"use client";

/**
 * Preview page — renders the iGradePlus-style mobile assessments UI
 * inside a phone frame so you can evaluate it in the browser.
 *
 * Visit: /teacher/assessments/mobile-preview
 * Remove this page once the design is approved and integrated.
 */

import { MobileAssessmentsIGrade } from "@/components/mobile/teacher/assessments/mobile-assessments-igrade";

export default function MobileAssessmentsPreviewPage() {
  return (
    <div className="min-h-screen bg-gray-200 flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
          Mobile Preview — 390 × 844 (iPhone 14)
        </p>

        {/* Phone frame */}
        <div
          className="relative bg-black rounded-[48px] shadow-2xl overflow-hidden"
          style={{ width: 390, height: 844 }}
        >
          {/* Status bar */}
          <div className="absolute top-0 left-0 right-0 h-12 bg-white z-10 flex items-end justify-between px-7 pb-1.5">
            <span className="text-[12px] font-semibold">9:41</span>
            <div className="w-28 h-7 bg-black rounded-b-2xl absolute top-0 left-1/2 -translate-x-1/2" />
            <div className="flex items-center gap-1.5">
              <span className="text-[12px]">●●●</span>
            </div>
          </div>

          {/* App content */}
          <div className="absolute inset-0 top-12 overflow-hidden bg-gray-50">
            <MobileAssessmentsIGrade />
          </div>

          {/* Home indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-800 rounded-full" />
        </div>

        <p className="text-xs text-gray-400 max-w-sm text-center">
          Tap cards to see the detail screen. Use the filter chips and tabs to
          explore the layout. Static data only — no API calls.
        </p>
      </div>
    </div>
  );
}
