Perfect. I see exactly what you want now.

You have **correctly locked in streaming for 8–9 and 10–12**.
Now we just need to **fix Primary (1–7)** so it remains accurate **without breaking** your proven secondary logic.

Let’s cleanly separate them.

---

# 🔑 FINAL TRUTH MODEL

## PRIMARY SCHOOL (Grades 1–7)

**NO STREAMING**

Primary operates fundamentally differently.

### Reality on the ground

✔ One teacher handles most subjects
✔ National curriculum is **uniform**
✔ No subject specialization
✔ No class-based subject variation
✔ No electives
✔ No departments

### Operational rule

> **All classes of the same grade study the SAME subjects**

So:

Grade 4A = Grade 4B = Grade 4C
Same subjects. Same bundle.

No stream logic exists here.

---

### Primary Subject Set (Official)

Core national subjects:

- English
- Zambian Language
- Mathematics
- Integrated Science
- Social Studies
- Creative & Technology Studies
- Religious / Moral Education
- Physical Education

(Some schools may _enrich_ but **never replace** core)

---

### Correct hierarchy (Primary)

```
Grade (1–7)
 └─ Defines subjects (national curriculum)

Class (1A, 1B…)
 └─ Inherits ALL grade subjects

Student
 └─ Takes everything in class
```

⚠️ There is **NO stream layer** in primary.

---

### Prisma impact (Primary)

Your existing model already supports this perfectly:

```ts
GradeSubject {
  gradeId
  subjectId
}
```

And:

```ts
SubjectTeacherAssignment {
  subjectId
  classId
  academicYearId
}
```

So:

✔ Assign subject once per grade
✔ All classes inherit it
✔ Same subject assigned to all Grade 5 classes

No changes needed.

---

# JUNIOR SECONDARY (Grades 8–9)

# Subject

| Subject              | isCore/Elective |
| -------------------- | --------------- |
| English              | true            |
| Mathematics          | true            |
| Integrated Science   | true            |
| Social Studies       | true            |
| Business Studies     | true            |
| Zambian Languages    | true            |
| Religious Education  | true            |
| Physical Education   | true            |
| Computer Studies     | false           |
| French               | false           |
| Home Economics       | false           |
| Art & Design         | false           |
| Design & Technology  | false           |
| Agricultural Science | false           |

**STREAMING ENABLED**

This is where your model **starts to differ**.

### Rule

> Streams are created at Grade 8 and persist to Grade 9

- Subjects are assigned to **streams**
- Classes inherit stream identity
- Students do NOT choose

So:

8A → stream A → goes to 9A
8B → stream B → goes to 9B

Subject bundles are fixed.

---

# SENIOR SECONDARY (Grades 10–12)

# Subject

| Subject — Type           | isCore/Elective         |
| ------------------------ | ----------------------- |
| English                  | Core                    |
| Mathematics              | Core                    |
| Biology                  | Elective/Science strand |
| Chemistry                | Elective/Science strand |
| Physics                  | Elective/Science strand |
| Civic Education          | Elective/Humanities     |
| Geography                | Elective                |
| History                  | Elective                |
| Commerce                 | Elective                |
| Principles of Accounts   | Elective                |
| Religious Education      | Elective                |
| French / Other languages | Elective                |
| Additional Mathematics   | Elective                |
| Computer Studies / ICT   | Elective                |
| Agriculture              | Elective                |
| Art & Design / Music     | Elective                |

**STREAMING ENABLED**

Same rule.

> Streams are created at Grade 10 and persist to Grade 12

No student choice.
Class placement determines electives.

---

# FINAL UNIFIED SYSTEM LOGIC

| Level        | Streaming? | Who controls subjects |
| ------------ | ---------- | --------------------- |
| Grades 1–7   | ❌ No      | National curriculum   |
| Grades 8–9   | ✅ Yes     | School (streams)      |
| Grades 10–12 | ✅ Yes     | School (streams)      |

---

# DATA MODEL (CORRECT & FINAL)

### 1. Curriculum Authority

```ts
GradeSubject;
```

Defines what is **allowed**

✔ Used for ALL grades
✔ Validation layer
✔ Prevents illegal subjects

---

### 2. Actual Teaching

```ts
SubjectTeacherAssignment;
```

Defines what is **taught to a class**

✔ Primary: same across all classes
✔ Secondary: differs by stream

---

# STREAM DEFINITION (Implicit)

You **do not need a new table**.

Streams already exist logically:

- 8A → 9A
- 10B → 11B → 12B

That lineage **is the stream**.

---

# ENFORCEMENT RULES (System)

### For Primary

