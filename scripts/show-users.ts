/**
 * Show all user accounts in the system
 */

import prisma from "@/lib/db/prisma";

async function showUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        email: true,
        role: true,
        isActive: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    console.log("\n=== User Accounts ===\n");
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Active: ${user.isActive}`);
      if (user.profile) {
        console.log(`   Name: ${user.profile.firstName} ${user.profile.lastName}`);
      }
      console.log("");
    });

    console.log("\n=== NOTE ===");
    console.log("Passwords are hashed using bcrypt and cannot be retrieved.");
    console.log("For development/testing, passwords are typically set during seeding.");
    console.log("Check your seed script or database documentation for default passwords.\n");

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

showUsers();
