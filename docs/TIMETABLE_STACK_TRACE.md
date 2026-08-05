# Timetable Configuration - Full Stack Trace

**Status**: ✅ Fully Connected
**Feature**: Double Period Configuration for Timetable Solver

## Complete Data Flow: UI → API → Service → Repository → Prisma → Database

### 1. **Database Layer** (PostgreSQL)

**Table**: `timetable_configurations`

```sql
CREATE TABLE timetable_configurations (
  id TEXT PRIMARY KEY,
  academic_year_id TEXT UNIQUE NOT NULL,
  school_start_time TEXT NOT NULL,
  period_duration INTEGER NOT NULL,
  break_start_period INTEGER NOT NULL,
  break_duration INTEGER NOT NULL,
  periods_before_break INTEGER NOT NULL,
  periods_after_break INTEGER NOT NULL,
  total_periods INTEGER NOT NULL,
  allow_subject_preferences BOOLEAN DEFAULT false,
  allow_teacher_preferences BOOLEAN DEFAULT false,
  auto_assign_rooms BOOLEAN DEFAULT true,
  double_period_configs JSONB,  -- ✅ Stores double period configs
  last_generated_at TIMESTAMP,
  generated_by_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Example Data**:
```json
{
  "id": "cm123abc...",
  "academic_year_id": "cm123...",
  "school_start_time": "08:00",
  "period_duration": 40,
  "break_duration": 20,
  "double_period_configs": [
    {
      "subjectId": "cm456def...",
      "requiresDoublePeriod": true,
      "preferTimeOfDay": "MORNING"
    },
    {
      "subjectId": "cm789ghi...",
      "requiresDoublePeriod": true,
      "preferTimeOfDay": "ANY"
    }
  ]
}
```

---

### 2. **Prisma Schema Layer**

**File**: [prisma/schema.prisma](../prisma/schema.prisma:399-429)

```prisma
model TimetableConfiguration {
  id                       String          @id @default(cuid())
  academicYearId           String          @unique
  termId                   String?
  schoolStartTime          String
  periodDuration           Int
  breakStartPeriod         Int
  breakDuration            Int
  periodsBeforeBreak       Int
  periodsAfterBreak        Int
  totalPeriods             Int
  allowSubjectPreferences  Boolean         @default(false)
  allowTeacherPreferences  Boolean         @default(false)
  autoAssignRooms          Boolean         @default(true)
  doublePeriodConfigs      Json?           // ✅ JSON field for double period configs
  lastGeneratedAt          DateTime?
  generatedById            String?
  createdAt                DateTime        @default(now())
  updatedAt                DateTime        @updatedAt
  academicYear             AcademicYear    @relation(fields: [academicYearId], references: [id], onDelete: Cascade)
  term                     Term?           @relation(fields: [termId], references: [id])
  generatedBy              TeacherProfile? @relation(fields: [generatedById], references: [id])

  @@index([academicYearId])
  @@map("timetable_configurations")
}
```

**Generated Prisma Type**:
```typescript
// generated/prisma/models/TimetableConfiguration.ts
export type TimetableConfiguration = {
  id: string
  academicYearId: string
  termId: string | null
  schoolStartTime: string
  periodDuration: number
  breakStartPeriod: number
  breakDuration: number
  periodsBeforeBreak: number
  periodsAfterBreak: number
  totalPeriods: number
  allowSubjectPreferences: boolean
  allowTeacherPreferences: boolean
  autoAssignRooms: boolean
  doublePeriodConfigs: Prisma.JsonValue | null  // ✅ Can store any JSON
  lastGeneratedAt: Date | null
  generatedById: string | null
  createdAt: Date
  updatedAt: Date
}
```

---

### 3. **Repository Layer**

**File**: [features/timetables/timetableConfiguration.repository.ts](../features/timetables/timetableConfiguration.repository.ts)

```typescript
export class TimetableConfigurationRepository {
  // ✅ Create - Accepts doublePeriodConfigs via Prisma.TimetableConfigurationCreateInput
  async create(
    data: Prisma.TimetableConfigurationCreateInput
  ): Promise<TimetableConfiguration> {
    return await prisma.timetableConfiguration.create({ data });
  }

  // ✅ Update - Accepts doublePeriodConfigs via Prisma.TimetableConfigurationUpdateInput
  async update(
    id: string,
    data: Prisma.TimetableConfigurationUpdateInput
  ): Promise<TimetableConfiguration> {
    return await prisma.timetableConfiguration.update({
      where: { id },
      data,
    });
  }

