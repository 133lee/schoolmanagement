/**
 * Junior Secondary Report Card (Grades 8-9)
 * 5-point ECZ grading scale: 1-4 + Fail
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from '@react-pdf/renderer';

// Font registration is handled dynamically in pdf-generator.tsx

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    justifyContent: 'center',
  },
  header: {
    textAlign: 'center',
    marginBottom: 15,
  },
  logo: {
    width: 60,
    height: 60,
    marginLeft: 'auto',
    marginRight: 'auto',
    marginBottom: 8,
  },
  logoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0e0e0',
    marginLeft: 'auto',
    marginRight: 'auto',
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#666',
  },
  title: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  infoTable: {
    marginBottom: 15,
    border: '1px solid black',
  },
  infoRow: {
    flexDirection: 'row',
    borderBottom: '1px solid black',
  },
  infoCell: {
    padding: 5,
    flex: 1,
    borderRight: '1px solid black',
  },
  infoCellLast: {
    padding: 5,
    flex: 1,
  },
  infoCellLabel: {
    fontWeight: 'bold',
  },
  marksTable: {
    marginBottom: 15,
    border: '1px solid black',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderBottom: '1px solid black',
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid black',
  },
  tableCell: {
    padding: 5,
    borderRight: '1px solid black',
  },
  tableCellLast: {
    padding: 5,
  },
  subjectCol: {
    width: '40%',
  },
  catCol: {
    width: '20%',
    textAlign: 'center',
  },
  midCol: {
    width: '20%',
    textAlign: 'center',
  },
  eotCol: {
    width: '20%',
    textAlign: 'center',
  },
  gradingTable: {
    marginBottom: 15,
    border: '1px solid black',
  },
  gradingHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderBottom: '1px solid black',
    fontWeight: 'bold',
  },
  gradingRow: {
    flexDirection: 'row',
  },
  gradingCell: {
    padding: 5,
    borderRight: '1px solid black',
    textAlign: 'center',
    fontSize: 9,
  },
  gradingCellLast: {
    padding: 5,
    textAlign: 'center',
    fontSize: 9,
  },
  commentsSection: {
    marginTop: 10,
  },
  commentBox: {
    marginBottom: 15,
  },
  commentLabel: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  commentLine: {
    borderBottom: '1px dotted black',
    height: 15,
    marginBottom: 3,
  },
  commentText: {
    fontSize: 9,
    lineHeight: 1.4,
  },
});

export interface JuniorReportCardData {
  pupilName: string;
  class: string;
  classTeacher: string;
  year: string;
  bestOfSix: string;
  attendance: string;
  subjects: Array<{
    name: string;
    cat: string | number;
    mid: string | number;
    eot: string | number;
  }>;
  teacherComment: string;
  headTeacherComment: string;
  schoolName?: string;
  logoUrl?: string;
}

export const JuniorReportCard: React.FC<{ data: JuniorReportCardData }> = ({
  data,
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with Logo */}
        <View style={styles.header}>
          {data.logoUrl ? (
            <Image style={styles.logo} src={data.logoUrl} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>LOGO</Text>
            </View>
          )}
          <Text style={styles.title}>MINISTRY OF EDUCATION</Text>
          <Text style={styles.subtitle}>{data.schoolName?.toUpperCase() || 'KAMBOMBO DAY SECONDARY SCHOOL'}</Text>
          <Text style={styles.subtitle}>JUNIOR SECONDARY REPORT CARD</Text>
        </View>

        {/* Student Information */}
        <View style={styles.infoTable}>
          <View style={styles.infoRow}>
            <View style={styles.infoCell}>
              <Text style={styles.infoCellLabel}>PUPIL NAME:</Text>
            </View>
            <View style={styles.infoCell}>
              <Text>{data.pupilName}</Text>
            </View>
            <View style={styles.infoCell}>
              <Text style={styles.infoCellLabel}>CLASS:</Text>
            </View>
            <View style={styles.infoCellLast}>
              <Text>{data.class}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoCell}>
              <Text style={styles.infoCellLabel}>CLASS TEACHER:</Text>
            </View>
            <View style={styles.infoCell}>
              <Text>{data.classTeacher}</Text>
            </View>
            <View style={styles.infoCell}>
              <Text style={styles.infoCellLabel}>YEAR:</Text>
            </View>
            <View style={styles.infoCellLast}>
              <Text>{data.year}</Text>
            </View>
          </View>

          <View style={{ ...styles.infoRow, borderBottom: 'none' }}>
            <View style={styles.infoCell}>
              <Text style={styles.infoCellLabel}>BEST OF SIX (6)</Text>
            </View>
            <View style={styles.infoCell}>
              <Text>{data.bestOfSix}</Text>
            </View>
            <View style={styles.infoCell}>
              <Text style={styles.infoCellLabel}>ATTENDANCE:</Text>
            </View>
            <View style={styles.infoCellLast}>
              <Text>{data.attendance}</Text>
            </View>
          </View>
        </View>

        {/* Marks Table */}
        <View style={styles.marksTable}>
          <View style={styles.tableHeader}>
            <View style={{ ...styles.tableCell, ...styles.subjectCol }}>
              <Text>SUBJECT</Text>
            </View>
            <View style={{ ...styles.tableCell, ...styles.catCol }}>
              <Text>CAT 1</Text>
            </View>
            <View style={{ ...styles.tableCell, ...styles.midCol }}>
              <Text>MID</Text>
            </View>
            <View style={{ ...styles.tableCellLast, ...styles.eotCol }}>
              <Text>EOT</Text>
            </View>
          </View>

          {data.subjects.map((subject, index) => (
            <View
              key={index}
              style={{
                ...styles.tableRow,
                borderBottom:
                  index === data.subjects.length - 1 ? 'none' : '1px solid black',
              }}
            >
              <View style={{ ...styles.tableCell, ...styles.subjectCol }}>
                <Text>{subject.name}</Text>
              </View>
              <View style={{ ...styles.tableCell, ...styles.catCol }}>
                <Text>{subject.cat || '-'}</Text>
              </View>
              <View style={{ ...styles.tableCell, ...styles.midCol }}>
                <Text>{subject.mid || '-'}</Text>
              </View>
              <View style={{ ...styles.tableCellLast, ...styles.eotCol }}>
                <Text>{subject.eot || '-'}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Grading Scale - Junior (5-point scale) */}
        <View style={styles.gradingTable}>
          <View style={styles.gradingHeader}>
            <View style={{ ...styles.gradingCell, flex: 1 }}>
              <Text>DISTINCTION</Text>
            </View>
            <View style={{ ...styles.gradingCell, flex: 1 }}>
              <Text>MERIT</Text>
            </View>
            <View style={{ ...styles.gradingCell, flex: 1 }}>
              <Text>CREDIT</Text>
            </View>
            <View style={{ ...styles.gradingCell, flex: 1 }}>
              <Text>PASS</Text>
            </View>
            <View style={{ ...styles.gradingCellLast, flex: 1 }}>
              <Text>FAIL</Text>
            </View>
          </View>

          {/* Percentage ranges */}
          <View style={styles.gradingRow}>
            <View style={{ ...styles.gradingCell, flex: 1 }}>
              <Text>100-75</Text>
            </View>
            <View style={{ ...styles.gradingCell, flex: 1 }}>
              <Text>74-60</Text>
            </View>
            <View style={{ ...styles.gradingCell, flex: 1 }}>
              <Text>59-50</Text>
            </View>
            <View style={{ ...styles.gradingCell, flex: 1 }}>
              <Text>49-40</Text>
            </View>
            <View style={{ ...styles.gradingCellLast, flex: 1 }}>
              <Text>39-0</Text>
            </View>
          </View>

          {/* Grade numbers */}
          <View style={{ ...styles.gradingRow, borderTop: '1px solid black' }}>
            <View style={{ ...styles.gradingCell, flex: 1 }}>
              <Text>1</Text>
            </View>
            <View style={{ ...styles.gradingCell, flex: 1 }}>
              <Text>2</Text>
            </View>
            <View style={{ ...styles.gradingCell, flex: 1 }}>
              <Text>3</Text>
            </View>
            <View style={{ ...styles.gradingCell, flex: 1 }}>
              <Text>4</Text>
            </View>
            <View style={{ ...styles.gradingCellLast, flex: 1 }}>
              <Text>Fail</Text>
            </View>
          </View>
        </View>

        {/* Comments */}
        <View style={styles.commentsSection}>
          <View style={styles.commentBox}>
            <Text style={styles.commentLabel}>TEACHER COMMENT:</Text>
            <View style={styles.commentLine} />
            {data.teacherComment ? (
              <Text style={styles.commentText}>{data.teacherComment}</Text>
            ) : (
              <View style={styles.commentLine} />
            )}
          </View>

          <View style={styles.commentBox}>
            <Text style={styles.commentLabel}>HEAD TEACHER COMMENT:</Text>
            <View style={styles.commentLine} />
            {data.headTeacherComment ? (
              <Text style={styles.commentText}>{data.headTeacherComment}</Text>
            ) : (
              <View style={styles.commentLine} />
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
};
