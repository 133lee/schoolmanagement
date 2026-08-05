// Seed default role-permission mappings for Zambian School Management System
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Default Permission Mappings by Role
 *
 * ADMIN: Full system access (all permissions)
 * HEAD_TEACHER: Most permissions except low-level system admin
 * DEPUTY_HEAD: Similar to HEAD_TEACHER but slightly limited
 * HOD: Department management and teaching permissions
 * TEACHER: Teaching and classroom management only
 * CLERK: Data entry and basic viewing
 */

const rolePermissions = {
  ADMIN: [
    // Student Management
    'CREATE_STUDENT',
    'READ_STUDENT',
    'UPDATE_STUDENT',
    'DELETE_STUDENT',

    // Class Management
    'CREATE_CLASS',
    'READ_CLASS',
    'UPDATE_CLASS',
    'DELETE_CLASS',

    // Assessment Management
    'CREATE_ASSESSMENT',
    'READ_ASSESSMENT',
    'UPDATE_ASSESSMENT',
    'DELETE_ASSESSMENT',
    'ENTER_RESULTS',

    // Teacher Management
    'CREATE_TEACHER',
    'READ_TEACHER',
    'UPDATE_TEACHER',
    'DELETE_TEACHER',

    // Reports
    'VIEW_REPORTS',
    'GENERATE_REPORTS',

    // System Admin
    'MANAGE_ROLES',
    'MANAGE_PERMISSIONS',
    'MANAGE_ACADEMIC_YEAR',
    'MANAGE_TERMS',
    'MANAGE_TIMETABLE',

    // Promotions
    'APPROVE_PROMOTION',

    // Attendance
    'MARK_ATTENDANCE',
    'VIEW_ATTENDANCE',
  ],

  HEAD_TEACHER: [
    // Student Management
    'CREATE_STUDENT',
    'READ_STUDENT',
    'UPDATE_STUDENT',
    'DELETE_STUDENT',

    // Class Management
    'CREATE_CLASS',
    'READ_CLASS',
    'UPDATE_CLASS',
    'DELETE_CLASS',

    // Assessment Management
    'CREATE_ASSESSMENT',
    'READ_ASSESSMENT',
    'UPDATE_ASSESSMENT',
    'DELETE_ASSESSMENT',
    'ENTER_RESULTS',

    // Teacher Management
    'CREATE_TEACHER',
    'READ_TEACHER',
    'UPDATE_TEACHER',
    // Note: No DELETE_TEACHER (requires ADMIN)

    // Reports
    'VIEW_REPORTS',
    'GENERATE_REPORTS',

    // System Admin
    // Note: No MANAGE_ROLES, MANAGE_PERMISSIONS (requires ADMIN)
    'MANAGE_ACADEMIC_YEAR',
    'MANAGE_TERMS',
    'MANAGE_TIMETABLE',

    // Promotions
    'APPROVE_PROMOTION',

    // Attendance
    'MARK_ATTENDANCE',
    'VIEW_ATTENDANCE',
  ],

  DEPUTY_HEAD: [
    // Student Management
    'CREATE_STUDENT',
    'READ_STUDENT',
    'UPDATE_STUDENT',
    // Note: No DELETE_STUDENT (requires HEAD_TEACHER or ADMIN)

    // Class Management
    'CREATE_CLASS',
    'READ_CLASS',
    'UPDATE_CLASS',
    'DELETE_CLASS',

    // Assessment Management
    'CREATE_ASSESSMENT',
    'READ_ASSESSMENT',
    'UPDATE_ASSESSMENT',
    'DELETE_ASSESSMENT',
    'ENTER_RESULTS',

    // Teacher Management
    'READ_TEACHER',
    'UPDATE_TEACHER',
    // Note: No CREATE_TEACHER, DELETE_TEACHER

    // Reports
    'VIEW_REPORTS',
    'GENERATE_REPORTS',

    // System Admin
    'MANAGE_ACADEMIC_YEAR',
    'MANAGE_TERMS',
    'MANAGE_TIMETABLE',

    // Promotions
    // Note: No APPROVE_PROMOTION (requires HEAD_TEACHER)

    // Attendance
    'MARK_ATTENDANCE',
    'VIEW_ATTENDANCE',
  ],

  HOD: [
    // Student Management (limited)
    'READ_STUDENT',
    'UPDATE_STUDENT', // Can update students in their department's classes

    // Class Management (for their department)
    'READ_CLASS',
    'UPDATE_CLASS',

    // Assessment Management (full for their department)
    'CREATE_ASSESSMENT',
    'READ_ASSESSMENT',
    'UPDATE_ASSESSMENT',
    'DELETE_ASSESSMENT',
    'ENTER_RESULTS',

    // Teacher Management (view department teachers)
    'READ_TEACHER',

    // Reports
    'VIEW_REPORTS',
    'GENERATE_REPORTS',

    // System Admin
    'MANAGE_TIMETABLE', // Can manage timetable (with department scope)

    // Attendance
    'MARK_ATTENDANCE',
    'VIEW_ATTENDANCE',
  ],

  TEACHER: [
    // Student Management (view and update their students)
    'READ_STUDENT',
    'UPDATE_STUDENT', // Limited to their classes

    // Class Management (view only)
    'READ_CLASS',

    // Assessment Management (for their subjects/classes)
    'CREATE_ASSESSMENT',
    'READ_ASSESSMENT',
    'UPDATE_ASSESSMENT',
    'DELETE_ASSESSMENT',
    'ENTER_RESULTS',

    // Teacher Management (view colleagues)
    'READ_TEACHER',

    // Reports (view/generate for their classes)
    'VIEW_REPORTS',
    'GENERATE_REPORTS',

    // Attendance
    'MARK_ATTENDANCE',
    'VIEW_ATTENDANCE',
  ],

  CLERK: [
    // Student Management (data entry)
    'CREATE_STUDENT',
    'READ_STUDENT',
    'UPDATE_STUDENT',
    // Note: No DELETE_STUDENT

    // Class Management (view and create)
    'CREATE_CLASS',
    'READ_CLASS',
    'UPDATE_CLASS',
    // Note: No DELETE_CLASS

    // Assessment Management (view only)
    'READ_ASSESSMENT',

    // Teacher Management (data entry)
    'CREATE_TEACHER',
    'READ_TEACHER',
    'UPDATE_TEACHER',
    // Note: No DELETE_TEACHER

    // Reports (view only)
    'VIEW_REPORTS',

    // Attendance (view only)
    'VIEW_ATTENDANCE',
  ],
};

