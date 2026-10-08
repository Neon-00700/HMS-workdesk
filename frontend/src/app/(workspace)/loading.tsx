import { DelayedFallback } from "@/components/shared/delayed-fallback";
import { PageSkeleton } from "@/components/shared/page-skeleton";

/** Shown while a workspace route streams in. Renders inside the app shell,
    so the sidebar and header stay put and only the content area swaps. */
export default function WorkspaceLoading() {
  return (
    <DelayedFallback ms={180}>
      <PageSkeleton />
    </DelayedFallback>
  );
}