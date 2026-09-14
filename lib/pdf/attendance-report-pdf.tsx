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

export interface AttendanceReportPdfDailyPoint {
  date: string;
  male: number;
  female: number;
  total: number;
  totalPresent: number;
  attendanceRate: number;
}

export interface AttendanceReportPdfClassBreakdown {
  className: string;
  totalStudents: number;
  maleCount: number;
  femaleCount: number;
  totalPresent: number;
  totalAbsent: number;
  attendanceRate: number;
}

export interface AttendanceReportPdfData {
  scopeLabel: string;
  summary: {
    totalStudents: number;
    maleStudents: number;
    femaleStudents: number;
    averageAttendanceRate: number;
  };
  dailyData: AttendanceReportPdfDailyPoint[];
  classBreakdown?: AttendanceReportPdfClassBreakdown[];
}

export interface AttendanceReportPdfMeta {
  startDate: Date;
  endDate: Date;
  schoolName?: string;
  schoolLogoBase64?: string;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const c = {
  primary: "#1e40af",
  primaryLight: "#dbeafe",
  muted: "#6b7280",
  mutedBg: "#f3f4f6",
  border: "#e5e7eb",
  green: "#16a34a",
  yellow: "#ca8a04",
  red: "#dc2626",
  white: "#ffffff",
  dark: "#111827",
};

const s = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: c.dark, backgroundColor: c.white },

  schoolHeader: { alignItems: "center", marginBottom: 10, paddingBottom: 10, borderBottom: `2 solid ${c.primary}` },
  schoolLogo: { width: 52, height: 52, marginBottom: 5 },
  schoolName: { fontSize: 11, fontFamily: "Helvetica-Bold", color: c.dark, marginBottom: 3, textAlign: "center" },
  docTitle: { fontSize: 16, fontFamily: "Helvetica-Bold", color: c.primary, textAlign: "center", marginBottom: 2 },
  docSubtitle: { fontSize: 9, color: c.muted, textAlign: "center" },
  headerMeta: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16, marginTop: 8 },
  metaBadge: { backgroundColor: c.primaryLight, borderRadius: 3, padding: "3 7", color: c.primary, fontSize: 8, fontFamily: "Helvetica-Bold" },
  metaDate: { fontSize: 8, color: c.muted, marginTop: 2 },

  sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: c.primary, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 },

  statsRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  statBox: { flex: 1, border: `1 solid ${c.border}`, borderRadius: 3, padding: 8, alignItems: "center" },
  statBoxLabel: { fontSize: 7, color: c.muted, textTransform: "uppercase", marginBottom: 4, textAlign: "center" },
  statBoxValue: { fontSize: 16, fontFamily: "Helvetica-Bold", color: c.primary },

  tableContainer: { marginBottom: 14 },
  tableHeader: { flexDirection: "row", backgroundColor: c.primary, padding: "4 0" },
  tableRow: { flexDirection: "row", padding: "3 0", borderBottom: `1 solid ${c.border}` },
  tableRowAlt: { flexDirection: "row", padding: "3 0", borderBottom: `1 solid ${c.border}`, backgroundColor: c.mutedBg },
  tableFooterRow: { flexDirection: "row", padding: "4 0", backgroundColor: c.mutedBg, borderTop: `1 solid ${c.border}` },
  th: { fontSize: 8, fontFamily: "Helvetica-Bold", color: c.white, paddingHorizontal: 6 },
  td: { fontSize: 8, paddingHorizontal: 6 },
  tdCenter: { fontSize: 8, paddingHorizontal: 6, textAlign: "center" },
  tdBold: { fontSize: 8, paddingHorizontal: 6, fontFamily: "Helvetica-Bold" },
  tdBoldCenter: { fontSize: 8, paddingHorizontal: 6, fontFamily: "Helvetica-Bold", textAlign: "center" },

  footer: { position: "absolute", bottom: 20, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between", borderTop: `1 solid ${c.border}`, paddingTop: 5 },
  footerText: { fontSize: 7, color: c.muted },
});

