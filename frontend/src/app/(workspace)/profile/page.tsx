"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { Camera, Mail, Building2, Briefcase, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/shared/page-header";
import { TaskCard } from "@/components/shared/task-card";
import { UPLOAD_POLICIES } from "@/config/constants";
import { validateUpload } from "@/lib/file-validation";
import { toFaDigits } from "@/lib/utils";
import { formatDateFa } from "@/lib/format";
import { useTasks, useProjects, useActivity } from "@/services/queries";
import { usersApi } from "@/services/api";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { toast } from "sonner";

/** Downscale an image to a small JPEG dataURL (≈10–20KB) for DB persistence. */
function downscaleToDataURL(file: File, max = 128): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("bad image"));
    };
    img.src = url;
  });
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const openTask = useUIStore((s) => s.openTask);
  const { data: myTasks } = useTasks({ assigneeId: user?.id, pageSize: 100 });
  const { data: projects = [] } = useProjects();
  const { data: activity = [] } = useActivity();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  if (!user) return null;

  const tasks = myTasks?.items ?? [];
  const done = tasks.filter((t) => t.status === "done" || t.status === "released").length;
  const myActivity = activity.filter((a) => a.actorId === user.id).slice(0, 5);
  const completion = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const onAvatar = async (f: File | undefined) => {
    if (!f) return;
    const v = await validateUpload("avatar", f);
    if (!v.ok) return toast.error(v.error);
    setUploading(true);
    try {
      // Downscale to a small JPEG dataURL so the avatar persists in the DB.
      const dataUrl = await downscaleToDataURL(f);
      const updated = await usersApi.updateMe({ avatarUrl: dataUrl });
      setUser(updated);
      toast.success("تصویر پروفایل به‌روز شد.");
    } catch {
      toast.error("خواندن تصویر ناموفق بود.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader
        title="پروفایل من"
        actions={<Button variant="outline" asChild><Link href="/settings">تنظیمات حساب <ArrowLeft className="h-4 w-4" /></Link></Button>}
      />

      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
          <div className="relative">
            <UserAvatar name={user.name} src={user.avatarUrl} size="xl" online />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              aria-label="تغییر تصویر پروفایل"
              className="absolute -bottom-1 -end-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-pop hover:bg-primary/90"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input ref={fileRef} type="file" hidden accept={UPLOAD_POLICIES.avatar.accept}
              onChange={(e) => { onAvatar(e.target.files?.[0]); e.target.value = ""; }} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold">{user.name}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{user.position} · {user.department}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge>{user.roleTitleFa}</Badge>
              <Badge variant="secondary">@{user.username}</Badge>
            </div>
            {user.about && <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{user.about}</p>}
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /><span dir="ltr">{user.email}</span></span>
              <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{user.department}</span>
              <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" />عضویت از {formatDateFa(user.createdAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5">
          <p className="text-[13px] text-muted-foreground">تسک‌های باز</p>
          <p className="mt-1 text-2xl font-bold tnum">{toFaDigits(tasks.length - done)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-[13px] text-muted-foreground">تکمیل‌شده</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600 tnum">{toFaDigits(done)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-[13px] text-muted-foreground">نرخ تکمیل</p>
          <p className="mt-1 text-2xl font-bold tnum">{toFaDigits(completion)}٪</p>
          <Progress value={completion} className="mt-2 h-1.5" />
        </CardContent></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div>
          <h3 className="mb-3 text-[15px] font-semibold">تسک‌های جاری</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {tasks.filter((t) => t.status !== "done" && t.status !== "released").slice(0, 4).map((t) => (
              <TaskCard key={t.id} task={t} compact onOpen={() => openTask(t.id)} />
            ))}
          </div>
          {tasks.length === 0 && <p className="text-[13px] text-muted-foreground">تسکی ندارید.</p>}
        </div>
        <div>
          <h3 className="mb-3 text-[15px] font-semibold">پروژه‌های من</h3>
          <Card>
            <CardContent className="flex flex-col gap-1 p-2">
              {projects.slice(0, 5).map((p) => (
                <Link key={p.id} href={`/projects/${p.id}/overview`} className="flex items-center gap-2.5 rounded-lg p-2 hover:bg-muted/60">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold text-white" style={{ backgroundColor: p.iconColor }}>
                    {p.key.slice(0, 2)}
                  </span>
                  <span className="truncate text-[13px] font-medium">{p.name}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
