import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";

// ── Types ────────────────────────────────────────────────────────────────────

export interface SubjectAnalysisPdfData {
  gradeLevel: "PRIMARY" | "JUNIOR" | "SENIOR";
  gradeName?: string;
  subjectName: string;
  totalStudents: { male: number; female: number; total: number };
  recordedEntries: { male: number; female: number; total: number };
  absentStudents: { male: number; female: number; total: number };
  gradeDistribution: Array<{
    grade: string;
    range: string;
    male: number;
    female: number;
    total: number;
    percentage: number;
  }>;
  quantityPass: { passed: number; total: number; rate: number };
  qualityPass: { qualityPasses: number; totalPassed: number; rate: number };
}

export interface SubjectAnalysisPdfMeta {
  classOrGrade: string;
  assessmentType: string;
  gradeLevelDescription?: string;
  schoolName?: string;
  schoolLogoBase64?: string;
  streamBreakdown?: Array<{
    className: string;
    enrolled: number;
    sat: number;
    absent: number;
    passRate: number;
    qualityRate: number;
  }>;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const c = {
  primary: "#1e40af",
  primaryLight: "#dbeafe",
  muted: "#6b7280",
  mutedBg: "#f3f4f6",
  border: "#e5e7eb",
  green: "#16a34a",
  blue: "#2563eb",
  white: "#ffffff",
  dark: "#111827",
};

const s = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: c.dark, backgroundColor: c.white },

  // School header
  schoolHeader: { alignItems: "center", marginBottom: 10, paddingBottom: 10, borderBottom: `2 solid ${c.primary}` },
  schoolLogo: { width: 52, height: 52, marginBottom: 5 },
  schoolName: { fontSize: 11, fontFamily: "Helvetica-Bold", color: c.dark, marginBottom: 3, textAlign: "center" },
  docTitle: { fontSize: 16, fontFamily: "Helvetica-Bold", color: c.primary, textAlign: "center", marginBottom: 2 },
  docSubtitle: { fontSize: 9, color: c.muted, textAlign: "center" },
  headerMeta: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16, marginTop: 8 },
  metaBadge: { backgroundColor: c.primaryLight, borderRadius: 3, padding: "3 7", color: c.primary, fontSize: 8, fontFamily: "Helvetica-Bold" },
  metaDate: { fontSize: 8, color: c.muted, marginTop: 2 },

  // Section
  sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: c.primary, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 },

  // Stats row
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  statBox: { flex: 1, border: `1 solid ${c.border}`, borderRadius: 3, padding: 8 },
  statBoxTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: c.muted, marginBottom: 5, textTransform: "uppercase" },
  statLine: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  statLabel: { fontSize: 8, color: c.muted },
  statValue: { fontSize: 8, fontFamily: "Helvetica-Bold" },
  statDivider: { borderTop: `1 solid ${c.border}`, marginTop: 3, paddingTop: 3 },

  // Table
  tableContainer: { marginBottom: 14 },
  tableHeader: { flexDirection: "row", backgroundColor: c.primary, padding: "4 0" },
  tableRow: { flexDirection: "row", padding: "3 0", borderBottom: `1 solid ${c.border}` },
  tableRowAlt: { flexDirection: "row", padding: "3 0", borderBottom: `1 solid ${c.border}`, backgroundColor: c.mutedBg },
  th: { fontSize: 8, fontFamily: "Helvetica-Bold", color: c.white, paddingHorizontal: 6 },
  td: { fontSize: 8, paddingHorizontal: 6 },
  tdCenter: { fontSize: 8, paddingHorizontal: 6, textAlign: "center" },
  tdBold: { fontSize: 8, paddingHorizontal: 6, fontFamily: "Helvetica-Bold" },

  // Pass analysis
  passRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  passBox: { flex: 1, border: `1 solid ${c.border}`, borderRadius: 3, padding: 8 },
  passBoxTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  passLine: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  passLabel: { fontSize: 8, color: c.muted },
  passValue: { fontSize: 11, fontFamily: "Helvetica-Bold", color: c.primary },
  passFormula: { fontSize: 7, color: c.muted, backgroundColor: c.mutedBg, padding: "3 5", borderRadius: 2, marginTop: 5 },

  // Footer
  footer: { position: "absolute", bottom: 20, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between", borderTop: `1 solid ${c.border}`, paddingTop: 5 },
  footerText: { fontSize: 7, color: c.muted },
});

