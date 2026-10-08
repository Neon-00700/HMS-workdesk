"use client";
import { useParams } from "next/navigation";
import { Gantt } from "@/features/timeline/gantt";
import { PageHeader } from "@/components/shared/page-header";

export default function ProjectTimelinePage() {
  const { id } = useParams() as { id: string };
  return (
    <div>
      <PageHeader title="تایم‌لاین / گانت" description="زمان‌بندی تسک‌ها، وابستگی‌ها و مایلستون‌ها." />
      <Gantt projectId={id} />
    </div>
  );
}
