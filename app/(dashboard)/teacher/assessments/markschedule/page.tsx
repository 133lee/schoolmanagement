"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TeacherProfile {
  firstName: string;
  lastName: string;
  department?: { name: string };
}

interface ClassOption {
  id: string;
  name: string;
  gradeLevel: string;
}

interface Term {
  id: string;
  termType: string;
  academicYear?: { id: string; year: number | string };
}

interface Assessment {
  id: string;
  title: string;
  examType: "CAT" | "MID" | "EOT";
  totalMarks: number;
  status: string;
  subject: { id: string; name: string; code: string };
}

interface StudentRow {
  id: string;
  name: string;
  gender: "M" | "F"; // service pre-converts MALE→M, FEMALE→F
}

type ResultsMap = Record<string, Record<string, number | null>>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function sexLabel(gender: string) {
  return gender === "F" || gender === "FEMALE" ? "F" : "M";
}

function colLabel(assessment: Assessment, catIndex: number) {
  if (assessment.examType === "CAT") return `CAT ${toRoman(catIndex)}`;
  if (assessment.examType === "MID") return "MID";
  return "END";
}

function toRoman(n: number) {
  const map = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  return map[n - 1] ?? String(n);
}

function termLabel(t: Term) {
  const num = t.termType.replace("TERM_", "");
  return `Term ${num}${t.academicYear ? ` · ${t.academicYear.year}` : ""}`;
}

// ── PDF generator ─────────────────────────────────────────────────────────────

interface PDFData {
  schoolName: string;
  department: string;
  teacherName: string;
  className: string;
  subjectName: string;
  termNum: string;
  year: string | number;
  columns: { label: string; totalMarks: number }[];
  students: StudentRow[];
  resultsMap: ResultsMap;
  assessmentIds: string[];
  logoBase64?: string | null;
}

