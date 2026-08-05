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

// ── Types ─────────────────────────────────────────────────────────────────────

interface SessionPdf {
  key: string;
  date: number;
  suffix: string;
  month: string;
  records: Record<string, string>; // studentId → "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"
}

interface WeekGroupPdf {
  label: string;
  sessions: SessionPdf[];
}

export interface SessionRegisterPdfData {
  termLabel:   string;
  className:   string;
  subjectName: string;
  students:    Array<{ id: string; name: string; gender: "M" | "F" }>;
  weeks:       WeekGroupPdf[];
}

export interface SessionRegisterPdfMeta {
  schoolName?:        string;
  schoolLogoBase64?:  string;
}

// ── Layout constants (landscape A4) ──────────────────────────────────────────

const MARGIN     = 28;
const PAGE_W     = 841.89;  // A4 landscape width in points
const USABLE_W   = PAGE_W - MARGIN * 2;   // ≈ 785.89 pt

const NAME_W     = 130;
const GENDER_W   = 14;
const ATT_W      = 38;
const SESSION_SPACE = USABLE_W - NAME_W - GENDER_W - ATT_W; // ≈ 604 pt

const MAX_SESSIONS_PER_PAGE = 28; // keep columns readable

// ── Colour palette ────────────────────────────────────────────────────────────

const C = {
  primary:      "#1e40af",
  primaryLight: "#dbeafe",
  muted:        "#6b7280",
  mutedBg:      "#f3f4f6",
  border:       "#d1d5db",
  darkBorder:   "#9ca3af",
  dark:         "#111827",
  white:        "#ffffff",
  // status backgrounds (light)
  greenBg:   "#dcfce7", greenFg:   "#166534",
  redBg:     "#fee2e2", redFg:     "#991b1b",
  amberBg:   "#fef3c7", amberFg:   "#92400e",
  blueBg:    "#dbeafe", blueFg:    "#1e40af",
  // alternating week column tints
  weekTintA: "#f8fafc",
  weekTintB: "#f0f4ff",
};

