# Automated Timetable Generation - Technical Specification

**Date**: 2026-01-01
**Status**: Planning Phase
**Priority**: HIGH - Core differentiator for system adoption

---

## Executive Summary

**Problem**: Manual timetable creation is time-consuming and error-prone. Schools need automated generation to see value in adopting this system.

**Solution**: Implement automated timetable generation using third-party libraries with constraint satisfaction to generate conflict-free timetables in seconds.

**Value Proposition**:
- ✅ Generate complete school timetable in seconds (vs days manually)
- ✅ Zero clashes (teacher/class conflicts impossible)
- ✅ Respects all hard and soft constraints
- ✅ Balanced teacher workload
- ✅ Optimized for student learning (grade-specific restrictions)

---

## User Answers to Requirements

### Q1: Implementation Approach
**Answer**: **Third-party library**
Use existing, battle-tested timetable generation libraries rather than building from scratch.

### Q2: Hard Constraints (MUST satisfy)
1. ✅ No teacher in two places at once
2. ✅ No class with two subjects at once
3. ✅ Teachers only teach subjects they're assigned to (via `SubjectTeacherAssignment`)
4. ✅ Respect time slot limits (e.g., 8 periods per day)
5. ✅ Lunch break (e.g., 12:00-13:00, no classes)

### Q3: Soft Constraints (Should optimize for)
1. ✅ Balanced workload (spread subjects evenly across week)
2. ✅ Minimize teacher free periods (unless teacher has limited subjects)
3. ✅ Avoid consecutive identical subjects for same class
4. ✅ Grade-specific restrictions (e.g., younger grades in morning)

### Q4: Manual Editing After Generation
**Answer**: **Editable with clash prevention**
- Users can manually adjust generated timetable
- System warns if manual changes create clashes
- User can override warnings (but discouraged)
- Goal: Minimize manual editing by generating high-quality timetable

### Q5: Timeline Priority
**Answer**: **Optimal quality** (3-4 weeks development)
Focus on getting it right rather than rushing a basic solution.

---

## Technical Requirements

### Input Data Required

```typescript
interface TimetableGenerationInput {
  // Core identifiers
  termId: string;              // Which term to generate for
  academicYearId: string;      // Which academic year

  // Scope (optional - defaults to all)
  gradeIds?: string[];         // Generate for specific grades only
  classIds?: string[];         // Generate for specific classes only

  // Hard Constraints
  hardConstraints: {
    periodsPerDay: number;              // e.g., 8
    schoolDays: DayOfWeek[];           // e.g., [MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY]
    lunchBreak: {
      dayOfWeek: DayOfWeek[];          // Which days (usually all)
      timeSlotIds: string[];           // Which time slots (e.g., Period 4)
    };
    maxTeacherPeriodsPerDay?: number;  // e.g., 6 (optional)
  };

  // Soft Constraints (preferences)
  softConstraints?: {
    balanceWorkload: boolean;                    // Spread subjects evenly
    minimizeTeacherFreePeriods: boolean;        // Reduce gaps in teacher schedule
    avoidConsecutiveIdenticalSubjects: boolean; // Don't repeat same subject back-to-back
    gradeTimePreferences?: {                    // Grade-specific time restrictions
      gradeId: string;
      preferredTimeSlots?: string[];            // e.g., morning slots for younger grades
      avoidTimeSlots?: string[];                // e.g., late afternoon for younger grades
    }[];
  };

  // Algorithm settings
  algorithm?: 'greedy' | 'genetic' | 'auto'; // Default: 'auto' (picks best for input size)
  maxGenerationTime?: number;                 // Max seconds to try (default: 60)
}
```

### Output Data Structure

