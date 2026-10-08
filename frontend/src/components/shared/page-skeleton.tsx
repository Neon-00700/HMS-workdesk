import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Route-transition fallback shaped like the app's page rhythm — title row,
    stat cards, then a content panel — so an in-flight navigation reads as
    "loading" instead of "broken". */
export function PageSkeleton({
  stats = 4,
  rows = 6,
  className,
}: {
  stats?: number;
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-6", className)} aria-busy="true">
      <span className="sr-only">در حال بارگذاری…</span>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-3.5 w-72 max-w-[60vw]" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      {stats > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {range(stats).map((i) => (
            <div key={i} className="rounded-xl border bg-card p-4 shadow-card">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="mt-3 h-7 w-16" />
              <Skeleton className="mt-3.5 h-2.5 w-full" />
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border bg-card shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-44" />
        </div>
        <div className="space-y-3 p-4 pt-0">
          {range(rows).map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-4 rounded-md" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="hidden h-4 w-28 sm:block" />
              <Skeleton className="size-6 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}