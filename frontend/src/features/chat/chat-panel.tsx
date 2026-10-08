"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, Send, Smile, Paperclip, Reply, Pencil, Trash2, Pin, PinOff,
  Check, CheckCheck, Plus, Users, VolumeX, Volume2, ImageIcon, ChevronRight,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tip } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/states";
import { UserPicker } from "@/components/shared/user-picker";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CHAT_BACKGROUND_PRESETS } from "@/config/constants";
import { formatTimeFa, formatDateFa, timeAgoFa } from "@/lib/format";
import { toFaDigits, cn } from "@/lib/utils";
import { useConversations, useMessages, useChatActions, useUsers } from "@/services/queries";
import { useAuthStore } from "@/stores/auth-store";
import { usePermission } from "@/hooks/use-permission";
import type { Conversation, Message, ChatBackground } from "@/types/models";
import { toast } from "sonner";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "👏", "🚀", "✅", "🎉"];

export function ChatPanel({ projectId, initialConversationId, showChannelsOnly }: {
  projectId?: string;
  initialConversationId?: string;
  showChannelsOnly?: boolean;
}) {
  const { data: allConvs = [], isLoading } = useConversations();
  const [activeId, setActiveId] = useState<string | undefined>(initialConversationId);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "unread" | "pinned">("all");
  const [mobileShowList, setMobileShowList] = useState(true);
  const { markRead, ensureChannel } = useChatActions();

  const convs = useMemo(() => {
    let list = allConvs;
    if (projectId) list = list.filter((c) => c.projectId === projectId);
    if (showChannelsOnly) list = list.filter((c) => c.kind === "project_channel");
    if (tab === "unread") list = list.filter((c) => c.unreadCount > 0);
    if (tab === "pinned") list = list.filter((c) => c.isPinned);
    if (q) list = list.filter((c) => c.title.includes(q));
    return list;
  }, [allConvs, projectId, showChannelsOnly, tab, q]);

  useEffect(() => {
    if (initialConversationId) {
      setActiveId(initialConversationId);
      setMobileShowList(false);
    }
  }, [initialConversationId]);

  useEffect(() => {
    if (!activeId && convs.length) setActiveId(convs[0].id);
  }, [convs, activeId]);

  // Auto-create the project channel on first visit so the page is never a dead end.
  const ensuredRef = useRef(false);
  useEffect(() => {
    if (projectId && showChannelsOnly && !isLoading && !ensuredRef.current) {
      const has = allConvs.some((c) => c.projectId === projectId && c.kind === "project_channel");
      if (!has) {
        ensuredRef.current = true;
        ensureChannel.mutate(projectId);
      }
    }
  }, [projectId, showChannelsOnly, isLoading, allConvs, ensureChannel]);

  const active = allConvs.find((c) => c.id === activeId);

  const select = (id: string) => {
    setActiveId(id);
    setMobileShowList(false);
    markRead.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="h-[32.5rem] animate-pulse rounded-xl bg-muted" />
        <div className="h-[32.5rem] animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      {/* Conversation list */}
      <div className={cn("flex-col gap-2 rounded-xl border bg-card p-3 shadow-card", mobileShowList ? "flex" : "hidden lg:flex")}>
        <div className="relative">
          <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="جست‌وجوی گفتگو…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 ps-8" />
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {([["all", "همه"], ["unread", "خوانده‌نشده"], ["pinned", "سنجاق‌شده"]] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={cn("h-7 flex-1 rounded-md text-xs font-medium transition-colors", tab === k ? "bg-card shadow-card" : "text-muted-foreground hover:text-foreground")}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto lg:max-h-[calc(100vh-320px)]">
          {convs.map((c) => (
            <ConversationRow key={c.id} conv={c} active={c.id === activeId} onSelect={() => select(c.id)} />
          ))}
          {convs.length === 0 && (
            <EmptyState icon={<MessageSquare className="h-6 w-6" />} title="گفتگویی نیست" description="گفتگوی جدیدی شروع کنید." className="py-8" />
          )}
        </div>
        {!projectId && <NewGroupButton />}
      </div>

      {/* Thread */}
      <div className={cn("min-h-[32.5rem] flex-col overflow-hidden rounded-xl border bg-card shadow-card", mobileShowList ? "hidden lg:flex" : "flex")}>
        {active ? (
          <Thread conv={active} onBack={() => setMobileShowList(true)} />
        ) : (
          <EmptyState icon={<MessageSquare className="h-8 w-8" />} title="گفتگو را انتخاب کنید" description="از فهرست، یک گفتگو را برای مشاهده پیام‌ها انتخاب کنید." className="m-4 flex-1 border-0" />
        )}
      </div>
    </div>
  );
}

function ConversationRow({ conv, active, onSelect }: { conv: Conversation; active: boolean; onSelect: () => void }) {
  const meId = useAuthStore((s) => s.user?.id);
  const peer = conv.kind === "dm" ? conv.members?.find((m) => m.id !== meId) : undefined;
  const title = peer?.name ?? conv.title;
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl p-2.5 text-start transition-colors",
        active ? "bg-primary/10" : "hover:bg-muted/60",
      )}
    >
      {peer ? (
        <UserAvatar name={peer.name} src={peer.avatarUrl} size="md" online={peer.isOnline} />
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {conv.kind === "group" ? <Users className="h-4 w-4" /> : <span className="text-sm font-bold">#</span>}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-[13px] font-semibold">{title}</span>
          {conv.lastMessage && <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgoFa(conv.lastMessage.createdAt)}</span>}
        </span>
        <span className="mt-0.5 flex items-center justify-between gap-2">
          <span className="truncate text-xs text-muted-foreground">{conv.lastMessage?.body ?? "بدون پیام"}</span>
          {conv.unreadCount > 0 && (
            <span className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground tnum">
              {toFaDigits(conv.unreadCount)}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

function Thread({ conv, onBack }: { conv: Conversation; onBack: () => void }) {
  const meId = useAuthStore((s) => s.user?.id);
  const { data: messages = [] } = useMessages(conv.id);
  const actions = useChatActions();
  const { can } = usePermission();
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [msgSearch, setMsgSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [bgOpen, setBgOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const peer = conv.kind === "dm" ? conv.members?.find((m) => m.id !== meId) : undefined;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, conv.id]);

  useEffect(() => {
    actions.markRead.mutate(conv.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv.id]);

  const send = () => {
    if (!body.trim()) return;
    if (editing) {
      actions.edit.mutate({ cid: conv.id, mid: editing.id, body: body.trim() });
      setEditing(null);
    } else {
      actions.send.mutate({ cid: conv.id, body: body.trim(), reply: replyTo?.id });
      setReplyTo(null);
    }
    setBody("");
  };

  const shown = msgSearch ? messages.filter((m) => m.body.includes(msgSearch)) : messages;
  const pinned = messages.filter((m) => m.isPinned);

  const bg = conv.background ?? { type: "default", value: "default", overlayOpacity: 0 };
  const bgStyle: React.CSSProperties = bg.type === "color" && bg.value !== "transparent"
    ? { backgroundColor: bg.value }
    : {};
  const bgClass = bg.type === "pattern" && bg.value === "dots" ? "chat-pattern-dots" : bg.type === "pattern" && bg.value === "grid" ? "chat-pattern-grid" : "";
  const bgImage = bg.type === "image" ? bg.value : undefined;

  const setBg = (next: ChatBackground) => {
    actions.setBackground.mutate({ cid: conv.id, bg: next });
    setBgOpen(false);
  };

  return (
    <>
      {/* Thread header */}
      <div className="flex items-center gap-2.5 border-b p-3">
        <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={onBack} aria-label="بازگشت">
          <ChevronRight className="h-4 w-4 rotate-180" />
        </Button>
        {peer ? <UserAvatar name={peer.name} src={peer.avatarUrl} size="md" online={peer.isOnline} /> : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            {conv.kind === "group" ? <Users className="h-4 w-4" /> : <span className="text-sm font-bold">#</span>}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{peer?.name ?? (conv.kind === "project_channel" ? `# ${conv.title}` : conv.title)}</p>
          <p className="text-[11px] text-muted-foreground">
            {peer ? (peer.isOnline ? "آنلاین" : `آخرین بازدید ${timeAgoFa(peer.lastSeenAt)}`) : `${toFaDigits(conv.memberIds.length)} عضو`}
          </p>
        </div>
        <Tip label="جست‌وجو در پیام‌ها">
          <Button variant="ghost" size="icon-sm" onClick={() => setShowSearch((v) => !v)} aria-label="جست‌وجو"><Search className="h-4 w-4" /></Button>
        </Tip>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="تنظیمات گفتگو"><ImageIcon className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => setBgOpen(true)}><ImageIcon className="h-4 w-4" /> تغییر پس‌زمینه</DropdownMenuItem>
            <DropdownMenuItem onClick={() => actions.toggleMute.mutate(conv.id)}>
              {conv.isMuted ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              {conv.isMuted ? "فعال کردن اعلان" : "بی‌صدا کردن"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {showSearch && (
        <div className="border-b p-2">
          <Input placeholder="جست‌وجو در پیام‌ها…" value={msgSearch} onChange={(e) => setMsgSearch(e.target.value)} className="h-9" autoFocus />
        </div>
      )}

      {pinned.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto border-b bg-muted/40 px-3 py-1.5">
          <Pin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          {pinned.map((p) => (
            <span key={p.id} className="truncate text-[11px] text-muted-foreground">{p.body.slice(0, 50)}</span>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className={cn("relative flex-1 overflow-y-auto overflow-x-clip p-4", bgClass)} style={bgStyle}>
        {bgImage && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bgImage} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
            <div className="pointer-events-none absolute inset-0 bg-card" style={{ opacity: bg.overlayOpacity }} />
          </>
        )}
        <div className="relative flex flex-col gap-1.5">
          {shown.map((m, i) => (
            <MessageBubble
              key={m.id}
              msg={m}
              mine={m.senderId === meId}
              showAvatar={i === 0 || shown[i - 1].senderId !== m.senderId}
              onReply={() => setReplyTo(m)}
              onEdit={() => { setEditing(m); setBody(m.body); }}
              convId={conv.id}
            />
          ))}
          {shown.length === 0 && (
            <p className="py-10 text-center text-[13px] text-muted-foreground">پیامی نیست. اولین پیام را بفرستید.</p>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Composer */}
      <div className="border-t p-3">
        {replyTo && (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-xs">
            <span className="flex items-center gap-1.5 truncate"><Reply className="h-3.5 w-3.5" /> پاسخ به: {replyTo.body.slice(0, 60)}</span>
            <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={() => setReplyTo(null)}>×</Button>
          </div>
        )}
        {editing && (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-xs">
            <span className="flex items-center gap-1.5"><Pencil className="h-3.5 w-3.5" /> در حال ویرایش پیام</span>
            <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={() => { setEditing(null); setBody(""); }}>×</Button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" disabled={!can("chat.send")} aria-label="اموجی"><Smile className="h-5 w-5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <div className="grid grid-cols-5 gap-1 p-1">
                {EMOJIS.map((e) => (
                  <button key={e} onClick={() => setBody((b) => b + e)} className="rounded-lg p-2 text-lg hover:bg-muted">{e}</button>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <Tip label="پیوست فایل">
            <Button variant="ghost" size="icon" disabled={!can("chat.send")} onClick={() => toast.info("پیوست فایل چت به‌زودی در این نسخه نمایشی فعال می‌شود. richest demo usesValidated uploader in files/tasks.")} aria-label="پیوست">
              <Paperclip className="h-5 w-5" />
            </Button>
          </Tip>
          <Input
            placeholder={can("chat.send") ? "پیام بنویسید… (@ برای منشن)" : "شما اجازه ارسال پیام ندارید"}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            disabled={!can("chat.send")}
            className="min-h-10"
          />
          <Button onClick={send} disabled={!body.trim() || !can("chat.send")} loading={actions.send.isPending} aria-label="ارسال پیام">
            <Send className="h-4 w-4 -scale-x-100" />
          </Button>
        </div>
      </div>

      {/* Background picker */}
      <Dialog open={bgOpen} onOpenChange={setBgOpen}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>پس‌زمینه گفتگو</DialogTitle></DialogHeader>
          <div className="grid grid-cols-4 gap-2">
            {CHAT_BACKGROUND_PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => setBg({ type: p.type === "color" ? "color" : "pattern", value: p.value, overlayOpacity: 0 })}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 rounded-xl border text-[11px]",
                  p.value === "dots" && "chat-pattern-dots",
                  p.value === "grid" && "chat-pattern-grid",
                )}
                style={p.type === "color" && p.value !== "transparent" ? { backgroundColor: p.value } : {}}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium">شفافیت لایه خوانایی (برای تصویر)</label>
            <input
              type="range" min={0} max={80} defaultValue={Math.round((bg.overlayOpacity ?? 0) * 100)}
              onChange={(e) => setBg({ ...bg, overlayOpacity: Number(e.target.value) / 100 })}
              className="w-full"
            />
          </div>
          <Button variant="outline" onClick={() => setBg({ type: "default", value: "default", overlayOpacity: 0 })}>
            بازگشت به پیش‌فرض
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MessageBubble({ msg, mine, showAvatar, onReply, onEdit, convId }: {
  msg: Message; mine: boolean; showAvatar: boolean; onReply: () => void; onEdit: () => void; convId: string;
}) {
  const actions = useChatActions();
  const { can } = usePermission();
  const read = msg.readByIds.length > 1;

  return (
    <div className={cn("group flex gap-2", mine && "flex-row-reverse")}>
      {showAvatar && !mine && <UserAvatar name={msg.sender?.name ?? "?"} src={msg.sender?.avatarUrl} size="sm" />}
      {!showAvatar && !mine && <span className="w-8 shrink-0" />}
      <div className={cn("max-w-[75%] sm:max-w-[65%]", mine && "flex flex-col items-end")}>
        {showAvatar && !mine && <p className="mb-0.5 ps-1 text-[11px] font-semibold text-primary">{msg.sender?.name}</p>}
        <div className={cn(
          "relative rounded-2xl px-3.5 py-2 text-[13px] leading-6 shadow-card",
          mine ? "rounded-ee-sm bg-primary text-primary-foreground" : "rounded-ss-sm bg-muted",
        )}>
          {msg.replyTo && (
            <div className={cn("mb-1.5 truncate rounded-lg border-s-2 px-2 py-1 text-[11px]", mine ? "border-primary-foreground/50 bg-black/10" : "border-primary bg-card")}>
              {msg.replyTo.body.slice(0, 80)}
            </div>
          )}
          <p className="whitespace-pre-wrap break-words">{msg.body}</p>
          <span className={cn("mt-1 flex items-center justify-end gap-1 text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
            {msg.isEdited && "ویرایش‌شده · "}
            {msg.isPinned && <Pin className="h-3 w-3" />}
            {formatTimeFa(msg.createdAt)}
            {mine && (read ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />)}
          </span>

          {/* Hover actions */}
          <span className={cn(
            "absolute top-1/2 flex -translate-y-1/2 items-center gap-0.5 rounded-lg border bg-card p-0.5 opacity-0 shadow-pop transition-opacity group-hover:opacity-100",
            mine ? "-start-2 -translate-x-full" : "-end-2 translate-x-full",
          )}>
            <Tip label="پاسخ">
              <button onClick={onReply} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Reply className="h-3.5 w-3.5" /></button>
            </Tip>
            {mine && can("chat.edit") && (
              <Tip label="ویرایش">
                <button onClick={onEdit} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
              </Tip>
            )}
            <Tip label={msg.isPinned ? "حذف سنجاق" : "سنجاق"}>
              <button onClick={() => actions.togglePin.mutate({ cid: convId, mid: msg.id })} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                {msg.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              </button>
            </Tip>
            {(mine || can("chat.delete")) && (
              <ConfirmDialog
                trigger={<button className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>}
                title="حذف پیام" description="این پیام حذف می‌شود." confirmLabel="حذف"
                onConfirm={() => actions.remove.mutate({ cid: convId, mid: msg.id })}
              />
            )}
          </span>
        </div>
        {msg.reactions.length > 0 && (
          <span className="mt-1 flex flex-wrap gap-1">
            {msg.reactions.map((r) => (
              <button key={r.emoji} onClick={() => actions.react.mutate({ cid: convId, mid: msg.id, emoji: r.emoji })}
                className="rounded-full border bg-card px-1.5 py-0.5 text-xs shadow-card hover:border-primary">
                {r.emoji} <span className="tnum">{toFaDigits(r.userIds.length)}</span>
              </button>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full border bg-card px-1.5 py-0.5 text-xs text-muted-foreground hover:border-primary">+</button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <div className="grid grid-cols-5 gap-1 p-1">
                  {EMOJIS.map((e) => (
                    <button key={e} onClick={() => actions.react.mutate({ cid: convId, mid: msg.id, emoji: e })} className="rounded-lg p-1.5 text-base hover:bg-muted">{e}</button>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </span>
        )}
      </div>
    </div>
  );
}

function NewGroupButton() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const { data: users = [] } = useUsers();
  const meId = useAuthStore((s) => s.user?.id);
  const actions = useChatActions();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full"><Plus className="h-4 w-4" /> گروه جدید</Button>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader><DialogTitle>ایجاد گروه</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          <Input placeholder="نام گروه…" value={title} onChange={(e) => setTitle(e.target.value)} />
          <UserPicker multiple value={members} onChange={(v) => setMembers((v as string[]) ?? [])} membersOnly={users.filter((u) => u.id !== meId)} placeholder="افزودن اعضا…" />
          <Button disabled={!title.trim() || !members.length} loading={actions.createGroup.isPending}
            onClick={() => actions.createGroup.mutate({ title: title.trim(), members }, { onSuccess: () => { setOpen(false); setTitle(""); setMembers([]); } })}>
            ایجاد گروه
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function formatDateHeader(d: string) {
  return formatDateFa(d);
}