function rateColor(rate: number): string {
  if (rate >= 90) return c.green;
  if (rate >= 75) return c.yellow;
  return c.red;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ── PDF Document ──────────────────────────────────────────────────────────────

function AttendanceReportPdfDocument({
  data,
  meta,
}: {
  data: AttendanceReportPdfData;
  meta: AttendanceReportPdfMeta;
}) {
  const dateRangeLabel = `${formatShortDate(meta.startDate.toISOString())} – ${formatShortDate(meta.endDate.toISOString())}`;
  const now = formatDate(new Date());

  const totals = data.classBreakdown?.reduce(
    (acc, row) => ({
      totalStudents: acc.totalStudents + row.totalStudents,
      maleCount: acc.maleCount + row.maleCount,
      femaleCount: acc.femaleCount + row.femaleCount,
      totalPresent: acc.totalPresent + row.totalPresent,
      totalAbsent: acc.totalAbsent + row.totalAbsent,
      rateSum: acc.rateSum + row.attendanceRate,
    }),
    { totalStudents: 0, maleCount: 0, femaleCount: 0, totalPresent: 0, totalAbsent: 0, rateSum: 0 }
  );
  const avgClassRate = totals && data.classBreakdown?.length
    ? (totals.rateSum / data.classBreakdown.length).toFixed(1)
    : "0.0";

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
          <Text style={s.docTitle}>Attendance Report</Text>
          <Text style={s.docSubtitle}>
            {data.scopeLabel}  •  {dateRangeLabel}  •  Attendance Report
          </Text>
        </View>

        <View style={s.headerMeta}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <View style={s.metaBadge}>
              <Text>{dateRangeLabel}</Text>
            </View>
          </View>
          <Text style={s.metaDate}>Generated: {now}</Text>
        </View>

        {/* ── Summary ── */}
        <Text style={s.sectionTitle}>Summary</Text>
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statBoxLabel}>Total Students</Text>
            <Text style={s.statBoxValue}>{data.summary.totalStudents}</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statBoxLabel}>Male</Text>
            <Text style={s.statBoxValue}>{data.summary.maleStudents}</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statBoxLabel}>Female</Text>
            <Text style={s.statBoxValue}>{data.summary.femaleStudents}</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statBoxLabel}>Avg Attendance Rate</Text>
            <Text style={[s.statBoxValue, { color: rateColor(data.summary.averageAttendanceRate) }]}>
              {data.summary.averageAttendanceRate}%
            </Text>
          </View>
        </View>

        {/* ── Class Breakdown (grade view only) ── */}
        {data.classBreakdown && data.classBreakdown.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Per-Class Breakdown</Text>
            <View style={s.tableContainer}>
              <View style={s.tableHeader}>
                <Text style={[s.th, { width: "22%" }]}>Class</Text>
                <Text style={[s.th, { width: "13%", textAlign: "center" }]}>Total</Text>
                <Text style={[s.th, { width: "13%", textAlign: "center" }]}>Male</Text>
                <Text style={[s.th, { width: "13%", textAlign: "center" }]}>Female</Text>
                <Text style={[s.th, { width: "13%", textAlign: "center" }]}>Present</Text>
                <Text style={[s.th, { width: "13%", textAlign: "center" }]}>Absent</Text>
                <Text style={[s.th, { width: "13%", textAlign: "center" }]}>Rate</Text>
              </View>
              {data.classBreakdown.map((row, i) => (
                <View key={row.className} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                  <Text style={[s.tdBold, { width: "22%" }]}>{row.className}</Text>
                  <Text style={[s.tdCenter, { width: "13%" }]}>{row.totalStudents}</Text>
                  <Text style={[s.tdCenter, { width: "13%" }]}>{row.maleCount}</Text>
                  <Text style={[s.tdCenter, { width: "13%" }]}>{row.femaleCount}</Text>
                  <Text style={[s.tdCenter, { width: "13%" }]}>{row.totalPresent}</Text>
                  <Text style={[s.tdCenter, { width: "13%" }]}>{row.totalAbsent}</Text>
                  <Text style={[s.tdBoldCenter, { width: "13%", color: rateColor(row.attendanceRate) }]}>
                    {row.attendanceRate}%
                  </Text>
                </View>
              ))}
              {totals && (
                <View style={s.tableFooterRow}>
                  <Text style={[s.tdBold, { width: "22%" }]}>TOTAL</Text>
                  <Text style={[s.tdBoldCenter, { width: "13%" }]}>{totals.totalStudents}</Text>
                  <Text style={[s.tdBoldCenter, { width: "13%" }]}>{totals.maleCount}</Text>
                  <Text style={[s.tdBoldCenter, { width: "13%" }]}>{totals.femaleCount}</Text>
                  <Text style={[s.tdBoldCenter, { width: "13%" }]}>{totals.totalPresent}</Text>
                  <Text style={[s.tdBoldCenter, { width: "13%" }]}>{totals.totalAbsent}</Text>
                  <Text style={[s.tdBoldCenter, { width: "13%" }]}>{avgClassRate}%</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* ── Daily Trend ── */}
        <Text style={s.sectionTitle}>Daily Attendance Trend</Text>
        <View style={s.tableContainer}>
          <View style={s.tableHeader}>
            <Text style={[s.th, { width: "26%" }]}>Date</Text>
            <Text style={[s.th, { width: "17%", textAlign: "center" }]}>Male</Text>
            <Text style={[s.th, { width: "17%", textAlign: "center" }]}>Female</Text>
            <Text style={[s.th, { width: "15%", textAlign: "center" }]}>Total</Text>
            <Text style={[s.th, { width: "15%", textAlign: "center" }]}>Present</Text>
            <Text style={[s.th, { width: "10%", textAlign: "center" }]}>Rate</Text>
          </View>
          {data.dailyData.map((row, i) => (
            <View key={row.date} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <Text style={[s.td, { width: "26%" }]}>{formatShortDate(row.date)}</Text>
              <Text style={[s.tdCenter, { width: "17%" }]}>{row.male}</Text>
              <Text style={[s.tdCenter, { width: "17%" }]}>{row.female}</Text>
              <Text style={[s.tdCenter, { width: "15%" }]}>{row.total}</Text>
              <Text style={[s.tdCenter, { width: "15%" }]}>{row.totalPresent}</Text>
              <Text style={[s.tdBoldCenter, { width: "10%", color: rateColor(row.attendanceRate) }]}>
                {row.attendanceRate}%
              </Text>
            </View>
          ))}
        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {data.scopeLabel} — Attendance Report — {dateRangeLabel}
          </Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}  •  Generated ${now}`}
          />
        </View>
      </Page>
    </Document>
  );
}

// ── Download helper (trend report) ─────────────────────────────────────────────

export async function downloadAttendanceReportPdf(
  data: AttendanceReportPdfData,
  meta: AttendanceReportPdfMeta
): Promise<void> {
  const doc = <AttendanceReportPdfDocument data={data} meta={meta} />;
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.scopeLabel}_Attendance_Report.pdf`.replace(/[\s/\\]/g, "_");
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Daily report ────────────────────────────────────────────────────────────────

export interface DailyAttendanceReportPdfClassRow {
  className: string;
  gradeName?: string;
  totalStudents: number;
  maleCount: number;
  femaleCount: number;
  totalPresent: number;
  totalAbsent: number;
  attendanceRate: number;
}

export interface DailyAttendanceReportPdfData {
  scopeLabel: string;
  date: Date;
  classRows: DailyAttendanceReportPdfClassRow[];
  showGradeColumn?: boolean;
}

export interface DailyAttendanceReportPdfMeta {
  schoolName?: string;
  schoolLogoBase64?: string;
}

function DailyAttendanceReportPdfDocument({
  data,
  meta,
}: {
  data: DailyAttendanceReportPdfData;
  meta: DailyAttendanceReportPdfMeta;
}) {
  const dateLabel = formatDate(data.date);
  const now = formatDate(new Date());

  const totals = data.classRows.reduce(
    (acc, row) => ({
      totalStudents: acc.totalStudents + row.totalStudents,
      maleCount: acc.maleCount + row.maleCount,
      femaleCount: acc.femaleCount + row.femaleCount,
      totalPresent: acc.totalPresent + row.totalPresent,
      totalAbsent: acc.totalAbsent + row.totalAbsent,
    }),
    { totalStudents: 0, maleCount: 0, femaleCount: 0, totalPresent: 0, totalAbsent: 0 }
  );
  const totalRecords = totals.totalPresent + totals.totalAbsent;
  const overallRate = totalRecords > 0 ? Math.round((totals.totalPresent / totalRecords) * 1000) / 10 : 0;

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
          <Text style={s.docTitle}>Daily Attendance Report</Text>
          <Text style={s.docSubtitle}>
            {data.scopeLabel}  •  {dateLabel}  •  Daily Attendance Report
          </Text>
        </View>

        <View style={s.headerMeta}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <View style={s.metaBadge}>
              <Text>{dateLabel}</Text>
            </View>
          </View>
          <Text style={s.metaDate}>Generated: {now}</Text>
        </View>

        {/* ── Summary ── */}
        <Text style={s.sectionTitle}>Summary</Text>
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statBoxLabel}>Total Students</Text>
            <Text style={s.statBoxValue}>{totals.totalStudents}</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statBoxLabel}>Present</Text>
            <Text style={[s.statBoxValue, { color: c.green }]}>{totals.totalPresent}</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statBoxLabel}>Absent</Text>
            <Text style={[s.statBoxValue, { color: c.red }]}>{totals.totalAbsent}</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statBoxLabel}>Attendance Rate</Text>
            <Text style={[s.statBoxValue, { color: rateColor(overallRate) }]}>{overallRate}%</Text>
          </View>
        </View>

        {/* ── Per-Class Breakdown ── */}
        <Text style={s.sectionTitle}>Per-Class Breakdown</Text>
        <View style={s.tableContainer}>
          <View style={s.tableHeader}>
            {data.showGradeColumn && (
              <Text style={[s.th, { width: "14%" }]}>Grade</Text>
            )}
            <Text style={[s.th, { width: data.showGradeColumn ? "18%" : "22%" }]}>Class</Text>
            <Text style={[s.th, { width: "11%", textAlign: "center" }]}>Total</Text>
            <Text style={[s.th, { width: "11%", textAlign: "center" }]}>Male</Text>
            <Text style={[s.th, { width: "11%", textAlign: "center" }]}>Female</Text>
            <Text style={[s.th, { width: "12%", textAlign: "center" }]}>Present</Text>
            <Text style={[s.th, { width: "11%", textAlign: "center" }]}>Absent</Text>
            <Text style={[s.th, { width: "12%", textAlign: "center" }]}>Rate</Text>
          </View>
          {data.classRows.map((row, i) => (
            <View key={`${row.gradeName ?? ""}-${row.className}`} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              {data.showGradeColumn && (
                <Text style={[s.td, { width: "14%" }]}>{row.gradeName}</Text>
              )}
              <Text style={[s.tdBold, { width: data.showGradeColumn ? "18%" : "22%" }]}>{row.className}</Text>
              <Text style={[s.tdCenter, { width: "11%" }]}>{row.totalStudents}</Text>
              <Text style={[s.tdCenter, { width: "11%" }]}>{row.maleCount}</Text>
              <Text style={[s.tdCenter, { width: "11%" }]}>{row.femaleCount}</Text>
              <Text style={[s.tdCenter, { width: "12%" }]}>{row.totalPresent}</Text>
              <Text style={[s.tdCenter, { width: "11%" }]}>{row.totalAbsent}</Text>
              <Text style={[s.tdBoldCenter, { width: "12%", color: rateColor(row.attendanceRate) }]}>
                {row.attendanceRate}%
              </Text>
            </View>
          ))}
          <View style={s.tableFooterRow}>
            {data.showGradeColumn && <Text style={[s.tdBold, { width: "14%" }]} />}
            <Text style={[s.tdBold, { width: data.showGradeColumn ? "18%" : "22%" }]}>TOTAL</Text>
            <Text style={[s.tdBoldCenter, { width: "11%" }]}>{totals.totalStudents}</Text>
            <Text style={[s.tdBoldCenter, { width: "11%" }]}>{totals.maleCount}</Text>
            <Text style={[s.tdBoldCenter, { width: "11%" }]}>{totals.femaleCount}</Text>
            <Text style={[s.tdBoldCenter, { width: "12%" }]}>{totals.totalPresent}</Text>
            <Text style={[s.tdBoldCenter, { width: "11%" }]}>{totals.totalAbsent}</Text>
            <Text style={[s.tdBoldCenter, { width: "12%" }]}>{overallRate}%</Text>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {data.scopeLabel} — Daily Attendance Report — {dateLabel}
          </Text>
          <Text style={s.footerText}>Generated {now}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function downloadDailyAttendanceReportPdf(
  data: DailyAttendanceReportPdfData,
  meta: DailyAttendanceReportPdfMeta
): Promise<void> {
  const doc = <DailyAttendanceReportPdfDocument data={data} meta={meta} />;
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const dateStr = data.date.toISOString().split("T")[0];
  a.download = `${data.scopeLabel}_Daily_Attendance_${dateStr}.pdf`.replace(/[\s/\\]/g, "_");
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
