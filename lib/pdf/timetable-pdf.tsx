/**
 * Timetable PDF Generator
 * 0-byte-proof version with fixed widths and bulletproof guards
 */

import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Define types
interface TimetableSlot {
  dayOfWeek: string;
  periodNumber: number;
  startTime?: string;
  endTime?: string;
  subject: {
    name: string;
    code?: string;
  };
  teacher: {
    firstName: string;
    lastName: string;
    staffNumber?: string;
  };
}

interface TimetablePDFProps {
  className: string;
  slots: TimetableSlot[];
  periodSlots: Array<{
    periodNumber: number;
    startTime: string;
    endTime: string;
    isBreak: boolean;
  }>;
  generatedDate?: string;
}

// Day constants - explicit bidirectional mapping (BULLETPROOF)
const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'] as const;
type DayType = typeof DAYS[number];

const DAY_ABBR: Record<DayType, string> = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
};

// Fixed-width styles in pt (NOT percentages - React-PDF is much more stable with fixed units)
// A4 landscape = 842pt wide, minus 40pt padding = 802pt usable
// Day column: 60pt, remaining: 742pt for periods
const createStyles = (periodCount: number) => {
  // Ensure periodCount is valid (GUARD against NaN)
  const safePeriodCount = Number.isFinite(periodCount) && periodCount > 0 ? periodCount : 9;

  // Calculate period cell width in fixed pt
  // Total usable: 802pt, day cell: 60pt, periods get: 742pt
  const periodCellWidth = Math.floor(742 / safePeriodCount);

  return StyleSheet.create({
    page: {
      padding: 20,
      fontSize: 9,
      fontFamily: 'Helvetica',
    },
    header: {
      marginBottom: 15,
      alignItems: 'center',
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 5,
    },
    subtitle: {
      fontSize: 12,
      marginTop: 20,
    },
    table: {
      width: '100%',
      borderWidth: 1,
      borderColor: '#000',
    },
    row: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#000',
    },
    headerRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#000',
      backgroundColor: '#e0e0e0',
    },
    dayCell: {
      width: 60, // Fixed pt width
      padding: 5,
      borderRightWidth: 1,
      borderRightColor: '#000',
      justifyContent: 'center',
      alignItems: 'center',
    },
    dayText: {
      fontSize: 12,
      fontWeight: 'bold',
    },
    cell: {
      width: periodCellWidth,
      minHeight: 50,
      padding: 3,
      borderRightWidth: 1,
      borderRightColor: '#000',
      justifyContent: 'center',
      alignItems: 'center',
    },
    breakCell: {
      width: periodCellWidth,
      minHeight: 50,
      padding: 3,
      borderRightWidth: 1,
      borderRightColor: '#000',
      backgroundColor: '#d0d0d0',
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyCell: {
      width: periodCellWidth,
      minHeight: 50,
      padding: 3,
      borderRightWidth: 1,
      borderRightColor: '#000',
      backgroundColor: '#fafafa',
    },
    periodHeader: {
      fontSize: 10,
      fontWeight: 'bold',
    },
    breakText: {
      fontSize: 8,
      fontWeight: 'bold',
    },
    timeText: {
      fontSize: 6,
      marginTop: 2,
    },
    subjectText: {
      fontSize: 10,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    teacherText: {
      fontSize: 7,
      marginTop: 2,
      textAlign: 'center',
      color: '#444',
    },
    footer: {
      marginTop: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      fontSize: 8,
    },
  });
};

// Fallback document for error cases
const FallbackDocument: React.FC<{ title: string; message: string }> = ({ title, message }) => {
  const styles = createStyles(9);
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{title || 'Timetable'}</Text>
          <Text style={styles.subtitle}>{message}</Text>
        </View>
      </Page>
    </Document>
  );
};

