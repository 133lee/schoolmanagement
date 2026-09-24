import prisma from "@/lib/db/prisma";
import { logger } from "@/lib/logger/logger";
import { NotFoundError, BadRequestError } from "@/lib/http/errors";
import { Role } from "@/types/prisma-enums";
import { requireMinimumRole, AuthContext } from "@/lib/auth/authorization";
import { resolveECZLevel, getGradeInfo, type GradeLevel } from "@/lib/grading/ecz-grading-system";
import { formatTeacherLabel } from "@/lib/utils";
import { ECZGrade } from "@/types/prisma-enums";
import {
  isPhysicsSubjectName,
  isChemistrySubjectName,
  hasRealMark,
  combinePhysicsChemistryMark,
  COMBINED_SCIENCE_LABEL,
  COMBINED_SCIENCE_SUBJECT_ID,
  type SubjectMarkRow,
} from "@/lib/grading/combined-science";

type MergeableReportCardSubject = SubjectMarkRow & { sourceSubjectIds?: string[] };

/**
 * Grade 12 only: merges a student's Physics + Chemistry rows into one
 * "SCIENCE" row when both have a real mark (see combined-science.ts).
 * Leaves the array untouched otherwise, including when only one of the two
 * has a mark — that subject just stands alone.
 */
function applyScienceMerge(
  subjects: MergeableReportCardSubject[]
): MergeableReportCardSubject[] {
  const physics = subjects.find((s) => isPhysicsSubjectName(s.subject.name));
  const chemistry = subjects.find((s) => isChemistrySubjectName(s.subject.name));
  if (!physics || !chemistry || !hasRealMark(physics) || !hasRealMark(chemistry)) {
    return subjects;
  }
  const merged = combinePhysicsChemistryMark(physics, chemistry);
  const scienceRow = {
    ...physics,
    ...merged,
    subjectId: COMBINED_SCIENCE_SUBJECT_ID,
    // Physics and Chemistry are usually taught by different teachers —
    // callers that need to look up teacher assignments for this merged row
    // (the Teachers table) must query both real subject IDs, not the
    // synthetic combined one.
    sourceSubjectIds: [physics.subjectId, chemistry.subjectId],
    subject: {
      id: COMBINED_SCIENCE_SUBJECT_ID,
      name: COMBINED_SCIENCE_LABEL,
      code: COMBINED_SCIENCE_LABEL,
    },
  };
  return [...subjects.filter((s) => s !== physics && s !== chemistry), scienceRow];
}

// Grade bands 1-6 are "credit or better" (quality), 1-8 is the full pass
// range (quantity) — grade 9 is the only failing band. This mirrors the
// SENIOR_GRADING scale in lib/grading/ecz-grading-system.ts, where symbol
// and ECZGrade band number are the same 1-9 value.
const CREDIT_BAND_MAX = 6;
const PASS_BAND_MAX = 8;
const GRADE_BANDS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
// "Best Grade" / "Best Performing Pupils" only recognise the top tier —
// Distinction 1/2 and Merit 3/4 — as worth reporting. A subject where
// nobody reached at least Merit 4 has no "best" to show.
const BEST_GRADE_MAX_BAND = 4;

function gradeBandNumber(grade: string): number {
  return parseInt(grade.replace("GRADE_", ""), 10);
}

