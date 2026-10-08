"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Search, Upload, FolderOpen, File as FileLucide, Image as ImageIcon, FileText,
  MoreVertical, Pencil, Trash2, FolderInput, Download, LayoutGrid, List, ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { Tip } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUploader } from "@/components/shared/file-uploader";
import { EmptyState, ErrorState, LoadingList } from "@/components/shared/states";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FILE_FOLDERS } from "@/config/constants";
import { formatDateFa, timeAgoFa } from "@/lib/format";
import { formatBytes, toFaDigits, cn } from "@/lib/utils";
import { downloadStoredFile, getStoredBlob } from "@/lib/file-store";
import { useFiles, useFileActions } from "@/services/queries";
import { usePermission, Can } from "@/hooks/use-permission";
import type { ProjectFile } from "@/types/models";
import { toast } from "sonner";

type SortKey = "newest" | "oldest" | "name" | "size";

export function FileExplorer({ projectId }: { projectId?: string }) {
  const { data: files = [], isLoading, isError, refetch } = useFiles(projectId);
  const actions = useFileActions();
  const { can } = usePermission();
  const [folder, setFolder] = useState<string>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFolder, setUploadFolder] = useState<string>(FILE_FOLDERS[0]);
  const [renameTarget, setRenameTarget] = useState<ProjectFile | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [preview, setPreview] = useState<ProjectFile | null>(null);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    files.forEach((f) => m.set(f.folder, (m.get(f.folder) ?? 0) + 1));
    return m;
  }, [files]);

  const shown = useMemo(() => {
    let list = files;
    if (folder !== "all") list = list.filter((f) => f.folder === folder);
    if (q) list = list.filter((f) => f.fileName.includes(q));
    const sorted = [...list];
    if (sort === "newest") sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (sort === "oldest") sorted.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
    if (sort === "name") sorted.sort((a, b) => a.fileName.localeCompare(b.fileName, "fa"));
    if (sort === "size") sorted.sort((a, b) => b.sizeBytes - a.sizeBytes);
    return sorted;
  }, [files, folder, q, sort]);

  const totalBytes = files.reduce((s, f) => s + f.sizeBytes, 0);

  if (isLoading) return <LoadingList rows={6} />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      {/* Folders */}
      <Card className="h-fit p-3">
        <p className="mb-2 px-2 text-[11px] font-semibold text-muted-foreground">پوشه‌ها</p>
        <div className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
          <FolderRow label="همه فایل‌ها" count={files.length} active={folder === "all"} onClick={() => setFolder("all")} />
          {FILE_FOLDERS.map((f) => (
            <FolderRow key={f} label={f} count={counts.get(f) ?? 0} active={folder === f} onClick={() => setFolder(f)} />
          ))}
        </div>
        <div className="mt-3 rounded-lg bg-muted/50 p-2.5 text-[11px] text-muted-foreground">
          مجموع: <span className="font-bold text-foreground">{formatBytes(totalBytes)}</span>
          <br />{toFaDigits(files.length)} فایل
        </div>
      </Card>

      {/* Main */}
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[11.25rem] flex-1 sm:max-w-64">
            <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="جست‌وجوی فایل…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 ps-8" />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-9 w-36"><ArrowUpDown className="h-3.5 w-3.5" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">جدیدترین</SelectItem>
              <SelectItem value="oldest">قدیمی‌ترین</SelectItem>
              <SelectItem value="name">نام</SelectItem>
              <SelectItem value="size">حجم</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex rounded-lg border p-0.5">
            <Tip label="نمایش شبکه‌ای">
              <Button variant={view === "grid" ? "secondary" : "ghost"} size="icon-sm" onClick={() => setView("grid")} aria-label="نمایش شبکه‌ای">
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </Tip>
            <Tip label="نمایش فهرستی">
              <Button variant={view === "list" ? "secondary" : "ghost"} size="icon-sm" onClick={() => setView("list")} aria-label="نمایش فهرستی">
                <List className="h-4 w-4" />
              </Button>
            </Tip>
          </div>
          <Can perm="files.upload">
            {projectId ? (
              <Button size="sm" className="ms-auto" onClick={() => { setUploadFolder(folder === "all" ? FILE_FOLDERS[0] : folder); setUploadOpen(true); }}>
                <Upload className="h-4 w-4" /> بارگذاری فایل
              </Button>
            ) : (
              <p className="ms-auto text-xs text-muted-foreground">برای بارگذاری، وارد فایل‌های یک پروژه شوید.</p>
            )}
          </Can>
        </div>

        {shown.length === 0 && (
          <EmptyState
            icon={<FolderOpen className="h-6 w-6" />} title="فایلی نیست"
            description={q ? "فایلی با این نام پیدا نشد." : "هنوز فایلی در این بخش بارگذاری نشده است."}
            action={projectId && can("files.upload") ? <Button size="sm" onClick={() => setUploadOpen(true)}><Upload className="h-4 w-4" /> بارگذاری اولین فایل</Button> : undefined}
          />
        )}

        {view === "grid" ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((f) => (
              <FileCard key={f.id} file={f}
                onPreview={() => setPreview(f)}
                onRename={() => { setRenameTarget(f); setRenameValue(f.fileName); }}
                onMove={(to) => actions.move.mutate({ id: f.id, folder: to })}
                onDelete={() => actions.remove.mutate(f.id)} />
            ))}
          </div>
        ) : (
          <Card className="divide-y p-0">
            {shown.map((f) => (
              <FileRow key={f.id} file={f}
                onPreview={() => setPreview(f)}
                onRename={() => { setRenameTarget(f); setRenameValue(f.fileName); }}
                onMove={(to) => actions.move.mutate({ id: f.id, folder: to })}
                onDelete={() => actions.remove.mutate(f.id)} />
            ))}
          </Card>
        )}
      </div>

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>بارگذاری فایل در «{uploadFolder}»</DialogTitle></DialogHeader>
          <Select value={uploadFolder} onValueChange={setUploadFolder}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FILE_FOLDERS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
          <FileUploader policyKey="projectFile" multiple
            onUploaded={async (list) => {
              for (const m of list) await actions.upload.mutateAsync({ pid: projectId!, folder: uploadFolder, meta: m });
              setUploadOpen(false);
            }} />
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(v) => !v && setRenameTarget(null)}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>تغییر نام فایل</DialogTitle></DialogHeader>
          <div className="flex gap-2">
            <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
            <Button disabled={!renameValue.trim()} onClick={() => {
              actions.rename.mutate({ id: renameTarget!.id, name: renameValue.trim() });
              setRenameTarget(null);
            }}>ذخیره</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent size="lg">
          <DialogHeader><DialogTitle className="truncate">{preview?.fileName}</DialogTitle></DialogHeader>
          {preview && <FilePreview file={preview} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FolderRow({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] transition-colors",
        active ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <FolderOpen className="h-4 w-4" />
      <span className="flex-1 whitespace-nowrap text-start">{label}</span>
      <Badge variant="secondary" className="tnum">{toFaDigits(count)}</Badge>
    </button>
  );
}

