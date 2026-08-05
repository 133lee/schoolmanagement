import prisma from "../lib/db/prisma";

async function checkSchema() {
  try {
    console.log("Checking database schema...\n");

    // Try to query a user to see the actual structure
    const user = await prisma.user.findFirst();

    if (user) {
      console.log("Sample user object:");
      console.log(JSON.stringify(user, null, 2));
    } else {
      console.log("No users found in database");
    }

    // Check if hasDefaultPassword exists in the type
    console.log("\nChecking TypeScript types...");
    const testUser: any = user;
    console.log("hasDefaultPassword field exists:", 'hasDefaultPassword' in (testUser || {}));

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchema();
