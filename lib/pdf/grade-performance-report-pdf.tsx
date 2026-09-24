import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";

// ── Types ────────────────────────────────────────────────────────────────────

export interface GradePerformanceGenderCount {
  male: number;
  female: number;
  total: number;
}

export interface GradePerformanceSubjectRow {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  entered: GradePerformanceGenderCount;
  sat: GradePerformanceGenderCount;
  absent: GradePerformanceGenderCount;
  gradeCounts: Record<number, GradePerformanceGenderCount>;
  pct1to6: GradePerformanceGenderCount;
  pct1to8: GradePerformanceGenderCount;
}

export interface GradePerformanceTeacherRow {
  subjectId: string;
  subjectName: string;
  teacherName: string;
  passRate: number;
  bestGrade: string;
  numberOfBestPupils: number;
  bestPerformingPupils: string;
}

export interface GradePerformanceOverallRow {
  entered: GradePerformanceGenderCount;
  sat: GradePerformanceGenderCount;
  absent: GradePerformanceGenderCount;
  schoolCertificate: GradePerformanceGenderCount;
  gce: GradePerformanceGenderCount;
  fail: GradePerformanceGenderCount;
  passRate: { male: number; female: number; total: number };
}

export interface GradePerformanceReportData {
  gradeName: string;
  termLabel: string;
  academicYearLabel: string;
  subjects: GradePerformanceSubjectRow[];
  teachers: GradePerformanceTeacherRow[];
  overall: GradePerformanceOverallRow;
}

export interface GradePerformancePdfMeta {
  schoolName?: string;
}

const GRADE_BANDS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// ── Styles — mirrors public/template.pdf: same section order, same
// headings/spelling ("OVERALL PERFOMANCE"), same M/F-only grid on page 1
// vs B/G/T on page 2, same shaded "TOTAL QUALITY"/"TOTAL QUANTITY"
// columns. ──

const c = {
  border: "#000000",
  shaded: "#d9d9d9",
  white: "#ffffff",
  dark: "#000000",
};

const s = StyleSheet.create({
  page: { padding: 28, fontSize: 7.5, fontFamily: "Helvetica", color: c.dark, backgroundColor: c.white },

  header: { alignItems: "center", marginBottom: 12 },
  headerLine: { fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "center", textTransform: "uppercase" },

  sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", marginBottom: 4, marginTop: 12 },

  table: { width: "100%", borderTop: `1 solid ${c.border}`, borderLeft: `1 solid ${c.border}` },
  row: { flexDirection: "row", width: "100%" },
  th: { fontSize: 6.5, fontFamily: "Helvetica-Bold", textAlign: "center", padding: 3, borderRight: `1 solid ${c.border}`, borderBottom: `1 solid ${c.border}` },
  thShaded: { fontSize: 6.5, fontFamily: "Helvetica-Bold", textAlign: "center", padding: 3, borderRight: `1 solid ${c.border}`, borderBottom: `1 solid ${c.border}`, backgroundColor: c.shaded },
  td: { fontSize: 7, textAlign: "center", padding: 3, borderRight: `1 solid ${c.border}`, borderBottom: `1 solid ${c.border}` },
  tdShaded: { fontSize: 7, fontFamily: "Helvetica-Bold", textAlign: "center", padding: 3, borderRight: `1 solid ${c.border}`, borderBottom: `1 solid ${c.border}`, backgroundColor: c.shaded },
  tdLeft: { fontSize: 7, fontFamily: "Helvetica-Bold", textAlign: "left", padding: 3, borderRight: `1 solid ${c.border}`, borderBottom: `1 solid ${c.border}` },

  footer: { position: "absolute", bottom: 16, left: 28, right: 28, flexDirection: "row", justifyContent: "space-between", borderTop: `1 solid ${c.border}`, paddingTop: 4 },
  footerText: { fontSize: 7, color: c.dark },
});

