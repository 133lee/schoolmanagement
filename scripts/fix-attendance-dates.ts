/**
 * Fix Attendance Dates Migration Script
 *
 * This script fixes attendance records that were saved with incorrect dates
 * due to timezone handling issues before the UTC normalization fix.
 *
 * IMPORTANT: Review the changes before applying them!
 */

import prisma from '../lib/db/prisma';
import { normalizeToUtcMidnight } from '../lib/utils/date-utils';

interface AttendanceRecordIssue {
  id: string;
  studentName: string;
  className: string;
  currentDate: Date;
  suggestedDate: Date;
  difference: string;
}

async function analyzeAttendanceDates() {
  console.log('🔍 Analyzing attendance records for date issues...\n');

  const records = await prisma.attendanceRecord.findMany({
    include: {
      student: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      class: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      date: 'desc',
    },
    take: 100, // Analyze last 100 records
  });

  console.log(`Found ${records.length} attendance records to analyze.\n`);

  const issues: AttendanceRecordIssue[] = [];

  for (const record of records) {
    const currentDate = record.date;
    const normalized = normalizeToUtcMidnight(currentDate);

    // Check if the date is not at UTC midnight
    if (
      currentDate.getUTCHours() !== 0 ||
      currentDate.getUTCMinutes() !== 0 ||
      currentDate.getUTCSeconds() !== 0 ||
      currentDate.getUTCMilliseconds() !== 0
    ) {
      const diffHours = currentDate.getUTCHours();
      const diffMinutes = currentDate.getUTCMinutes();

      issues.push({
        id: record.id,
        studentName: `${record.student.firstName} ${record.student.lastName}`,
        className: record.class.name,
        currentDate: currentDate,
        suggestedDate: normalized,
        difference: `${diffHours}h ${diffMinutes}m from midnight`,
      });
    }
  }

  return { total: records.length, issues };
}

async function displayIssues(issues: AttendanceRecordIssue[]) {
  if (issues.length === 0) {
    console.log('✅ No date issues found! All attendance records are properly normalized.\n');
    return;
  }

  console.log(`⚠️  Found ${issues.length} attendance records with date normalization issues:\n`);

  console.table(
    issues.slice(0, 10).map((issue) => ({
      Student: issue.studentName,
      Class: issue.className,
      'Current Date (UTC)': issue.currentDate.toISOString(),
      'Suggested Date (UTC)': issue.suggestedDate.toISOString(),
      'Time Offset': issue.difference,
    }))
  );

  if (issues.length > 10) {
    console.log(`\n... and ${issues.length - 10} more records with similar issues.\n`);
  }
}

async function fixAttendanceDates(issues: AttendanceRecordIssue[], dryRun: boolean = true) {
  if (issues.length === 0) {
    return { updated: 0, failed: 0 };
  }

  console.log(
    dryRun
      ? '\n🧪 DRY RUN - No changes will be made to the database\n'
      : '\n✏️  APPLYING FIXES - Updating database records\n'
  );

  let updated = 0;
  let failed = 0;

  for (const issue of issues) {
    try {
      if (!dryRun) {
        await prisma.attendanceRecord.update({
          where: { id: issue.id },
          data: { date: issue.suggestedDate },
        });
      }
      updated++;
      if (dryRun) {
        console.log(`  [DRY RUN] Would update: ${issue.studentName} - ${issue.className}`);
      } else {
        console.log(`  ✓ Updated: ${issue.studentName} - ${issue.className}`);
      }
    } catch (error: any) {
      failed++;
      console.error(`  ✗ Failed to update: ${issue.studentName} - ${error.message}`);
    }
  }

  return { updated, failed };
}

async function main() {
  const args = process.argv.slice(2);
  const shouldFix = args.includes('--fix');
  const dryRun = !shouldFix;

  console.log('=' .repeat(80));
  console.log('Attendance Date Normalization Fix Script');
  console.log('=' .repeat(80));
  console.log();

  try {
    // Step 1: Analyze
    const { total, issues } = await analyzeAttendanceDates();

    // Step 2: Display issues
    await displayIssues(issues);

    if (issues.length > 0) {
      // Step 3: Fix (if requested)
      const { updated, failed } = await fixAttendanceDates(issues, dryRun);

      console.log('\n' + '='.repeat(80));
      console.log('Summary:');
      console.log('='.repeat(80));
      console.log(`Total records analyzed: ${total}`);
      console.log(`Records with issues: ${issues.length}`);
      console.log(`Records ${dryRun ? 'would be' : ''} updated: ${updated}`);
      if (failed > 0) {
        console.log(`Failed updates: ${failed}`);
      }
      console.log('='.repeat(80));

      if (dryRun) {
        console.log('\n💡 To apply these fixes, run: npm run fix-attendance-dates -- --fix\n');
      } else {
        console.log('\n✅ Attendance dates have been normalized successfully!\n');
        console.log('📊 Verify the changes in the UI to ensure attendance displays correctly.\n');
      }
    }
  } catch (error: any) {
    console.error('\n❌ Error running migration script:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
