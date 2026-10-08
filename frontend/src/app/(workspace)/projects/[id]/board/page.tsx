"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Kanban } from "@/features/boards/kanban";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { cn } from "@/lib/utils";
import { useBoards, useCreateBoard } from "@/services/queries";
import { Can } from "@/hooks/use-permission";
import type { Board } from "@/types/models";

export default function ProjectBoardPage() {
  const { id } = useParams() as { id: string };
  const params = useSearchParams();
  const { data: boards = [], isLoading, isError, refetch } = useBoards(id);
  const [activeId, setActiveId] = useState<string>("");
  const [newOpen, setNewOpen] = useState(false);
  const [name, setName] = useState("");
  const create = useCreateBoard();

  useEffect(() => {
    const fromUrl = params.get("b");
    if (fromUrl && boards.some((b) => b.id === fromUrl)) setActiveId(fromUrl);
    else if (!activeId && boards.length) setActiveId(boards.find((b) => b.isDefault)?.id ?? boards[0].id);
  }, [boards, params, activeId]);

  const active: Board | undefined = boards.find((b) => b.id === activeId);

  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="بوردها"
        description="نمای کانبان کارها؛ تسک‌ها و ستون‌ها را بکشید و رها کنید."
        actions={
          <Can perm="boards.create">
            <Dialog open={newOpen} onOpenChange={setNewOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4" /> بورد جدید</Button>
              </DialogTrigger>
              <DialogContent size="sm">
                <DialogHeader><DialogTitle>بورد جدید</DialogTitle></DialogHeader>
                <div className="flex gap-2">
                  <Input placeholder="نام بورد…" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                  <Button disabled={!name.trim()} loading={create.isPending}
                    onClick={() => create.mutate({ pid: id, name: name.trim() }, { onSuccess: (b) => { setNewOpen(false); setName(""); setActiveId(b.id); } })}>
                    ایجاد
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </Can>
        }
      />

      {isLoading ? (
        <div className="flex gap-2">{[0, 1, 2].map((i) => <div key={i} className="h-9 w-32 animate-pulse rounded-lg bg-muted" />)}</div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="بوردهای پروژه">
          {boards.map((b) => (
            <button
              key={b.id}
              role="tab"
              aria-selected={b.id === activeId}
              onClick={() => setActiveId(b.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2 text-[13px] font-medium transition-colors",
                b.id === activeId ? "border-primary bg-primary/10 text-primary" : "bg-card hover:border-primary/40",
              )}
            >
              {b.name}
              {b.kind === "urgent" && (
                <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">فوری</span>
              )}
            </button>
          ))}
        </div>
      )}

      {active && <Kanban key={active.id} boardId={active.id} projectId={id} />}
    </div>
  );
}
