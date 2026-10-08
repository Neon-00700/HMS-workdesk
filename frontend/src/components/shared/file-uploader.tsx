"use client";
import { useRef, useState } from "react";
import { UploadCloud, X, File as FileIcon, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { UPLOAD_POLICIES } from "@/config/constants";
import { validateUpload, validateFileList } from "@/lib/file-validation";
import { formatBytes, cn } from "@/lib/utils";

interface QueuedFile {
  key: string;
  file: File;
  safeName: string;
  progress: number;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
}

export function FileUploader({ policyKey, multiple, onUploaded, compact }: {
  policyKey: keyof typeof UPLOAD_POLICIES | string;
  multiple?: boolean;
  onUploaded: (files: { fileName: string; mimeType: string; sizeBytes: number; blob: Blob }[]) => void | Promise<void>;
  compact?: boolean;
}) {
  const policy = UPLOAD_POLICIES[policyKey] ?? UPLOAD_POLICIES.taskAttachment;
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  const pick = (files: FileList | File[]) => {
    const arr = [...files];
    const listCheck = validateFileList(String(policyKey), arr);
    if (!listCheck.ok) {
      setQueue([{ key: `err_${Date.now()}`, file: arr[0], safeName: arr[0]?.name ?? "", progress: 0, status: "error", error: listCheck.error }]);
      return;
    }
    void (async () => {
      const next: QueuedFile[] = [];
      for (const f of arr) {
        const v = await validateUpload(String(policyKey), f);
        next.push({
          key: `${f.name}_${f.size}_${Date.now()}`,
          file: f,
          safeName: v.safeName ?? f.name,
          progress: 0,
          status: v.ok ? "queued" : "error",
          error: v.error,
        });
      }
      setQueue(multiple ? (q) => [...q.filter((x) => x.status === "done"), ...next].slice(0, policy.maxFiles) : next.slice(0, 1));
    })();
  };

  const startUpload = async () => {
    const valid = queue.filter((q) => q.status === "queued");
    if (!valid.length) return;
    setBusy(true);
    setCancelled(false);
    const done: QueuedFile[] = [];
    for (const q of valid) {
      if (cancelled) break;
      setQueue((qs) => qs.map((x) => (x.key === q.key ? { ...x, status: "uploading" as const } : x)));
      // Simulated chunked upload with progress + cancellation
      for (let p = 10; p <= 100; p += 15) {
        await new Promise((r) => setTimeout(r, 90));
        let stop = false;
        setQueue((qs) => qs.map((x) => (x.key === q.key ? { ...x, progress: Math.min(100, p) } : x)));
        setCancelled((c) => { stop = c; return c; });
        if (stop) break;
      }
      let wasCancelled = false;
      setCancelled((c) => { wasCancelled = c; return c; });
      if (wasCancelled) {
        setQueue((qs) => qs.map((x) => (x.key === q.key ? { ...x, status: "error" as const, error: "آپلود لغو شد." } : x)));
        break;
      }
      setQueue((qs) => qs.map((x) => (x.key === q.key ? { ...x, status: "done" as const, progress: 100 } : x)));
      done.push(q);
    }
    setBusy(false);
    if (done.length) {
      await onUploaded(done.map((q) => ({ fileName: q.safeName, mimeType: q.file.type || "application/octet-stream", sizeBytes: q.file.size, blob: q.file })));
      setQueue((qs) => qs.filter((x) => x.status !== "done"));
    }
  };

  const removeFromQueue = (key: string) => setQueue((qs) => qs.filter((x) => x.key !== key));

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); pick(e.dataTransfer.files); }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-muted/30 px-4 text-center transition-colors hover:border-primary/50 hover:bg-muted/50",
          compact ? "py-4" : "py-8",
          dragOver && "border-primary bg-primary/5",
        )}
      >
        <UploadCloud className={cn("text-muted-foreground", compact ? "h-6 w-6" : "h-9 w-9")} />
        <p className="text-[13px] font-medium">برای انتخاب فایل کلیک کنید یا آن را بکشید و رها کنید</p>
        <p className="text-xs text-muted-foreground">{policy.label}</p>
        <input
          ref={inputRef}
          type="file"
          hidden
          accept={policy.accept}
          multiple={multiple && policy.maxFiles > 1}
          onChange={(e) => { if (e.target.files?.length) pick(e.target.files); e.target.value = ""; }}
        />
      </button>

      {queue.length > 0 && (
        <div className="flex flex-col gap-2">
          {queue.map((q) => (
            <div key={q.key} className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-card">
              <FileIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{q.safeName}</p>
                <p className="text-[11px] text-muted-foreground">{formatBytes(q.file.size)}</p>
                {q.status === "uploading" && <Progress value={q.progress} className="mt-1.5 h-1.5" />}
                {q.status === "error" && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-destructive">
                    <AlertCircle className="h-3 w-3" />{q.error}
                  </p>
                )}
                {q.status === "done" && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" />آپلود شد
                  </p>
                )}
              </div>
              {q.status === "uploading" ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : (
                <Button variant="ghost" size="icon-sm" onClick={() => removeFromQueue(q.key)} aria-label="حذف از صف">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <div className="flex gap-2">
            <Button size="sm" onClick={startUpload} disabled={busy || !queue.some((q) => q.status === "queued")} loading={busy}>
              شروع آپلود
            </Button>
            {busy && <Button size="sm" variant="outline" onClick={() => setCancelled(true)}>لغو آپلود</Button>}
          </div>
        </div>
      )}
    </div>
  );
}