const STATUS_BG: Record<string, string> = {
  PRESENT: C.greenBg,
  ABSENT:  C.redBg,
  LATE:    C.amberBg,
  EXCUSED: C.blueBg,
};
const STATUS_FG: Record<string, string> = {
  PRESENT: C.greenFg,
  ABSENT:  C.redFg,
  LATE:    C.amberFg,
  EXCUSED: C.blueFg,
};
const STATUS_LABEL: Record<string, string> = {
  PRESENT: "P",
  ABSENT:  "A",
  LATE:    "L",
  EXCUSED: "Ex",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Split the weeks array into chunks so each chunk's total sessions ≤ MAX_SESSIONS_PER_PAGE */
function chunkWeeks(weeks: WeekGroupPdf[]): WeekGroupPdf[][] {
  const chunks: WeekGroupPdf[][] = [];
  let current: WeekGroupPdf[] = [];
  let count = 0;

  for (const week of weeks) {
    if (count + week.sessions.length > MAX_SESSIONS_PER_PAGE && current.length > 0) {
      chunks.push(current);
      current = [];
      count = 0;
    }
    current.push(week);
    count += week.sessions.length;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

function sessionsInChunk(chunk: WeekGroupPdf[]): number {
  return chunk.reduce((n, w) => n + w.sessions.length, 0);
}

function sessionColW(chunk: WeekGroupPdf[]): number {
  const n = sessionsInChunk(chunk);
  return n > 0 ? Math.min(SESSION_SPACE / n, SESSION_SPACE / 8) : 22;
}

function studentSummary(studentId: string, allWeeks: WeekGroupPdf[]) {
  let present = 0, absent = 0, late = 0, excused = 0, recorded = 0;
  for (const week of allWeeks) {
    for (const s of week.sessions) {
      const st = s.records[studentId];
      if (!st) continue;
      recorded++;
      if (st === "PRESENT")  present++;
      else if (st === "ABSENT")  absent++;
      else if (st === "LATE")    late++;
      else if (st === "EXCUSED") excused++;
    }
  }
  const pct = recorded > 0 ? Math.round((present / recorded) * 100) : null;
  return { present, absent, late, excused, recorded, pct };
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    padding: MARGIN,
    paddingBottom: MARGIN + 18, // space for fixed footer
    fontSize: 8,
    fontFamily: "Helvetica",
    color: C.dark,
    backgroundColor: C.white,
  },

  // ── School header ─────────────────────────────────────────────────────────
  schoolHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 8,
    borderBottom: `2 solid ${C.primary}`,
  },
  logo: { width: 44, height: 44, marginRight: 10 },
  headerCenter: { flex: 1, alignItems: "center" },
  schoolName:   { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.dark, marginBottom: 1, textAlign: "center" },
  docTitle:     { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.primary, textAlign: "center", marginBottom: 1 },
  docSubtitle:  { fontSize: 8,  color: C.muted, textAlign: "center" },
  headerRight:  { alignItems: "flex-end", minWidth: 120 },
  badge:        { backgroundColor: C.primaryLight, borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2, color: C.primary, fontSize: 7, fontFamily: "Helvetica-Bold", marginBottom: 2, textAlign: "right" },
  metaDate:     { fontSize: 7, color: C.muted, textAlign: "right" },

  // ── Legend row ────────────────────────────────────────────────────────────
  legendRow: { flexDirection: "row", gap: 10, marginBottom: 7, alignItems: "center" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  legendDot:  { width: 9, height: 9, borderRadius: 2 },
  legendText: { fontSize: 6.5, color: C.muted },
  legendNote: { fontSize: 6.5, color: C.muted, marginLeft: "auto" },

  // ── Week group row (row 1 of header) ──────────────────────────────────────
  weekGroupRow: { flexDirection: "row" },
  nameGenderSpacer: { width: NAME_W + GENDER_W },
  weekCell:    { borderRight: `1 solid ${C.border}`, alignItems: "center", justifyContent: "center", paddingVertical: 2 },
  weekCellText: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: C.primary, textTransform: "uppercase", letterSpacing: 0.5 },
  attSpacer:   { width: ATT_W },

  // ── Date sub-header row (row 2 of header) ────────────────────────────────
  dateHeaderRow: { flexDirection: "row", backgroundColor: C.primary },
  thName:   { width: NAME_W,   fontSize: 7, fontFamily: "Helvetica-Bold", color: C.white, paddingLeft: 5,  paddingVertical: 3 },
  thGender: { width: GENDER_W, fontSize: 7, fontFamily: "Helvetica-Bold", color: C.white, textAlign: "center", paddingVertical: 3 },
  thAtt:    { width: ATT_W,    fontSize: 7, fontFamily: "Helvetica-Bold", color: C.white, textAlign: "center", paddingVertical: 3 },

  // ── Student rows ─────────────────────────────────────────────────────────
  row:    { flexDirection: "row", borderBottom: `1 solid ${C.border}`, minHeight: 14 },
  rowAlt: { flexDirection: "row", borderBottom: `1 solid ${C.border}`, minHeight: 14, backgroundColor: C.mutedBg },

  tdName: { width: NAME_W, fontSize: 7, paddingLeft: 5, paddingVertical: 2.5, justifyContent: "center" },
  tdGender: { width: GENDER_W, fontSize: 6.5, textAlign: "center", paddingVertical: 2.5, justifyContent: "center" },
  tdAtt:  { width: ATT_W, fontSize: 7, textAlign: "center", paddingVertical: 2.5, justifyContent: "center", fontFamily: "Helvetica-Bold" },

  // ── Table wrapper ─────────────────────────────────────────────────────────
  tableWrap: { flexGrow: 1 },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 14,
    left: MARGIN,
    right: MARGIN,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: `1 solid ${C.border}`,
    paddingTop: 4,
  },
  footerText: { fontSize: 6.5, color: C.muted },
});

// ── Sub-components ────────────────────────────────────────────────────────────

function SchoolHeader({
  meta,
  data,
  pageLabel,
  generatedOn,
}: {
  meta: SessionRegisterPdfMeta;
  data: SessionRegisterPdfData;
  pageLabel: string;
  generatedOn: string;
}) {
  return (
    <View style={s.schoolHeader}>
      {/* Left — logo */}
      {meta.schoolLogoBase64 && (
        <Image style={s.logo} src={meta.schoolLogoBase64} />
      )}

      {/* Centre — school name + doc title */}
      <View style={s.headerCenter}>
        {meta.schoolName && <Text style={s.schoolName}>{meta.schoolName}</Text>}
        <Text style={s.docTitle}>Session Attendance Record</Text>
        <Text style={s.docSubtitle}>
          {data.subjectName}  •  {data.className}  •  {data.termLabel}
        </Text>
      </View>

      {/* Right — meta badges */}
      <View style={s.headerRight}>
        <Text style={s.badge}>{data.termLabel}</Text>
        <Text style={s.badge}>{pageLabel}</Text>
        <Text style={s.metaDate}>Generated: {generatedOn}</Text>
      </View>
    </View>
  );
}

