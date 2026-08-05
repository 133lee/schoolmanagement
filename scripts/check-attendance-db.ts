import prisma from '../lib/db/prisma';

async function checkAttendance() {
  try {
    // Get all attendance records for January 2026
    const records = await prisma.attendanceRecord.findMany({
      where: {
        date: {
          gte: new Date('2026-01-01T00:00:00.000Z'),
          lte: new Date('2026-01-31T23:59:59.999Z')
        }
      },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    console.log('\n=== ALL ATTENDANCE RECORDS FOR JANUARY 2026 ===\n');
    console.log(`Total records: ${records.length}\n`);

    records.forEach(record => {
      const date = new Date(record.date);
      console.log(`Student: ${record.student.firstName} ${record.student.lastName}`);
      console.log(`  Date (stored): ${record.date.toISOString()}`);
      console.log(`  Date (local): ${date.toLocaleDateString()}`);
      console.log(`  UTC Day: ${date.getUTCDate()}`);
      console.log(`  UTC Hours: ${date.getUTCHours()}`);
      console.log(`  Status: ${record.status}`);
      console.log('---');
    });

    // Check specifically for January 26
    const jan26Records = records.filter(r => {
      const date = new Date(r.date);
      return date.getUTCDate() === 26;
    });

    console.log(`\n=== RECORDS FOR JANUARY 26 ===`);
    console.log(`Found ${jan26Records.length} records for Jan 26\n`);

    jan26Records.forEach(record => {
      console.log(`${record.student.firstName} ${record.student.lastName}: ${record.status}`);
      console.log(`  Stored as: ${record.date.toISOString()}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAttendance();
