"use client";
import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPicker } from "./user-picker";
import { PRIORITY_META, STREAM_META } from "@/config/constants";
import { useCreateTask, useProjects, useBoards, useMembers } from "@/services/queries";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type { Task } from "@/types/models";

const schema = z.object({
  title: z.string().min(3, "عنوان حداقل ۳ کاراکتر باشد."),
  description: z.string().max(4000).optional(),
  projectId: z.string().min(1, "پروژه را انتخاب کنید."),
  boardId: z.string().min(1, "بورد را انتخاب کنید."),
  columnId: z.string().min(1, "ستون را انتخاب کنید."),
  priority: z.enum(["lowest", "low", "medium", "high", "critical"]),
  stream: z.enum(["frontend", "backend", "database", "infra", "qa", "design", "other"]).optional(),
  assigneeIds: z.array(z.string()).optional(),
  dueDate: z.string().optional(),
  estimateMinutes: z.coerce.number().min(0).max(100000).optional(),
});

type FormValues = z.infer<typeof schema>;

export function CreateTaskForm({ defaults, onDone }: { defaults?: Record<string, unknown>; onDone?: () => void }) {
  const activePid = useWorkspaceStore((s) => s.activeProjectId);
  const { data: projects = [] } = useProjects();
  const create = useCreateTask();

  const { control, register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      projectId: (defaults?.projectId as string) ?? activePid ?? projects[0]?.id ?? "",
      boardId: (defaults?.boardId as string) ?? "",
      columnId: (defaults?.columnId as string) ?? "",
      priority: ((defaults?.priority as FormValues["priority"]) ?? "medium"),
      assigneeIds: [],
    },
  });

  const projectId = watch("projectId");
  const boardId = watch("boardId");
  const { data: boards = [] } = useBoards(projectId);
  const { data: members = [] } = useMembers(projectId);
  const board = useMemo(() => boards.find((b) => b.id === boardId) ?? boards.find((b) => b.isDefault) ?? boards[0], [boards, boardId]);

  useEffect(() => {
    if (boards.length && !boardId) {
      const d = boards.find((b) => b.isDefault) ?? boards[0];
      setValue("boardId", d.id);
      setValue("columnId", d.columns[0]?.id ?? "");
    }
  }, [boards, boardId, setValue]);

  useEffect(() => {
    if (board && boardId && !watch("columnId")) setValue("columnId", board.columns[0]?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  const submit = (v: FormValues) => {
    create.mutate(
      {
        title: v.title,
        description: v.description,
        projectId: v.projectId,
        boardId: v.boardId || board?.id || "",
        columnId: v.columnId || board?.columns[0]?.id || "",
        priority: v.priority,
        stream: v.stream,
        assigneeIds: v.assigneeIds,
        dueDate: v.dueDate ? new Date(v.dueDate).toISOString() : undefined,
        estimateMinutes: v.estimateMinutes ? v.estimateMinutes * 60 : undefined,
      } as Partial<Task> & { title: string; projectId: string; boardId: string; columnId: string },
      { onSuccess: () => onDone?.() },
    );
  };

  const err = (f: keyof FormValues) =>
    errors[f] ? <p className="mt-1 text-xs text-destructive">{String(errors[f]?.message)}</p> : null;

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-[13px] font-medium">عنوان تسک *</label>
        <Input placeholder="مثلاً: پیاده‌سازی فرم ورود" {...register("title")} autoFocus />
        {err("title")}
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-medium">توضیحات</label>
        <Textarea rows={3} placeholder="شرح کوتاه…" {...register("description")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium">پروژه *</label>
          <Controller
            control={control} name="projectId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={(v) => { field.onChange(v); setValue("boardId", ""); setValue("columnId", ""); }}>
                <SelectTrigger><SelectValue placeholder="انتخاب پروژه" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
          {err("projectId")}
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium">بورد *</label>
          <Controller
            control={control} name="boardId"
            render={({ field }) => (
              <Select value={field.value || board?.id} onValueChange={(v) => { field.onChange(v); const b = boards.find((x) => x.id === v); setValue("columnId", b?.columns[0]?.id ?? ""); }}>
                <SelectTrigger><SelectValue placeholder="انتخاب بورد" /></SelectTrigger>
                <SelectContent>
                  {boards.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
          {err("boardId")}
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium">ستون *</label>
          <Controller
            control={control} name="columnId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="انتخاب ستون" /></SelectTrigger>
                <SelectContent>
                  {(board?.columns ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
          {err("columnId")}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium">اولویت</label>
          <Controller
            control={control} name="priority"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_META).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium">حوزه کاری</label>
          <Controller
            control={control} name="stream"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="انتخاب حوزه" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STREAM_META).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium">ددلاین</label>
          <Input type="date" {...register("dueDate")} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium">مجریان</label>
          <Controller
            control={control} name="assigneeIds"
            render={({ field }) => (
              <UserPicker multiple value={field.value} onChange={(v) => field.onChange(v as string[])} membersOnly={members.map((m) => ({ id: m.userId, name: m.user.name }))} />
            )}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium">تخمین (ساعت)</label>
          <Input type="number" min={0} placeholder="مثلاً ۸" {...register("estimateMinutes")} />
        </div>
      </div>
      <div className="flex justify-start gap-2 pt-1">
        <Button type="submit" loading={create.isPending}>ایجاد تسک</Button>
        {onDone && <Button type="button" variant="outline" onClick={onDone}>انصراف</Button>}
      </div>
    </form>
  );
}