async function seedPermissions() {
  console.log('🌱 Starting permission seeding...\n');

  try {
    // First, clear existing role permissions (idempotent seeding)
    console.log('🗑️  Clearing existing role permissions...');
    const deletedCount = await prisma.rolePermission.deleteMany({});
    console.log(`   Deleted ${deletedCount.count} existing role-permission mappings\n`);

    // Seed each role's permissions
    let totalCreated = 0;

    for (const [role, permissions] of Object.entries(rolePermissions)) {
      console.log(`📝 Seeding permissions for ${role}...`);

      const permissionsData = permissions.map(permission => ({
        role,
        permission,
      }));

      const result = await prisma.rolePermission.createMany({
        data: permissionsData,
        skipDuplicates: true, // Safety net
      });

      console.log(`   ✅ Created ${result.count} permissions for ${role}`);
      totalCreated += result.count;
    }

    console.log(`\n✨ Permission seeding completed successfully!`);
    console.log(`   Total role-permission mappings created: ${totalCreated}`);

    // Display summary
    console.log('\n📊 Summary by Role:');
    for (const [role, permissions] of Object.entries(rolePermissions)) {
      console.log(`   ${role}: ${permissions.length} permissions`);
    }

    // Verify seeding
    console.log('\n🔍 Verifying seed data...');
    const verifyCount = await prisma.rolePermission.count();
    console.log(`   Total permissions in database: ${verifyCount}`);

    if (verifyCount === totalCreated) {
      console.log('   ✅ Verification passed!\n');
    } else {
      console.warn(`   ⚠️  Warning: Expected ${totalCreated} but found ${verifyCount}\n`);
    }

  } catch (error) {
    console.error('❌ Error seeding permissions:', error);
    throw error;
  }
}

// Execute seeding
seedPermissions()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
