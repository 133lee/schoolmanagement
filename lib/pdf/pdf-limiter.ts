/**
 * PDF Concurrency Limiter
 *
 * @react-pdf/renderer's renderToStream is CPU-bound and blocks the Node.js
 * event loop for several hundred milliseconds per document.  Allowing an
 * unlimited number of simultaneous renders means 100 concurrent requests
 * saturate the CPU and every other API call slows to a crawl.
 *
 * This module exposes a singleton semaphore that caps the number of PDF
 * renders running at the same time.  Extra requests queue and run as soon
 * as a slot frees up, so nobody gets a 500 — they just wait a moment.
 *
 * Tune PDF_CONCURRENCY in your env:
 *   - 1-vCPU server  →  PDF_CONCURRENCY=3  (default)
 *   - 2-vCPU server  →  PDF_CONCURRENCY=6
 *   - 4-vCPU server  →  PDF_CONCURRENCY=10
 */

export class PdfConcurrencyLimiter {
  private readonly max: number;
  private running = 0;
  private readonly queue: Array<() => void> = [];

  constructor(max: number) {
    this.max = max;
  }

  /**
   * Run `fn` as soon as a slot is available.
   * Awaiting this method waits in the queue if all slots are busy.
   */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    return new Promise((resolve) => {
      const attempt = () => {
        if (this.running < this.max) {
          this.running++;
          resolve();
        } else {
          this.queue.push(attempt);
        }
      };
      attempt();
    });
  }

  private release(): void {
    this.running--;
    const next = this.queue.shift();
    if (next) next();
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────
// Use globalThis so hot-reloads in development don't create multiple instances.

const MAX = parseInt(process.env.PDF_CONCURRENCY ?? "3");

declare global {
  var _pdfLimiter: PdfConcurrencyLimiter | undefined;
}

export const pdfLimiter: PdfConcurrencyLimiter =
  globalThis._pdfLimiter ?? new PdfConcurrencyLimiter(MAX);

if (process.env.NODE_ENV !== "production") {
  globalThis._pdfLimiter = pdfLimiter;
}