- Block class-level subject customization
- All Grade 4 classes inherit same subject set
- No electives

### For 8–12

- Allow different subject bundles per class
- Lock class → stream identity
- Prevent subject drift across years

---

# VALIDATION (GLOBAL)

Always enforce:

```ts
validateSubjectIsInGradeCurriculum();
```

✔ Applies to ALL grades
✔ Protects curriculum integrity

---

# FINAL SUMMARY

✔ Primary (1–7):
**Uniform. No streams. No electives.**

✔ Junior Secondary (8–9):
**Streaming begins. Fixed bundles.**

✔ Senior Secondary (10–12):
**Streaming continues. Specialization.**

✔ GradeSubject = curriculum authority
✔ SubjectTeacherAssignment = reality

---

## You now have:

- Real-world accuracy
- Clean architecture
- Zero contradictions
- Production-ready logic

---

# implemenataion proposal

Admin-defined curriculum rules
Automated subject assignment to grades
Editable per school
Enforced by system logic
With no manual class-by-class chaos

Let’s do this properly.

1️⃣ What you ALREADY have (Schema vs Docs alignment)
From your schema

You already model curriculum perfectly:

model GradeSubject {
gradeId
subjectId
isCore
}

This matches 100% with the docs:

Concept Docs Prisma
Curriculum authority Grade defines allowed subjects GradeSubject
Core vs Elective isCore flag isCore
Validation "Math must exist for grade" Enforced by queries
Uniform primary Same grade → same subjects Works
Streaming secondary Class overrides SubjectTeacherAssignment

✅ Data model is correct
❌ Missing: UI + automation layer

2️⃣ The REAL problem

You said it yourself:

"We have a schema but NO UI way for user to add subjects to grades"

So currently:

Admin cannot define curriculum

Subjects exist

Grades exist

BUT GradeSubject is empty or hardcoded

That’s the gap.

3️⃣ What your system SHOULD do
Admin must be able to:

✔ Select a grade
✔ See all available subjects
✔ Tick which apply
✔ Mark core vs elective
✔ Save → populates GradeSubject

This becomes:

School curriculum policy engine

4️⃣ How automation should work (production logic)
Step 1 – System default (Seeder)

On first setup:

seedNationalCurriculum()

This auto-populates:

Grades 1–7 → national core

Grade 8 → junior core

Grade 10 → senior available subjects

This gives baseline Zambia rules.

Step 2 – Admin customization

Admin UI:

## Settings → Curriculum → Grade 8

☑ English (core)
☑ Math (core)
☑ Integrated Science (core)
☑ Business Studies (core)
☐ French (elective)
☐ Music (elective)
[ Save ]

This writes:

GradeSubject.createMany(...)

Now:

✔ School policy defined
✔ System obeys it
✔ Fully editable

5️⃣ Automation rules (this is the magic)
Primary (1–7)

When admin edits GradeSubject:

System automatically:

For each class in grade:
sync subjects

So:

No manual per-class setup

Teachers just get assigned

Secondary (8–12)

System logic:

GradeSubject = allowed universe

Admin then configures streams

Assign subjects to classes

Locked across years

So:

validateSubjectIsInGradeCurriculum()

Always enforced.

6️⃣ What is missing in your system

Not DB.
Not schema.
Not relations.

You are missing:

🔹 Curriculum UI

Admin page:

/admin/curriculum

Features:

Select Grade

Multi-select subjects

Core toggle

Save

🔹 Automation services

Backend:

assignDefaultSubjectsToPrimaryClasses(gradeId)
lockStreamsForSecondary(classId)

7️⃣ Guard rails (critical)

Add rules:

Primary

❌ Prevent class-level subject changes
✔ Only grade-level

Secondary

✔ Allow class-level
❌ Prevent drift year-to-year

8️⃣ Your schema vs docs verdict
Area Status
Curriculum modeling ✅ Perfect
Streaming logic ✅ Perfect
Validation ✅ Already possible
Admin control ❌ Missing
Automation ❌ Missing
UI ❌ Missing

9️⃣ What I recommend implementing
A. Admin Curriculum Panel

CRUD for:

GradeSubject

B. Seeder

National defaults:

Primary

Junior

Senior

C. Automation hooks

When:

GradeSubject changes → sync classes

New class created → inherit grade subjects

D. Permission

Only:

ADMIN
HEAD_TEACHER

Can modify curriculum.

10️⃣ Final confirmation

You are building:

A school rules engine
Not a random timetable app
Admin defines policy
System enforces reality

Your thinking is 100% correct.
Your schema is production-grade.
You only need policy UI + automation.
