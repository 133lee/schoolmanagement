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

export interface TeacherTimetableSlot {
  dayOfWeek: string;
  periodNumber: number;
  startTime?: string;
  endTime?: string;
  subject: { name: string };
  class: { name: string; grade: { name: string } };
  roomNumber?: string | null;
}

export interface TeacherTimetablePDFProps {
  teacherName: string;
  slots: TeacherTimetableSlot[];
  schoolName?: string;
  schoolLogoBase64?: string;
  generatedDate?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as const;
type Day = (typeof DAYS)[number];

const DAY_LABELS: Record<Day, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatClass(gradeName: string, className: string): string {
  return /^[A-Za-z]\d|^\d/.test(className)
    ? className
    : `${gradeName} ${className}`;
}

// ── Styles ─────────────────────────────────────────────────────────────────────
// A4 landscape = 842 × 595 pt; 30pt padding each side → 782pt usable width
// Day label col = 56pt, time col = 44pt → remaining for periods = 682pt

const createStyles = (periodCount: number) => {
  const safeCount = Number.isFinite(periodCount) && periodCount > 0 ? periodCount : 8;
  // Day col + time col = 100pt; remaining for period cells
  const cellW = Math.floor(682 / safeCount);

  return StyleSheet.create({
    page: {
      padding: 30,
      fontSize: 8,
      fontFamily: "Helvetica",
      backgroundColor: "#ffffff",
    },
    // ── school header ──
    schoolHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
      borderBottomWidth: 1.5,
      borderBottomColor: "#1a1a2e",
      paddingBottom: 8,
      gap: 8,
    },
    logo: {
      width: 36,
      height: 36,
      objectFit: "contain",
    },
    headerText: {
      flex: 1,
    },
    schoolName: {
      fontSize: 13,
      fontFamily: "Helvetica-Bold",
      color: "#1a1a2e",
    },
    docTitle: {
      fontSize: 10,
      color: "#444",
      marginTop: 2,
    },
    teacherLine: {
      fontSize: 9,
      color: "#222",
      marginTop: 1,
      fontFamily: "Helvetica-Bold",
    },
    // ── table ──
    table: {
      borderWidth: 1,
      borderColor: "#ccc",
      borderRadius: 2,
    },
    // header row
    headerRow: {
      flexDirection: "row",
      backgroundColor: "#1a1a2e",
    },
    // body row
    row: {
      flexDirection: "row",
      borderTopWidth: 1,
      borderTopColor: "#ddd",
    },
    rowAlt: {
      flexDirection: "row",
      borderTopWidth: 1,
      borderTopColor: "#ddd",
      backgroundColor: "#f8f9fc",
    },
    // day label cell
    dayCell: {
      width: 56,
      padding: 4,
      justifyContent: "center",
      alignItems: "center",
      borderRightWidth: 1,
      borderRightColor: "#ddd",
    },
    dayCellHeader: {
      width: 56,
      padding: 4,
      justifyContent: "center",
      alignItems: "center",
      borderRightWidth: 1,
      borderRightColor: "#3a3a5c",
    },
    dayText: {
      fontSize: 8,
      fontFamily: "Helvetica-Bold",
      color: "#1a1a2e",
    },
    // period header cell
    periodHeaderCell: {
      width: cellW,
      padding: 4,
      alignItems: "center",
      borderRightWidth: 1,
      borderRightColor: "#3a3a5c",
    },
    periodHeaderText: {
      fontSize: 8,
      fontFamily: "Helvetica-Bold",
      color: "#ffffff",
    },
    periodTimeText: {
      fontSize: 6,
      color: "#c8c8e8",
      marginTop: 1,
    },
    // content cells
    emptyCell: {
      width: cellW,
      minHeight: 46,
      padding: 3,
      borderRightWidth: 1,
      borderRightColor: "#ddd",
      backgroundColor: "#f5f5f5",
    },
    slotCell: {
      width: cellW,
      minHeight: 46,
      padding: 3,
      borderRightWidth: 1,
      borderRightColor: "#ddd",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#eef2ff",
    },
    subjectText: {
      fontSize: 8,
      fontFamily: "Helvetica-Bold",
      color: "#1a1a2e",
      textAlign: "center",
    },
    classText: {
      fontSize: 7,
      color: "#444",
      textAlign: "center",
      marginTop: 2,
    },
    roomText: {
      fontSize: 6,
      color: "#888",
      textAlign: "center",
      marginTop: 1,
    },
    // ── footer ──
    footer: {
      marginTop: 8,
      flexDirection: "row",
      justifyContent: "space-between",
      fontSize: 7,
      color: "#888",
    },
  });
};

