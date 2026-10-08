import { cn } from "@/lib/utils";

/** Pure-CSS spinner. Renders during SSR with no client JS, so it can paint
    on the very first frame. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="در حال بارگذاری"
      className={cn(
        "inline-block size-5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
    />
  );
}