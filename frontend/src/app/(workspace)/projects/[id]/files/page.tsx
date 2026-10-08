"use client";
import { useParams } from "next/navigation";
import { FileExplorer } from "@/features/files/file-explorer";
import { PageHeader } from "@/components/shared/page-header";

export default function ProjectFilesPage() {
  const { id } = useParams() as { id: string };
  return (
    <div>
      <PageHeader title="فایل‌های پروژه" description="مدیریت اسناد، دیزاین‌ها و فایل‌های این پروژه." />
      <FileExplorer projectId={id} />
    </div>
  );
}
