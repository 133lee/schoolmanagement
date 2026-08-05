// Load environment variables
require('dotenv').config();

// Import from the TypeScript file using ts-node or tsx
const prisma = require('../lib/db/prisma.ts').default;

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      take: 10,
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    console.log('Total users found:', users.length);
    console.log('Users:');
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error querying users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
