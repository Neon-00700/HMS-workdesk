import { Inbox, SearchX, WifiOff, ShieldAlert, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function EmptyState({ icon, title, description, action, className }: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card/60 px-6 py-12 text-center", className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <p className="text-sm font-semibold">{title}</p>
      {description && <p className="max-w-sm text-[13px] text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

export function NoSearchResults({ query }: { query: string }) {
  return (
    <EmptyState
      icon={<SearchX className="h-6 w-6" />}
      title="نتیجه‌ای یافت نشد"
      description={query ? `برای «${query}» چیزی پیدا نکردیم. عبارت دیگری را امتحان کنید.` : "عبارت دیگری را امتحان کنید."}
    />
  );
}

export function ErrorState({ title = "خطا در بارگذاری", description = "مشکلی پیش آمد. لطفاً دوباره تلاش کنید.", onRetry, className }: {
  title?: string; description?: string; onRetry?: () => void; className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-xl border bg-card px-6 py-12 text-center shadow-card", className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="max-w-sm text-[13px] text-muted-foreground">{description}</p>
      {onRetry && <Button variant="outline" size="sm" onClick={onRetry}>تلاش مجدد</Button>}
    </div>
  );
}

export function PermissionDenied({ description = "شما دسترسی لازم برای مشاهده این بخش را ندارید." }: { description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-card px-6 py-12 text-center shadow-card">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10 text-warning">
        <ShieldAlert className="h-6 w-6" />
      </div>
      <p className="text-sm font-semibold">عدم دسترسی</p>
      <p className="max-w-sm text-[13px] text-muted-foreground">{description}</p>
    </div>
  );
}

export function OfflineState() {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-[13px] text-warning">
      <WifiOff className="h-4 w-4" />
      اتصال قطع است؛ در تلاش برای اتصال مجدد…
    </div>
  );
}

export function LoadingCards({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex flex-col gap-3 p-5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-7 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function LoadingList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-card">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}

export function LoadingBoard() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 4 }).map((_, c) => (
        <div key={c} className="flex w-72 shrink-0 flex-col gap-2 rounded-xl border bg-card/60 p-3">
          <Skeleton className="h-5 w-24" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}