```typescript
interface TimetableGenerationResult {
  success: boolean;

  // Generated timetable entries
  timetable: SecondaryTimetable[];  // Or ClassTimetable[] for primary

  // Generation metadata
  metadata: {
    algorithm: string;                  // Which algorithm was used
    generationTimeMs: number;          // How long it took
    totalEntriesGenerated: number;     // Number of timetable entries
    completionRate: number;            // 0-100% (100% = fully scheduled)
  };

  // Constraint satisfaction stats
  constraints: {
    hardConstraintsSatisfied: boolean;
    hardConstraintViolations: ConstraintViolation[];
    softConstraintScore: number;        // 0-100 (higher is better)
    softConstraintDetails: {
      workloadBalance: number;          // 0-100
      teacherFreePeriods: number;       // 0-100
      consecutiveSubjects: number;      // 0-100
      gradeTimePreferences: number;     // 0-100
    };
  };

  // Warnings/issues
  warnings: Warning[];

  // Conflicts (if any)
  conflicts: Conflict[];

  // Unscheduled items (if couldn't fit everything)
  unscheduled?: {
    classId: string;
    subjectId: string;
    reason: string;
  }[];
}

interface ConstraintViolation {
  type: 'TEACHER_CLASH' | 'CLASS_CLASH' | 'LUNCH_BREAK' | 'MAX_PERIODS' | 'NO_ASSIGNMENT';
  severity: 'ERROR' | 'WARNING';
  message: string;
  affectedEntries: string[];  // Timetable entry IDs
}

interface Warning {
  type: 'WORKLOAD_IMBALANCE' | 'MANY_FREE_PERIODS' | 'CONSECUTIVE_SUBJECTS' | 'SUBOPTIMAL_TIME';
  message: string;
  affectedEntity: {
    type: 'TEACHER' | 'CLASS' | 'SUBJECT';
    id: string;
    name: string;
  };
}
```

---

## Algorithm Research Summary

### Industry Standard: Genetic Algorithms

