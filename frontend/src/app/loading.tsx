import { Spinner } from "@/components/shared/spinner";
import { WORKSPACE_NAME } from "@/config/constants";

/** Boot screen for the first render. Server component, so it paints before
    any JS arrives — the one moment there is nothing else to look at. */
export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0c2318] text-xl font-extrabold text-white">
          هـ
        </span>
        <div className="space-y-2">
          <p className="text-[15px] font-semibold text-foreground">{WORKSPACE_NAME}</p>
          <p className="flex items-center justify-center gap-2 text-[13px] text-muted-foreground">
            <Spinner className="size-4 text-primary" />
            در حال آماده‌سازی…
          </p>
        </div>
      </div>
    </div>
  );
}