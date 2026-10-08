"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied, ErrorState } from "@/components/shared/states";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PROJECT_STATUS_META, HEALTH_META } from "@/config/constants";
import { useProject, useUpdateProject } from "@/services/queries";
import { projectsApi } from "@/services/api";
import { usePermission } from "@/hooks/use-permission";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().min(3, "نام حداقل ۳ کاراکتر."),
  key: z.string().min(2).max(5),
  description: z.string().max(500).optional(),
  status: z.enum(["active", "on_hold", "completed", "archived"]),
  health: z.enum(["on_track", "at_risk", "off_track"]),
  targetDate: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const COLORS = ["#16a34a", "#0ea5e9", "#8b5cf6", "#f59e0b", "#ec4899", "#14b8a6", "#f97316", "#64748b"];

export default function ProjectSettingsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { data: project, isLoading, isError } = useProject(id);
  const update = useUpdateProject();
  const { can } = usePermission();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (project) {
      reset({
        name: project.name, key: project.key, description: project.description,
        status: project.status, health: project.health,
        targetDate: project.targetDate.slice(0, 10),
      });
    }
  }, [project, reset]);

  if (!can("projects.edit")) return <PermissionDenied />;
  if (isError) return <ErrorState />;
  if (isLoading || !project) return <div className="h-80 animate-pulse rounded-xl bg-muted" />;

  const submit = (v: FormValues) => {
    update.mutate({
      id,
      patch: {
        name: v.name, key: v.key, description: v.description, status: v.status, health: v.health,
        targetDate: v.targetDate ? new Date(v.targetDate).toISOString() : project.targetDate,
        iconColor: watch("iconColor" as keyof FormValues) as unknown as string ?? project.iconColor,
      },
    });
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader title="تنظیمات پروژه" description="اطلاعات پایه، وضعیت و سلامت پروژه." />

      <Card>
        <CardHeader>
          <CardTitle>اطلاعات پایه</CardTitle>
          <CardDescription>این اطلاعات در سراسر فضای کاری نمایش داده می‌شود.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium">نام پروژه</label>
                <Input {...register("name")} />
                {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium">کلید</label>
                <Input {...register("key")} className="uppercase" maxLength={5} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium">توضیحات</label>
              <Textarea {...register("description")} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium">وضعیت</label>
                <Select value={watch("status")} onValueChange={(v) => setValue("status", v as FormValues["status"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROJECT_STATUS_META).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium">سلامت</label>
                <Select value={watch("health")} onValueChange={(v) => setValue("health", v as FormValues["health"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(HEALTH_META).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium">تاریخ هدف</label>
                <Input type="date" {...register("targetDate")} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium">رنگ پروژه</label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c} type="button" aria-label={`رنگ ${c}`}
                    onClick={() => update.mutate({ id, patch: { iconColor: c } })}
                    className={`h-8 w-8 rounded-lg transition-transform hover:scale-110 ${project.iconColor === c ? "ring-2 ring-offset-2 ring-offset-card" : ""}`}
                    style={{ backgroundColor: c, ["--tw-ring-color" as string]: c }}
                  />
                ))}
              </div>
            </div>
            <div>
              <Button type="submit" loading={update.isPending}>ذخیره تغییرات</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">منطقه خطر</CardTitle>
          <CardDescription>حذف پروژه همه بوردها، تسک‌ها و فایل‌های آن را حذف می‌کند.</CardDescription>
        </CardHeader>
        <CardContent>
          <ConfirmDialog
            trigger={<Button variant="destructive">حذف پروژه</Button>}
            title="حذف پروژه" description={`«${project.name}» و همه داده‌های آن حذف می‌شود. این عمل قابل بازگشت نیست.`}
            confirmLabel="حذف دائمی"
            onConfirm={async () => {
              await projectsApi.remove(id);
              toast.success("پروژه حذف شد.");
              router.replace("/projects");
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
