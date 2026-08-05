import { describe, it, expect } from "vitest";
import { PdfConcurrencyLimiter } from "@/lib/pdf/pdf-limiter";

// A real concurrency test, not a mock — this fires genuinely overlapping
// async tasks through the limiter and tracks the actual peak number running
// at once, the same way the enrollment-race test proves its fix by firing
// real concurrent requests rather than asserting on isolated calls.
describe("PdfConcurrencyLimiter", () => {
  it("never runs more than `max` tasks at once, and queued tasks still all complete", async () => {
    const limiter = new PdfConcurrencyLimiter(2);

    let currentlyRunning = 0;
    let peakConcurrent = 0;

    const task = (id: number) =>
      limiter.run(async () => {
        currentlyRunning++;
        peakConcurrent = Math.max(peakConcurrent, currentlyRunning);
        // Hold the "slot" long enough that, without the limiter, all 5 tasks
        // fired below would overlap.
        await new Promise((resolve) => setTimeout(resolve, 30));
        currentlyRunning--;
        return id;
      });

    // Fire 5 tasks at once against a limiter capped at 2 — more than the cap,
    // so some must queue rather than run immediately.
    const results = await Promise.all([task(1), task(2), task(3), task(4), task(5)]);

    expect(peakConcurrent).toBeLessThanOrEqual(2);
    expect(results.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("a failing task releases its slot so subsequent tasks aren't stuck queued forever", async () => {
    const limiter = new PdfConcurrencyLimiter(1);

    await expect(
      limiter.run(async () => {
        throw new Error("render failed");
      })
    ).rejects.toThrow("render failed");

    // If the failed task's slot weren't released, this would hang until the
    // test's timeout instead of resolving.
    const result = await limiter.run(async () => "ok");
    expect(result).toBe("ok");
  });
});