function studentFullName(student: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
}): string {
  return [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(" ");
}

interface GenderCount {
  male: number;
  female: number;
  total: number;
}

function emptyGenderCount(): GenderCount {
  return { male: 0, female: 0, total: 0 };
}

function bump(count: GenderCount, gender: "MALE" | "FEMALE") {
  if (gender === "MALE") count.male++;
  else count.female++;
  count.total++;
}

function pct(numerator: number, denominator: number): number {
  return denominator > 0 ? parseFloat(((numerator / denominator) * 100).toFixed(1)) : 0;
}

export interface SubjectPerformanceRow {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  entered: GenderCount;
  sat: GenderCount;
  absent: GenderCount;
  // Keyed by grade band 1-9. Only male/female are shown on the grid (the
  // template has no per-band "Total" sub-column) but total is kept for
  // convenience.
  gradeCounts: Record<number, GenderCount>;
  // Percentage of SAT students in bands 1-6 / 1-8, per gender + combined.
  // The combined ("total") values are what the template prints again as
  // the shaded "TOTAL QUALITY" / "TOTAL QUANTITY" columns.
  pct1to6: GenderCount;
  pct1to8: GenderCount;
}

export interface SubjectTeacherRow {
  subjectId: string;
  subjectName: string;
  teacherName: string;
  passRate: number;
  bestGrade: string;
  numberOfBestPupils: number;
  bestPerformingPupils: string;
}

export interface OverallPerformanceRow {
  entered: GenderCount;
  sat: GenderCount;
  absent: GenderCount;
  schoolCertificate: GenderCount;
  gce: GenderCount;
  fail: GenderCount;
  passRate: { male: number; female: number; total: number };
}

export interface GradePerformanceReport {
  gradeLevel: GradeLevel;
  gradeName: string;
  termLabel: string;
  academicYearLabel: string;
  totalClasses: number;
  subjects: SubjectPerformanceRow[];
  teachers: SubjectTeacherRow[];
  overall: OverallPerformanceRow;
}

/**
 * Grade-wide performance report ("Subject by Gender Analysis" + "Overall
 * Performance") — mirrors the Ministry of Education two-page paper form
 * (see public/template.pdf) exactly: same column grouping, same "TOTAL
 * QUALITY"/"TOTAL QUANTITY" columns (the combined 1-6%/1-8% pass rates),
 * same Teachers summary sorted by pass rate. Sourced from FINAL report
 * card data (not a single CAT/MID/EOT snapshot), since the document's
 * page 2 title is explicitly "... FINAL".
 */
export class GradePerformanceReportService {
  async getGradeReport(
    gradeId: string,
    termId: string,
    context: AuthContext
  ): Promise<GradePerformanceReport> {
    requireMinimumRole(
      context,
      Role.DEPUTY_HEAD,
      "Admin access required to view this report"
    );

    if (!gradeId || !termId) {
      throw new BadRequestError("Grade ID and Term ID are required");
    }

    const grade = await prisma.grade.findUnique({
      where: { id: gradeId },
      select: { id: true, name: true, level: true },
    });
    if (!grade) throw new NotFoundError("Grade not found");

    const term = await prisma.term.findUnique({
      where: { id: termId },
      select: {
        id: true,
        termType: true,
        academicYearId: true,
        academicYear: { select: { year: true } },
      },
    });
    if (!term) throw new NotFoundError("Term not found");

    const classes = await prisma.class.findMany({
      where: { gradeId, status: "ACTIVE" },
      select: { id: true, name: true },
    });
    const classIds = classes.map((c) => c.id);
    const gradeLevel = resolveECZLevel(grade.level, grade.name, classes[0]?.name);

    logger.info("Generating grade performance report", {
      gradeId,
      termId,
      classCount: classes.length,
    });

    const reportCards =
      classIds.length === 0
        ? []
        : await prisma.reportCard.findMany({
            where: { termId, classId: { in: classIds } },
            include: {
              student: {
                select: {
                  id: true,
                  firstName: true,
                  middleName: true,
                  lastName: true,
                  gender: true,
                },
              },
              subjects: {
                include: {
                  subject: { select: { id: true, name: true, code: true } },
                },
              },
            },
          });

    // ── Subject aggregation (Page 1 grid) ──
    interface SubjectAgg {
      subjectId: string;
      subjectName: string;
      subjectCode: string;
      // Real Subject IDs backing this row — one entry normally, two
      // (Physics + Chemistry) for a merged Grade 12 "SCIENCE" row, since
      // that's what a teacher-assignment lookup must query.
      sourceSubjectIds: string[];
      entered: GenderCount;
      sat: GenderCount;
      absent: GenderCount;
      gradeCounts: Record<number, GenderCount>;
      // Student names achieving each band — used to name the "Best
      // Performing Pupils" at whatever the best band actually reached is.
      namesByBand: Record<number, string[]>;
    }
    const subjectAggs = new Map<string, SubjectAgg>();

    // ── Per-student overall classification (Page 2) ──
    const overall: OverallPerformanceRow = {
      entered: emptyGenderCount(),
      sat: emptyGenderCount(),
      absent: emptyGenderCount(),
      schoolCertificate: emptyGenderCount(),
      gce: emptyGenderCount(),
      fail: emptyGenderCount(),
      passRate: { male: 0, female: 0, total: 0 },
    };

    for (const report of reportCards) {
      const gender = report.student.gender;
      bump(overall.entered, gender);

      let passCount = 0;
      let creditCount = 0;
      let hasEnglishPass = false;
      let studentSat = false;

      const effectiveSubjects: MergeableReportCardSubject[] =
        grade.level === "GRADE_12" ? applyScienceMerge(report.subjects) : report.subjects;

      for (const rcs of effectiveSubjects) {
        let agg = subjectAggs.get(rcs.subjectId);
        if (!agg) {
          agg = {
            subjectId: rcs.subjectId,
            subjectName: rcs.subject.name,
            subjectCode: rcs.subject.code,
            sourceSubjectIds: rcs.sourceSubjectIds ?? [rcs.subjectId],
            entered: emptyGenderCount(),
            sat: emptyGenderCount(),
            absent: emptyGenderCount(),
            gradeCounts: Object.fromEntries(
              GRADE_BANDS.map((b) => [b, emptyGenderCount()])
            ),
            namesByBand: Object.fromEntries(GRADE_BANDS.map((b) => [b, []])),
          };
          subjectAggs.set(rcs.subjectId, agg);
        }

        bump(agg.entered, gender);

        // Three distinct states, not two: a real mark, an explicit AB (the
        // exam happened and the student was marked absent for it), or no
        // entry at all (the teacher hasn't recorded anything for this exam
        // type yet). Only the first two are meaningful outcomes — a subject
        // nobody has entered any assessment/marks for at all (like a
        // teacher who hasn't started marking this term) must NOT be counted
        // as every student having been "absent"; it's simply not counted
        // either way, since nothing has actually happened for them yet.
        // catMark/midMark/eotMark stay null in both the AB and no-entry
        // cases, so catAbsent/midAbsent/eotAbsent — set only when a result
        // row was explicitly marked isAbsent — are what distinguish them.
        const hasMark =
          rcs.catMark !== null || rcs.midMark !== null || rcs.eotMark !== null;
        const explicitlyAbsent = rcs.catAbsent || rcs.midAbsent || rcs.eotAbsent;

        if (!hasMark && !explicitlyAbsent) {
          continue;
        }

        if (!hasMark) {
          bump(agg.absent, gender);
          continue;
        }

        bump(agg.sat, gender);
        studentSat = true;

        if (rcs.grade) {
          const band = gradeBandNumber(rcs.grade);
          bump(agg.gradeCounts[band], gender);
          agg.namesByBand[band].push(studentFullName(report.student));

          // "Pass" = grade 1-8 (only band 9 fails a subject); "credit" =
          // grade 1-6, a stricter subset of pass.
          if (band <= PASS_BAND_MAX) {
            passCount++;
            if (rcs.subject.name.toLowerCase().includes("english")) {
              hasEnglishPass = true;
            }
          }
          if (band <= CREDIT_BAND_MAX) {
            creditCount++;
          }
        }
      }

      if (!studentSat) {
        bump(overall.absent, gender);
        continue;
      }

      bump(overall.sat, gender);

      // Official ECZ School Certificate award conditions (one sitting):
      // pass (grade 1-8) in at least 6 subjects including English, with
      // credit (1-6) in at least 1 of them; OR pass in at least 5 subjects
      // including English, with credit in at least 2 of them. Maths is NOT
      // a requirement — only English is compulsory. A candidate with at
      // least one pass who doesn't meet either route gets a Statement of
      // Results (GCE); zero passes (grade 9 everywhere) is a fail.
      const meetsSchoolCertificate =
        hasEnglishPass &&
        ((passCount >= 6 && creditCount >= 1) || (passCount >= 5 && creditCount >= 2));

      if (meetsSchoolCertificate) {
        bump(overall.schoolCertificate, gender);
      } else if (passCount >= 1) {
        bump(overall.gce, gender);
      } else {
        bump(overall.fail, gender);
      }
    }

    overall.passRate = {
      male: pct(overall.schoolCertificate.male + overall.gce.male, overall.sat.male),
      female: pct(overall.schoolCertificate.female + overall.gce.female, overall.sat.female),
      total: pct(overall.schoolCertificate.total + overall.gce.total, overall.sat.total),
    };

    // ── Finalize subject rows + teacher lookup ──
    const subjectRows: SubjectPerformanceRow[] = [];
    const teacherRows: SubjectTeacherRow[] = [];

    const sortedAggs = Array.from(subjectAggs.values()).sort((a, b) =>
      a.subjectName.localeCompare(b.subjectName)
    );

    const bandSum = (
      counts: Record<number, GenderCount>,
      max: number,
      field: keyof GenderCount
    ) =>
      GRADE_BANDS.filter((b) => b <= max).reduce((sum, b) => sum + counts[b][field], 0);

    for (const agg of sortedAggs) {
      const pct1to6: GenderCount = {
        male: pct(bandSum(agg.gradeCounts, CREDIT_BAND_MAX, "male"), agg.sat.male),
        female: pct(bandSum(agg.gradeCounts, CREDIT_BAND_MAX, "female"), agg.sat.female),
        total: pct(bandSum(agg.gradeCounts, CREDIT_BAND_MAX, "total"), agg.sat.total),
      };
      const pct1to8: GenderCount = {
        male: pct(bandSum(agg.gradeCounts, PASS_BAND_MAX, "male"), agg.sat.male),
        female: pct(bandSum(agg.gradeCounts, PASS_BAND_MAX, "female"), agg.sat.female),
        total: pct(bandSum(agg.gradeCounts, PASS_BAND_MAX, "total"), agg.sat.total),
      };

      subjectRows.push({
        subjectId: agg.subjectId,
        subjectName: agg.subjectName,
        subjectCode: agg.subjectCode,
        entered: agg.entered,
        sat: agg.sat,
        absent: agg.absent,
        gradeCounts: agg.gradeCounts,
        pct1to6,
        pct1to8,
      });

      const bestBand = GRADE_BANDS.filter((b) => b <= BEST_GRADE_MAX_BAND).find(
        (b) => agg.gradeCounts[b].total > 0
      );
      const bestGrade = bestBand
        ? getGradeInfo(`GRADE_${bestBand}` as ECZGrade, "SENIOR")?.displayName.toUpperCase() ??
          String(bestBand)
        : "-";
      const bestPupilNames = bestBand ? agg.namesByBand[bestBand] : [];

      const assignments =
        classIds.length === 0
          ? []
          : await prisma.subjectTeacherAssignment.findMany({
              where: {
                subjectId: { in: agg.sourceSubjectIds },
                classId: { in: classIds },
                academicYearId: term.academicYearId,
                endedAt: null,
              },
              select: {
                teacher: {
                  select: { firstName: true, lastName: true },
                },
              },
            });
      const teacherNames = Array.from(
        new Set(assignments.map((a) => formatTeacherLabel(a.teacher)))
      );

      teacherRows.push({
        subjectId: agg.subjectId,
        subjectName: agg.subjectName,
        teacherName: teacherNames.length > 0 ? teacherNames.join(" / ") : "Unassigned",
        passRate: pct1to8.total,
        bestGrade,
        numberOfBestPupils: bestPupilNames.length,
        bestPerformingPupils: bestPupilNames.length > 0 ? bestPupilNames.join("/") : "-",
      });
    }

    // Template orders the Teachers table by pass rate, best-performing
    // subject first.
    teacherRows.sort((a, b) => b.passRate - a.passRate);

    logger.info("Grade performance report generated", {
      gradeId,
      termId,
      subjectCount: subjectRows.length,
      studentsIncluded: reportCards.length,
    });

    return {
      gradeLevel,
      gradeName: grade.name,
      termLabel: term.termType,
      academicYearLabel: term.academicYear?.year ? String(term.academicYear.year) : "",
      totalClasses: classes.length,
      subjects: subjectRows,
      teachers: teacherRows,
      overall,
    };
  }
}

export const gradePerformanceReportService = new GradePerformanceReportService();
