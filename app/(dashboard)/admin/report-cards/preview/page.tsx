'use client';

import React from 'react';
import { PDFViewer } from '@react-pdf/renderer';
import { SeniorReportCard } from '@/components/report-cards';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * Report Card PDF Preview Page
 * Shows a sample report card PDF for design verification
 */
export default function ReportCardPreviewPage() {
  const router = useRouter();

  // Sample data matching the structure expected by PDF components
  const sampleData = {
    pupilName: 'John Mwamba',
    class: 'Grade 10A',
    classTeacher: 'Mrs. Sarah Phiri',
    year: '2024',
    bestOfSix: '78.5',
    status: 'PROMOTED',
    subjects: [
      {
        name: 'Mathematics',
        mid: 75,
        eot: 82,
        comment: 'Excellent progress in problem-solving',
      },
      {
        name: 'English',
        mid: 78,
        eot: 80,
        comment: 'Strong reading comprehension skills',
      },
      {
        name: 'Science',
        mid: 70,
        eot: 76,
        comment: 'Good understanding of practical work',
      },
      {
        name: 'Social Studies',
        mid: 82,
        eot: 85,
        comment: 'Outstanding performance in geography',
      },
      {
        name: 'Religious Education',
        mid: 88,
        eot: 90,
        comment: 'Exceptional moral values demonstrated',
      },
      {
        name: 'Physical Education',
        mid: 80,
        eot: 84,
        comment: 'Active participation in sports',
      },
    ],
    teacherComment:
      'John is a hardworking and dedicated student. He consistently demonstrates strong academic abilities across all subjects. His participation in class discussions is commendable, and he shows great potential for continued success. Keep up the excellent work!',
    headTeacherComment:
      'Congratulations on a successful term. John has shown remarkable improvement and leadership qualities. We encourage him to maintain this excellent standard and continue striving for academic excellence.',
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Report Cards
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Report Card PDF Preview</h1>
            <p className="text-sm text-muted-foreground">
              Sample report card design for verification
            </p>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div className="w-full h-[calc(100vh-200px)]">
            <PDFViewer width="100%" height="100%" showToolbar={true}>
              <SeniorReportCard data={sampleData as any} />
            </PDFViewer>
          </div>
        </div>

        {/* Information */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">About this preview</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>This is a sample report card with mock data for design verification</li>
            <li>Actual report cards will pull data from the database</li>
            <li>The design follows the Ministry of Education format</li>
            <li>Different grade levels (Junior, Senior, Form) have different templates</li>
            <li>You can download this as PDF using the toolbar above</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
