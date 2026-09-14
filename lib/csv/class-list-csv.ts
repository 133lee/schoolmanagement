import Papa from "papaparse";
import { ClassListExportData } from "@/features/teachers/teacher-class.service";

/**
 * Builds a CSV export of a class list.
 *
 * Unlike the PDF export, names stay as separate First/Last/Middle Name
 * columns rather than a merged "Surname Firstname" string — that's the more
 * useful shape for a file meant to be opened in a spreadsheet or re-imported
 * elsewhere. Students are already sorted by last name (see
 * `getClassListForExport`), so row order carries through unchanged.
 */
export function generateClassListCsv(data: ClassListExportData): string {
  const rows = data.students.map((student, index) => ({
    "#": index + 1,
    "Student Number": student.studentNumber,
    "Last Name": student.lastName,
    "First Name": student.firstName,
    "Middle Name": student.middleName ?? "",
    Gender: student.gender,
    "Date of Birth": new Date(student.dateOfBirth).toLocaleDateString("en-GB"),
    "Admission Date": new Date(student.admissionDate).toLocaleDateString("en-GB"),
    Status: student.status,
  }));

  return Papa.unparse(rows);
}
