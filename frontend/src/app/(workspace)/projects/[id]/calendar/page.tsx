"use client";
import { useParams } from "next/navigation";
import { CalendarView } from "@/features/calendar/calendar-view";
import { PageHeader } from "@/components/shared/page-header";

export default function ProjectCalendarPage() {
  const { id } = useParams() as { id: string };
  return (
    <div>
      <PageHeader title="تقویم پروژه" description="ددلاین‌ها، مایلستون‌ها و رویدادهای این پروژه." />
      <CalendarView projectId={id} />
    </div>
  );
}
