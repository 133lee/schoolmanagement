import { pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import { computeBestOfSixFromReportCard } from "@/lib/services/performance-calculator-pure";
import JSZip from "jszip";
import {
  SeniorReportCard,
  SeniorReportCardData,
} from "@/components/report-cards/SeniorReportCard";
import {
  JuniorReportCard,
  JuniorReportCardData,
} from "@/components/report-cards/JuniorReportCard";

/**
 * Convert image URL to base64 data URI for PDF generation
 */
async function convertImageToBase64(url: string): Promise<string | undefined> {
  try {
    // If it's already a data URI, return it
    if (url.startsWith("data:")) {
      return url;
    }

    // Convert relative URL to absolute
    const absoluteUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;

    // Fetch the image
    const response = await fetch(absoluteUrl);
    const blob = await response.blob();

    // Convert to base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error converting image to base64:", error);
    return undefined;
  }
}

/**
 * Map report card data from database to PDF data format
 */
function mapReportCardData(
  reportCard: any,
  schoolName?: string,
  logoUrl?: string
): SeniorReportCardData | JuniorReportCardData {
  const pupilName = reportCard.student
    ? `${reportCard.student.firstName} ${
        reportCard.student.middleName ? reportCard.student.middleName + " " : ""
      }${reportCard.student.lastName}`
    : "";

  const className = reportCard.class?.name || "";

  // Handle both data structures: classTeacher.user.firstName or classTeacher.firstName
  let classTeacher = "";
  if (reportCard.classTeacher) {
    if (reportCard.classTeacher.user) {
      classTeacher = `${reportCard.classTeacher.user.firstName || ""} ${
        reportCard.classTeacher.user.lastName || ""
      }`.trim();
    } else if (reportCard.classTeacher.firstName) {
      classTeacher = `${reportCard.classTeacher.firstName} ${
        reportCard.classTeacher.lastName || ""
      }`.trim();
    }
  }

  const year = reportCard.term?.academicYear?.year?.toString() || "";
  const gradeId = reportCard.class?.grade?.id || "";
  const gradeLevel = reportCard.class?.grade?.level || "";
  const gradeName = reportCard.class?.grade?.name || null;
  const subjectsForBestSix = (reportCard.subjects || []).map((sub: any) => {
    const gs = sub.subject?.gradeSubjects?.find((g: any) => g.gradeId === gradeId);
    return {
      totalMark: sub.totalMark ?? null,
      grade: sub.grade ?? null,
      isCore: gs?.isCore ?? true,
    };
  });
  const bestOfSix = computeBestOfSixFromReportCard(subjectsForBestSix, gradeLevel, gradeName, className);
  const attendance = reportCard.attendance?.toString() || "0";

  const subjects =
    reportCard.subjects?.map((subject: any) => ({
      name: subject.subject.name.toUpperCase(),
      mid: subject.midMark?.toString() || "",
      eot: subject.eotMark?.toString() || "",
      cat: subject.catMark?.toString() || "",
    })) || [];

  const teacherComment = reportCard.classTeacherRemarks || "";
  const headTeacherComment = reportCard.headTeacherRemarks || "";

  return {
    pupilName,
    class: className,
    classTeacher,
    year,
    bestOfSix,
    attendance,
    subjects,
    teacherComment,
    headTeacherComment,
    schoolName,
    logoUrl,
  };
}

/**
 * Check if class name follows the Form naming convention (F1, F2, etc.)
 * Returns the form number if matched, null otherwise.
 *
 * Class naming convention: F{number} {className} or F{number}-{className}
 * Examples: F1 Blue, F1-B, F2 A, F3-Gold
 */
function getFormNumber(className: string): number | null {
  // Match pattern: F followed by a number at the start
  const match = className.match(/^F(\d+)[\s-]/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Get the appropriate PDF component based on grade level and class name
 *
 * Mapping:
 * - Form 1-5 (F1, F2, F3, F4, F5 classes): SeniorReportCard (9-point ECZ scale)
 * - Old Grades 8-9 (no F prefix): JuniorReportCard (5-point ECZ scale)
 * - Old Grades 10-12 (no F prefix): SeniorReportCard (9-point ECZ scale)
 * - Grades 1-7: SeniorReportCard as fallback (no dedicated template yet)
 */
function getReportCardComponent(gradeLevel: string, className: string = "") {
  // Check for Form naming convention first (F1, F2, F3, etc.)
  const formNumber = getFormNumber(className);

  if (formNumber !== null) {
    // All Form classes (F1-F5) use Senior Secondary report card (9-point ECZ scale)
    if (formNumber >= 1 && formNumber <= 5) {
      return SeniorReportCard;
    }
  }

  // Fallback to grade level detection (for old classes without F prefix)
  // Junior Secondary: Grades 8-9 (5-point ECZ scale)
  if (gradeLevel === "GRADE_8" || gradeLevel === "GRADE_9") {
    return JuniorReportCard;
  }
  // Senior Secondary: Grades 10-12 (9-point ECZ scale)
  if (gradeLevel === "GRADE_10" || gradeLevel === "GRADE_11" || gradeLevel === "GRADE_12") {
    return SeniorReportCard;
  }
  // Fallback for grades 1-7 (no dedicated template yet)
  return SeniorReportCard;
}

/**
 * Generate PDF Blob for a single report card (no download)
 */
export async function generateReportCardBlob(
  reportCard: any,
  schoolName?: string,
  logoUrl?: string
): Promise<Blob> {
  // Convert logo to base64 if provided
  const logoBase64 = logoUrl ? await convertImageToBase64(logoUrl) : undefined;

  const data = mapReportCardData(reportCard, schoolName, logoBase64);
  const gradeLevel = reportCard.class?.grade?.level || "";
  const className = reportCard.class?.name || "";
  const ReportCardComponent = getReportCardComponent(gradeLevel, className);

  return await pdf(<ReportCardComponent data={data} />).toBlob();
}

/**
 * Generate and download PDF for a single report card
 */
export async function downloadSingleReportCard(
  reportCard: any,
  studentName: string,
  schoolName?: string,
  logoUrl?: string
): Promise<void> {
  try {
    const blob = await generateReportCardBlob(reportCard, schoolName, logoUrl);

    // Download PDF
    const filename = `${studentName.replace(/\s+/g, "_")}_Report_Card.pdf`;
    saveAs(blob, filename);
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
}

/**
 * Generate and download all report cards as a single ZIP file
 */
export async function downloadClassReportCards(
  reportCards: any[],
  className: string,
  gradeName: string,
  onProgress?: (percent: number) => void,
  schoolName?: string,
  logoUrl?: string
): Promise<void> {
  try {
    const zip = new JSZip();

    for (let i = 0; i < reportCards.length; i++) {
      const reportCard = reportCards[i];
      const student = reportCard.student;
      const studentNumber = student?.studentNumber || String(i + 1).padStart(3, "0");
      const studentName = student
        ? `${student.firstName}_${student.lastName}`
        : "Student";

      const pdfBlob = await generateReportCardBlob(reportCard, schoolName, logoUrl);
      zip.file(`${studentNumber}_${studentName}.pdf`, pdfBlob);

      // Report progress
      if (onProgress) {
        onProgress(Math.round(((i + 1) / reportCards.length) * 100));
      }
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    saveAs(zipBlob, `${gradeName}_${className}_Report_Cards.zip`);
  } catch (error) {
    console.error("Error generating bulk PDFs:", error);
    throw error;
  }
}
