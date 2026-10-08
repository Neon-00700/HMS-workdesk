"use client";
import { CalendarView } from "@/features/calendar/calendar-view";
import { PageHeader } from "@/components/shared/page-header";

export default function CalendarPage() {
  return (
    <div>
      <PageHeader title="تقویم" description="ددلاین‌ها، جلسات و رویدادهای همه پروژه‌ها و کارهای شخصی." />
      <CalendarView />
    </div>
  );
}