Based on research from:
- [AI Optimization of Academic Timetable (2025)](https://ijsdr.org/papers/IJSDR2504317.pdf)
- [University Course Timetabling Using Genetic Algorithms](https://www.researchgate.net/publication/346969094_University_Course_Timetabling_Using_Genetic_Algorithms)
- [Automated Timetable Generation](https://www.ijert.org/automated-timetable-generation-using-genetic-algorithm)

**Key Findings**:
1. **NP-Hard Problem**: Timetabling is computationally complex
2. **Genetic Algorithms**: Most effective for complex constraints (90-99% optimal)
3. **Performance**: Small schools (200-500 students) solved in tens of seconds
4. **Constraint Handling**: Fitness function penalizes hard constraint violations, rewards soft constraint satisfaction

### Third-Party Library Options

| Library | Language | Algorithm | Pros | Cons |
|---------|----------|-----------|------|------|
| **genetic-js** | JavaScript | Genetic Algorithm | Easy integration, lightweight | Limited timetabling features |
| **Optaplanner** | Java (with Node wrapper) | Constraint Programming | Industry standard, very powerful | Heavy, requires JVM |
| **OR-Tools** | Python/JS | Constraint Programming | Google-backed, excellent | Learning curve |
| **Custom Python GA → API** | Python | Genetic Algorithm | Full control, proven examples | Extra service to maintain |

**Recommendation**: Research phase needed to test integration complexity.

---

## Database Schema Support

### Existing Models (Already Support This)

✅ **SecondaryTimetable** (Grades 8-12):
```prisma
model SecondaryTimetable {
  id             String   @id @default(cuid())
  classId        String
  subjectId      String
  teacherId      String
  academicYearId String
  termId         String
  dayOfWeek      DayOfWeek
  timeSlotId     String

  // Unique constraints prevent clashes at DB level
  @@unique([classId, termId, dayOfWeek, timeSlotId])  // No class clash
  @@unique([teacherId, termId, dayOfWeek, timeSlotId]) // No teacher clash
}
```

✅ **SubjectTeacherAssignment** (Who can teach what):
```prisma
model SubjectTeacherAssignment {
  teacherId      String
  subjectId      String
  classId        String
  academicYearId String

  @@unique([teacherId, subjectId, classId, academicYearId])
}
```

✅ **SubjectPeriodRequirement** (How many periods per week):
```prisma
model SubjectPeriodRequirement {
  gradeId        String
  subjectId      String
  periodsPerWeek Int  // e.g., Math = 5 periods/week

  @@unique([gradeId, subjectId])
}
```

✅ **TimeSlot** (Period definitions):
```prisma
model TimeSlot {
  id        String @id
  label     String  // "Period 1"
  startTime String  // "08:00"
  endTime   String  // "09:00"
}
```

### What's Missing (Need to Add)

❌ **TimetableGenerationHistory** (Track generation attempts):
```prisma
model TimetableGenerationHistory {
  id                String   @id @default(cuid())
  termId            String
  academicYearId    String
  generatedBy       String   // userId who triggered generation

  // Input parameters (JSON)
  inputParameters   Json

  // Results
  success           Boolean
  algorithm         String
  generationTimeMs  Int
  completionRate    Float

  // Constraint stats
  hardConstraintsSatisfied Boolean
  softConstraintScore      Float

  // Generated entries count
  entriesGenerated  Int

  // Warnings/errors (JSON)
  warnings          Json?
  errors            Json?

  createdAt DateTime @default(now())

  term Term @relation(fields: [termId], references: [id])
  user User @relation(fields: [generatedBy], references: [id])

  @@index([termId])
  @@index([generatedBy])
  @@map("timetable_generation_history")
}
```

❌ **TimetableConstraintConfig** (School-specific constraint settings):
```prisma
model TimetableConstraintConfig {
  id              String @id @default(cuid())
  schoolId        String? // Future: Multi-school support

  // Hard constraints
  periodsPerDay   Int @default(8)
  schoolDays      Json // ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]
  lunchBreakSlots Json // { "days": ["MONDAY", ...], "timeSlotIds": ["slot-id"] }

  // Soft constraints (weights 0-100)
  balanceWorkloadWeight            Int @default(80)
  minimizeFreePeriodWeight         Int @default(60)
  avoidConsecutiveSubjectsWeight   Int @default(70)
  gradeTimePreferencesWeight       Int @default(50)

  // Grade-specific preferences (JSON)
  gradeTimePreferences Json? // { "grade-8-id": { "preferred": [...], "avoid": [...] } }

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("timetable_constraint_configs")
}
```

---

## API Endpoints Needed

### 1. Generate Timetable
```typescript
POST /api/timetables/generate

Request Body:
{
  termId: string;
  academicYearId: string;
  gradeIds?: string[];
  classIds?: string[];
  hardConstraints: {...};
  softConstraints?: {...};
  algorithm?: 'greedy' | 'genetic' | 'auto';
}

Response: TimetableGenerationResult
```

### 2. Get Generation History
```typescript
GET /api/timetables/generation-history?termId={termId}

Response:
{
  history: TimetableGenerationHistory[];
}
```

### 3. Get Constraint Configuration
```typescript
GET /api/timetables/constraints/config

Response:
{
  config: TimetableConstraintConfig;
}
```

### 4. Update Constraint Configuration
```typescript
PUT /api/timetables/constraints/config

Request Body: TimetableConstraintConfig

Response:
{
  success: boolean;
  config: TimetableConstraintConfig;
}
```

### 5. Preview Generation (Dry Run)
```typescript
POST /api/timetables/generate/preview

Request Body: Same as /generate

Response: TimetableGenerationResult (but doesn't save to DB)
```

---

## UI Components Needed

### 1. Timetable Generator Page
**Route**: `/dashboard/timetables/generate`

**Components**:
- Term selector
- Grade/class scope selector
- Constraint configuration form
  - Hard constraints (periods/day, lunch break, etc.)
  - Soft constraints with weight sliders
- "Generate" button
- Progress indicator
- Results display:
  - Success/failure status
  - Completion rate
  - Constraint satisfaction scores
  - Warnings list
  - Conflicts list
  - Preview grid of generated timetable

### 2. Constraint Configuration Page
**Route**: `/dashboard/timetables/settings`

**Components**:
- School-wide defaults
- Grade-specific time preferences
- Constraint weight adjustments
- Save/reset buttons

### 3. Generation History Page
**Route**: `/dashboard/timetables/history`

**Components**:
- List of past generation attempts
- Filters (by term, user, success/failure)
- Comparison view (compare two generation results)
- Rollback feature (restore previous generation)

### 4. Manual Timetable Editor (Post-Generation)
**Route**: `/dashboard/timetables/edit/{termId}`

**Components**:
- Grid view of timetable (days × periods)
- Drag-and-drop to reassign
- Real-time clash detection (visual warnings)
- Teacher/class filter views
- Conflict resolver sidebar

---

## Implementation Phases

### Phase 1: Research & Setup (Week 1)
- [ ] Evaluate third-party libraries
- [ ] Create proof-of-concept with top 2 candidates
- [ ] Choose final library
- [ ] Add missing Prisma models (`TimetableGenerationHistory`, `TimetableConstraintConfig`)
- [ ] Run migrations

### Phase 2: Core Generation Engine (Week 2)
- [ ] Implement generation service using chosen library
- [ ] Map our database models to library's input format
- [ ] Implement hard constraint validation
- [ ] Implement soft constraint optimization
- [ ] Create API endpoint `/api/timetables/generate`
- [ ] Write unit tests for generation logic

### Phase 3: API & Database Integration (Week 3)
- [ ] Create all API endpoints
- [ ] Implement generation history tracking
- [ ] Implement constraint configuration CRUD
- [ ] Add proper error handling
- [ ] Add logging and monitoring
- [ ] Integration tests for APIs

### Phase 4: UI Development (Week 4)
- [ ] Create generator page with form
- [ ] Create results display component
- [ ] Create constraint configuration page
- [ ] Create generation history page
- [ ] Create manual editor (basic drag-drop)
- [ ] Add clash detection warnings in UI
- [ ] User acceptance testing

### Phase 5: Polish & Optimization (Week 5)
- [ ] Performance optimization
- [ ] Better error messages
- [ ] UI/UX improvements
- [ ] Documentation
- [ ] Admin user guide
- [ ] Deploy to production

---

## Success Metrics

### Technical Metrics
- ✅ Generation completes in < 60 seconds for school of 500 students
- ✅ 100% hard constraint satisfaction
- ✅ > 85% soft constraint score on average
- ✅ < 5% manual adjustments needed post-generation

### User Adoption Metrics
- ✅ Schools report 90%+ time savings vs manual timetabling
- ✅ Zero reported teacher/class clashes in production use
- ✅ Users rate automated generation as "very helpful" or "essential"

---

## Risk Assessment

### High Risk
1. **Library Integration Complexity**
   *Mitigation*: PoC phase to validate before committing

2. **Complex Constraint Satisfaction**
   *Mitigation*: Start with hard constraints only, add soft gradually

3. **Performance for Large Schools**
   *Mitigation*: Load testing, optimization phase planned

### Medium Risk
1. **User Expectations vs Reality**
   *Mitigation*: Clear documentation that manual tweaks may be needed

2. **Edge Cases in School Structure**
   *Mitigation*: Comprehensive testing with real school data

### Low Risk
1. **UI Complexity**
   *Mitigation*: Iterative development, user feedback loops

---

## Open Questions

1. **Library Choice**: Which third-party library best fits our stack?
   - Needs research in Phase 1

2. **Multi-Tenancy**: Single constraint config per school or per term?
   - Recommendation: Per school (can override per term if needed)

3. **Rollback Strategy**: How to handle re-generation (clear old, append, version)?
   - Recommendation: Version-based (keep history, activate one)

4. **Performance**: What's acceptable generation time?
   - Target: < 30 seconds for 90% of cases
   - Max: 60 seconds with progress bar

5. **Manual Overrides**: Store which entries were manually changed?
   - Recommendation: Yes, add `isManualOverride: boolean` to timetable entries

---

## Next Steps

1. ✅ Document requirements (this document)
2. 🔄 Explore what's missing in the system
3. ⏳ Research third-party libraries (Phase 1)
4. ⏳ Create PoC with top candidates
5. ⏳ Present findings and get approval to proceed
6. ⏳ Begin Phase 2 implementation

---

## References

### Research Papers
- [AI Optimization of Academic Timetable (2025)](https://ijsdr.org/papers/IJSDR2504317.pdf)
- [Student Timetabling Genetic Algorithm](https://pmc.ncbi.nlm.nih.gov/articles/PMC10280284/)
- [University Course Timetabling Using GA](https://www.researchgate.net/publication/346969094_University_Course_Timetabling_Using_Genetic_Algorithms)
- [Dynamic Timetable Using Constraint Satisfaction](https://link.springer.com/chapter/10.1007/978-81-322-2517-1_73)

### Code Examples
- [Python GA Implementation](https://github.com/hayrapetyan-armine/Timetable)
- [Java Implementation](https://github.com/pranavkhurana/Time-table-scheduler)
- [Automated Timetable Generator](https://github.com/imamaaa/automated-timetable-generator)

### Commercial Systems (for inspiration)
- [Fedena Timetable Management](https://fedena.com/feature-tour/timetable-management-system)
- [aSc TimeTables](https://www.asctimetables.com/)
- [Vidyalaya AI Timetable](https://www.vidyalayaschoolsoftware.com/ai-timetable-generator-for-school)

---

**Document Version**: 1.0
**Last Updated**: 2026-01-01
**Author**: Claude Code
**Status**: Approved - Ready for Phase 1
