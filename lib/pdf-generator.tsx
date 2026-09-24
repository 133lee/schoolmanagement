import { pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import { computeBestOfSixFromReportCard } from "@/lib/services/performance-calculator-pure";
import { resolveReportCardLevel } from "@/lib/grading/ecz-grading-system";
import { formatTeacherLabel, formatCompactClassLabel } from "@/lib/utils";
import { formatAttendanceLabel } from "@/lib/report-cards/attendance-label";
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
  // Grade-prefixed for display ("12 A") — a bare "A" is unidentifiable once
  // printed as a hard copy. Form classes (e.g. "F1-B") already carry their
  // own identifying prefix and are returned as-is.
  const displayClassName = formatCompactClassLabel(reportCard.class?.grade?.name, className);

  // Handle both data structures: classTeacher.user.{firstName,lastName} or
  // classTeacher.{firstName,lastName} directly — formatted "Surname F."
  const classTeacher = formatTeacherLabel(
    reportCard.classTeacher?.user ?? reportCard.classTeacher
  );

  const year = reportCard.term?.academicYear?.year?.toString() || "";
  const gradeLevel = reportCard.class?.grade?.level || "";
  const gradeName = reportCard.class?.grade?.name || null;
  const subjectsForBestSix = (reportCard.subjects || []).map((sub: any) => ({
    name: sub.subject?.name ?? "",
    totalMark: sub.totalMark ?? null,
    grade: sub.grade ?? null,
  }));
  const bestOfSix = computeBestOfSixFromReportCard(subjectsForBestSix, gradeLevel, gradeName, className);
  const attendance = formatAttendanceLabel(reportCard);

  const subjects =
    reportCard.subjects?.map((subject: any) => ({
      name: subject.subject.name.toUpperCase(),
      mid: subject.midAbsent ? "AB" : subject.midMark?.toString() ?? "-",
      eot: subject.eotAbsent ? "AB" : subject.eotMark?.toString() ?? "-",
      cat: subject.catAbsent ? "AB" : subject.catMark?.toString() ?? "-",
    })) || [];

  const teacherComment = reportCard.classTeacherRemarks || "";
  const headTeacherComment = reportCard.headTeacherRemarks || "";

  return {
    pupilName,
    class: displayClassName,
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
 * Get the appropriate PDF component for a class — delegates to the single
 * shared resolveReportCardLevel so this never disagrees with the server-side
 * PDF route or the in-app preview about which template a class gets.
 */
function getReportCardComponent(gradeLevel: string, gradeName: string | null, className: string = "") {
  return resolveReportCardLevel(gradeLevel, gradeName, className) === "JUNIOR"
    ? JuniorReportCard
    : SeniorReportCard;
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
  const gradeName = reportCard.class?.grade?.name || null;
  const className = reportCard.class?.name || "";
  const ReportCardComponent = getReportCardComponent(gradeLevel, gradeName, className);

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