// ── Document ───────────────────────────────────────────────────────────────────

const TeacherTimetableDocument: React.FC<TeacherTimetablePDFProps> = ({
  teacherName,
  slots,
  schoolName,
  schoolLogoBase64,
  generatedDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }),
}) => {
  if (!slots || slots.length === 0) {
    const s = createStyles(8);
    return (
      <Document>
        <Page size="A4" orientation="landscape" style={s.page}>
          <View style={s.schoolHeader}>
            <View style={s.headerText}>
              {schoolName && <Text style={s.schoolName}>{schoolName}</Text>}
              <Text style={s.docTitle}>Teaching Timetable</Text>
              <Text style={s.teacherLine}>{teacherName}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 10, color: "#888", textAlign: "center", marginTop: 40 }}>
            No timetable data available.
          </Text>
        </Page>
      </Document>
    );
  }

  // Build sorted unique period numbers
  const periodNumbers = Array.from(new Set(slots.map((s) => s.periodNumber))).sort(
    (a, b) => a - b
  );

  // Build period → time label map (take first slot with that period that has times)
  const periodTimes: Record<number, { start: string; end: string }> = {};
  slots.forEach((s) => {
    if (!periodTimes[s.periodNumber] && s.startTime && s.endTime) {
      periodTimes[s.periodNumber] = { start: s.startTime, end: s.endTime };
    }
  });

  // Build fast lookup map: "DAY|period" → slot
  const slotMap = new Map<string, TeacherTimetableSlot>();
  slots.forEach((s) => {
    const day = s.dayOfWeek.toUpperCase().trim() as Day;
    if (!DAYS.includes(day)) return;
    slotMap.set(`${day}|${s.periodNumber}`, s);
  });

  const styles = createStyles(periodNumbers.length);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* School header */}
        <View style={styles.schoolHeader}>
          {schoolLogoBase64 && (
            <Image style={styles.logo} src={schoolLogoBase64} />
          )}
          <View style={styles.headerText}>
            {schoolName && <Text style={styles.schoolName}>{schoolName}</Text>}
            <Text style={styles.docTitle}>Teaching Timetable</Text>
            <Text style={styles.teacherLine}>{teacherName}</Text>
          </View>
        </View>

        {/* Grid */}
        <View style={styles.table}>
          {/* Header row */}
          <View style={styles.headerRow}>
            <View style={styles.dayCellHeader}>
              <Text style={{ ...styles.periodHeaderText, color: "#c8c8e8", fontSize: 7 }}>Day</Text>
            </View>
            {periodNumbers.map((p) => {
              const t = periodTimes[p];
              return (
                <View key={`h-${p}`} style={styles.periodHeaderCell}>
                  <Text style={styles.periodHeaderText}>P{p}</Text>
                  {t && (
                    <Text style={styles.periodTimeText}>
                      {t.start}–{t.end}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>

          {/* Day rows */}
          {DAYS.map((day, rowIdx) => (
            <View key={day} style={rowIdx % 2 === 0 ? styles.row : styles.rowAlt}>
              <View style={styles.dayCell}>
                <Text style={styles.dayText}>{DAY_LABELS[day]}</Text>
              </View>
              {periodNumbers.map((p) => {
                const slot = slotMap.get(`${day}|${p}`);
                if (!slot) {
                  return <View key={`${day}-${p}`} style={styles.emptyCell} />;
                }
                const classLabel = formatClass(slot.class.grade.name, slot.class.name);
                return (
                  <View key={`${day}-${p}`} style={styles.slotCell}>
                    <Text style={styles.subjectText}>{slot.subject.name}</Text>
                    <Text style={styles.classText}>{classLabel}</Text>
                    {slot.roomNumber && (
                      <Text style={styles.roomText}>Rm {slot.roomNumber}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Generated: {generatedDate}</Text>
          <Text>School Management System</Text>
        </View>
      </Page>
    </Document>
  );
};

// ── Download helper ────────────────────────────────────────────────────────────

export async function downloadTeacherTimetablePdf(
  props: TeacherTimetablePDFProps
): Promise<void> {
  const blob = await pdf(<TeacherTimetableDocument {...props} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeName = (props.teacherName || "Teacher").replace(/[\s/\\]/g, "_");
  a.download = `${safeName}_Timetable.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
