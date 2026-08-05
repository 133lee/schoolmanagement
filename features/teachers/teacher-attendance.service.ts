import prisma from "@/lib/db/prisma";
import { logger } from "@/lib/logger/logger";
import { AttendanceTrendsResponse, AttendanceTrendData } from "./teacher-app.types";
import { teacherStudentService } from "./teacher-student.service";
import { getUtcMonthDateRange, getUtcDayOfMonth } from "@/lib/utils/date-utils";

/**
 * Teacher Attendance Service
 *
 * Business logic for teachers viewing attendance data.
 * Handles attendance trends and statistics for classes.
 */
export class TeacherAttendanceService {
  /**
   * Get attendance trends for a class
   *
   * @param userId - The user ID of the logged-in teacher
   * @param classId - The class ID to get attendance for
   * @param timeRange - Time range for trends: "7d", "30d", or "90d" (default: "30d")
   * @returns Attendance trends data grouped by date and gender
   * @throws ForbiddenError if teacher doesn't have access to the class
   * @throws NotFoundError if teacher or academic year not found
   */
  async getAttendanceTrends(
    userId: string,
    classId: string,
    timeRange: "7d" | "30d" | "90d" = "30d"
  ): Promise<AttendanceTrendsResponse> {
    logger.info("Fetching attendance trends", { userId, classId, timeRange });

    // Verify teacher has access to this class (reuses existing authorization logic)
    await teacherStudentService.verifyTeacherClassAccess(userId, classId);

    logger.debug("Teacher access verified", { userId, classId });

    // Calculate date range
    const startDate = this.calculateStartDate(timeRange);

    logger.debug("Date range calculated", {
      timeRange,
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString()
    });

    // Read all records (daily + period) for this class.
    // Deduplication below collapses multiple period records for the same
    // student+day into one, so the chart always shows meaningful data
    // regardless of which attendance method the teacher uses.
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        classId: classId,
        date: {
          gte: startDate,
        },
      },
      include: {
        student: {
          select: {
            id: true,
            gender: true,
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    logger.debug("Attendance records fetched", {
      recordCount: attendanceRecords.length,
      classId
    });

    // Group attendance by date and gender (pass startDate so all days are initialised)
    const attendanceData = this.processAttendanceData(attendanceRecords, startDate);

    logger.info("Attendance trends processed successfully", {
      userId,
      classId,
      timeRange,
      dataPoints: attendanceData.length,
    });

    return {
      attendanceData,
      timeRange,
      classId,
    };
  }

  /**
   * Calculate start date based on time range
   *
   * @param timeRange - Time range: "7d", "30d", or "90d"
   * @returns Start date for the range
   */
  private calculateStartDate(timeRange: "7d" | "30d" | "90d"): Date {
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    return startDate;
  }

  /**
   * Process attendance records into trend data
   *
   * Groups attendance by date and counts present students by gender
   *
   * @param attendanceRecords - Raw attendance records with student data
   * @returns Array of attendance trend data sorted by date
   */
  private processAttendanceData(attendanceRecords: any[], startDate: Date): AttendanceTrendData[] {
    const STATUS_PRIORITY: Record<string, number> = { PRESENT: 3, LATE: 2, EXCUSED: 1, ABSENT: 0 };

    // Deduplicate: one entry per (studentId, UTC-date), keeping best status
    const bestByStudentDay = new Map<string, { dateKey: string; status: string; gender: string }>();

    attendanceRecords.forEach((record) => {
      const dateKey = new Date(record.date).toISOString().split("T")[0]; // UTC date
      const mapKey = `${record.student.id}-${dateKey}`;
      const existing = bestByStudentDay.get(mapKey);
      if (!existing || STATUS_PRIORITY[record.status] > STATUS_PRIORITY[existing.status]) {
        bestByStudentDay.set(mapKey, { dateKey, status: record.status, gender: record.student.gender });
      }
    });

    // Aggregate deduplicated entries by date
    const attendanceByDate: Record<string, { date: string; boys: number; girls: number }> = {};
    bestByStudentDay.forEach(({ dateKey, status, gender }) => {
      if (!attendanceByDate[dateKey]) {
        attendanceByDate[dateKey] = { date: dateKey, boys: 0, girls: 0 };
      }
      if (status === "PRESENT" || status === "LATE") {
        if (gender === "MALE") attendanceByDate[dateKey].boys++;
        else attendanceByDate[dateKey].girls++;
      }
    });

    // Initialise every date in the range so the chart draws a continuous curve
    // instead of isolated dots when only a few days have records.
    const result: AttendanceTrendData[] = [];
    const cur = new Date(Date.UTC(
      startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()
    ));
    const today = new Date();
    const todayUtc = new Date(Date.UTC(
      today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()
    ));

    while (cur <= todayUtc) {
      const dateKey = cur.toISOString().split("T")[0];
      result.push(attendanceByDate[dateKey] ?? { date: dateKey, boys: 0, girls: 0 });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    logger.debug("Attendance data processed", {
      uniqueDates: result.length,
      daysWithData: Object.keys(attendanceByDate).length,
    });

    return result;
  }

  /**
   * Get class attendance for a specific month (grid view)
   *
   * @param userId - The user ID of the logged-in teacher
   * @param classId - The class ID to get attendance for
   * @param month - Month (0-11, JavaScript Date convention)
   * @param year - Year (e.g., 2024)
   * @returns Attendance grid with student attendance status for each day
   * @throws ForbiddenError if teacher doesn't have access to the class
   */
  async getClassAttendanceForMonth(
    userId: string,
    classId: string,
    month: number,
    year: number
  ): Promise<{
    students: Array<{
      id: string;
      name: string;
      gender: string;
      attendance: Array<"P" | "A" | "L" | "E" | null>;
    }>;
    month: number;
    year: number;
    daysInMonth: number;
  }> {
    logger.info("Fetching class attendance for month", {
      userId,
      classId,
      month,
      year,
    });

    // Verify teacher has access to this class (reuses existing authorization)
    await teacherStudentService.verifyTeacherClassAccess(userId, classId);

    // Get active academic year
    const academicYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
      select: { id: true },
    });

    if (!academicYear) {
      logger.warn("No active academic year found");
      throw new Error("No active academic year found");
    }

    // Calculate date range for the specified month using UTC
    const { startDate, endDate } = getUtcMonthDateRange(year, month);

    logger.debug("Date range for month", {
      month,
      year,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    // Get all attendance records for this class in the specified month
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        classId: classId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            gender: true,
          },
        },
      },
      orderBy: [{ date: "asc" }, { student: { firstName: "asc" } }],
    });

    // Get all students enrolled in this class
    const enrolledStudents = await prisma.studentClassEnrollment.findMany({
      where: {
        classId: classId,
        academicYearId: academicYear.id,
        status: "ACTIVE",
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            gender: true,
          },
        },
      },
      orderBy: {
        student: {
          firstName: "asc",
        },
      },
    });

    // Calculate the number of days in the month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Group attendance records by student
    type AttendanceStatus = "P" | "A" | "L" | "E" | null;
    const attendanceByStudent = new Map<string, Map<number, AttendanceStatus>>();

    // Initialize all enrolled students with null attendance for all days
    enrolledStudents.forEach((enrollment) => {
      const dayMap = new Map<number, AttendanceStatus>();
      for (let day = 1; day <= daysInMonth; day++) {
        dayMap.set(day, null);
      }
      attendanceByStudent.set(enrollment.student.id, dayMap);
    });

    // Populate actual attendance data
    attendanceRecords.forEach((record) => {
      const studentId = record.student.id;
      // Use UTC date to match how dates are stored
      const day = getUtcDayOfMonth(record.date);

      // Map database status to UI status codes
      let statusCode: "P" | "A" | "L" | "E" | null = null;
      switch (record.status) {
        case "PRESENT":
          statusCode = "P";
          break;
        case "ABSENT":
          statusCode = "A";
          break;
        case "LATE":
          statusCode = "L";
          break;
        case "EXCUSED":
          statusCode = "E";
          break;
      }

      if (attendanceByStudent.has(studentId)) {
        attendanceByStudent.get(studentId)!.set(day, statusCode);
      }
    });

    // Format response data
    const studentsData = enrolledStudents.map((enrollment) => {
      const student = enrollment.student;
      const fullName = [student.firstName, student.middleName, student.lastName]
        .filter(Boolean)
        .join(" ");

      const dayMap = attendanceByStudent.get(student.id)!;
      const attendance = Array.from({ length: daysInMonth }, (_, i) => {
        return dayMap.get(i + 1) ?? null;
      });

      return {
        id: student.id,
        name: fullName,
        gender: student.gender === "MALE" ? "M" : "F",
        attendance,
      };
    });

    logger.info("Class attendance for month fetched successfully", {
      userId,
      classId,
      month,
      year,
      studentCount: studentsData.length,
      daysInMonth,
    });

    return {
      students: studentsData,
      month,
      year,
      daysInMonth,
    };
  }
}

// Export singleton instance
export const teacherAttendanceService = new TeacherAttendanceService();