// ── Page 1 column widths — fixed percentages, not flexGrow ──────────────────
//
// The previous version sized every cell with flexGrow, which needs Yoga to
// measure and stretch each cell at render time — and Yoga only stretches
// branch Views to match their row siblings' height, never leaf Text nodes.
// SUBJECT and the two shaded TOTAL columns are single-line leaf cells
// sitting beside two-line group headers (a label row + an M/F sub-row); no
// guessed `minHeight` on the leaf reliably closes that gap, because it's
// approximating a height Yoga would otherwise compute on its own from real
// content.
//
// Fixed percentage widths — the same mechanism the subject-analysis PDF's
// table already uses — sidestep the measurement question for WIDTH
// entirely: a cell's width comes only from its declared %, never from
// sibling content. For HEIGHT, the fix is structural rather than numeric:
// every header cell, including the single-column ones, is built from the
// same two-stacked-row shape as a real M/F group (see singleHeaderCell
// below). The bottom border always lives on the second (spacer) row, so it
// lands exactly where the M/F rows' own border lands — by construction,
// not by estimating a number that happens to match it.
const LEAF = 1;
const SUBJECT_UNITS = 2.4;
// Wide enough for "QUANTITY" (the longest label) to fit on one line at the
// header font size; at 1.7 it wrapped and made the cell three lines tall.
const SHADED_UNITS = 2.0;
const GROUP_COUNT = 3 + GRADE_BANDS.length + 2; // ENTERED, SAT, ABSENT, bands 1-9, 1-6%, 1-8%
const TOTAL_UNITS = SUBJECT_UNITS + LEAF * 2 * GROUP_COUNT + SHADED_UNITS * 2;
const pctOf = (units: number) => `${((units / TOTAL_UNITS) * 100).toFixed(4)}%`;

const W_SUBJECT = pctOf(SUBJECT_UNITS);
const W_LEAF = pctOf(LEAF);
const W_GROUP = pctOf(LEAF * 2);
const W_SHADED = pctOf(SHADED_UNITS);

// A header cell with no M/F split (SUBJECT, TOTAL QUAL., TOTAL QUANT.). It's
// always exactly TWO single-line rows — the label is split across them
// explicitly ("TOTAL" / "QUAL.") rather than left to wrap, because a label
// that wraps on its own makes the cell three lines tall against the two of
// every M/F group beside it. Row 1 has its bottom border removed; row 2
// carries the real one, so the pair reads as one seamless spanning box with
// a single straight line under the whole header.
function singleHeaderCell(
  top: string,
  bottom: string,
  width: string,
  opts?: { shaded?: boolean; left?: boolean }
) {
  const base = opts?.shaded ? s.thShaded : s.th;
  const align = opts?.left ? { textAlign: "left" as const } : {};
  return (
    <View style={{ flexDirection: "column", width }}>
      <Text style={[base, { borderBottomWidth: 0 }, align]}>{top}</Text>
      <Text style={[base, align]}>{bottom || " "}</Text>
    </View>
  );
}

