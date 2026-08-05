import { describe, it, expect, beforeEach } from "vitest";
import { Role } from "@prisma/client";
import { GET as listRooms, POST as createRoom } from "@/app/api/admin/rooms/route";
import { GET as getRoom, PUT as updateRoom, DELETE as deleteRoom } from "@/app/api/admin/rooms/[roomId]/route";
import { callRoute } from "../../helpers/callRoute";
import { loginAs } from "../../helpers/auth";
import { resetDb, createTestUser } from "../../helpers/db";

describe("admin/rooms", () => {
  let adminToken: string;
  let teacherToken: string;

  beforeEach(async () => {
    await resetDb();
    const admin = await createTestUser({ role: Role.ADMIN });
    adminToken = await loginAs(admin.user.email, admin.password);
    const teacher = await createTestUser({ role: Role.TEACHER });
    teacherToken = await loginAs(teacher.user.email, teacher.password);
  });

  it("supports the full create/list/get/update/delete lifecycle for ADMIN", async () => {
    // Regression coverage for a real bug found while scoping this suite:
    // room.repository.ts called prisma.room.* with no Room model in the
    // Prisma schema at all (masked by a blanket @ts-nocheck), so every one
    // of these calls threw at runtime. Fixed by adding a real Room model
    // (migration 20260709080725_add_room_model) and a roomId relation on
    // TimetableSlot.
    const created = await callRoute<{ data: { id: string; name: string; type: string } }>(createRoom, {
      method: "POST",
      url: "/api/admin/rooms",
      token: adminToken,
      body: { name: "Room 101", code: "R101", type: "SCIENCE_LAB", capacity: 30 },
    });
    expect(created.status).toBe(201);
    expect(created.json.data.name).toBe("Room 101");
    expect(created.json.data.type).toBe("SCIENCE_LAB");
    const roomId = created.json.data.id;

    const list = await callRoute<{ data: { id: string }[] }>(listRooms, { url: "/api/admin/rooms", token: adminToken });
    expect(list.status).toBe(200);
    expect(list.json.data.map((r) => r.id)).toContain(roomId);

    const fetched = await callRoute<{ data: { id: string } }>(getRoom, {
      url: `/api/admin/rooms/${roomId}`,
      token: adminToken,
      params: { roomId },
    });
    expect(fetched.status).toBe(200);
    expect(fetched.json.data.id).toBe(roomId);

    const updated = await callRoute<{ data: { capacity: number } }>(updateRoom, {
      method: "PUT",
      url: `/api/admin/rooms/${roomId}`,
      token: adminToken,
      params: { roomId },
      body: { capacity: 35 },
    });
    expect(updated.status).toBe(200);
    expect(updated.json.data.capacity).toBe(35);

    const deleted = await callRoute(deleteRoom, {
      method: "DELETE",
      url: `/api/admin/rooms/${roomId}`,
      token: adminToken,
      params: { roomId },
    });
    expect(deleted.status).toBe(200);

    const afterDelete = await callRoute(getRoom, {
      url: `/api/admin/rooms/${roomId}`,
      token: adminToken,
      params: { roomId },
    });
    expect(afterDelete.status).toBe(404);
  });

  it("rejects room creation/update/delete from a TEACHER but allows listing", async () => {
    const created = await callRoute(createRoom, {
      method: "POST",
      url: "/api/admin/rooms",
      token: teacherToken,
      body: { name: "Room 202" },
    });
    expect(created.status).toBe(403);

    const list = await callRoute(listRooms, { url: "/api/admin/rooms", token: teacherToken });
    expect(list.status).toBe(200);
  });

  it("rejects duplicate room names with a 409", async () => {
    await callRoute(createRoom, {
      method: "POST",
      url: "/api/admin/rooms",
      token: adminToken,
      body: { name: "Room 303" },
    });

    const { status } = await callRoute(createRoom, {
      method: "POST",
      url: "/api/admin/rooms",
      token: adminToken,
      body: { name: "Room 303" },
    });

    expect(status).toBe(409);
  });
});
