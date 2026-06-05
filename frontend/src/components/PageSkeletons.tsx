import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const TableSkeleton = ({ rows = 5, cols = 5 }) => (
    <div className="w-full space-y-3">
        <div className="flex space-x-4">
            {[...Array(cols)].map((_, i) => (
                <Skeleton key={i} className="h-8 flex-1" />
            ))}
        </div>
        {[...Array(rows)].map((_, i) => (
            <div key={i} className="flex space-x-4">
                {[...Array(cols)].map((_, j) => (
                    <Skeleton key={j} className="h-12 flex-1" />
                ))}
            </div>
        ))}
    </div>
);

export const CardSkeleton = () => (
    <Card>
        <CardHeader className="gap-2">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
        </CardContent>
    </Card>
);

export const FormSkeleton = ({ sections = 4 }) => (
    <div className="space-y-6">
        {[...Array(sections)].map((_, i) => (
            <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-10 w-full" />
            </div>
        ))}
        <Skeleton className="h-10 w-1/3" />
    </div>
);

export const CalendarSkeleton = () => (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-48" />
            <div className="flex space-x-2">
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-10 w-10" />
            </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
            {[...Array(7)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
            ))}
            {[...Array(35)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
            ))}
        </div>
    </div>
);

export const TimesheetSkeleton = () => (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <div className="flex justify-between">
                    <Skeleton className="h-8 w-48" />
                    <div className="flex space-x-2">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <TableSkeleton rows={6} cols={10} />
            </CardContent>
        </Card>
    </div>
);
