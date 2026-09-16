import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const TableSkeleton = ({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) => (
  <div className="w-full space-y-3">
    <div className="flex space-x-4">
      {[...Array(cols)].map((_, i) => (
        <Skeleton key={i} className="h-8 flex-1 bg-gray-200/70 rounded-md" />
      ))}
    </div>
    {[...Array(rows)].map((_, i) => (
      <div key={i} className="flex space-x-4">
        {[...Array(cols)].map((_, j) => (
          <Skeleton key={j} className="h-12 flex-1 bg-gray-100 rounded-md" />
        ))}
      </div>
    ))}
  </div>
);

export const CardSkeleton = () => (
  <Card className="border border-gray-200">
    <CardHeader className="gap-2 pb-2">
      <Skeleton className="h-6 w-1/3 bg-gray-200/80 rounded" />
      <Skeleton className="h-4 w-1/2 bg-gray-100 rounded" />
    </CardHeader>
    <CardContent className="space-y-3">
      <Skeleton className="h-16 w-full bg-gray-100 rounded-lg" />
      <Skeleton className="h-16 w-full bg-gray-100 rounded-lg" />
    </CardContent>
  </Card>
);

export const FormSkeleton = ({ sections = 4 }: { sections?: number }) => (
  <div className="space-y-6">
    {[...Array(sections)].map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-4 w-1/4 bg-gray-200/80 rounded" />
        <Skeleton className="h-10 w-full bg-gray-100 rounded-lg" />
      </div>
    ))}
    <Skeleton className="h-10 w-1/3 bg-gray-200 rounded-lg" />
  </div>
);

export const CalendarSkeleton = () => (
  <div className="space-y-6">
    {/* Tab pills */}
    <div className="flex items-center gap-2">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-10 w-36 rounded-full bg-gray-200/70" />
      ))}
    </div>

    {/* Main Calendar Card */}
    <div className="rounded-2xl bg-white border border-gray-200 p-6 space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-56 bg-gray-200 rounded-lg" />
        <div className="flex space-x-2">
          <Skeleton className="h-8 w-24 bg-gray-100 rounded-lg" />
          <Skeleton className="h-8 w-24 bg-gray-100 rounded-lg" />
        </div>
      </div>

      {/* Grid Headers */}
      <div className="grid grid-cols-7 gap-3">
        {[...Array(7)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-full bg-gray-100 rounded-md" />
        ))}
      </div>

      {/* Grid Cells */}
      <div className="grid grid-cols-7 gap-3">
        {[...Array(35)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full bg-gray-50 border border-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  </div>
);

export const AttendanceTabSkeleton = () => (
  <div className="space-y-6">
    {/* Filter Dropdown */}
    <div className="bg-white border border-gray-200 rounded-xl px-6 py-4 flex items-center gap-4">
      <Skeleton className="h-5 w-36 bg-gray-200 rounded" />
      <Skeleton className="h-10 w-64 bg-gray-100 rounded-lg" />
    </div>

    {/* Main Card */}
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden p-6 space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-7 w-60 bg-gray-200 rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 bg-gray-100 rounded-lg" />
          <Skeleton className="h-8 w-24 bg-gray-100 rounded-lg" />
          <Skeleton className="h-8 w-32 bg-green-100/50 rounded-lg" />
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full bg-gray-50 border border-gray-100 rounded-xl" />
        ))}
      </div>

      {/* Table */}
      <TableSkeleton rows={7} cols={7} />
    </div>
  </div>
);

