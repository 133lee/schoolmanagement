"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";

interface StreamBreakdown {
  className: string;
  enrolled: number;
  sat: number;
  absent: number;
  passRate: number;
  qualityRate: number;
}

interface StreamBreakdownTableProps {
  streams: StreamBreakdown[];
}

export function StreamBreakdownTable({ streams }: StreamBreakdownTableProps) {
  // Calculate totals
  const totals = streams.reduce(
    (acc, stream) => ({
      enrolled: acc.enrolled + stream.enrolled,
      sat: acc.sat + stream.sat,
      absent: acc.absent + stream.absent,
    }),
    { enrolled: 0, sat: 0, absent: 0 }
  );

  // Calculate weighted average pass rates
  const totalPassRate =
    totals.sat > 0
      ? streams.reduce((acc, stream) => {
          const weight = stream.sat / totals.sat;
          return acc + stream.passRate * weight;
        }, 0)
      : 0;

  const totalStudentsPassed = streams.reduce((acc, stream) => {
    return acc + Math.round((stream.sat * stream.passRate) / 100);
  }, 0);

  const totalQualityRate =
    totalStudentsPassed > 0
      ? streams.reduce((acc, stream) => {
          const studentsPassed = Math.round((stream.sat * stream.passRate) / 100);
          const weight = studentsPassed / totalStudentsPassed;
          return acc + stream.qualityRate * weight;
        }, 0)
      : 0;

  return (
    <div>
      <h3 className="font-semibold mb-3 text-sm">Performance by Stream</h3>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Stream</TableHead>
              <TableHead className="text-center text-xs">Enrolled</TableHead>
              <TableHead className="text-center text-xs">Sat</TableHead>
              <TableHead className="text-center text-xs">Absent</TableHead>
              <TableHead className="text-center text-xs">Pass Rate</TableHead>
              <TableHead className="text-center text-xs">Quality Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {streams.map((stream, index) => (
              <TableRow
                key={stream.className}
                className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}
              >
                <TableCell className="font-medium text-xs">
                  {stream.className}
                </TableCell>
                <TableCell className="text-center text-xs">
                  {stream.enrolled}
                </TableCell>
                <TableCell className="text-center text-xs">
                  {stream.sat}
                </TableCell>
                <TableCell className="text-center text-xs">
                  {stream.absent}
                </TableCell>
                <TableCell className="text-center text-xs">
                  <span
                    className={
                      stream.passRate >= 75
                        ? "text-green-600 font-semibold"
                        : stream.passRate >= 50
                        ? "text-yellow-600 font-semibold"
                        : "text-red-600 font-semibold"
                    }
                  >
                    {stream.passRate.toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell className="text-center text-xs">
                  <span
                    className={
                      stream.qualityRate >= 50
                        ? "text-blue-600 font-semibold"
                        : "font-semibold"
                    }
                  >
                    {stream.qualityRate.toFixed(1)}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="bg-muted/50">
              <TableCell className="font-bold text-xs">TOTAL</TableCell>
              <TableCell className="text-center font-bold text-xs">
                {totals.enrolled}
              </TableCell>
              <TableCell className="text-center font-bold text-xs">
                {totals.sat}
              </TableCell>
              <TableCell className="text-center font-bold text-xs">
                {totals.absent}
              </TableCell>
              <TableCell className="text-center font-bold text-xs">
                <span
                  className={
                    totalPassRate >= 75
                      ? "text-green-600"
                      : totalPassRate >= 50
                      ? "text-yellow-600"
                      : "text-red-600"
                  }
                >
                  {totalPassRate.toFixed(1)}%
                </span>
              </TableCell>
              <TableCell className="text-center font-bold text-xs">
                <span
                  className={
                    totalQualityRate >= 50 ? "text-blue-600" : ""
                  }
                >
                  {totalQualityRate.toFixed(1)}%
                </span>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Compare performance across different streams in the same grade
      </p>
    </div>
  );
}
