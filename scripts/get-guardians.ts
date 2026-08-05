// Temporary script to get guardian IDs for testing
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(__dirname, "../.env") });

import prisma from "../lib/db/prisma";

async function getGuardians() {
  try {
    const guardians = await prisma.guardian.findMany({
      take: 10,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log("\n📋 Available Guardians in Database:\n");
    console.log("═══════════════════════════════════════════════════════");

    if (guardians.length === 0) {
      console.log("❌ No guardians found in database!");
      console.log("\nYou need to create a guardian first.");
      console.log("Navigate to: http://localhost:3000/admin/parents");
      return;
    }

    guardians.forEach((guardian, index) => {
      console.log(`\n${index + 1}. ${guardian.firstName} ${guardian.lastName}`);
      console.log(`   ID: ${guardian.id}`);
      console.log(`   Phone: ${guardian.phone}`);
      console.log(`   Email: ${guardian.email || 'N/A'}`);
    });

    console.log("\n═══════════════════════════════════════════════════════");
    console.log("\n✅ Copy one of the IDs above to use in your test route");
    console.log("\nUpdate line 14 in: app/api/sms/test-send/route.ts");
    console.log(`const TEST_GUARDIAN_ID = 'PASTE_ID_HERE';`);
    console.log("\n");

  } catch (error) {
    console.error("Error fetching guardians:", error);
  } finally {
    await prisma.$disconnect();
  }
}

getGuardians();
