import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

type Bucket = { total: number; male: number; female: number };

function mkBucket(): Bucket {
  return { total: 0, male: 0, female: 0 };
}
function addTo(bucket: Bucket, isMale: boolean) {
  bucket.total++;
  if (isMale) bucket.male++;
  else bucket.female++;
}

/**
 * Admin Dashboard Service
 *
 * Aggregation queries backing the admin overview, daily attendance, and
 * students/teachers stats screens. Read-only, no per-record authorization —
 * callers gate access via role (ADMIN/HEAD_TEACHER/CLERK).
 */
export class AdminDashboardService {
  async getOverviewStats() {
    const [
      totalStudents,
      activeStudents,
      totalTeachers,
      activeTeachers,
      totalClasses,
      activeClasses,
      totalDepartments,
      totalSubjects,
      ovcStudents,
      activeAcademicYear,
    ] = await Promise.all([
      prisma.student.count(),
      prisma.student.count({ where: { status: { in: ["ACTIVE", "SUSPENDED"] } } }),
      prisma.teacherProfile.count(),
      prisma.teacherProfile.count({ where: { status: "ACTIVE" } }),
      prisma.class.count(),
      prisma.class.count({ where: { status: "ACTIVE" } }),
      prisma.department.count(),
      prisma.subject.count(),
      prisma.student.findMany({
        where: {
          vulnerability: { not: "NOT_VULNERABLE" },
          status: { in: ["ACTIVE", "SUSPENDED"] },
        },
        select: { gender: true, vulnerability: true, orphanType: true },
      }),
      prisma.academicYear.findFirst({
        where: { isActive: true },
        include: {
          terms: { where: { isActive: true }, select: { id: true, termType: true } },
        },
      }),
    ]);

    const orphans = ovcStudents.filter((s) => s.vulnerability === "ORPHAN");
    const singleOrphans = orphans.filter((s) => s.orphanType === "SINGLE_ORPHAN");
    const doubleOrphans = orphans.filter((s) => s.orphanType === "DOUBLE_ORPHAN");
    const vulnerable = ovcStudents.filter((s) => s.vulnerability === "VULNERABLE_CHILD");
    const specialNeeds = ovcStudents.filter((s) => s.vulnerability === "SPECIAL_NEEDS");
    const underFive = ovcStudents.filter((s) => s.vulnerability === "UNDER_FIVE_INITIATIVE");

    const m = (arr: { gender: string }[]) => arr.filter((s) => s.gender === "MALE").length;
    const f = (arr: { gender: string }[]) => arr.filter((s) => s.gender === "FEMALE").length;

    const ovcOrphan = orphans.length;
    const ovcVulnerable = vulnerable.length;
    const ovcSpecialNeeds = specialNeeds.length;
    const ovcUnderFive = underFive.length;

    const activeTerm = activeAcademicYear?.terms[0] ?? null;

    const [draftCount, publishedCount, completedCount] = activeTerm
      ? await Promise.all([
          prisma.assessment.count({ where: { termId: activeTerm.id, status: "DRAFT" } }),
          prisma.assessment.count({ where: { termId: activeTerm.id, status: "PUBLISHED" } }),
          prisma.assessment.count({ where: { termId: activeTerm.id, status: "COMPLETED" } }),
        ])
      : [0, 0, 0];

    const termLabel = activeTerm ? `Term ${activeTerm.termType.replace("TERM_", "")}` : null;
    const ovcTotal = ovcOrphan + ovcVulnerable + ovcSpecialNeeds + ovcUnderFive;

    return {
      students: { total: totalStudents, active: activeStudents },
      teachers: { total: totalTeachers, active: activeTeachers },
      classes: { total: totalClasses, active: activeClasses },
      departments: { total: totalDepartments, subjects: totalSubjects },
      academicYear: {
        year: activeAcademicYear?.year ?? null,
        termLabel,
        termId: activeTerm?.id ?? null,
      },
      assessments: {
        draft: draftCount,
        published: publishedCount,
        completed: completedCount,
        total: draftCount + publishedCount + completedCount,
      },
      vulnerability: {
        orphan: ovcOrphan,
        orphanMale: m(orphans),
        orphanFemale: f(orphans),
        singleOrphan: singleOrphans.length,
        singleOrphanMale: m(singleOrphans),
        singleOrphanFemale: f(singleOrphans),
        doubleOrphan: doubleOrphans.length,
        doubleOrphanMale: m(doubleOrphans),
        doubleOrphanFemale: f(doubleOrphans),
        vulnerable: ovcVulnerable,
        vulnerableMale: m(vulnerable),
        vulnerableFemale: f(vulnerable),
        specialNeeds: ovcSpecialNeeds,
        specialNeedsMale: m(specialNeeds),
        specialNeedsFemale: f(specialNeeds),
        underFive: ovcUnderFive,
        underFiveMale: m(underFive),
        underFiveFemale: f(underFive),
        total: ovcTotal,
      },
    };
  }

