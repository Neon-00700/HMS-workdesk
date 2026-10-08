"use client";
import { useParams, useRouter } from "next/navigation";
import { TaskDetailContent } from "@/features/tasks/task-detail";

export default function TaskPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  return (
    <div className="mx-auto max-w-6xl">
      <TaskDetailContent taskId={id} onDeleted={() => router.back()} />
    </div>
  );
}
