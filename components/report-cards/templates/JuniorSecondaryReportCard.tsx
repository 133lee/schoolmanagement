/**
 * Junior Secondary Report Card HTML Preview (UI only)
 * This is for screen preview - PDF generation uses the @react-pdf/renderer version
 */

interface JuniorSecondaryReportCardProps {
  pupilName: string;
  className: string;
  classTeacher: string;
  year: string;
  bestOfSix: string;
  attendance: string;
  grades: Array<{
    subject: string;
    cat: string;
    mid: string;
    eot: string;
  }>;
  teacherComment: string;
  headTeacherComment: string;
  schoolName?: string;
  logoUrl?: string;
}

export function JuniorSecondaryReportCard({
  pupilName,
  className,
  classTeacher,
  year,
  bestOfSix,
  attendance,
  grades,
  teacherComment,
  headTeacherComment,
  schoolName = "KAMBOMBO DAY SECONDARY SCHOOL",
  logoUrl,
}: JuniorSecondaryReportCardProps) {
  return (
    <div className="bg-white text-black p-8 max-w-4xl mx-auto border-2 border-gray-300">
      {/* Logo */}
      <div className="flex justify-center mb-4">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="School Logo"
            className="w-20 h-20 object-contain"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
            LOGO
          </div>
        )}
      </div>

      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-lg font-bold mb-1">MINISTRY OF EDUCATION</h1>
        <h2 className="text-base font-bold">{schoolName.toUpperCase()}</h2>
        <h3 className="text-sm font-semibold mt-1">JUNIOR SECONDARY REPORT CARD</h3>
      </div>

      {/* Student Info */}
      <div className="mb-4 border-2 border-black">
        <table className="w-full">
          <tbody>
            <tr className="border-b-2 border-black">
              <td className="p-2 font-bold border-r-2 border-black w-1/4">PUPIL NAME:</td>
              <td className="p-2 border-r-2 border-black">{pupilName}</td>
              <td className="p-2 font-bold border-r-2 border-black w-1/6">CLASS:</td>
              <td className="p-2">{className}</td>
            </tr>
            <tr className="border-b-2 border-black">
              <td className="p-2 font-bold border-r-2 border-black">CLASS TEACHER:</td>
              <td className="p-2 border-r-2 border-black">{classTeacher}</td>
              <td className="p-2 font-bold border-r-2 border-black">YEAR:</td>
              <td className="p-2">{year}</td>
            </tr>
            <tr>
              <td className="p-2 font-bold border-r-2 border-black">BEST OF SIX (6)</td>
              <td className="p-2 border-r-2 border-black">{bestOfSix}</td>
              <td className="p-2 font-bold border-r-2 border-black">ATTENDANCE:</td>
              <td className="p-2">{attendance}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Grades Table */}
      <div className="mb-4 border-2 border-black">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-black">
              <th className="p-2 text-left border-r-2 border-black w-[40%]">SUBJECT</th>
              <th className="p-2 text-center border-r-2 border-black w-[15%]">CAT 1</th>
              <th className="p-2 text-center border-r-2 border-black w-[15%]">MID</th>
              <th className="p-2 text-center w-[15%]">EOT</th>
            </tr>
          </thead>
          <tbody>
            {grades.map((grade, index) => (
              <tr key={index} className={index < grades.length - 1 ? "border-b-2 border-black" : ""}>
                <td className="p-2 font-semibold border-r-2 border-black">{grade.subject}</td>
                <td className="p-2 text-center border-r-2 border-black">{grade.cat || "-"}</td>
                <td className="p-2 text-center border-r-2 border-black">{grade.mid || "-"}</td>
                <td className="p-2 text-center">{grade.eot || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Grading Scale - Simpler 5-point for Junior */}
      <div className="mb-6 border-2 border-black text-xs">
        <div className="grid grid-cols-5 bg-gray-100 border-b-2 border-black font-bold text-center">
          <div className="p-1 border-r-2 border-black">DISTINCTION</div>
          <div className="p-1 border-r-2 border-black">MERIT</div>
          <div className="p-1 border-r-2 border-black">CREDIT</div>
          <div className="p-1 border-r-2 border-black">PASS</div>
          <div className="p-1">FAIL</div>
        </div>
        <div className="grid grid-cols-5 border-b-2 border-black text-center">
          <div className="p-1 border-r-2 border-black">100-75</div>
          <div className="p-1 border-r-2 border-black">74-60</div>
          <div className="p-1 border-r-2 border-black">59-50</div>
          <div className="p-1 border-r-2 border-black">49-40</div>
          <div className="p-1">39-0</div>
        </div>
        <div className="grid grid-cols-5 text-center">
          <div className="p-1 border-r-2 border-black">1</div>
          <div className="p-1 border-r-2 border-black">2</div>
          <div className="p-1 border-r-2 border-black">3</div>
          <div className="p-1 border-r-2 border-black">4</div>
          <div className="p-1">Fail</div>
        </div>
      </div>

      {/* Comments */}
      <div className="space-y-6">
        <div>
          <p className="font-bold mb-3">TEACHER COMMENT:</p>
          <div className="border-b border-dotted border-black pb-1 mb-2"></div>
          <p className="text-sm">{teacherComment}</p>
          <div className="border-b border-dotted border-black pb-1 mt-2"></div>
        </div>

        <div>
          <p className="font-bold mb-3">HEAD TEACHER COMMENT:</p>
          <div className="border-b border-dotted border-black pb-1 mb-2"></div>
          <p className="text-sm">{headTeacherComment}</p>
          <div className="border-b border-dotted border-black pb-1 mt-2"></div>
        </div>
      </div>
    </div>
  );
}