  // ✅ Find - Returns full TimetableConfiguration including doublePeriodConfigs
  async findByAcademicYearId(
    academicYearId: string
  ): Promise<TimetableConfiguration | null> {
    return prisma.timetableConfiguration.findUnique({
      where: { academicYearId },
    });
  }
}
```

**Data Flow**:
- Repository methods use Prisma's generated types
- Prisma automatically handles JSON serialization/deserialization
- `doublePeriodConfigs` passed as plain JavaScript array/object
- Prisma converts to JSONB for PostgreSQL

---

### 4. **Service Layer**

**File**: [features/timetables/timetable.service.ts](../features/timetables/timetable.service.ts)

#### Input Interface

```typescript
export interface TimetableConfigInput {
  academicYearId: string;
  termId?: string;
  schoolStartTime: string;
  periodDuration: number;
  breakStartPeriod: number;
  breakDuration: number;
  periodsBeforeBreak: number;
  periodsAfterBreak: number;
  totalPeriods: number;
  allowSubjectPreferences?: boolean;
  allowTeacherPreferences?: boolean;
  autoAssignRooms?: boolean;
  doublePeriodConfigs?: DoublePeriodConfig[];  // ✅ Added to interface
}
```

#### Create/Update Method

```typescript
async createOrUpdateConfiguration(
  input: TimetableConfigInput,
  context: ServiceContext
): Promise<TimetableConfiguration> {
  // Validate and check permissions...

  const existing = await timetableConfigurationRepository.findByAcademicYearId(
    input.academicYearId
  );

  if (existing) {
    // ✅ Update - includes doublePeriodConfigs
    return timetableConfigurationRepository.update(existing.id, {
      // ... other fields
      doublePeriodConfigs: input.doublePeriodConfigs || [],  // ✅ Saved to database
    });
  } else {
    // ✅ Create - includes doublePeriodConfigs
    return timetableConfigurationRepository.create({
      academicYear: { connect: { id: input.academicYearId } },
      // ... other fields
      doublePeriodConfigs: input.doublePeriodConfigs || [],  // ✅ Saved to database
    });
  }
}
```

#### Generate Timetable Method

```typescript
async generateTimetable(
  academicYearId: string,
  context: ServiceContext
): Promise<GenerationResult> {
  // Get configuration
  const config = await timetableConfigurationRepository.findByAcademicYearIdWithRelations(
    academicYearId
  );

  // ✅ Extract doublePeriodConfigs from configuration
  const doublePeriodConfigs: DoublePeriodConfig[] = (config as any).doublePeriodConfigs || [];

  // ✅ Pass to solver
  const solverResult = solve({
    academicYearId,
    assignments,
    classSubjects,
    periodSlots,
    teacherAvailabilities: [],
    config: {
      schoolDays: [/* ... */],
      doublePeriodConfigs,  // ✅ Used by solver for activity generation
      // ... other config
    },
  });

  // Solver uses doublePeriodConfigs to:
  // 1. Generate double period activities for specified subjects
  // 2. Place them in consecutive slots
  // 3. Create 2 timetable_slots entries per double period
}
```

---

### 5. **API Layer**

**File**: [app/api/admin/timetable/configuration/route.ts](../app/api/admin/timetable/configuration/route.ts)

#### GET Endpoint

```typescript
export async function GET(request: NextRequest) {
  const context = getAuthContext(request);
  const academicYear = await prisma.academicYear.findFirst({
    where: { isActive: true },
  });

  // ✅ Returns configuration with doublePeriodConfigs
  const configuration = await timetableService.getConfiguration(
    academicYear.id,
    context
  );

  return NextResponse.json({ configuration });  // ✅ Includes doublePeriodConfigs
}
```

**Response Example**:
```json
{
  "configuration": {
    "id": "cm123...",
    "academicYearId": "cm456...",
    "schoolStartTime": "08:00",
    "periodDuration": 40,
    "doublePeriodConfigs": [
      {
        "subjectId": "cm789...",
        "requiresDoublePeriod": true,
        "preferTimeOfDay": "MORNING"
      }
    ]
  }
}
```

#### POST Endpoint

```typescript
export async function POST(request: NextRequest) {
  const context = getAuthContext(request);
  const body = await request.json();  // ✅ Includes doublePeriodConfigs

  // ✅ Passes entire body (including doublePeriodConfigs) to service
  const configuration = await timetableService.createOrUpdateConfiguration(
    body,
    context
  );

  return NextResponse.json({ configuration });
}
```

**Request Example**:
```json
{
  "academicYearId": "cm123...",
  "schoolStartTime": "08:00",
  "periodDuration": 40,
  "breakDuration": 20,
  "periodsBeforeBreak": 4,
  "periodsAfterBreak": 4,
  "totalPeriods": 8,
  "doublePeriodConfigs": [
    {
      "subjectId": "cm789ghi...",
      "subjectName": "Science",
      "requiresDoublePeriod": true,
      "preferTimeOfDay": "MORNING"
    }
  ]
}
```

---

### 6. **UI Layer**

**File**: [app/(dashboard)/admin/timetable/configuration/page.tsx](../app/(dashboard)/admin/timetable/configuration/page.tsx)

#### State Management

```typescript
const [doublePeriodConfigs, setDoublePeriodConfigs] = useState<DoublePeriodConfig[]>([]);
```

#### Fetching Configuration (GET)

```typescript
useEffect(() => {
  fetchConfiguration();
}, []);

