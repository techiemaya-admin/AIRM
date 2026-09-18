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
      <div className="mb-6">
        <Skeleton className="h-8 w-36 bg-gray-200 rounded-lg" />
      </div>

      {/* Top 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left: Clock In Card */}
        <Card className="h-[460px] border border-gray-200 rounded-xl p-6 flex flex-col justify-between shadow-2xs">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2">
              <Skeleton className="h-5 w-5 rounded-full bg-blue-100" />
              <Skeleton className="h-5 w-24 bg-gray-200 rounded" />
            </div>

            {/* Field 1: Project */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-28 bg-gray-200 rounded" />
              <Skeleton className="h-10 w-full bg-gray-100 rounded-md border border-gray-200" />
            </div>

            {/* Field 2: Story / Task / Bug */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-44 bg-gray-200 rounded" />
              <Skeleton className="h-10 w-full bg-gray-100 rounded-md border border-gray-200" />
            </div>

            {/* Field 3: Notes */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-28 bg-gray-200 rounded" />
              <Skeleton className="h-10 w-full bg-gray-100 rounded-md border border-gray-200" />
            </div>
          </div>

          <Skeleton className="h-11 w-full bg-[#0B1957]/30 rounded-lg mt-4" />
        </Card>

        {/* Right: Recent Time Entries Card */}
        <Card className="h-[460px] border border-gray-200 rounded-xl p-6 flex flex-col shadow-2xs">
          <div className="pb-3 mb-2 border-b border-gray-100">
            <Skeleton className="h-5 w-40 bg-gray-200 rounded" />
          </div>

          <div className="space-y-3 overflow-hidden flex-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-3.5 border border-gray-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-2 h-2 rounded-full bg-green-200" />
                    <Skeleton className="h-4 w-36 bg-gray-300 rounded" />
                  </div>
                  <Skeleton className="h-4 w-14 bg-gray-100 rounded" />
                </div>
                <div className="flex items-center gap-1.5 ml-4">
                  <Skeleton className="h-3 w-3 bg-blue-100 rounded" />
                  <Skeleton className="h-3.5 w-48 bg-blue-100 rounded" />
                </div>
                <Skeleton className="h-3 w-32 bg-gray-100 rounded ml-4" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom: Stories & Tasks/Bugs Tracker Card */}
      <Card className="border border-gray-200 rounded-xl p-6 shadow-2xs space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 bg-gray-200 rounded" />
            <Skeleton className="h-5 w-56 bg-gray-200 rounded" />
          </div>
          <Skeleton className="h-8 w-28 bg-gray-100 rounded-full" />
        </div>

        <Skeleton className="h-4 w-44 bg-gray-100 rounded" />

        {/* Chart representation */}
        <div className="h-64 w-full flex flex-col justify-between py-4 border-b border-gray-100 relative">
          <div className="space-y-8 w-full">
            <Skeleton className="h-0.5 w-full bg-gray-100" />
            <Skeleton className="h-0.5 w-full bg-gray-100" />
            <Skeleton className="h-0.5 w-full bg-gray-100" />
            <Skeleton className="h-0.5 w-full bg-gray-100" />
          </div>
          <div className="flex justify-between pt-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-3 w-8 bg-gray-100 rounded" />
            ))}
          </div>
        </div>
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
  <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
    <div className="mx-auto max-w-7xl space-y-5">
      {/* Top Header & Tab Navigation */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-40 bg-gray-200 rounded-lg" />

        {/* Sub-tabs: Board, Backlog, Timeline, Reports */}
        <div className="flex items-center gap-6 border-b border-gray-200 pb-2">
          <Skeleton className="h-6 w-16 bg-[#0B1957]/30 rounded" />
          <Skeleton className="h-5 w-16 bg-gray-100 rounded" />
          <Skeleton className="h-5 w-16 bg-gray-100 rounded" />
          <Skeleton className="h-5 w-16 bg-gray-100 rounded" />
        </div>
      </div>

      {/* Top Action & Project Breadcrumb Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 bg-gray-200 rounded" />
          <Skeleton className="h-5 w-44 bg-gray-200 rounded" />
        </div>
        <Skeleton className="h-9 w-32 bg-[#0B1957]/40 rounded-lg" />
      </div>

      {/* Filter Bar Controls */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 pb-2">
        <Skeleton className="h-9 w-44 sm:w-56 bg-gray-100 rounded-lg border border-gray-200" />
        <Skeleton className="h-9 w-24 bg-gray-100 rounded-lg border border-gray-200" />
        <Skeleton className="h-9 w-24 bg-gray-100 rounded-lg border border-gray-200" />
        <Skeleton className="h-9 w-24 bg-gray-100 rounded-lg border border-gray-200" />
        <Skeleton className="h-9 w-28 bg-gray-100 rounded-lg border border-gray-200" />
        <Skeleton className="h-9 w-32 bg-gray-100 rounded-lg border border-gray-200" />
        <Skeleton className="h-9 w-28 bg-gray-100 rounded-lg border border-gray-200" />
        <Skeleton className="h-9 w-32 bg-gray-100 rounded-lg border border-gray-200" />
      </div>

      {/* Exactly 3 Kanban Columns: TO DO, IN PROGRESS, DONE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {[
          { titleWidth: 'w-16', count: '13' },
          { titleWidth: 'w-24', count: '16' },
          { titleWidth: 'w-16', count: '34' },
        ].map((col, idx) => (
          <div
            key={idx}
            className="bg-gray-50/70 border border-gray-200/80 rounded-2xl p-3 sm:p-4 space-y-3 min-h-[560px]"
          >
            {/* Column Header */}
            <div className="flex items-center gap-2 pb-2">
              <Skeleton className={`h-5 ${col.titleWidth} bg-gray-300/80 rounded-md`} />
              <Skeleton className="h-5 w-7 bg-gray-200 rounded-full" />
            </div>

            {/* Column Issue Cards */}
            {[...Array(3)].map((_, cIdx) => (
              <div
                key={cIdx}
                className="bg-white border border-gray-200 rounded-xl p-3.5 sm:p-4 space-y-3 shadow-2xs"
              >
                {/* Issue Title */}
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-5/6 bg-gray-300 rounded" />
                  {cIdx === 1 && <Skeleton className="h-4 w-3/5 bg-gray-200 rounded" />}
                </div>

                {/* Epic & Tag Pill */}
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-20 bg-orange-100/70 border border-orange-200/60 rounded" />
                  {cIdx === 0 && <Skeleton className="h-5 w-16 bg-blue-50 border border-blue-200/60 rounded" />}
                </div>

                {/* Type Icon + Key on Left, Assignee Avatar on Right */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-4 w-4 bg-emerald-100 rounded" />
                    <Skeleton className="h-4 w-24 bg-gray-200 rounded" />
                  </div>
                  <Skeleton className="h-6 w-6 rounded-full bg-blue-900/20" />
                </div>

                {/* Time Spent Bottom Row */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-3.5 w-3.5 rounded-full bg-gray-200" />
                    <Skeleton className="h-3 w-24 bg-gray-200 rounded" />
                  </div>
                  <Skeleton className="h-3.5 w-3.5 rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
);