function SubjectGrid({ subjects }: { subjects: GradePerformanceSubjectRow[] }) {
  const pairGroup = (label: string) => (
    <View style={{ flexDirection: "column", width: W_GROUP }}>
      <Text style={s.th}>{label}</Text>
      <View style={{ flexDirection: "row" }}>
        <Text style={[s.th, { width: "50%" }]}>M</Text>
        <Text style={[s.th, { width: "50%" }]}>F</Text>
      </View>
    </View>
  );

  return (
    <View style={s.table}>
      <View style={s.row}>
        {singleHeaderCell("SUBJECT", "", W_SUBJECT, { left: true })}
        {pairGroup("ENTERED")}
        {pairGroup("SAT")}
        {pairGroup("ABSENT")}
        {GRADE_BANDS.map((b) => (
          <View key={b} style={{ flexDirection: "column", width: W_GROUP }}>
            <Text style={s.th}>{b}</Text>
            <View style={{ flexDirection: "row" }}>
              <Text style={[s.th, { width: "50%" }]}>M</Text>
              <Text style={[s.th, { width: "50%" }]}>F</Text>
            </View>
          </View>
        ))}
        {pairGroup("1-6%")}
        {pairGroup("1-8%")}
        {singleHeaderCell("TOTAL", "QUALITY", W_SHADED, { shaded: true })}
        {singleHeaderCell("TOTAL", "QUANTITY", W_SHADED, { shaded: true })}
      </View>

      {subjects.map((row) => (
        <View key={row.subjectId} style={s.row}>
          <Text style={[s.tdLeft, { width: W_SUBJECT }]}>{row.subjectCode || row.subjectName}</Text>
          <Text style={[s.td, { width: W_LEAF }]}>{row.entered.male}</Text>
          <Text style={[s.td, { width: W_LEAF }]}>{row.entered.female}</Text>
          <Text style={[s.td, { width: W_LEAF }]}>{row.sat.male}</Text>
          <Text style={[s.td, { width: W_LEAF }]}>{row.sat.female}</Text>
          <Text style={[s.td, { width: W_LEAF }]}>{row.absent.male}</Text>
          <Text style={[s.td, { width: W_LEAF }]}>{row.absent.female}</Text>
          {GRADE_BANDS.map((b) => (
            <React.Fragment key={b}>
              <Text style={[s.td, { width: W_LEAF }]}>{row.gradeCounts[b]?.male || 0}</Text>
              <Text style={[s.td, { width: W_LEAF }]}>{row.gradeCounts[b]?.female || 0}</Text>
            </React.Fragment>
          ))}
          <Text style={[s.td, { width: W_LEAF }]}>{row.pct1to6.male}</Text>
          <Text style={[s.td, { width: W_LEAF }]}>{row.pct1to6.female}</Text>
          <Text style={[s.td, { width: W_LEAF }]}>{row.pct1to8.male}</Text>
          <Text style={[s.td, { width: W_LEAF }]}>{row.pct1to8.female}</Text>
          <Text style={[s.tdShaded, { width: W_SHADED }]}>{row.pct1to6.total}</Text>
          <Text style={[s.tdShaded, { width: W_SHADED }]}>{row.pct1to8.total}</Text>
        </View>
      ))}
    </View>
  );
}

// Teachers table column ratios (SR NO, SUBJECT, TEACHER, PASS %, BEST GRADE,
// NUMBERS OF Ps, BEST PERFORMING PUPILS) — the pupils column is deliberately
// the widest since it holds long slash-joined name lists. Converted to exact
// percentages of their own total so they always sum to 100%.
const TEACHER_UNITS = [0.8, 2.4, 3, 1.2, 1.8, 1.5, 5.3];
const TEACHER_TOTAL = TEACHER_UNITS.reduce((a, b) => a + b, 0);
const [W_SR, W_SUBJ, W_TEACHER, W_PASS, W_BEST, W_PS, W_PUPILS] = TEACHER_UNITS.map(
  (u) => `${((u / TEACHER_TOTAL) * 100).toFixed(4)}%`
);