const fetchConfiguration = async () => {
  const response = await fetch("/api/admin/timetable/configuration", {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();

  if (data.configuration) {
    // ✅ Load doublePeriodConfigs from API response
    if (data.configuration.doublePeriodConfigs) {
      setDoublePeriodConfigs(data.configuration.doublePeriodConfigs);
    }
  }
};
```

#### Saving Configuration (POST)

```typescript
const handleSaveConfiguration = async (e: React.FormEvent) => {
  e.preventDefault();

  const response = await fetch("/api/admin/timetable/configuration", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ...formData,
      totalPeriods: formData.periodsBeforeBreak + formData.periodsAfterBreak,
      doublePeriodConfigs,  // ✅ Sent to API
    }),
  });

  // Handle response...
};
```

#### UI Components

```tsx
{/* Double Period Configuration Section */}
<div className="space-y-4">
  <h3 className="text-lg font-semibold">
    Double Periods (80 minutes for Practicals)
  </h3>

  {/* Subject List */}
  {subjects.map((subject) => {
    const config = doublePeriodConfigs.find(
      (c) => c.subjectId === subject.id
    );
    const isEnabled = !!config;

    return (
      <div key={subject.id} className="flex items-center gap-4">
        {/* Checkbox to enable/disable double period */}
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={() => toggleDoublePeriod(subject.id, subject.name)}
        />

        {/* Subject Name */}
        <span>{subject.name}</span>

        {/* Time Preference Dropdown (if enabled) */}
        {isEnabled && (
          <select
            value={config.preferTimeOfDay || "ANY"}
            onChange={(e) => updateTimePreference(subject.id, e.target.value)}
          >
            <option value="ANY">Any Time</option>
            <option value="MORNING">Morning</option>
            <option value="AFTERNOON">Afternoon</option>
          </select>
        )}
      </div>
    );
  })}

  {/* Status Display */}
  {doublePeriodConfigs.length > 0 && (
    <p className="text-xs text-muted-foreground">
      {doublePeriodConfigs.length} subject(s) configured for double periods
    </p>
  )}
</div>
```

---

## Complete Data Flow Summary

### Saving Configuration

```
User Interface (Configuration Page)
  ↓ User clicks "Save Configuration"
  ↓ doublePeriodConfigs state: [{ subjectId: "...", requiresDoublePeriod: true, preferTimeOfDay: "MORNING" }]
  ↓
POST /api/admin/timetable/configuration
  ↓ Body: { ...formData, doublePeriodConfigs: [...] }
  ↓
API Route Handler
  ↓ const body = await request.json()
  ↓
timetableService.createOrUpdateConfiguration(body, context)
  ↓ input.doublePeriodConfigs = [...]
  ↓
timetableConfigurationRepository.update(id, { doublePeriodConfigs: [...] })
  ↓ Prisma UpdateInput
  ↓
prisma.timetableConfiguration.update({ where: { id }, data: { doublePeriodConfigs: [...] } })
  ↓ JSON.stringify([...])
  ↓
PostgreSQL JSONB Storage
  ✅ Data saved to timetable_configurations.double_period_configs
```

### Loading Configuration

```
PostgreSQL Database
  ↓ SELECT * FROM timetable_configurations WHERE academic_year_id = '...'
  ↓ double_period_configs: [{"subjectId": "...", "requiresDoublePeriod": true, ...}]
  ↓