  async getDailyAttendanceStats(dateParam: string | null) {
    const dateStr = dateParam ?? new Date().toISOString().slice(0, 10);
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    const [totalMale, totalFemale] = await Promise.all([
      prisma.student.count({ where: { gender: "MALE", status: { in: ["ACTIVE", "SUSPENDED"] } } }),
      prisma.student.count({ where: { gender: "FEMALE", status: { in: ["ACTIVE", "SUSPENDED"] } } }),
    ]);

    const records = await prisma.attendanceRecord.findMany({
      where: {
        date: { gte: startOfDay, lte: endOfDay },
        timetableSlotId: null,
      },
      select: {
        studentId: true,
        status: true,
        student: { select: { gender: true } },
      },
    });

    const seen = new Set<string>();
    const unique: { status: string; gender: string }[] = [];
    for (const r of records) {
      if (!seen.has(r.studentId)) {
        seen.add(r.studentId);
        unique.push({ status: r.status, gender: r.student.gender });
      }
    }

    let malePresent = 0,
      maleAbsent = 0,
      maleLate = 0,
      maleExcused = 0;
    let femalePresent = 0,
      femaleAbsent = 0,
      femaleLate = 0,
      femaleExcused = 0;

    for (const r of unique) {
      const isMale = r.gender === "MALE";
      switch (r.status) {
        case "PRESENT":
          isMale ? malePresent++ : femalePresent++;
          break;
        case "ABSENT":
          isMale ? maleAbsent++ : femaleAbsent++;
          break;
        case "LATE":
          isMale ? maleLate++ : femaleLate++;
          break;
        case "EXCUSED":
          isMale ? maleExcused++ : femaleExcused++;
          break;
      }
    }

    const maleMarked = malePresent + maleAbsent + maleLate + maleExcused;
    const femaleMarked = femalePresent + femaleAbsent + femaleLate + femaleExcused;
    const totalMarked = maleMarked + femaleMarked;
    const totalPresent = malePresent + maleLate + femalePresent + femaleLate;
    const totalAbsent = maleAbsent + femaleAbsent;
    const totalLate = maleLate + femaleLate;
    const totalExcused = maleExcused + femaleExcused;

    const rate = (v: number, t: number) => (t > 0 ? Math.round((v / t) * 100) : 0);

    return {
      date: dateStr,
      overall: {
        totalEnrolled: totalMale + totalFemale,
        marked: totalMarked,
        present: totalPresent + totalLate, // PRESENT + LATE = attending
        absent: totalAbsent,
        late: totalLate,
        excused: totalExcused,
        rate: rate(totalPresent + totalLate, totalMarked),
      },
      male: {
        totalEnrolled: totalMale,
        marked: maleMarked,
        present: malePresent + maleLate,
        rate: rate(malePresent + maleLate, maleMarked),
      },
      female: {
        totalEnrolled: totalFemale,
        marked: femaleMarked,
        present: femalePresent + femaleLate,
        rate: rate(femalePresent + femaleLate, femaleMarked),
      },
    };
  }