async function downloadPDF(data: PDFData) {
  const { Document, Page, Text, View, Image, StyleSheet, pdf } =
    await import("@react-pdf/renderer");
  const { saveAs } = await import("file-saver");

  // ── Layout constants (A4 portrait, 28pt padding each side) ───────────────
  // Usable width ≈ 595.28 − 56 = 539pt
  const SNO_W  = 24;
  const SEX_W  = 22;
  const NAME_W = 140;
  const nCols  = Math.max(1, data.columns.length);
  const ASS_SPACE = 539 - SNO_W - SEX_W - NAME_W; // ≈ 353pt
  // Each assessment column: divide available space evenly; minimum 50pt so
  // labels like "CAT III" never wrap.
  const colW   = Math.max(50, Math.floor(ASS_SPACE / nCols));

  // ── Name formatter: "Lee Misheck Nyirenda" → "NYIRENDA M. LEE" ──────────
  // Format: LASTNAME [MIDDLE_INITIAL.] FIRSTNAME — all uppercase, no comma
  function fmtName(fullName: string): string {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "";
    if (parts.length === 1) return parts[0].toUpperCase();

    const lastName  = parts[parts.length - 1].toUpperCase();
    const firstName = parts[0].toUpperCase();

    if (parts.length === 2) {
      return `${lastName} ${firstName}`;
    }

    // Middle part(s) → initials with periods
    const midInitials = parts
      .slice(1, -1)
      .map((w) => w[0].toUpperCase() + ".")
      .join(" ");

    return `${lastName} ${midInitials} ${firstName}`;
  }

  // ── Sort: best total score first (nulls treated as 0) ────────────────────
  function totalScore(studentId: string): number {
    return data.assessmentIds.reduce((sum, aid) => {
      const m = data.resultsMap[studentId]?.[aid];
      return sum + (m != null ? Number(m) : 0);
    }, 0);
  }
  const sortedStudents = [...data.students].sort(
    (a, b) => totalScore(b.id) - totalScore(a.id)
  );

  const styles = StyleSheet.create({
    page: { fontFamily: "Helvetica", fontSize: 9, padding: 28 },
    centerBlock: { alignItems: "center", marginBottom: 3 },
    bold: { fontFamily: "Helvetica-Bold" },
    logo: { width: 52, height: 52, marginBottom: 4, objectFit: "contain" },
    infoRow: {
      flexDirection: "row",
      marginBottom: 6,
      borderBottomWidth: 0.5,
      borderColor: "#555",
      paddingBottom: 4,
    },
    infoCell: { flex: 1, flexDirection: "row", gap: 2 },
    table: { borderWidth: 0.5, borderColor: "#000" },
    row: { flexDirection: "row" },
    evenRow: { backgroundColor: "#f5f5f5" },
    thCenter: {
      borderRightWidth: 0.5,
      borderBottomWidth: 0.5,
      borderColor: "#000",
      padding: "3 4",
      textAlign: "center",
      fontFamily: "Helvetica-Bold",
    },
    td: { borderRightWidth: 0.5, borderBottomWidth: 0.5, borderColor: "#000", padding: "3 4" },
    tdCenter: {
      borderRightWidth: 0.5,
      borderBottomWidth: 0.5,
      borderColor: "#000",
      padding: "3 4",
      textAlign: "center",
    },
  });

  const MIN_ROWS = 33;
  const blankCount = Math.max(0, MIN_ROWS - sortedStudents.length);

  const infoFields = [
    { label: "CLASS:", value: data.className },
    { label: "SUBJECT:", value: data.subjectName },
    { label: "TEACHER:", value: data.teacherName },
    { label: "TERM:", value: data.termNum },
    { label: "YEAR:", value: String(data.year) },
  ];

  const Doc = () => (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
        {/* Logo */}
        {data.logoBase64 && (
          <View style={styles.centerBlock}>
            <Image style={styles.logo} src={data.logoBase64} />
          </View>
        )}

        {/* School name */}
        <View style={styles.centerBlock}>
          <Text style={[styles.bold, { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }]}>
            {data.schoolName}
          </Text>
        </View>

        {/* Department */}
        {data.department ? (
          <View style={styles.centerBlock}>
            <Text style={[styles.bold, { textTransform: "uppercase" }]}>
              Department of {data.department}
            </Text>
          </View>
        ) : null}

        {/* Title */}
        <View style={[styles.centerBlock, { marginBottom: 8 }]}>
          <Text style={[styles.bold, { textTransform: "uppercase", letterSpacing: 1 }]}>
            Mark Schedule
          </Text>
        </View>

        {/* Info row */}
        <View style={styles.infoRow}>
          {infoFields.map(({ label, value }) => (
            <View key={label} style={styles.infoCell}>
              <Text style={styles.bold}>{label} </Text>
              <Text>{value}</Text>
            </View>
          ))}
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Header row 1 — group labels */}
          <View style={styles.row}>
            <Text style={[styles.thCenter, { width: SNO_W }]}>S/NO</Text>
            <Text style={[styles.thCenter, { width: NAME_W, textAlign: "left" }]}>NAME</Text>
            <Text style={[styles.thCenter, { width: SEX_W }]}>SEX</Text>
            <Text
              style={[
                styles.thCenter,
                { width: colW * nCols, textAlign: "center", borderRightWidth: 0 },
              ]}
            >
              ASSESSMENTS
            </Text>
          </View>

          {/* Header row 2 — assessment sub-columns */}
          <View style={styles.row}>
            <Text style={[styles.thCenter, { width: SNO_W }]} />
            <Text style={[styles.thCenter, { width: NAME_W }]} />
            <Text style={[styles.thCenter, { width: SEX_W }]} />
            {data.columns.map((col, i) => (
              <Text
                key={i}
                style={[
                  styles.thCenter,
                  {
                    width: colW,
                    borderRightWidth: i === data.columns.length - 1 ? 0 : 0.5,
                  },
                ]}
              >
                {col.label}
              </Text>
            ))}
          </View>

          {/* Student rows — sorted best-first, names as SURNAME M. FIRSTNAME */}
          {sortedStudents.map((student, idx) => (
            <View key={student.id} style={[styles.row, idx % 2 === 1 ? styles.evenRow : {}]}>
              <Text style={[styles.tdCenter, { width: SNO_W }]}>{idx + 1}</Text>
              <Text style={[styles.td, { width: NAME_W }]}>{fmtName(student.name)}</Text>
              <Text style={[styles.tdCenter, { width: SEX_W }]}>{sexLabel(student.gender)}</Text>
              {data.assessmentIds.map((aid, i) => (
                <Text
                  key={aid}
                  style={[
                    styles.tdCenter,
                    { width: colW, borderRightWidth: i === data.columns.length - 1 ? 0 : 0.5 },
                  ]}
                >
                  {data.resultsMap[student.id]?.[aid] !== null &&
                  data.resultsMap[student.id]?.[aid] !== undefined
                    ? String(data.resultsMap[student.id][aid])
                    : ""}
                </Text>
              ))}
            </View>
          ))}

          {/* Blank filler rows */}
          {Array.from({ length: blankCount }).map((_, i) => (
            <View key={`blank-${i}`} style={styles.row}>
              <Text style={[styles.tdCenter, { width: SNO_W, color: "#bbb" }]}>
                {sortedStudents.length + i + 1}
              </Text>
              <Text style={[styles.td, { width: NAME_W }]} />
              <Text style={[styles.tdCenter, { width: SEX_W }]} />
              {data.columns.map((_, ci) => (
                <Text
                  key={ci}
                  style={[
                    styles.tdCenter,
                    { width: colW, borderRightWidth: ci === data.columns.length - 1 ? 0 : 0.5 },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );

  const blob = await pdf(<Doc />).toBlob();
  const fileName = `mark-schedule-${data.className.replace(/\s+/g, "-")}-${data.subjectName.replace(/\s+/g, "-")}.pdf`;
  saveAs(blob, fileName);
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function MarkScheduleSkeleton() {
  return (
    <div className="space-y-3">
      {/* controls row */}
      <div className="flex items-end justify-between gap-3">
        <Skeleton className="h-8 w-16 rounded-md" />
        <div className="flex items-end gap-3">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-8 w-36 rounded-md" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-8 w-36 rounded-md" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-8 w-40 rounded-md" />
          </div>
        </div>
      </div>
      {/* document */}
      <div className="font-sans text-sm space-y-3">
        <div className="flex flex-col items-center gap-2 py-1">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-3 w-56" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="grid grid-cols-5 gap-x-4 border-b pb-3">
          {["w-20", "w-28", "w-24", "w-16", "w-14"].map((w, i) => (
            <Skeleton key={i} className={`h-3 ${w}`} />
          ))}
        </div>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-muted/70">
              <th className="border border-border px-2 py-2 w-10">
                <Skeleton className="h-3 w-6 mx-auto" />
              </th>
              <th className="border border-border px-2 py-2">
                <Skeleton className="h-3 w-12" />
              </th>
              <th className="border border-border px-2 py-2 w-10">
                <Skeleton className="h-3 w-6 mx-auto" />
              </th>
              <th colSpan={3} className="border border-border px-2 py-2">
                <Skeleton className="h-3 w-24 mx-auto" />
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }).map((_, i) => (
              <tr key={i}>
                <td className="border border-border px-2 py-2">
                  <Skeleton className="h-3 w-5 mx-auto" />
                </td>
                <td className="border border-border px-2 py-2">
                  <Skeleton className="h-3 w-32" />
                </td>
                <td className="border border-border px-2 py-2">
                  <Skeleton className="h-3 w-4 mx-auto" />
                </td>
                {[0, 1, 2].map((j) => (
                  <td key={j} className="border border-border px-2 py-2">
                    <Skeleton className="h-3 w-8 mx-auto" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MarkSchedulePage() {
  const { toast } = useToast();
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; });
  const router = useRouter();

  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [schoolName, setSchoolName] = useState("");
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedTermId, setSelectedTermId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  const [subjectOptions, setSubjectOptions] = useState<{ id: string; name: string }[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [resultsMap, setResultsMap] = useState<ResultsMap>({});

  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  // ── Initial load ─────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, classesRes, allTermsRes, activeTermRes, schoolRes] =
          await Promise.all([
            api.get("/teacher/profile").catch(() => null),
            api.get("/teacher/classes").catch(() => null),
            api.get("/terms?pageSize=50").catch(() => null),
            api.get("/terms/active").catch(() => null),
            fetch("/api/admin/settings/school-info", {
              headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
            })
              .then((r) => r.json())
              .catch(() => null),
          ]);

        if (profileRes?.data) setProfile(profileRes.data);

        if (schoolRes?.settings?.name) setSchoolName(schoolRes.settings.name);
        if (schoolRes?.logoBase64) setLogoBase64(schoolRes.logoBase64);

        const rawData = classesRes?.data;
        const rawArr = Array.isArray(rawData)
          ? rawData
          : rawData?.allClasses ?? rawData?.classes ?? [];
        const cls: ClassOption[] = rawArr.filter((c: any) => c?.id).map((c: any) => ({
          id: c.id,
          name: c.name,
          gradeLevel: c.gradeLevel ?? "",
        }));
        setClasses(cls);

        const rawTerms = allTermsRes?.data ?? allTermsRes ?? [];
        const termList: Term[] = Array.isArray(rawTerms) ? rawTerms : [];
        setTerms(termList);

        const activeTerm = activeTermRes?.data;
        if (activeTerm?.id) {
          setSelectedTermId(activeTerm.id);
        } else if (termList.length > 0) {
          setSelectedTermId(termList[0].id);
        }
      } catch {
        toastRef.current({ title: "Failed to load page data", variant: "destructive" });
      } finally {
        setLoadingMeta(false);
      }
    }
    load();
  }, []);

  // ── Class + term → subject list ───────────────────────────────────────────

  useEffect(() => {
    if (!selectedClassId || !selectedTermId) return;
    setSubjectOptions([]);
    setSelectedSubjectId("");
    setAssessments([]);
    setStudents([]);
    setResultsMap({});

    api
      .get(`/assessments?classId=${selectedClassId}&termId=${selectedTermId}&pageSize=100`)
      .then((res) => {
        const list: Assessment[] = res.data ?? res ?? [];
        const seen = new Map<string, { id: string; name: string }>();
        for (const a of list) {
          if (a?.subject?.id && !seen.has(a.subject.id)) {
            seen.set(a.subject.id, { id: a.subject.id, name: a.subject.name });
          }
        }
        setSubjectOptions([...seen.values()]);
      })
      .catch(() => {});
  }, [selectedClassId, selectedTermId]);

  // ── Subject chosen → full grid ────────────────────────────────────────────

  const loadGrid = useCallback(async () => {
    if (!selectedClassId || !selectedTermId || !selectedSubjectId) return;

    setLoadingGrid(true);
    try {
      const [studentsRes, assessmentsRes] = await Promise.all([
        api.get(`/teacher/classes/${selectedClassId}/students`),
        api.get(
          `/assessments?classId=${selectedClassId}&termId=${selectedTermId}&subjectId=${selectedSubjectId}&pageSize=50`
        ),
      ]);

      const rawStudents = Array.isArray(studentsRes.data)
        ? studentsRes.data
        : studentsRes.data?.students ?? studentsRes.data?.data ?? [];

      const studentList: StudentRow[] = rawStudents.map((s: any) => ({
        id: s.id,
        name: s.name,
        gender: s.gender,
      }));

      const assessmentList: Assessment[] = (assessmentsRes.data ?? assessmentsRes ?? []).filter(
        (a: Assessment) => a.status !== "DRAFT"
      );

      setStudents(studentList);
      setAssessments(assessmentList);

      const resultChunks = await Promise.all(
        assessmentList.map((a: Assessment) =>
          api.get(`/assessments/${a.id}/results`).then((r) => ({
            assessmentId: a.id,
            results: r.data ?? [],
          }))
        )
      );

      const map: ResultsMap = {};
      for (const student of studentList) {
        map[student.id] = {};
        for (const a of assessmentList) map[student.id][a.id] = null;
      }
      for (const chunk of resultChunks) {
        for (const r of chunk.results) {
          const sid = r.student?.id ?? r.studentId;
          if (map[sid]) map[sid][chunk.assessmentId] = r.marksObtained ?? null;
        }
      }

      setResultsMap(map);
    } catch {
      toastRef.current({ title: "Failed to load mark schedule", variant: "destructive" });
    } finally {
      setLoadingGrid(false);
    }
  }, [selectedClassId, selectedTermId, selectedSubjectId]);

  useEffect(() => {
    loadGrid();
  }, [loadGrid]);

  // ── Derived values ────────────────────────────────────────────────────────

  const cats = assessments.filter((a) => a.examType === "CAT");
  const mid = assessments.find((a) => a.examType === "MID");
  const eot = assessments.find((a) => a.examType === "EOT");
  const columns = [...cats, ...(mid ? [mid] : []), ...(eot ? [eot] : [])];

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const selectedSubject = subjectOptions.find((s) => s.id === selectedSubjectId);
  const selectedTerm = terms.find((t) => t.id === selectedTermId);

  const teacherName = profile ? `${profile.firstName} ${profile.lastName}` : "";
  const rawDepartment = profile?.department?.name ?? "";
  const department = rawDepartment.replace(/\s*department\s*$/i, "").trim();
  const displaySchoolName = schoolName || "School";

  const termNum = selectedTerm ? selectedTerm.termType.replace("TERM_", "") : "—";
  const termYear = selectedTerm?.academicYear?.year ?? "—";

  const hasData = students.length > 0 && columns.length > 0;
  const assessmentColspan = Math.max(1, columns.length);

  // ── PDF download ──────────────────────────────────────────────────────────

  const handleDownloadPDF = async () => {
    if (!hasData) return;
    setDownloadingPDF(true);
    try {
      await downloadPDF({
        schoolName: displaySchoolName,
        department,
        teacherName,
        className: selectedClass?.name ?? "—",
        subjectName: selectedSubject?.name ?? "—",
        termNum,
        year: termYear,
        columns: columns.map((a) => ({
          label: colLabel(a, a.examType === "CAT" ? cats.indexOf(a) + 1 : 0),
          totalMarks: a.totalMarks,
        })),
        students,
        resultsMap,
        assessmentIds: columns.map((a) => a.id),
        logoBase64,
      });
    } catch {
      toast({ title: "Failed to generate PDF", variant: "destructive" });
    } finally {
      setDownloadingPDF(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loadingMeta) return <MarkScheduleSkeleton />;

  return (
    <div className="space-y-3">
      {/* ── Controls (hidden when printing) ── */}
      <div className="print:hidden space-y-2">
        {/* Row 1: Back · Download PDF */}
        <div className="flex items-center justify-between gap-2 my-5 mx-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/teacher/assessments")}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>

          {hasData && !loadingGrid && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
            >
              <Download className="h-4 w-4 mr-1.5" />
              {downloadingPDF ? "Generating…" : "Download PDF"}
            </Button>
          )}
        </div>

        {/* Row 2: Filters — equal-width, full row */}
        <div className="flex gap-2 mx-2">
          <div className="flex-1 min-w-0">
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="w-full h-8 text-xs lg:h-9 lg:text-sm">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-0">
            <Select
              value={selectedTermId}
              onValueChange={setSelectedTermId}
              disabled={terms.length === 0}
            >
              <SelectTrigger className="w-full h-8 text-xs lg:h-9 lg:text-sm">
                <SelectValue placeholder="Term" />
              </SelectTrigger>
              <SelectContent>
                {terms.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {termLabel(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-0">
            <Select
              value={selectedSubjectId}
              onValueChange={setSelectedSubjectId}
              disabled={subjectOptions.length === 0}
            >
              <SelectTrigger className="w-full h-8 text-xs lg:h-9 lg:text-sm">
                <SelectValue
                  placeholder={subjectOptions.length === 0 ? "Subject" : "Subject"}
                />
              </SelectTrigger>
              <SelectContent>
                {subjectOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── Mark Schedule Document ── */}
      <div className="mark-schedule font-sans text-sm print:text-[11px]">
        {/* Header */}
        <div className="text-center mb-3 space-y-0.5 text-xs print:text-[11px]">
          {logoBase64 && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoBase64}
              alt="School logo"
              className="h-18 w-18 object-contain mx-auto mb-1"
            />
          )}
          <p className="font-bold uppercase tracking-wide">{displaySchoolName}</p>
          {department && (
            <p className="font-semibold uppercase tracking-wide">Department of {department}</p>
          )}
          <p className="font-bold uppercase tracking-widest">Mark Schedule</p>
        </div>

        {/* Info row — evenly spread across full table width */}
        <div className="grid grid-cols-5 mb-3 text-xs border-b pb-2 gap-x-2 mx-2">
          <span>
            <span className="font-semibold">CLASS: </span>
            {selectedClass?.name ?? "—"}
          </span>
          <span>
            <span className="font-semibold">SUBJECT: </span>
            {selectedSubject?.name ?? "—"}
          </span>
          <span>
            <span className="font-semibold">TEACHER: </span>
            {teacherName || "—"}
          </span>
          <span>
            <span className="font-semibold">TERM: </span>
            {termNum}
          </span>
          <span>
            <span className="font-semibold">YEAR: </span>
            {String(termYear)}
          </span>
        </div>

        {/* Grid */}
        <table className="w-full border-collapse text-xs print:text-[10px]">
          <thead>
            <tr className="bg-muted/70 print:bg-gray-200">
              <th rowSpan={2} className="border border-border px-2 py-1 text-center font-bold w-10">
                S/NO
              </th>
              <th rowSpan={2} className="border border-border px-2 py-1 text-left font-bold">
                NAME
              </th>
              <th rowSpan={2} className="border border-border px-2 py-1 text-center font-bold w-10">
                SEX
              </th>
              <th
                colSpan={assessmentColspan}
                className="border border-border px-2 py-1 text-center font-bold"
              >
                ASSESSMENTS
              </th>
            </tr>
            <tr className="bg-muted/40 print:bg-gray-100">
              {columns.length > 0 ? (
                columns.map((a) => {
                  const catIdx = a.examType === "CAT" ? cats.indexOf(a) + 1 : 0;
                  return (
                    <th
                      key={a.id}
                      className="border border-border px-2 py-1 text-center font-bold min-w-[56px]"
                    >
                      {colLabel(a, catIdx)}
                    </th>
                  );
                })
              ) : (
                <th className="border border-border px-2 py-1" />
              )}
            </tr>
          </thead>
          <tbody>
            {loadingGrid ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={`skel-${i}`} className={i % 2 === 1 ? "bg-muted/20" : ""}>
                  <td className="border border-border px-2 py-2">
                    <Skeleton className="h-3 w-5 mx-auto" />
                  </td>
                  <td className="border border-border px-2 py-2">
                    <Skeleton className="h-3 w-32" />
                  </td>
                  <td className="border border-border px-2 py-2">
                    <Skeleton className="h-3 w-4 mx-auto" />
                  </td>
                  {Array.from({ length: assessmentColspan }).map((_, j) => (
                    <td key={j} className="border border-border px-2 py-2">
                      <Skeleton className="h-3 w-8 mx-auto" />
                    </td>
                  ))}
                </tr>
              ))
            ) : !selectedSubjectId ? (
              <tr>
                <td
                  colSpan={3 + assessmentColspan}
                  className="border border-border py-16 text-center text-muted-foreground text-xs print:hidden"
                >
                  Select a class, term, and subject to load the mark schedule.
                </td>
              </tr>
            ) : hasData ? (
              <>
                {students.map((student, idx) => (
                  <tr
                    key={student.id}
                    className="hover:bg-muted/30 print:hover:bg-transparent even:bg-muted/20 print:even:bg-gray-50"
                  >
                    <td className="border border-border px-2 py-1.5 text-center tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="border border-border px-2 py-1.5 whitespace-nowrap">
                      {student.name}
                    </td>
                    <td className="border border-border px-2 py-1.5 text-center font-medium">
                      {sexLabel(student.gender)}
                    </td>
                    {columns.map((a) => {
                      const marks = resultsMap[student.id]?.[a.id];
                      return (
                        <td
                          key={a.id}
                          className="border border-border px-2 py-1.5 text-center tabular-nums"
                        >
                          {marks !== null && marks !== undefined ? marks : ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {Array.from({ length: Math.max(0, 33 - students.length) }).map((_, i) => (
                  <tr key={`blank-${i}`} className="print:table-row hidden">
                    <td className="border border-border px-2 py-1.5 text-center text-muted-foreground/40">
                      {students.length + i + 1}
                    </td>
                    <td className="border border-border px-2 py-1.5" />
                    <td className="border border-border px-2 py-1.5" />
                    {columns.map((a) => (
                      <td key={a.id} className="border border-border px-2 py-1.5" />
                    ))}
                  </tr>
                ))}
              </>
            ) : (
              <tr>
                <td
                  colSpan={3 + assessmentColspan}
                  className="border border-border py-12 text-center text-muted-foreground text-xs"
                >
                  No published assessments or students found for this selection.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Print styles ── */}
      <style jsx global>{`
        @media print {
          body > * { display: none; }
          .mark-schedule { display: block !important; }
          @page { margin: 1.5cm; size: A4 portrait; }
          table, th, td { border-color: #000 !important; }
        }
      `}</style>
    </div>
  );
}
