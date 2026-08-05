# Report Card PDF Generation

This document explains how the report card PDF generation system works, including design, implementation, and usage.

## Overview

The system generates professional PDF report cards that follow the Ministry of Education format for Zambian schools. Different templates are used for different grade levels:

- **Junior Secondary** (Grades 8-9)
- **Senior Secondary** (Grades 10-12)
- **Form 1-4** (Alternative naming system)

## Architecture

### Components

1. **PDF Templates** (`components/report-cards/`)
   - `SeniorReportCard.tsx` - For Grades 10-12
   - `JuniorReportCard.tsx` - For Grades 8-9
   - `Form1ReportCard.tsx` - For Form-based grading
   - `index.ts` - Template selector and type definitions

2. **API Endpoint** (`app/api/report-cards/[id]/pdf/route.ts`)
   - Fetches report card data from database
   - Transforms data for PDF template
   - Generates PDF using @react-pdf/renderer
   - Returns downloadable PDF file

3. **Service Layer** (`features/report-cards/reportCard.service.ts`)
   - `getReportCardWithRelations()` - Fetches complete report card data

4. **Preview Page** (`app/(dashboard)/admin/report-cards/preview/page.tsx`)
   - Shows sample PDF for design verification
   - Uses PDFViewer component for in-browser preview

## PDF Template Design (Senior Secondary)

### Header Section
- School logo (placeholder)
- Ministry of Education title
- School name: "KAMBOMBO DAY SECONDARY SCHOOL"
- Report type: "SENIOR SECONDARY REPORT CARD"

### Student Information Table
| Field | Value |
|-------|-------|
| PUPIL NAME | Student's full name |
| CLASS | Grade and class name (e.g., "Grade 10A") |
| CLASS TEACHER | Teacher's name |
| YEAR | Academic year |
| BEST OF SIX (6) | Average of top 6 subjects |
| STATUS | PROMOTED / GRADUATED / RETAINED / IN_PROGRESS |

### Marks Table
| SUBJECT | MID | EOT | COMMENT |
|---------|-----|-----|---------|
| Subject name | Mid-term mark | End-of-term mark | Teacher remarks |

### Grading Scale (ECZ 9-Point Scale)

| Performance | Percentage | Grade |
|-------------|------------|-------|
| DISTINCTION | 100-75, 74-70 | 1, 2 |
| MERIT | 69-65, 64-60 | 3, 4 |
| CREDIT | 59-55, 54-50 | 5, 6 |
| SATISFACTORY | 49-45, 44-40 | 7, 8 |
| UNSATISFACTORY | 39-0 | 9 |

### Comments Section
- **Teacher Comment**: Class teacher's remarks
- **Head Teacher Comment**: Head teacher's remarks

## Usage

### For Administrators

1. **View Sample PDF**
   - Navigate to Report Cards page
   - Click "Preview Sample PDF" button
   - View the PDF design with sample data
   - Use toolbar to download sample PDF

2. **Generate Real Report Cards**
   - Generate report cards from the system (via API)
   - System automatically calculates marks and positions
   - Download PDFs for individual students

3. **Download PDF**
   - In Report Cards list, click "PDF" button
   - PDF downloads automatically
   - Filename format: `ReportCard_[StudentNumber]_[Term].pdf`

### For Developers

#### Generating PDFs Programmatically

```typescript
import { reportCardService } from '@/features/report-cards/reportCard.service';

// Generate report card
const reportCard = await reportCardService.generateReportCard({
  studentId: 'student-id',
  classId: 'class-id',
  termId: 'term-id',
  classTeacherId: 'teacher-id',
}, context);

// Download PDF via API
const response = await fetch(`/api/report-cards/${reportCard.id}/pdf`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

#### Adding Custom Templates

1. Create new component in `components/report-cards/`
2. Follow the structure of existing templates
3. Use @react-pdf/renderer components (Document, Page, View, Text)
4. Update `getReportCardType()` in `index.ts`
5. Add case in PDF endpoint (`route.ts`)

## Authorization

PDF generation requires authentication and authorization:

- **Minimum Role**: TEACHER
- **Inherited by**: HOD, DEPUTY_HEAD, HEAD_TEACHER, ADMIN

Authorization is enforced at:
1. Service layer (`reportCard.service.ts`)
2. API endpoint (`route.ts`)

## Data Flow

```
User clicks "Download PDF"
    ↓
Frontend calls /api/report-cards/[id]/pdf
    ↓
API verifies JWT token
    ↓
Service fetches report card with relations
    ↓
API transforms data for PDF template
    ↓
Template renders PDF
    ↓
PDF streams to client
    ↓
Browser downloads file
```

## Mock Data vs Real Data

### Mock Data Mode
- Shows sample report cards in UI
- PDF download shows helpful error message
- Use "Preview Sample PDF" button to see design

### Real API Mode
- Fetches actual report cards from database
- PDF download works with real data
- Requires proper authentication

## Troubleshooting

### PDF Not Downloading
1. Check authentication token is valid
2. Verify report card ID exists in database
3. Check browser console for errors
4. Ensure @react-pdf/renderer is installed

### Missing Data in PDF
1. Verify `getReportCardWithRelations()` includes all relations
2. Check data transformation in PDF endpoint
3. Ensure subject marks and remarks exist

### Layout Issues
1. Adjust styles in PDF template component
2. Test with different data volumes
3. Consider page breaks for many subjects
4. Check font loading from CDN

## Technical Details

### Dependencies
- `@react-pdf/renderer@^4.3.2` - PDF generation library
- Roboto fonts (from CDN)

### PDF Specifications
- **Page Size**: A4
- **Font**: Roboto (Regular and Bold)
- **Encoding**: UTF-8
- **Format**: PDF 1.4+

### Performance
- PDF generation: ~500ms - 2s (depends on data volume)
- Streaming: Real-time (no temp files)
- Memory: Efficient streaming implementation

## Future Enhancements

Potential improvements:

1. **School Logo**: Add actual school logo image
2. **Signatures**: Digital signature support
3. **Watermarks**: "OFFICIAL COPY" watermark
4. **Batch Download**: Download multiple PDFs as ZIP
5. **Email Delivery**: Send PDFs directly to parents
6. **Print Layout**: Optimize for direct printing
7. **Attendance Summary**: Add attendance statistics
8. **Progress Charts**: Visual performance graphs

## Related Files

- [app/api/report-cards/[id]/pdf/route.ts](../app/api/report-cards/[id]/pdf/route.ts) - PDF API endpoint
- [components/report-cards/SeniorReportCard.tsx](../components/report-cards/SeniorReportCard.tsx) - Senior template
- [components/report-cards/JuniorReportCard.tsx](../components/report-cards/JuniorReportCard.tsx) - Junior template
- [app/(dashboard)/admin/report-cards/preview/page.tsx](../app/(dashboard)/admin/report-cards/preview/page.tsx) - Preview page
- [features/report-cards/reportCard.service.ts](../features/report-cards/reportCard.service.ts) - Service layer

## Contact

For issues or questions about PDF generation:
- Check GitHub issues
- Review @react-pdf/renderer documentation
- Contact system administrator
