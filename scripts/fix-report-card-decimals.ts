/**
 * Fix Report Card Decimals Script
 *
 * Report cards generated before the rounding fix in reportCard.service.ts
 * (percentage/weighted-average calculations weren't rounded) have decimal
 * values like 56.00000000000001 baked into the DB. This rounds every
 * existing ReportCardSubject (catMark/midMark/eotMark/totalMark) and
 * ReportCard (totalMarks/averageMark) to whole numbers, matching what
 * newly-generated report cards already get.
 *
 * Run with: npx tsx scripts/fix-report-card-decimals.ts
 */

import prisma from "../lib/db/prisma";

function needsRounding(value: number | null): boolean {
  return value !== null && !Number.isInteger(value);
}

async function fixReportCardDecimals() {
  console.log("Starting report card decimal fix...\n");

  try {
    const subjects = await prisma.reportCardSubject.findMany({
      select: { id: true, catMark: true, midMark: true, eotMark: true, totalMark: true },
    });

    let subjectsUpdated = 0;
    for (const s of subjects) {
      if (
        !needsRounding(s.catMark) &&
        !needsRounding(s.midMark) &&
        !needsRounding(s.eotMark) &&
        !needsRounding(s.totalMark)
      ) {
        continue;
      }

      await prisma.reportCardSubject.update({
        where: { id: s.id },
        data: {
          catMark: s.catMark !== null ? Math.round(s.catMark) : null,
          midMark: s.midMark !== null ? Math.round(s.midMark) : null,
          eotMark: s.eotMark !== null ? Math.round(s.eotMark) : null,
          totalMark: s.totalMark !== null ? Math.round(s.totalMark) : null,
        },
      });
      subjectsUpdated++;
    }

    const reportCards = await prisma.reportCard.findMany({
      select: { id: true, totalMarks: true, averageMark: true },
    });

    let reportCardsUpdated = 0;
    for (const rc of reportCards) {
      if (!needsRounding(rc.totalMarks) && !needsRounding(rc.averageMark)) {
        continue;
      }

      await prisma.reportCard.update({
        where: { id: rc.id },
        data: {
          totalMarks: rc.totalMarks !== null ? Math.round(rc.totalMarks) : null,
          averageMark: rc.averageMark !== null ? Math.round(rc.averageMark) : null,
        },
      });
      reportCardsUpdated++;
    }

    console.log("=== Summary ===");
    console.log(`ReportCardSubject rows checked: ${subjects.length}, updated: ${subjectsUpdated}`);
    console.log(`ReportCard rows checked: ${reportCards.length}, updated: ${reportCardsUpdated}`);
    console.log("\n✅ Report card decimal fix completed!");
  } catch (error) {
    console.error("❌ Error fixing report card decimals:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixReportCardDecimals();