  async getStudentStats(gradeId?: string, statusFilter?: string) {
    const where: Prisma.StudentWhereInput = { deletedAt: null };
    if (statusFilter) where.status = statusFilter as Prisma.StudentWhereInput["status"];
    if (gradeId) {
      where.enrollments = { some: { class: { gradeId }, status: "ACTIVE" } };
    }

    const students = await prisma.student.findMany({
      where,
      select: {
        gender: true,
        status: true,
        dateOfBirth: true,
        vulnerability: true,
        orphanType: true,
        enrollments: {
          where: { status: "ACTIVE" },
          select: { class: { select: { grade: { select: { id: true, name: true, sequence: true } } } } },
          take: 1,
          orderBy: { enrollmentDate: "desc" },
        },
      },
    });

    const grades = await prisma.grade.findMany({
      select: { id: true, name: true, sequence: true },
      orderBy: { sequence: "asc" },
    });

    const now = new Date();

    const byGender = { MALE: 0, FEMALE: 0 };
    const byStatus: Record<string, Bucket> = {};
    const byAgeGroup: Record<string, Bucket> = {
      "Under 10": mkBucket(),
      "10-12": mkBucket(),
      "13-15": mkBucket(),
      "16-18": mkBucket(),
      "Over 18": mkBucket(),
    };
    const byVulnerability: Record<string, Bucket> = {};
    const byGrade: Record<
      string,
      { name: string; sequence: number; total: number; male: number; female: number }
    > = {};

    for (const s of students) {
      const isMale = s.gender === "MALE";

      if (isMale) byGender.MALE++;
      else byGender.FEMALE++;

      if (!byStatus[s.status]) byStatus[s.status] = mkBucket();
      addTo(byStatus[s.status], isMale);

      if (s.dateOfBirth) {
        const age = Math.floor(
          (now.getTime() - new Date(s.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
        );
        const group = age < 10 ? "Under 10" : age <= 12 ? "10-12" : age <= 15 ? "13-15" : age <= 18 ? "16-18" : "Over 18";
        addTo(byAgeGroup[group], isMale);
      }

      const vuln = s.vulnerability ?? "NOT_VULNERABLE";
      if (!byVulnerability[vuln]) byVulnerability[vuln] = mkBucket();
      addTo(byVulnerability[vuln], isMale);

      const grade = s.enrollments?.[0]?.class?.grade;
      if (grade) {
        if (!byGrade[grade.id]) {
          byGrade[grade.id] = { name: grade.name, sequence: grade.sequence, total: 0, male: 0, female: 0 };
        }
        byGrade[grade.id].total++;
        if (isMale) byGrade[grade.id].male++;
        else byGrade[grade.id].female++;
      }
    }

    const byGradeArray = Object.values(byGrade).sort((a, b) => a.sequence - b.sequence);

    return {
      total: students.length,
      byGender,
      byStatus,
      byAgeGroup,
      byVulnerability,
      byGrade: byGradeArray,
      grades,
    };
  }

  async getTeacherStats(departmentId?: string) {
    const where: Prisma.TeacherProfileWhereInput = { deletedAt: null };
    if (departmentId) {
      where.departments = { some: { departmentId } };
    }

    const teachers = await prisma.teacherProfile.findMany({
      where,
      select: {
        gender: true,
        qualification: true,
        status: true,
        dateOfBirth: true,
        yearsExperience: true,
        departments: { select: { departmentId: true } },
      },
    });

    const departments = await prisma.department.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    const now = new Date();

    const byGender = { MALE: 0, FEMALE: 0 };
    const byStatus: Record<string, Bucket> = {};
    const byQualification: Record<string, Bucket> = {};
    const byAgeGroup: Record<string, Bucket> = {
      "20-29": mkBucket(),
      "30-39": mkBucket(),
      "40-49": mkBucket(),
      "50-59": mkBucket(),
      "60+": mkBucket(),
    };
    const byExperience: Record<string, Bucket> = {
      "0-2 yrs": mkBucket(),
      "3-5 yrs": mkBucket(),
      "6-10 yrs": mkBucket(),
      "11-20 yrs": mkBucket(),
      "20+ yrs": mkBucket(),
    };

    for (const t of teachers) {
      const isMale = t.gender === "MALE";

      if (isMale) byGender.MALE++;
      else byGender.FEMALE++;

      if (!byStatus[t.status]) byStatus[t.status] = mkBucket();
      addTo(byStatus[t.status], isMale);

      if (t.qualification) {
        if (!byQualification[t.qualification]) byQualification[t.qualification] = mkBucket();
        addTo(byQualification[t.qualification], isMale);
      }

      if (t.dateOfBirth) {
        const age = Math.floor(
          (now.getTime() - new Date(t.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
        );
        const group = age < 30 ? "20-29" : age < 40 ? "30-39" : age < 50 ? "40-49" : age < 60 ? "50-59" : "60+";
        addTo(byAgeGroup[group], isMale);
      }

      const exp = t.yearsExperience ?? 0;
      const expGroup = exp <= 2 ? "0-2 yrs" : exp <= 5 ? "3-5 yrs" : exp <= 10 ? "6-10 yrs" : exp <= 20 ? "11-20 yrs" : "20+ yrs";
      addTo(byExperience[expGroup], isMale);
    }

    return {
      total: teachers.length,
      byGender,
      byStatus,
      byQualification,
      byAgeGroup,
      byExperience,
      departments,
    };
  }
}

export const adminDashboardService = new AdminDashboardService();
