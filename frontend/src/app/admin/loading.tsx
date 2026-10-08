import { DelayedFallback } from "@/components/shared/delayed-fallback";
import { PageSkeleton } from "@/components/shared/page-skeleton";

/** Admin routes are table-heavy, so this variant leads with the table panel. */
export default function AdminLoading() {
  return (
    <DelayedFallback ms={180}>
      <PageSkeleton stats={3} rows={8} />
    </DelayedFallback>
  );
}