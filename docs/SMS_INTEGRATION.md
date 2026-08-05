# SMS Integration Documentation

## Overview

Complete Africa's Talking SMS integration for sending report cards and notifications to parents/guardians in Zambia.

**Implementation Date**: January 28, 2026
**Provider**: Africa's Talking (Zambia)
**Architecture**: Prisma → Repository → Service → API → UI

---

## 🏗️ Architecture

### Database Layer (Prisma)

**New Models Added** (`prisma/schema.prisma`):

1. **SMSLog** - Tracks all sent messages
   - Stores message content, status, cost, delivery info
   - Links to Guardian and Student
   - Indexed for performance

2. **SMSTemplate** - Message templates
   - Supports variable replacement
   - Category-based organization
   - Active/inactive status

3. **Enums**:
   - `SMSStatus`: PENDING, SENT, DELIVERED, FAILED
   - `SMSProvider`: AFRICAS_TALKING, TWILIO, CLICKSEND

4. **New Permissions**:
   - `SEND_SMS`
   - `VIEW_SMS_LOGS`

**Relations Updated**:
- `Guardian.smsLogs` → One-to-many with SMSLog
- `Student.smsLogs` → One-to-many with SMSLog

---

## 📁 Files Created

### Repository Layer (`features/sms/`)

1. **smsLog.repository.ts**
   - CRUD operations for SMS logs
   - Query methods with filters
   - Statistics aggregation
   - Bulk operations support

2. **smsTemplate.repository.ts**
   - Template management
   - Default templates seeding
   - Category-based queries

### Service Layer (`features/sms/`)

1. **africasTalking.service.ts**
   - Africa's Talking API integration
   - Phone number formatting for Zambia
   - Balance checking
   - Connection testing
   - Error handling

2. **sms.service.ts**
   - Business logic orchestration
   - Authorization checks (role-based)
   - Template processing
   - Bulk sending
   - Logging and tracking

### API Layer (`app/api/sms/`)

1. **`POST /api/sms/send`** - Send single SMS
2. **`GET /api/sms/logs`** - View SMS history
3. **`GET /api/sms/balance`** - Check credits
4. **`GET /api/sms/test`** - Test connection

### UI Layer

1. **`/admin/settings/notifications/page.tsx`**
   - SMS configuration interface
   - Connection testing
   - Balance display
   - Recent SMS logs table
   - Admin-only access

---

## 🔐 Environment Variables

**Added to `.env` and `.env.example`**:

```env
# SMS Configuration - Africa's Talking (for Zambia)
AFRICAS_TALKING_USERNAME="Lee Nyirenda"
AFRICAS_TALKING_API_KEY="atsk_c7512681a2e29daae00279ab3a625df9d9b87f658e1a6b26bab6b285467030cfee09d76e"
AFRICAS_TALKING_SENDER_ID="" # Optional
```

---

## 🚀 How to Use

### 1. Setup

```bash
# Environment variables already added to .env
# Database schema already migrated

# Restart dev server to load new env vars
npm run dev
```

### 2. Test Configuration

1. Navigate to `http://localhost:3000/admin/settings/notifications`
2. Click **"Test Connection"**
3. Should see: "Connected successfully. Balance: ZMW X.XX"

### 3. Send SMS

#### A. Programmatically

```typescript
import { smsService } from "@/features/sms/sms.service";

// Send single SMS
const result = await smsService.sendSMS(
  {
    guardianId: "guardian_id",
    studentId: "student_id", // optional
    message: "Your custom message here",
    provider: "AFRICAS_TALKING",
  },
  {
    userId: "user_id",
    role: "TEACHER",
  }
);

// Send using template
const result = await smsService.sendTemplatedSMS(
  {
    guardianId: "guardian_id",
    templateName: "REPORT_CARD",
    variables: {
      parentName: "John Doe",
      studentName: "Jane Doe",
      schoolName: "Kambombo School",
      // ... other variables
    },
  },
  context
);

// Send bulk SMS
const result = await smsService.sendBulkSMS(
  {
    recipients: [
      { guardianId: "id1", studentId: "sid1" },
      { guardianId: "id2", studentId: "sid2" },
    ],
    message: "Bulk message",
  },
  context
);
```

#### B. Via API

```bash
# Send SMS
curl -X POST http://localhost:3000/api/sms/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "guardianId": "xxx",
    "message": "Hello from school!"
  }'

# View logs
curl http://localhost:3000/api/sms/logs?page=1&pageSize=20 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check balance
curl http://localhost:3000/api/sms/balance \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🎯 Integration Points

### Report Cards Integration

**To send report cards via SMS**, add this to your report card generation flow:

```typescript
// In features/report-cards/reportCard.service.ts
import { smsService } from "../sms/sms.service";
import { settingsService } from "../settings/settings.service";