function LegendRow() {
  return (
    <View style={s.legendRow}>
      {(
        [
          { label: "P — Present",  bg: C.greenBg  },
          { label: "A — Absent",   bg: C.redBg    },
          { label: "L — Late",     bg: C.amberBg  },
          { label: "Ex — Excused", bg: C.blueBg   },
        ] as const
      ).map((item) => (
        <View key={item.label} style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: item.bg }]} />
          <Text style={s.legendText}>{item.label}</Text>
        </View>
      ))}
      <Text style={s.legendNote}>· = not yet recorded</Text>
    </View>
  );
}

/** Two-row table header for a given week chunk */
function TableHeader({ chunk, colW }: { chunk: WeekGroupPdf[]; colW: number }) {
  return (
    <>
      {/* Row 1 — week group labels */}
      <View style={s.weekGroupRow}>
        <View style={s.nameGenderSpacer} />
        {chunk.map((week, wi) => {
          const weekW = week.sessions.length * colW;
          const tint  = wi % 2 === 0 ? C.weekTintA : C.weekTintB;
          return (
            <View
              key={week.label}
              style={[
                s.weekCell,
                {
                  width: weekW,
                  backgroundColor: tint,
                  borderRight: wi < chunk.length - 1 ? `1 solid ${C.darkBorder}` : "none",
                },
              ]}
            >
              <Text style={s.weekCellText}>{week.label}</Text>
            </View>
          );
        })}
        <View style={s.attSpacer} />
      </View>

      {/* Row 2 — date sub-headers */}
      <View style={s.dateHeaderRow}>
        <Text style={s.thName}>Student</Text>
        <Text style={s.thGender}>G</Text>
        {chunk.map((week, wi) =>
          week.sessions.map((session, si) => {
            const isLastInWeek = si === week.sessions.length - 1;
            const isLastChunk  = wi === chunk.length - 1;
            return (
              <View
                key={session.key}
                style={{
                  width: colW,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 3,
                  borderRight:
                    isLastInWeek && !isLastChunk
                      ? `1 solid rgba(255,255,255,0.5)`
                      : !isLastInWeek
                      ? `1 solid rgba(255,255,255,0.2)`
                      : "none",
                }}
              >
                <Text
                  style={{
                    fontSize: 7,
                    fontFamily: "Helvetica-Bold",
                    color: C.white,
                    lineHeight: 1.1,
                  }}
                >
                  {session.date}
                  <Text style={{ fontSize: 5.5, fontFamily: "Helvetica" }}>{session.suffix}</Text>
                </Text>
                {si === 0 && (
                  <Text style={{ fontSize: 5.5, color: "rgba(255,255,255,0.7)", lineHeight: 1 }}>
                    {session.month}
                  </Text>
                )}
              </View>
            );
          })
        )}
        <Text style={s.thAtt}>Att.</Text>
      </View>
    </>
  );
}

