"use client";
import { FileExplorer } from "@/features/files/file-explorer";
import { PageHeader } from "@/components/shared/page-header";

export default function FilesPage() {
  return (
    <div>
      <PageHeader title="فایل‌ها" description="همه فایل‌های پروژه‌ها در یک نما." />
      <FileExplorer />
    </div>
  );
}