async function sendReportCardSMS(reportCard: ReportCard, context: ServiceContext) {
  // Get school name
  const schoolSettings = await settingsService.getSettingsByCategory("school_info", context);
  const schoolName = schoolSettings.find(s => s.key === "name")?.value || "School";

  // Get primary guardian
  const student = await studentRepository.findById(reportCard.studentId);
  const primaryGuardian = student.studentGuardians.find(sg => sg.isPrimary);

  if (!primaryGuardian) {
    throw new Error("No primary guardian found for student");
  }

  // Format subject scores
  const subjectScores = reportCard.subjects
    .map(s => `${s.subject.name}: ${s.totalMark}%`)
    .join(", ");

  // Send SMS using template
  return smsService.sendTemplatedSMS(
    {
      guardianId: primaryGuardian.guardianId,
      studentId: reportCard.studentId,
      templateName: "REPORT_CARD",
      variables: {
        parentName: `${primaryGuardian.guardian.firstName} ${primaryGuardian.guardian.lastName}`,
        studentName: `${student.firstName} ${student.lastName}`,
        subjectScores,
        position: reportCard.position?.toString() || "N/A",
        totalStudents: reportCard.outOf?.toString() || "N/A",
        attendanceRate: `${((reportCard.daysPresent / (reportCard.daysPresent + reportCard.daysAbsent)) * 100).toFixed(1)}`,
        schoolName,
      },
    },
    context
  );
}
```

---

## 📊 Default Templates

**Pre-loaded templates** (seed with: `smsService.seedDefaultTemplates()`):

### 1. REPORT_CARD
```
Dear {parentName},

Results for {studentName} are as follows:
{subjectScores}

Position: {position}/{totalStudents}
Attendance: {attendanceRate}%

- {schoolName}
```

### 2. EXAM_REMINDER
```
Dear {parentName},

Reminder: {examName} for {studentName} is on {examDate}.

Please ensure your child is prepared.

- {schoolName}
```

### 3. ABSENCE_ALERT
```
Dear {parentName},

{studentName} was absent from school on {date}.

If this is an emergency, please contact us immediately.

- {schoolName}
```

### 4. FEE_REMINDER
```
Dear {parentName},

Reminder: School fees for {studentName} are due.

Amount: {amount}
Due date: {dueDate}

Please ensure timely payment.

- {schoolName}
```

---

## 🔒 Permissions

**Role-Based Access**:
- **TEACHER+**: Can send SMS, view logs
- **ADMIN**: Can test connection, manage templates

---

## 💰 Cost Tracking

- Each SMS log includes `cost` field (populated by Africa's Talking)
- Statistics endpoint provides total cost calculations
- Balance checking available in UI and API

---

## 📝 Logging

All SMS operations are logged via the `logger` service:
- Connection tests
- Send attempts (success/failure)
- Balance checks
- API requests

Check logs for debugging and monitoring.

---

## ⚠️ Important Notes

### Phone Number Format
- **Zambian numbers**: +260 971234567
- System auto-formats numbers starting with 0 or without country code
- Invalid formats will be rejected

### Message Length
- Max 1600 characters (10 SMS segments)
- Each segment ≈ 160 characters
- Cost multiplies by segment count

### Rate Limiting
- Built-in 100ms delay between bulk messages
- Prevents API rate limiting from Africa's Talking

### Error Handling
- Failed messages logged with error details
- Status updates tracked in database
- Retry logic NOT implemented (manual retry needed)

---

## 🔧 Troubleshooting

### Connection Test Fails

**Check**:
1. Environment variables set correctly in `.env`
2. API key is valid (not expired)
3. Network can reach api.africastalking.com
4. Username matches Africa's Talking account

### SMS Not Sending

**Check**:
1. Guardian has valid phone number
2. Africa's Talking account has credits
3. Check SMS logs for error messages
4. Verify user has `SEND_SMS` permission

### Balance Shows Null

**Means**: API call failed or credentials invalid
**Fix**: Test connection first, check credentials

---

## 🚀 Next Steps

### Recommended Enhancements

1. **Scheduled SMS**: Use cron jobs for automated reminders
2. **SMS Templates UI**: Admin interface to create/edit templates
3. **Delivery Webhooks**: Handle delivery confirmations from Africa's Talking
4. **Retry Queue**: Auto-retry failed messages
5. **Analytics Dashboard**: SMS usage, costs, delivery rates
6. **Bulk Import**: CSV upload for mass SMS campaigns

### Integration Opportunities

- **Attendance Alerts**: Daily absence notifications
- **Fee Reminders**: Automated payment reminders
- **Exam Schedules**: Send timetables to parents
- **Emergency Alerts**: School closure notifications
- **Event Reminders**: Parent meetings, sports days

---

## 📞 Support

**Africa's Talking**:
- Dashboard: https://account.africastalking.com/
- Docs: https://developers.africastalking.com/
- Support: support@africastalking.com

**System Issues**:
- Check logs in `/api/sms/logs`
- Review error messages in SMS log table
- Test connection in notifications settings

---

## ✅ Implementation Checklist

- [x] Database schema (Prisma models)
- [x] Repository layer (data access)
- [x] Service layer (business logic)
- [x] API endpoints (HTTP interface)
- [x] UI (notifications settings)
- [x] Environment variables
- [x] Permissions integration
- [x] Default templates
- [x] Documentation
- [ ] Report card integration (ready for implementation)
- [ ] Attendance alerts (ready for implementation)
- [ ] Template management UI (future enhancement)

---

**Implementation Complete**: All core SMS functionality is ready to use!