export const TimeClockSkeleton = () => (
  <div className="min-h-screen bg-background p-4 md:p-8">
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-8 w-44 bg-gray-200 rounded-lg" />
        <Skeleton className="h-8 w-32 bg-gray-100 rounded-full" />
      </div>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left: Clock In / Active Session Card */}
        <Card className="h-[460px] border border-gray-200 flex flex-col justify-between p-6">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-6 rounded-full bg-blue-100" />
              <Skeleton className="h-6 w-36 bg-gray-200 rounded" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-28 bg-gray-200 rounded" />
              <Skeleton className="h-11 w-full bg-gray-100 rounded-lg" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-36 bg-gray-200 rounded" />
              <Skeleton className="h-11 w-full bg-gray-100 rounded-lg" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-20 bg-gray-200 rounded" />
              <Skeleton className="h-16 w-full bg-gray-100 rounded-lg" />
            </div>
          </div>
          <Skeleton className="h-12 w-full bg-blue-100/60 rounded-xl mt-4" />
        </Card>

        {/* Right: Analytics / Chart Card */}
        <Card className="h-[460px] border border-gray-200 p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <Skeleton className="h-6 w-48 bg-gray-200 rounded" />
            <Skeleton className="h-8 w-28 bg-gray-100 rounded-full" />
          </div>
          <div className="flex-1 flex items-end gap-3 pb-4 pt-8">
            {[40, 65, 80, 50, 90, 75, 85, 60, 95, 70, 80, 60].map((h, i) => (
              <Skeleton key={i} className="flex-1 rounded-t-md bg-gray-100" style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-100">
            <Skeleton className="h-4 w-16 bg-gray-100 rounded" />
            <Skeleton className="h-4 w-16 bg-gray-100 rounded" />
          </div>
        </Card>
      </div>

      {/* Bottom: Recent Entries Table */}
      <Card className="border border-gray-200 p-6 space-y-4">
        <div className="flex justify-between items-center mb-2">
          <Skeleton className="h-6 w-48 bg-gray-200 rounded" />
          <Skeleton className="h-6 w-24 bg-gray-100 rounded-full" />
        </div>
        <TableSkeleton rows={5} cols={6} />
      </Card>
    </div>
  </div>
);

export const TimesheetSkeleton = () => (
  <div className="min-h-screen bg-background p-4 md:p-8">
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Skeleton className="h-9 w-48 bg-gray-200 rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 bg-gray-100 rounded-lg" />
          <Skeleton className="h-9 w-28 bg-gray-100 rounded-lg" />
          <Skeleton className="h-9 w-32 bg-blue-100/70 rounded-lg" />
        </div>
      </div>

      {/* Week Selector Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex justify-between items-center">
        <Skeleton className="h-8 w-56 bg-gray-200 rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-lg bg-gray-100" />
          <Skeleton className="h-8 w-8 rounded-lg bg-gray-100" />
        </div>
      </div>

      {/* Timesheet Main Table Card */}
      <Card className="border border-gray-200 p-6 space-y-4 overflow-hidden">
        <TableSkeleton rows={6} cols={10} />
      </Card>
    </div>
  </div>
);

export const TaskBoardSkeleton = () => (
  <div className="min-h-screen bg-background p-4 md:p-8">
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-44 bg-gray-200 rounded-lg" />
          <Skeleton className="h-8 w-32 bg-gray-100 rounded-lg" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36 bg-gray-100 rounded-lg" />
          <Skeleton className="h-9 w-32 bg-blue-100/70 rounded-lg" />
        </div>
      </div>

      {/* Kanban Columns (4 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {['To Do', 'In Progress', 'In Review', 'Done'].map((col, idx) => (
          <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3 min-h-[500px]">
            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
              <Skeleton className="h-5 w-24 bg-gray-200 rounded" />
              <Skeleton className="h-5 w-6 rounded-full bg-gray-200" />
            </div>
            {[...Array(3)].map((_, cIdx) => (
              <div key={cIdx} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2 shadow-xs">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-16 bg-blue-100 rounded" />
                  <Skeleton className="h-4 w-12 bg-gray-100 rounded" />
                </div>
                <Skeleton className="h-4 w-full bg-gray-200/80 rounded" />
                <Skeleton className="h-4 w-3/4 bg-gray-100 rounded" />
                <div className="flex justify-between items-center pt-2">
                  <Skeleton className="h-6 w-6 rounded-full bg-gray-200" />
                  <Skeleton className="h-4 w-10 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
);