function TeachersTable({ teachers }: { teachers: GradePerformanceTeacherRow[] }) {
  // A flat single-row header — every cell is a plain leaf Text at the same
  // nesting level, so there's no group/spanning height mismatch possible
  // here to begin with.
  return (
    <View style={s.table}>
      <View style={s.row}>
        <Text style={[s.th, { width: W_SR }]}>SR NO</Text>
        <Text style={[s.th, { width: W_SUBJ, textAlign: "left" }]}>SUBJECT</Text>
        <Text style={[s.th, { width: W_TEACHER, textAlign: "left" }]}>TEACHER</Text>
        <Text style={[s.th, { width: W_PASS }]}>PASS %</Text>
        <Text style={[s.th, { width: W_BEST }]}>BEST GRADE</Text>
        <Text style={[s.th, { width: W_PS }]}>NUMBERS OF Ps</Text>
        <Text style={[s.th, { width: W_PUPILS, textAlign: "left" }]}>BEST PERFORMING PUPILS</Text>
      </View>
      {teachers.map((row, i) => (
        <View key={row.subjectId} style={s.row}>
          <Text style={[s.td, { width: W_SR }]}>{i + 1}</Text>
          <Text style={[s.tdLeft, { width: W_SUBJ }]}>{row.subjectName.toUpperCase()}</Text>
          <Text style={[s.tdLeft, { width: W_TEACHER }]}>{row.teacherName}</Text>
          <Text style={[s.td, { width: W_PASS }]}>{row.passRate}</Text>
          <Text style={[s.td, { width: W_BEST }]}>{row.bestGrade}</Text>
          <Text style={[s.td, { width: W_PS }]}>{row.numberOfBestPupils}</Text>
          <Text style={[s.tdLeft, { width: W_PUPILS }]}>{row.bestPerformingPupils}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Page 2: Overall Performance ─────────────────────────────────────────────

function OverallPerformanceTable({ overall }: { overall: GradePerformanceOverallRow }) {
  const W = "14.2857%"; // 7 equal columns
  const triple = (label: string, d: GradePerformanceGenderCount, bold = false) => (
    <View style={{ flexDirection: "column", width: W }}>
      <Text style={[s.th, { minHeight: 26 }]}>{label}</Text>
      <View style={{ flexDirection: "row" }}>
        <Text style={[s.th, { width: "33.3333%" }]}>B</Text>
        <Text style={[s.th, { width: "33.3333%" }]}>G</Text>
        <Text style={[s.th, { width: "33.3334%" }]}>T</Text>
      </View>
      <View style={{ flexDirection: "row" }}>
        <Text style={[s.td, { width: "33.3333%", fontFamily: bold ? "Helvetica-Bold" : "Helvetica" }]}>{d.male}</Text>
        <Text style={[s.td, { width: "33.3333%", fontFamily: bold ? "Helvetica-Bold" : "Helvetica" }]}>{d.female}</Text>
        <Text style={[s.td, { width: "33.3334%", fontFamily: bold ? "Helvetica-Bold" : "Helvetica" }]}>{d.total}</Text>
      </View>
    </View>
  );

  return (
    <View style={[s.table, s.row]}>
      {triple("ENTERED", overall.entered)}
      {triple("SAT", overall.sat)}
      {triple("ABSENT", overall.absent)}
      {triple("SCHOOL\nCERTIFICATE", overall.schoolCertificate, true)}
      {triple("GCE", overall.gce)}
      {triple("FAIL", overall.fail)}
      {triple("PASS %", { male: overall.passRate.male, female: overall.passRate.female, total: overall.passRate.total }, true)}
    </View>
  );
}

function GradePerformancePdfDocument({
  data,
  meta,
}: {
  data: GradePerformanceReportData;
  meta: GradePerformancePdfMeta;
}) {
  const now = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header}>
          <Text style={s.headerLine}>Ministry of Education</Text>
          {meta.schoolName && <Text style={s.headerLine}>{meta.schoolName}</Text>}
          <Text style={s.headerLine}>
            {data.gradeName}, {data.academicYearLabel} Subject by Gender Analysis
          </Text>
        </View>

        <SubjectGrid subjects={data.subjects} />

        <Text style={s.sectionTitle}>TEACHERS</Text>
        <TeachersTable teachers={data.teachers} />

        <View style={s.footer} fixed>
          <Text style={s.footerText}>{data.gradeName} — Term: {data.termLabel}</Text>
          <Text style={s.footerText}>Generated {now}</Text>
        </View>
      </Page>

      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header}>
          <Text style={s.headerLine}>Ministry of Education</Text>
          {meta.schoolName && <Text style={s.headerLine}>{meta.schoolName}</Text>}
          <Text style={s.headerLine}>Overall Perfomance</Text>
          <Text style={s.headerLine}>
            {data.academicYearLabel} {data.gradeName} Final
          </Text>
        </View>

        <OverallPerformanceTable overall={data.overall} />

        <View style={s.footer} fixed>
          <Text style={s.footerText}>{data.gradeName} — Term: {data.termLabel}</Text>
          <Text style={s.footerText}>Generated {now}</Text>
        </View>
      </Page>
    </Document>
  );
}

// ── Download helper ───────────────────────────────────────────────────────────

export async function downloadGradePerformanceReportPdf(
  data: GradePerformanceReportData,
  meta: GradePerformancePdfMeta
): Promise<void> {
  const doc = <GradePerformancePdfDocument data={data} meta={meta} />;
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.gradeName}_${data.termLabel}_Grade_Report.pdf`.replace(/[\s/\\]/g, "_");
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