Prisma Query
  ↓ prisma.timetableConfiguration.findUnique({ where: { academicYearId } })
  ↓ JSON.parse() automatically
  ↓
Repository
  ↓ Returns TimetableConfiguration object
  ↓
Service Layer
  ↓ timetableService.getConfiguration(academicYearId, context)
  ↓
API Route
  ↓ GET /api/admin/timetable/configuration
  ↓ NextResponse.json({ configuration: { doublePeriodConfigs: [...] } })
  ↓
UI Component
  ↓ const data = await response.json()
  ↓ setDoublePeriodConfigs(data.configuration.doublePeriodConfigs)
  ✅ UI displays double period checkboxes with correct state
```

### Using in Timetable Generation

```
User clicks "Generate Timetable"
  ↓
POST /api/admin/timetable/generate
  ↓
timetableService.generateTimetable(academicYearId, context)
  ↓
const config = await repository.findByAcademicYearIdWithRelations(academicYearId)
  ↓ config.doublePeriodConfigs = [{ subjectId: "...", requiresDoublePeriod: true, ... }]
  ↓
const doublePeriodConfigs = config.doublePeriodConfigs || []
  ↓
solve({ config: { doublePeriodConfigs, ... } })
  ↓
Activity Generator
  ↓ Checks if subject needs double period: doublePeriodConfigs.find(c => c.subjectId === subjectId)
  ↓ If yes: Creates Activity with isDoublePeriod: true
  ↓
Constraint Checker
  ↓ For double periods: Checks TWO consecutive slots are free
  ↓
Solver
  ↓ Places double period in consecutive slots (period N and N+1)
  ↓
Database Writer
  ↓ Creates TWO TimetableSlot entries for each double period
  ↓
prisma.timetableSlot.createMany({ data: [...slotEntries] })
  ✅ Timetable generated with double periods
```

---

## Verification Checklist

- ✅ **Database**: `timetable_configurations` table has `double_period_configs` JSONB column
- ✅ **Prisma**: TimetableConfiguration model has `doublePeriodConfigs Json?` field
- ✅ **Repository**: Uses Prisma types, automatically handles JSON
- ✅ **Service Interface**: TimetableConfigInput includes `doublePeriodConfigs?: DoublePeriodConfig[]`
- ✅ **Service Create**: `createOrUpdateConfiguration` saves `doublePeriodConfigs`
- ✅ **Service Generate**: `generateTimetable` reads and uses `doublePeriodConfigs`
- ✅ **API GET**: Returns configuration with `doublePeriodConfigs`
- ✅ **API POST**: Accepts and passes `doublePeriodConfigs` to service
- ✅ **UI State**: Manages `doublePeriodConfigs` in React state
- ✅ **UI Load**: Fetches and displays `doublePeriodConfigs` from API
- ✅ **UI Save**: Sends `doublePeriodConfigs` to API when saving

---

## Type Safety Chain

```typescript
// UI Types
interface DoublePeriodConfig {
  subjectId: string;
  subjectName: string;
  requiresDoublePeriod: boolean;
  preferTimeOfDay?: "MORNING" | "AFTERNOON" | "ANY";
}

// Service Types (features/timetables/timetable.service.ts)
export interface TimetableConfigInput {
  doublePeriodConfigs?: DoublePeriodConfig[];
}

// Solver Types (features/timetables/solver/types.ts)
export interface DoublePeriodConfig {
  subjectId: string;
  requiresDoublePeriod: boolean;
  allowedDays?: DayOfWeek[];
  preferTimeOfDay?: 'MORNING' | 'AFTERNOON' | 'ANY';
}

// Prisma Generated Types
type TimetableConfiguration = {
  doublePeriodConfigs: Prisma.JsonValue | null;  // Can store any JSON
}

// Database
-- double_period_configs JSONB  (PostgreSQL native JSON type)
```

---

## Conclusion

**Status**: ✅ **FULLY CONNECTED**

The timetable configuration feature is now **end-to-end connected**:

1. **User** configures double periods in UI
2. **UI** sends configuration to API
3. **API** passes to service layer
4. **Service** validates and saves via repository
5. **Repository** uses Prisma to persist
6. **Prisma** converts to JSONB and stores in PostgreSQL
7. **Database** stores configuration safely

When generating timetables:

1. **Service** reads configuration from database
2. **Solver** uses `doublePeriodConfigs` to generate activities
3. **Database** stores timetable with proper double period slots
4. **UI** displays generated timetable with consecutive double periods

No breaks in the chain - all layers properly connected! 🎉
