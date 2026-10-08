"use client";
import { useParams } from "next/navigation";
import { ChatPanel } from "@/features/chat/chat-panel";
import { PageHeader } from "@/components/shared/page-header";

export default function ProjectChatPage() {
  const { id } = useParams() as { id: string };
  return (
    <div>
      <PageHeader title="گفتگوی پروژه" description="کانال‌های تیمی این پروژه." />
      <ChatPanel projectId={id} showChannelsOnly />
    </div>
  );
}
