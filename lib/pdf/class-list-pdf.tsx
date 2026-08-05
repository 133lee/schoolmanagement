import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
    alignItems: "center",
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 5,
  },
  schoolName: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 3,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  className: {
    fontSize: 12,
    fontWeight: "bold",
  },
  titleSeparator: {
    fontSize: 12,
    marginHorizontal: 10,
  },
  classListTitle: {
    fontSize: 12,
    fontWeight: "bold",
  },
  meta: {
    fontSize: 9,
    color: "#666",
    marginTop: 5,
  },
  table: {
    width: "100%",
    marginTop: 15,
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
  colNo: {
    width: "8%",
    padding: 6,
    textAlign: "center",
  },
  colName: {
    width: "50%",
    padding: 6,
  },
  colGender: {
    width: "12%",
    padding: 6,
    textAlign: "center",
  },
  colDob: {
    width: "30%",
    padding: 6,
    textAlign: "center",
  },
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

interface Student {
  studentNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  gender: string;
  dateOfBirth: Date | string;
  admissionDate: Date | string;
  status: string;
}

interface ClassListPDFProps {
  title: string;
  className: string;
  academicYear: string;
  subjectName?: string;
  students: Student[];
  generatedDate?: string;
  schoolName?: string;
  logoUrl?: string;
}

export const ClassListPDF: React.FC<ClassListPDFProps> = ({
  className,
  academicYear,
  subjectName,
  students,
  generatedDate = new Date().toLocaleDateString("en-GB"),
  schoolName = "Kambombo Day Secondary School",
  logoUrl = "/logo.png",
}) => {
  // Defensive rendering
  if (!students || students.length === 0) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.schoolName}>{schoolName}</Text>
            <Text style={{ fontSize: 12, marginTop: 20 }}>
              No students found in this class
            </Text>
          </View>
        </Page>
      </Document>
    );
  }

  const formatDate = (date: Date | string) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("en-GB");
  };

  const formatGender = (gender: string) => {
    if (gender === "MALE" || gender === "M") return "M";
    if (gender === "FEMALE" || gender === "F") return "F";
    return gender?.charAt(0) || "";
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image style={styles.logo} src={logoUrl} />
          <Text style={styles.schoolName}>{schoolName}</Text>
          <View style={styles.titleRow}>
            <Text style={styles.className}>{className}</Text>
            <Text style={styles.titleSeparator}>-</Text>
            <Text style={styles.classListTitle}>Class List</Text>
          </View>
          {subjectName && (
            <Text style={{ fontSize: 10, marginBottom: 3 }}>
              Subject: {subjectName}
            </Text>
          )}
          <Text style={styles.meta}>
            Academic Year: {academicYear} | Total: {students.length} students | Generated: {generatedDate}
          </Text>
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Header Row */}
          <View style={styles.tableHeader}>
            <Text style={styles.colNo}>#</Text>
            <Text style={styles.colName}>Full Name</Text>
            <Text style={styles.colGender}>Gender</Text>
            <Text style={styles.colDob}>Date of Birth</Text>
          </View>

          {/* Data Rows */}
          {students.map((student, index) => (
            <View
              key={student.studentNumber || index}
              style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
            >
              <Text style={styles.colNo}>{index + 1}</Text>
              <Text style={styles.colName}>
                {student.lastName}, {student.firstName}
                {student.middleName ? ` ${student.middleName}` : ""}
              </Text>
              <Text style={styles.colGender}>{formatGender(student.gender)}</Text>
              <Text style={styles.colDob}>{formatDate(student.dateOfBirth)}</Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>{className} - Class List</Text>
          <Text>Page 1</Text>
        </View>
      </Page>
    </Document>
  );
};
