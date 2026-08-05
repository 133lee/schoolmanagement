import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const subjects = await prisma.subject.findMany({
    orderBy: { code: 'asc' },
  });

  console.log('\n📚 Subjects in database:\n');
  subjects.forEach((s) => {
    console.log(`  ${s.code.padEnd(10)} - ${s.name}`);
  });
  console.log(`\n✅ Total: ${subjects.length} subjects\n`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