export function FileIcon({ mime, name, className }: { mime: string; name: string; className?: string }) {
  const isImg = mime.startsWith("image/");
  const isDoc = mime.includes("pdf") || mime.includes("word") || name.endsWith(".txt") || name.endsWith(".md");
  const Icon = isImg ? ImageIcon : isDoc ? FileText : FileLucide;
  return (
    <span className={cn(
      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
      isImg ? "bg-violet-500/10 text-violet-600 dark:text-violet-400" : isDoc ? "bg-sky-500/10 text-sky-600 dark:text-sky-400" : "bg-muted text-muted-foreground",
      className,
    )}>
      <Icon className="h-5 w-5" />
    </span>
  );
}

function downloadFile(file: ProjectFile): void {
  const ok = downloadStoredFile(file.id, file.fileName);
  if (!ok) toast.warning("فایل در این نشست موجود نیست؛ پس از رفرش صفحه، محتوای فایل‌ها پاک می‌شود.");
}

function FileMenu({ file, onRename, onMove, onDelete }: { file: ProjectFile; onRename: () => void; onMove: (to: string) => void; onDelete: () => void }) {
  const { can } = usePermission();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="اقدامات فایل"><MoreVertical className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {can("files.download") && (
          <DropdownMenuItem onClick={() => downloadFile(file)}>
            <Download className="h-4 w-4" /> دانلود
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onRename}><Pencil className="h-4 w-4" /> تغییر نام</DropdownMenuItem>
        <DropdownMenuSeparator />
        {FILE_FOLDERS.filter((f) => f !== file.folder).map((f) => (
          <DropdownMenuItem key={f} onClick={() => onMove(f)}><FolderInput className="h-4 w-4" /> انتقال به {f}</DropdownMenuItem>
        ))}
        {can("files.delete") && (
          <>
            <DropdownMenuSeparator />
            <ConfirmDialog
              trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive"><Trash2 className="h-4 w-4" /> حذف فایل</DropdownMenuItem>}
              title="حذف فایل" description={`«${file.fileName}» حذف می‌شود. این عمل قابل بازگشت نیست.`}
              confirmLabel="حذف" onConfirm={onDelete}
            />
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FileCard({ file, onPreview, onRename, onMove, onDelete }: {
  file: ProjectFile; onPreview: () => void; onRename: () => void; onMove: (to: string) => void; onDelete: () => void;
}) {
  return (
    <Card className="group p-4 transition-all hover:border-primary/40 hover:shadow-pop">
      <div className="flex items-start justify-between">
        <button onClick={onPreview} aria-label="پیش‌نمایش"><FileIcon mime={file.mimeType} name={file.fileName} className="h-12 w-12" /></button>
        <FileMenu file={file} onRename={onRename} onMove={onMove} onDelete={onDelete} />
      </div>
      <button onClick={onPreview} className="mt-2 block w-full text-start">
        <p className="truncate text-[13px] font-semibold hover:text-primary">{file.fileName}</p>
      </button>
      <p className="mt-1 text-[11px] text-muted-foreground">{formatBytes(file.sizeBytes)} · نسخه {toFaDigits(file.version)}</p>
      <div className="mt-2.5 flex items-center gap-1.5 border-t pt-2.5">
        <UserAvatar name={file.uploadedBy?.name ?? "?"} size="xs" />
        <span className="truncate text-[11px] text-muted-foreground">{file.uploadedBy?.name} · {timeAgoFa(file.updatedAt)}</span>
        <Badge variant="secondary" className="ms-auto text-[10px]">{file.folder}</Badge>
      </div>
    </Card>
  );
}

function FileRow({ file, onPreview, onRename, onMove, onDelete }: {
  file: ProjectFile; onPreview: () => void; onRename: () => void; onMove: (to: string) => void; onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 hover:bg-muted/40">
      <button onClick={onPreview} aria-label="پیش‌نمایش"><FileIcon mime={file.mimeType} name={file.fileName} /></button>
      <button onClick={onPreview} className="min-w-0 flex-1 text-start">
        <p className="truncate text-[13px] font-medium hover:text-primary">{file.fileName}</p>
        <p className="text-[11px] text-muted-foreground">{file.folder} · {formatBytes(file.sizeBytes)} · {formatDateFa(file.updatedAt)}</p>
      </button>
      <span className="hidden text-[11px] text-muted-foreground sm:block">{file.uploadedBy?.name}</span>
      <FileMenu file={file} onRename={onRename} onMove={onMove} onDelete={onDelete} />
    </div>
  );
}

function FilePreview({ file }: { file: ProjectFile }) {
  const isImg = file.mimeType.startsWith("image/");
  const isText = file.mimeType.startsWith("text/") || file.fileName.endsWith(".md");
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    setObjectUrl(null);
    setText(null);
    const blob = getStoredBlob(file.id);
    if (!blob) return;
    if (isImg) {
      const url = URL.createObjectURL(blob);
      setObjectUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    if (isText && blob.size < 200_000) {
      blob.text().then((t) => setText(t.slice(0, 8000))).catch(() => setText(null));
    }
  }, [file.id, isImg, isText]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
        <span>{formatBytes(file.sizeBytes)}</span>·<span>نسخه {toFaDigits(file.version)}</span>·
        <span>{file.uploadedBy?.name}</span>·<span>{formatDateFa(file.updatedAt)}</span>
      </div>
      {isImg ? (
        objectUrl ? (
          <img src={objectUrl} alt={file.fileName} className="max-h-96 w-full rounded-xl bg-muted/30 object-contain" />
        ) : (
          <div className="flex items-center justify-center gap-3 rounded-xl bg-muted/30 p-10 text-sm text-muted-foreground">
            <ImageIcon className="h-10 w-10" />
            پیش‌نمایش موجود نیست؛ فایل را دانلود کنید.
          </div>
        )
      ) : isText ? (
        <pre className="max-h-80 overflow-auto rounded-xl bg-muted/50 p-4 text-xs leading-6" dir="ltr">
          {text ?? "(محتوای فایل در این نشست موجود نیست؛ پس از رفرش صفحه، بایت‌ها پاک می‌شوند.)"}
        </pre>
      ) : (
        <div className="flex items-center justify-center gap-3 rounded-xl bg-muted/30 p-10 text-sm text-muted-foreground">
          <FileIcon mime={file.mimeType} name={file.fileName} className="h-14 w-14" />
          پیش‌نمایش این فرمت پشتیبانی نمی‌شود.
        </div>
      )}
      <div className="flex gap-2">
        <Button onClick={() => downloadFile(file)}><Download className="h-4 w-4" /> دانلود</Button>
      </div>
    </div>
  );
}
