/**
 * Cleanup Orphaned Users Script
 *
 * Removes users that don't have associated teacher profiles.
 * These are typically created by test scripts that failed to clean up properly.
 *
 * Run with: npx tsx scripts/cleanup-orphaned-users.ts
 */

import prisma from "@/lib/db/prisma";

async function cleanupOrphanedUsers() {
  console.log("🧹 Starting cleanup of orphaned users...\n");

  try {
    // Find all users without teacher profiles
    const orphanedUsers = await prisma.user.findMany({
      where: {
        profile: null,
        // Don't delete the seed users
        email: {
          not: {
            in: ["admin@school.zm", "head@school.zm", "teacher@school.zm"],
          },
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (orphanedUsers.length === 0) {
      console.log("✅ No orphaned users found");
      return;
    }

    console.log(`Found ${orphanedUsers.length} orphaned user(s):\n`);

    orphanedUsers.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Created: ${user.createdAt.toLocaleString()}`);
      console.log();
    });

    // Delete orphaned users
    const result = await prisma.user.deleteMany({
      where: {
        id: {
          in: orphanedUsers.map((u) => u.id),
        },
      },
    });

    console.log(`✅ Deleted ${result.count} orphaned user(s)`);

  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the cleanup
cleanupOrphanedUsers();
