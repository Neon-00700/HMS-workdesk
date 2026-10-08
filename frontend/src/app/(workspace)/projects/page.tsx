"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { ProjectCard } from "@/components/shared/project-card";
import { CreateProjectForm } from "@/components/shared/create-project-form";
import { LoadingCards, EmptyState, ErrorState } from "@/components/shared/states";
import { useProjects } from "@/services/queries";
import { Can } from "@/hooks/use-permission";
import { FolderKanban } from "lucide-react";

function ProjectsInner() {
  const params = useSearchParams();
  const { data: projects = [], isLoading, isError, refetch } = useProjects();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [favOnly, setFavOnly] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => {
    if (params.get("new") === "1") setNewOpen(true);
  }, [params]);

  const shown = projects.filter((p) => {
    if (q && !p.name.includes(q) && !p.key.includes(q)) return false;
    if (status !== "all" && p.status !== status) return false;
    if (favOnly && !p.isFavorite) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="پروژه‌ها"
        description="همه پروژه‌های شرکت؛ برای ورود به فضای کاری هر پروژه روی آن کلیک کنید."
        actions={
          <Can perm="projects.create">
            <Dialog open={newOpen} onOpenChange={setNewOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4" /> پروژه جدید</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>ایجاد پروژه جدید</DialogTitle></DialogHeader>
                <CreateProjectForm onDone={() => setNewOpen(false)} />
              </DialogContent>
            </Dialog>
          </Can>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[11.25rem] flex-1 sm:max-w-72">
          <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="جست‌وجوی پروژه…" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 ps-8" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-40"><SelectValue placeholder="وضعیت" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه وضعیت‌ها</SelectItem>
            <SelectItem value="active">فعال</SelectItem>
            <SelectItem value="on_hold">متوقف</SelectItem>
            <SelectItem value="completed">تکمیل‌شده</SelectItem>
            <SelectItem value="archived">بایگانی</SelectItem>
          </SelectContent>
        </Select>
        <Button variant={favOnly ? "secondary" : "outline"} size="sm" className="h-9" onClick={() => setFavOnly((v) => !v)}>
          <Star className="h-4 w-4" /> فقط علاقه‌مندی‌ها
        </Button>
      </div>

      {isLoading && <LoadingCards count={4} />}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !isError && shown.length === 0 && (
        <EmptyState
          icon={<FolderKanban className="h-6 w-6" />} title="پروژه‌ای یافت نشد"
          description={q ? "پروژه‌ای با این مشخصات وجود ندارد." : "هنوز پروژه‌ای ساخته نشده است."}
        />
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((p) => <ProjectCard key={p.id} project={p} />)}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense>
      <ProjectsInner />
    </Suspense>
  );
}
