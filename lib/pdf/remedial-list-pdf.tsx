import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 18,
    alignItems: "center",
  },
  logo: {
    width: 56,
    height: 56,
    marginBottom: 5,
  },
  schoolName: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 3,
  },
  title: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 2,
  },
  meta: {
    fontSize: 9,
    color: "#666",
    marginTop: 5,
    textAlign: "center",
  },
  topicBox: {
    marginTop: 16,
    marginBottom: 14,
    padding: 10,
    borderWidth: 0.5,
    borderColor: "#ccc",
    borderRadius: 2,
  },
  topicLabel: {
    fontSize: 8,
    color: "#666",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  topicText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  subtopicText: {
    fontSize: 9,
    marginTop: 4,
    color: "#333",
  },
  table: {
    width: "100%",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
  },
  tableRowAlt: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    backgroundColor: "#fafafa",
  },
  colNo: { width: "8%", padding: 6, textAlign: "center" },
  colName: { width: "42%", padding: 6 },
  colNumber: { width: "25%", padding: 6 },
  colDone: { width: "25%", padding: 6, textAlign: "center" },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    fontSize: 8,
    color: "#666",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

interface RemedialStudent {
  studentNumber: string;
  name: string;
}

interface RemedialListPDFProps {
  className: string;
  subjectName: string;
  date: string;
  periodNumber: number;
  topic: string;
  subtopics?: string | null;
  students: RemedialStudent[];
  generatedDate?: string;
  schoolName?: string;
  logoUrl?: string;
}

export const RemedialListPDF: React.FC<RemedialListPDFProps> = ({
  className,
  subjectName,
  date,
  periodNumber,
  topic,
  subtopics,
  students,
  generatedDate = new Date().toLocaleDateString("en-GB"),
  schoolName = "School",
  logoUrl,
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {logoUrl && <Image style={styles.logo} src={logoUrl} />}
          <Text style={styles.schoolName}>{schoolName}</Text>
          <Text style={styles.title}>Remedial List</Text>
          <Text style={styles.meta}>
            {className} · {subjectName} · Period {periodNumber} · {date} | Generated: {generatedDate}
          </Text>
        </View>

        <View style={styles.topicBox}>
          <Text style={styles.topicLabel}>Topic Missed</Text>
          <Text style={styles.topicText}>{topic}</Text>
          {subtopics && <Text style={styles.subtopicText}>{subtopics}</Text>}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNo}>#</Text>
            <Text style={styles.colName}>Student Name</Text>
            <Text style={styles.colNumber}>Student No.</Text>
            <Text style={styles.colDone}>Caught Up</Text>
          </View>

          {students.map((student, index) => (
            <View
              key={student.studentNumber || index}
              style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
            >
              <Text style={styles.colNo}>{index + 1}</Text>
              <Text style={styles.colName}>{student.name}</Text>
              <Text style={styles.colNumber}>{student.studentNumber}</Text>
              <Text style={styles.colDone}></Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text>{className} — Remedial List</Text>
          <Text>Page 1</Text>
        </View>
      </Page>
    </Document>
  );
};
