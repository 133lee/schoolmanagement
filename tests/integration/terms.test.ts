import { describe, it, expect, beforeEach } from "vitest";
import { Role, TermType } from "@prisma/client";
import { GET as listTerms, POST as createTerm } from "@/app/api/terms/route";
import { GET as getTerm, PATCH as updateTerm, DELETE as deleteTerm } from "@/app/api/terms/[id]/route";
import { POST as activateTerm } from "@/app/api/terms/[id]/activate/route";
import { POST as deactivateTerm } from "@/app/api/terms/[id]/deactivate/route";
import { GET as getTermStats } from "@/app/api/terms/[id]/stats/route";
import { GET as getActiveTerm } from "@/app/api/terms/active/route";
import { callRoute } from "../helpers/callRoute";
import { loginAs } from "../helpers/auth";
import { resetDb, createTestUser, createTestAcademicYear, createTestTerm } from "../helpers/db";

describe("terms routes", () => {
  let adminToken: string;
  let teacherToken: string;
  let academicYearId: string;

  beforeEach(async () => {
    await resetDb();
    const admin = await createTestUser({ role: Role.ADMIN });
    adminToken = await loginAs(admin.user.email, admin.password);
    const teacher = await createTestUser({ role: Role.TEACHER });
    teacherToken = await loginAs(teacher.user.email, teacher.password);
    const academicYear = await createTestAcademicYear({ year: 2090 });
    academicYearId = academicYear.id;
  });

  it("supports the full create/list/get/update/delete lifecycle for ADMIN", async () => {
    const created = await callRoute<{ data: { id: string; termType: string } }>(createTerm, {
      method: "POST",
      url: "/api/terms",
      token: adminToken,
      body: {
        academicYearId,
        termType: TermType.TERM_2,
        startDate: "2090-05-01",
        endDate: "2090-08-31",
      },
    });
    expect(created.status).toBe(201);
    const termId = created.json.data.id;

    const list = await callRoute<{ data: { id: string }[] }>(listTerms, {
      url: `/api/terms?academicYearId=${academicYearId}`,
      token: adminToken,
    });
    expect(list.status).toBe(200);
    expect(list.json.data.map((t) => t.id)).toContain(termId);

    const fetched = await callRoute<{ data: { id: string } }>(getTerm, {
      url: `/api/terms/${termId}`,
      token: adminToken,
      params: { id: termId },
    });
    expect(fetched.status).toBe(200);

    const updated = await callRoute<{ data: { termType: string } }>(updateTerm, {
      method: "PATCH",
      url: `/api/terms/${termId}`,
      token: adminToken,
      params: { id: termId },
      body: { termType: TermType.TERM_3 },
    });
    expect(updated.status).toBe(200);
    expect(updated.json.data.termType).toBe(TermType.TERM_3);

    const deniedDelete = await callRoute(deleteTerm, {
      method: "DELETE",
      url: `/api/terms/${termId}`,
      token: teacherToken,
      params: { id: termId },
    });
    expect(deniedDelete.status).toBe(403);

    const deleted = await callRoute(deleteTerm, {
      method: "DELETE",
      url: `/api/terms/${termId}`,
      token: adminToken,
      params: { id: termId },
    });
    expect(deleted.status).toBe(204);
  });

  it("rejects term creation from a TEACHER but allows listing", async () => {
    const created = await callRoute(createTerm, {
      method: "POST",
      url: "/api/terms",
      token: teacherToken,
      body: { academicYearId, termType: TermType.TERM_1, startDate: "2090-01-01", endDate: "2090-04-30" },
    });
    expect(created.status).toBe(403);

    const list = await callRoute(listTerms, { url: "/api/terms", token: teacherToken });
    expect(list.status).toBe(200);
  });

  it("activating a term deactivates the previously-active term in the same academic year", async () => {
    const termA = await createTestTerm(academicYearId, { termType: TermType.TERM_1, isActive: true });
    const termB = await createTestTerm(academicYearId, { termType: TermType.TERM_2, isActive: false });

    const activated = await callRoute<{ data: { isActive: boolean } }>(activateTerm, {
      method: "POST",
      url: `/api/terms/${termB.id}/activate`,
      token: adminToken,
      params: { id: termB.id },
    });
    expect(activated.status).toBe(200);
    expect(activated.json.data.isActive).toBe(true);

    const oldTerm = await callRoute<{ data: { isActive: boolean } }>(getTerm, {
      url: `/api/terms/${termA.id}`,
      token: adminToken,
      params: { id: termA.id },
    });
    expect(oldTerm.json.data.isActive).toBe(false);

    const deactivated = await callRoute<{ data: { isActive: boolean } }>(deactivateTerm, {
      method: "POST",
      url: `/api/terms/${termB.id}/deactivate`,
      token: adminToken,
      params: { id: termB.id },
    });
    expect(deactivated.status).toBe(200);
    expect(deactivated.json.data.isActive).toBe(false);
  });

  it("rejects activate/deactivate from a role below HEAD_TEACHER", async () => {
    const term = await createTestTerm(academicYearId, { isActive: false });

    const { status } = await callRoute(activateTerm, {
      method: "POST",
      url: `/api/terms/${term.id}/activate`,
      token: teacherToken,
      params: { id: term.id },
    });
    expect(status).toBe(403);
  });

  it("GET /api/terms/[id]/stats returns statistics for a term", async () => {
    const term = await createTestTerm(academicYearId);

    const { status, json } = await callRoute<{ data: unknown }>(getTermStats, {
      url: `/api/terms/${term.id}/stats`,
      token: adminToken,
      params: { id: term.id },
    });
    expect(status).toBe(200);
    expect(json.data).toBeTruthy();
  });

  it("GET /api/terms/active returns 200 with null data (not 404) when no term is active", async () => {
    const { status, json } = await callRoute<{ data: unknown }>(getActiveTerm, {
      url: "/api/terms/active",
      token: teacherToken,
    });
    expect(status).toBe(200);
    expect(json.data).toBeNull();
  });

  it("GET /api/terms/active returns the active term when one exists", async () => {
    const term = await createTestTerm(academicYearId, { isActive: true });

    const { status, json } = await callRoute<{ data: { id: string } | null }>(getActiveTerm, {
      url: "/api/terms/active",
      token: teacherToken,
    });
    expect(status).toBe(200);
    expect(json.data?.id).toBe(term.id);
  });
});
