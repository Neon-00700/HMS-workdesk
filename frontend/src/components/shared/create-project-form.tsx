"use client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateProject } from "@/services/queries";

const schema = z.object({
  name: z.string().min(3, "نام پروژه حداقل ۳ کاراکتر باشد."),
  key: z.string().min(2, "کلید حداقل ۲ کاراکتر.").max(5, "حداکثر ۵ کاراکتر."),
  description: z.string().max(500, "حداکثر ۵۰۰ کاراکتر.").optional(),
  targetDate: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function CreateProjectForm({ onDone }: { onDone?: () => void }) {
  const create = useCreateProject();
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", key: "", description: "" },
  });

  const submit = (v: FormValues) => {
    create.mutate(
      { name: v.name, key: v.key, description: v.description, targetDate: v.targetDate || undefined },
      { onSuccess: () => onDone?.() },
    );
  };

  const err = (f: keyof FormValues) => errors[f] && <p className="mt-1 text-xs text-destructive">{errors[f]?.message}</p>;

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-[13px] font-medium">نام پروژه *</label>
        <Input placeholder="مثلاً: سیستم CRM داخلی" {...register("name")} />
        {err("name")}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium">کلید پروژه *</label>
          <Input placeholder="CRM" {...register("key")} className="uppercase" maxLength={5} />
          {err("key")}
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium">تاریخ هدف</label>
          <Input type="date" {...register("targetDate")} />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-medium">توضیحات</label>
        <Textarea placeholder="هدف و دامنه پروژه…" {...register("description")} />
        {err("description")}
      </div>
      <div className="flex justify-start gap-2">
        <Button type="submit" loading={create.isPending}>ایجاد پروژه</Button>
        {onDone && <Button type="button" variant="outline" onClick={onDone}>انصراف</Button>}
      </div>
    </form>
  );
}