// ── PDF Document ──────────────────────────────────────────────────────────────

function SubjectAnalysisPdfDocument({
  data,
  meta,
}: {
  data: SubjectAnalysisPdfData;
  meta: SubjectAnalysisPdfMeta;
}) {
  const assessmentLabel =
    meta.assessmentType === "CAT" || meta.assessmentType === "CAT1"
      ? "CAT"
      : meta.assessmentType === "MID"
      ? "Mid-Term"
      : "End of Term";

  const qualityLabel =
    data.gradeLevel === "JUNIOR" ? "Distinction 1" : "Distinction 1 & 2";

  const now = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ── School Header ── */}
        <View style={s.schoolHeader}>
          {meta.schoolLogoBase64 && (
            <Image style={s.schoolLogo} src={meta.schoolLogoBase64} />
          )}
          {meta.schoolName && (
            <Text style={s.schoolName}>{meta.schoolName}</Text>
          )}
          <Text style={s.docTitle}>{data.subjectName} Analysis</Text>
          <Text style={s.docSubtitle}>
            {meta.classOrGrade}  •  {assessmentLabel}  •  Subject Analysis
          </Text>
        </View>

        <View style={s.headerMeta}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <View style={s.metaBadge}>
              <Text>{assessmentLabel}</Text>
            </View>
            {meta.gradeLevelDescription && (
              <View style={s.metaBadge}>
                <Text>{meta.gradeLevelDescription}</Text>
              </View>
            )}
          </View>
          <Text style={s.metaDate}>Generated: {now}</Text>
        </View>

        {/* ── Student Summary ── */}
        <Text style={s.sectionTitle}>Student Summary</Text>
        <View style={s.statsRow}>
          {(
            [
              { title: "Total Enrolled", d: data.totalStudents },
              { title: "Sat for Exam", d: data.recordedEntries },
              { title: "Absent", d: data.absentStudents },
            ] as const
          ).map(({ title, d }) => (
            <View key={title} style={s.statBox}>
              <Text style={s.statBoxTitle}>{title}</Text>
              <View style={s.statLine}>
                <Text style={s.statLabel}>Male</Text>
                <Text style={s.statValue}>{d.male}</Text>
              </View>
              <View style={s.statLine}>
                <Text style={s.statLabel}>Female</Text>
                <Text style={s.statValue}>{d.female}</Text>
              </View>
              <View style={[s.statLine, s.statDivider]}>
                <Text style={[s.statLabel, { fontFamily: "Helvetica-Bold" }]}>Total</Text>
                <Text style={s.statValue}>{d.total}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Grade Distribution ── */}
        <Text style={s.sectionTitle}>Grade Distribution</Text>
        <View style={s.tableContainer}>
          <View style={s.tableHeader}>
            <Text style={[s.th, { width: "15%" }]}>Grade</Text>
            <Text style={[s.th, { width: "35%" }]}>Range</Text>
            <Text style={[s.th, { width: "12%", textAlign: "center" }]}>Male</Text>
            <Text style={[s.th, { width: "13%", textAlign: "center" }]}>Female</Text>
            <Text style={[s.th, { width: "13%", textAlign: "center" }]}>Total</Text>
            <Text style={[s.th, { width: "12%", textAlign: "center" }]}>%</Text>
          </View>
          {data.gradeDistribution.map((row, i) => (
            <View key={row.grade} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <Text style={[s.tdBold, { width: "15%" }]}>{row.grade}</Text>
              <Text style={[s.td, { width: "35%" }]}>{row.range}</Text>
              <Text style={[s.tdCenter, { width: "12%" }]}>{row.male}</Text>
              <Text style={[s.tdCenter, { width: "13%" }]}>{row.female}</Text>
              <Text style={[s.tdBold, { width: "13%", textAlign: "center" }]}>{row.total}</Text>
              <Text style={[s.tdCenter, { width: "12%" }]}>{row.percentage}%</Text>
            </View>
          ))}
        </View>

        {/* ── Pass Analysis ── */}
        <Text style={s.sectionTitle}>Pass Analysis</Text>
        <View style={s.passRow}>
          <View style={s.passBox}>
            <Text style={s.passBoxTitle}>Quantity Pass</Text>
            <View style={s.passLine}>
              <Text style={s.passLabel}>Students Passed</Text>
              <Text style={s.passValue}>
                {data.quantityPass.passed}/{data.quantityPass.total}
              </Text>
            </View>
            <View style={s.passLine}>
              <Text style={s.passLabel}>Pass Rate</Text>
              <Text style={[s.passValue, { color: c.green }]}>
                {data.quantityPass.rate}%
              </Text>
            </View>
            <Text style={s.passFormula}>
              Formula: (Students passed / Students who sat) x 100
            </Text>
          </View>

          <View style={s.passBox}>
            <Text style={s.passBoxTitle}>Quality Pass</Text>
            <View style={s.passLine}>
              <Text style={s.passLabel}>{qualityLabel}</Text>
              <Text style={s.passValue}>
                {data.qualityPass.qualityPasses}/{data.qualityPass.totalPassed}
              </Text>
            </View>
            <View style={s.passLine}>
              <Text style={s.passLabel}>Quality Rate</Text>
              <Text style={[s.passValue, { color: c.blue }]}>
                {data.qualityPass.rate}%
              </Text>
            </View>
            <Text style={s.passFormula}>
              Formula: ({qualityLabel} / Students passed) x 100
            </Text>
          </View>
        </View>

        {/* ── Stream Breakdown (admin only) ── */}
        {meta.streamBreakdown && meta.streamBreakdown.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Stream Breakdown</Text>
            <View style={s.tableContainer}>
              <View style={s.tableHeader}>
                <Text style={[s.th, { width: "22%" }]}>Class</Text>
                <Text style={[s.th, { width: "13%", textAlign: "center" }]}>Enrolled</Text>
                <Text style={[s.th, { width: "13%", textAlign: "center" }]}>Sat</Text>
                <Text style={[s.th, { width: "13%", textAlign: "center" }]}>Absent</Text>
                <Text style={[s.th, { width: "19%", textAlign: "center" }]}>Pass Rate</Text>
                <Text style={[s.th, { width: "20%", textAlign: "center" }]}>Quality Rate</Text>
              </View>
              {meta.streamBreakdown.map((row, i) => (
                <View key={row.className} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                  <Text style={[s.tdBold, { width: "22%" }]}>{row.className}</Text>
                  <Text style={[s.tdCenter, { width: "13%" }]}>{row.enrolled}</Text>
                  <Text style={[s.tdCenter, { width: "13%" }]}>{row.sat}</Text>
                  <Text style={[s.tdCenter, { width: "13%" }]}>{row.absent}</Text>
                  <Text style={[s.tdCenter, { width: "19%" }]}>{row.passRate}%</Text>
                  <Text style={[s.tdCenter, { width: "20%" }]}>{row.qualityRate}%</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {data.subjectName} — {meta.classOrGrade} — {assessmentLabel}
          </Text>
          <Text style={s.footerText}>Generated {now}</Text>
        </View>
      </Page>
    </Document>
  );
}

// ── Download helper ───────────────────────────────────────────────────────────

export async function downloadSubjectAnalysisPdf(
  data: SubjectAnalysisPdfData,
  meta: SubjectAnalysisPdfMeta
): Promise<void> {
  const doc = (
    <SubjectAnalysisPdfDocument data={data} meta={meta} />
  );
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const assessmentLabel =
    meta.assessmentType === "CAT" || meta.assessmentType === "CAT1"
      ? "CAT"
      : meta.assessmentType === "MID"
      ? "MidTerm"
      : "EOT";
  a.download = `${data.subjectName}_${meta.classOrGrade}_${assessmentLabel}_Analysis.pdf`
    .replace(/[\s/\\]/g, "_");
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
