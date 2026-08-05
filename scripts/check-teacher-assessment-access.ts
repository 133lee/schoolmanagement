/**
 * Check Teacher Assessment Access
 *
 * Run: npm run check:teacher:assessment:access
 */

const API_BASE_URL = "http://localhost:3000/api";

// Use your actual logged-in credentials
const TEST_CREDENTIALS = {
  email: "misheck@gmail.com",
  password: "teacher123",
};

async function apiRequest(endpoint: string, options: RequestInit = {}, token?: string): Promise<any> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  return { status: response.status, data };
}

async function checkTeacherAssessmentAccess() {
  console.log("=== Checking Teacher Assessment Access ===\n");

  try {
    // 1. Login
    console.log(`🔐 Logging in as: ${TEST_CREDENTIALS.email}`);
    const loginRes = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify(TEST_CREDENTIALS),
    });

    if (loginRes.status !== 200) {
      throw new Error(`Login failed: ${loginRes.data.error}`);
    }

    const token = loginRes.data.data?.token || loginRes.data.token;
    const user = loginRes.data.data?.user || loginRes.data.user;
    console.log(`✅ Logged in as: ${user.email} (Role: ${user.role})\n`);

    // 2. Get terms
    console.log("📅 Fetching terms from /terms...");
    const termsRes = await apiRequest("/terms", {}, token);

    if (termsRes.status !== 200) {
      console.error(`❌ Failed to fetch terms: ${termsRes.data.error}`);
      return;
    }

    const termsData = termsRes.data.data || termsRes.data;
    const terms = Array.isArray(termsData) ? termsData : (termsData.data || []);

    console.log(`\n✅ Found ${terms.length} terms`);
    const activeTerm = terms.find((t: any) => t.isActive);

    if (activeTerm) {
      console.log(`  Active term: ${activeTerm.termType} ${activeTerm.academicYear?.year || ''} (ID: ${activeTerm.id})`);
    } else {
      console.log(`  ⚠️  WARNING: No active term found!`);
      console.log(`     UI will NOT fetch assessments without an active term.`);
      if (terms.length > 0) {
        console.log(`     Available terms:`, terms.map((t: any) => `${t.termType} ${t.academicYear?.year || ''} (isActive: ${t.isActive})`));
      }
    }
    console.log();

    // 3. Get teacher's classes
    console.log("📚 Fetching teacher's classes from /teacher/classes...");
    const classesRes = await apiRequest("/teacher/classes", {}, token);

    if (classesRes.status !== 200) {
      console.error(`❌ Failed to fetch classes: ${classesRes.data.error}`);
      return;
    }

    console.log("\nTeacher's Classes:");
    console.log(JSON.stringify(classesRes.data, null, 2));

    // Handle Golden Rule response structure: { success: true, data: {...} }
    const actualData = classesRes.data.data || classesRes.data;
    const classTeacherClasses = actualData.classTeacherClasses || [];
    const subjectTeacherClasses = actualData.subjectTeacherClasses || [];

    const classTeacherIds = classTeacherClasses.map((c: any) => c.id);
    const subjectTeacherIds = subjectTeacherClasses.map((c: any) => c.id);

    console.log(`\n📊 Summary:`);
    console.log(`  Class Teacher for ${classTeacherClasses.length} classes:`, classTeacherIds);
    console.log(`  Subject Teacher for ${subjectTeacherClasses.length} classes:`, subjectTeacherIds);

    if (classTeacherIds.length === 0 && subjectTeacherIds.length === 0) {
      console.log("\n⚠️  WARNING: Teacher has NO class assignments!");
      console.log("   This is why UI shows empty state.");
      console.log("\n   To fix:");
      console.log("   1. Assign teacher as Class Teacher for a class, OR");
      console.log("   2. Create SubjectTeacherAssignment records for this teacher");
      return;
    }

    // 3. Fetch assessments
    console.log("\n📝 Fetching assessments from /assessments...");
    const assessmentsRes = await apiRequest("/assessments?pageSize=20", {}, token);

    if (assessmentsRes.status !== 200) {
      console.error(`❌ Failed to fetch assessments: ${assessmentsRes.data.error}`);
      return;
    }

    // Handle Golden Rule response structure
    const actualAssessmentsData = assessmentsRes.data.data || assessmentsRes.data;
    const assessments = actualAssessmentsData.data || actualAssessmentsData || [];
    console.log(`\n✅ API returned ${assessments.length} total assessments`);

    if (assessments.length === 0) {
      console.log("   No assessments exist in the database for any class.");
      return;
    }

    // 4. Filter by teacher's classes (same logic as UI)
    const classTeacherAssessments = assessments.filter((a: any) =>
      classTeacherIds.includes(a.class?.id)
    );
    const subjectTeacherAssessments = assessments.filter((a: any) =>
      subjectTeacherIds.includes(a.class?.id)
    );

    console.log(`\n📊 Filtered Results (UI Logic):`);
    console.log(`  Class Teacher assessments: ${classTeacherAssessments.length}`);
    console.log(`  Subject Teacher assessments: ${subjectTeacherAssessments.length}`);

    if (classTeacherAssessments.length === 0 && subjectTeacherAssessments.length === 0) {
      console.log("\n❌ PROBLEM FOUND: No assessments match teacher's assigned classes!");
      console.log("\n   All assessments in database:");
      assessments.forEach((a: any) => {
        console.log(`     - ${a.title} (Class ID: ${a.class?.id}, Subject: ${a.subject?.name})`);
      });
      console.log("\n   Teacher's class IDs:");
      console.log(`     - Class Teacher: ${classTeacherIds.join(", ") || "NONE"}`);
      console.log(`     - Subject Teacher: ${subjectTeacherIds.join(", ") || "NONE"}`);
      console.log("\n   ✅ FIX: Create assessments for classes this teacher is assigned to, OR");
      console.log("           Assign this teacher to the classes that have assessments.");
    } else {
      console.log("\n✅ SUCCESS: Teacher has access to assessments!");
      console.log("\n   Class Teacher Assessments:");
      classTeacherAssessments.forEach((a: any) => {
        console.log(`     - ${a.title} (${a.examType}) - ${a.class?.name}`);
      });
      console.log("\n   Subject Teacher Assessments:");
      subjectTeacherAssessments.forEach((a: any) => {
        console.log(`     - ${a.title} (${a.examType}) - ${a.class?.name} - ${a.subject?.name}`);
      });
    }

  } catch (error) {
    console.error("\n❌ Error:", error);
    if (error instanceof Error) {
      console.error("Message:", error.message);
    }
  }
}

checkTeacherAssessmentAccess();
