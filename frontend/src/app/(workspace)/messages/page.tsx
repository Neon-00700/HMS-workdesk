"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChatPanel } from "@/features/chat/chat-panel";
import { PageHeader } from "@/components/shared/page-header";

function MessagesInner() {
  const cid = useSearchParams().get("c") ?? undefined;
  return (
    <div>
      <PageHeader title="پیام‌ها" description="گفتگوهای مستقیم، گروه‌ها و کانال‌های پروژه‌ها." />
      <ChatPanel key={cid ?? "all"} initialConversationId={cid} />
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense>
      <MessagesInner />
    </Suspense>
  );
}