/** All student rows for a given week chunk */
function TableBody({
  chunk,
  colW,
  students,
  allWeeks,
}: {
  chunk: WeekGroupPdf[];
  colW: number;
  students: SessionRegisterPdfData["students"];
  allWeeks: WeekGroupPdf[];
}) {
  return (
    <>
      {students.map((student, rowIdx) => {
        const isAlt = rowIdx % 2 !== 0;
        const sm    = studentSummary(student.id, allWeeks);

        const attColor =
          sm.pct === null  ? C.muted     :
          sm.pct >= 80     ? C.greenFg   :
          sm.pct >= 60     ? C.amberFg   :
                             C.redFg;

        return (
          <View key={student.id} style={isAlt ? s.rowAlt : s.row}>
            {/* Name */}
            <View style={s.tdName}>
              <Text>{student.name}</Text>
            </View>

            {/* Gender */}
            <View style={s.tdGender}>
              <Text
                style={{
                  fontSize: 6.5,
                  fontFamily: "Helvetica-Bold",
                  color: student.gender === "M" ? "#1d4ed8" : "#be185d",
                }}
              >
                {student.gender}
              </Text>
            </View>

            {/* Session cells */}
            {chunk.map((week, wi) =>
              week.sessions.map((session, si) => {
                const rawStatus = session.records[student.id];
                const isLastInWeek = si === week.sessions.length - 1;
                const isLastChunk  = wi === chunk.length - 1;

                const borderRight =
                  isLastInWeek && !isLastChunk
                    ? `1 solid ${C.darkBorder}`
                    : !isLastInWeek
                    ? `1 solid ${C.border}`
                    : "none";

                return (
                  <View
                    key={session.key}
                    style={{
                      width: colW,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRight,
                    }}
                  >
                    {rawStatus ? (
                      <View
                        style={{
                          backgroundColor: STATUS_BG[rawStatus] ?? C.mutedBg,
                          borderRadius: 2,
                          width: colW - 4,
                          alignItems: "center",
                          paddingVertical: 1,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 6.5,
                            fontFamily: "Helvetica-Bold",
                            color: STATUS_FG[rawStatus] ?? C.muted,
                          }}
                        >
                          {STATUS_LABEL[rawStatus] ?? rawStatus}
                        </Text>
                      </View>
                    ) : (
                      <Text style={{ fontSize: 7, color: C.border }}>·</Text>
                    )}
                  </View>
                );
              })
            )}

            {/* Attendance % */}
            <View style={s.tdAtt}>
              {sm.pct !== null ? (
                <>
                  <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: attColor }}>
                    {sm.pct}%
                  </Text>
                  <Text style={{ fontSize: 5.5, color: C.muted }}>
                    {sm.present}/{sm.recorded}
                  </Text>
                </>
              ) : (
                <Text style={{ fontSize: 7, color: C.border }}>—</Text>
              )}
            </View>
          </View>
        );
      })}
    </>
  );
}

// ── Document ──────────────────────────────────────────────────────────────────

function SessionRegisterDocument({
  data,
  meta,
}: {
  data: SessionRegisterPdfData;
  meta: SessionRegisterPdfMeta;
}) {
  const chunks     = chunkWeeks(data.weeks);
  const totalPages = chunks.length;

  const generatedOn = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <Document>
      {chunks.map((chunk, pageIdx) => {
        const colW      = sessionColW(chunk);
        const pageLabel =
          totalPages > 1
            ? `Page ${pageIdx + 1} of ${totalPages}`
            : "Full Term";

        return (
          <Page
            key={pageIdx}
            size="A4"
            orientation="landscape"
            style={s.page}
          >
            {/* ── Header ─────────────────────────────────────────────────── */}
            <SchoolHeader
              meta={meta}
              data={data}
              pageLabel={pageLabel}
              generatedOn={generatedOn}
            />

            {/* ── Legend ─────────────────────────────────────────────────── */}
            <LegendRow />

            {/* ── Table ──────────────────────────────────────────────────── */}
            <View style={s.tableWrap}>
              <TableHeader chunk={chunk} colW={colW} />
              <TableBody
                chunk={chunk}
                colW={colW}
                students={data.students}
                allWeeks={data.weeks}
              />
            </View>

            {/* ── Footer ─────────────────────────────────────────────────── */}
            <View style={s.footer} fixed>
              <Text style={s.footerText}>
                {data.subjectName}  •  {data.className}  •  {data.termLabel}
                {totalPages > 1 ? `  •  Weeks ${chunk[0].label}–${chunk[chunk.length - 1].label}` : ""}
              </Text>
              <Text style={s.footerText}>
                {pageLabel}  •  Generated {generatedOn}
              </Text>
            </View>
          </Page>
        );
      })}
    </Document>
  );
}

// ── Download helper ───────────────────────────────────────────────────────────

export async function downloadSessionRegisterPdf(
  data: SessionRegisterPdfData,
  meta: SessionRegisterPdfMeta
): Promise<void> {
  const doc  = <SessionRegisterDocument data={data} meta={meta} />;
  const blob = await pdf(doc).toBlob();
  const url  = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `SessionRecord_${data.subjectName}_${data.className}_${data.termLabel}`
    .replace(/[·\s/\\]/g, "_")
    .replace(/_+/g, "_")
    + ".pdf";

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