export const TimetablePDF: React.FC<TimetablePDFProps> = ({
  className,
  slots,
  periodSlots,
  generatedDate = new Date().toLocaleDateString('en-GB'),
}) => {
  // GUARD 1: Check for null/undefined inputs
  if (!slots || !periodSlots) {
    return <FallbackDocument title={className || 'Timetable'} message="No timetable data available" />;
  }

  // GUARD 2: Check for empty arrays
  if (slots.length === 0 || periodSlots.length === 0) {
    return <FallbackDocument title={className || 'Timetable'} message="No timetable data available" />;
  }

  // GUARD 3: Validate periodSlots have valid periodNumbers
  const validPeriodSlots = periodSlots.filter(
    p => p && typeof p.periodNumber === 'number' && Number.isFinite(p.periodNumber)
  );

  if (validPeriodSlots.length === 0) {
    return <FallbackDocument title={className || 'Timetable'} message="Invalid period configuration" />;
  }

  // Create dynamic styles based on period count
  const styles = createStyles(validPeriodSlots.length);

  // Build slot map for quick lookup using pipe separator to avoid collision
  // Key format: "MONDAY|1" (uppercase day + pipe + period number)
  const slotMap = new Map<string, TimetableSlot>();

  slots.forEach(slot => {
    // GUARD: Skip invalid slots
    if (!slot || !slot.dayOfWeek || typeof slot.periodNumber !== 'number') {
      return;
    }

    // Normalize day to uppercase to handle case variations
    const normalizedDay = String(slot.dayOfWeek).toUpperCase().trim();

    // GUARD: Only accept valid days
    if (!DAYS.includes(normalizedDay as DayType)) {
      return;
    }

    const key = `${normalizedDay}|${slot.periodNumber}`;
    slotMap.set(key, slot);
  });

  // Helper to get slot (returns undefined if not found - that's OK)
  const getSlot = (day: DayType, period: number): TimetableSlot | undefined => {
    return slotMap.get(`${day}|${period}`);
  };

  // Helper to check if period is a break
  const isBreak = (period: number): boolean => {
    const p = validPeriodSlots.find(ps => ps.periodNumber === period);
    return p?.isBreak === true;
  };

  // Helper to get period time string
  const getPeriodTime = (period: number): string => {
    const p = validPeriodSlots.find(ps => ps.periodNumber === period);
    if (!p || !p.startTime || !p.endTime) return '';
    return `${p.startTime}-${p.endTime}`;
  };

  // Helper to get teacher display code (SAFE)
  const getTeacherCode = (teacher: TimetableSlot['teacher'] | null | undefined): string => {
    if (!teacher) return '';
    if (teacher.staffNumber) return String(teacher.staffNumber).toUpperCase();
    if (teacher.lastName) return String(teacher.lastName).substring(0, 3).toUpperCase();
    return '';
  };

  // Helper to get subject display code (SAFE)
  const getSubjectCode = (subject: TimetableSlot['subject'] | null | undefined): string => {
    if (!subject) return '';
    if (subject.code) return String(subject.code).toUpperCase();
    if (subject.name) return String(subject.name).substring(0, 6).toUpperCase();
    return '';
  };

  // Extract period numbers (already validated)
  const periods = validPeriodSlots.map(p => p.periodNumber);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{className || 'Class Timetable'}</Text>
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Header row with periods */}
          <View style={styles.headerRow}>
            <View style={styles.dayCell}>
              <Text style={styles.dayText}>Day</Text>
            </View>
            {periods.map(period => (
              <View key={`header-${period}`} style={isBreak(period) ? styles.breakCell : styles.cell}>
                <Text style={isBreak(period) ? styles.breakText : styles.periodHeader}>
                  {isBreak(period) ? 'BREAK' : `P${period}`}
                </Text>
                <Text style={styles.timeText}>{getPeriodTime(period)}</Text>
              </View>
            ))}
          </View>

          {/* Day rows - iterate over canonical day names */}
          {DAYS.map(day => (
            <View key={`row-${day}`} style={styles.row}>
              <View style={styles.dayCell}>
                <Text style={styles.dayText}>{DAY_ABBR[day]}</Text>
              </View>
              {periods.map(period => {
                // Break cells are always empty content
                if (isBreak(period)) {
                  return <View key={`${day}-${period}`} style={styles.breakCell} />;
                }

                // Get slot for this day/period
                const slot = getSlot(day, period);

                // GUARD: No slot = empty cell (NOT a crash)
                if (!slot) {
                  return <View key={`${day}-${period}`} style={styles.emptyCell} />;
                }

                // GUARD: Slot exists but missing subject/teacher = empty cell
                if (!slot.subject || !slot.teacher) {
                  return <View key={`${day}-${period}`} style={styles.emptyCell} />;
                }

                // Render the slot content
                return (
                  <View key={`${day}-${period}`} style={styles.cell}>
                    <Text style={styles.subjectText}>{getSubjectCode(slot.subject)}</Text>
                    <Text style={styles.teacherText}>{getTeacherCode(slot.teacher)}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* Footer - NO absolute positioning */}
        <View style={styles.footer}>
          <Text>Generated: {generatedDate}</Text>
          <Text>School Management System</Text>
        </View>
      </Page>
    </Document>
  );
};
