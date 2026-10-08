"use client";
import Link from "next/link";
import { Star, Users, AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { PROJECT_STATUS_META, HEALTH_META } from "@/config/constants";
import { timeAgoFa } from "@/lib/format";
import { toFaDigits, cn } from "@/lib/utils";
import { useUpdateProject } from "@/services/queries";
import type { Project } from "@/types/models";

export function ProjectCard({ project }: { project: Project }) {
  const fav = useUpdateProject();
  const st = PROJECT_STATUS_META[project.status];
  const health = HEALTH_META[project.health];

  return (
    <Card className="group overflow-hidden transition-all hover:border-primary/40 hover:shadow-pop">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <span
              className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor: project.iconColor }}
            >
              {project.key.slice(0, 2)}
            </span>
            <div className="min-w-0">
              <Link href={`/projects/${project.id}/overview`} className="block truncate text-[15px] font-semibold hover:text-primary">
                {project.name}
              </Link>
              <p className="mt-0.5 text-xs text-muted-foreground">{project.key} · {timeAgoFa(project.lastActivityAt)}</p>
            </div>
          </div>
          <Button
            variant="ghost" size="icon-sm"
            onClick={() => fav.mutate({ id: project.id, patch: { isFavorite: !project.isFavorite } })}
            aria-label={project.isFavorite ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
            className={cn(project.isFavorite ? "text-amber-500" : "text-muted-foreground opacity-0 group-hover:opacity-100")}
          >
            <Star className={cn("h-4 w-4", project.isFavorite && "fill-current")} />
          </Button>
        </div>

        <p className="mt-3 line-clamp-2 min-h-10 text-[13px] leading-6 text-muted-foreground">{project.description}</p>

        <div className="mt-3 flex items-center gap-2">
          <Progress value={project.progress} className="h-2" />
          <span className="shrink-0 text-xs font-semibold tnum">{toFaDigits(project.progress)}٪</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="gap-1.5 font-normal">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: st.color }} />{st.label}
          </Badge>
          <Badge variant="secondary" className="gap-1.5 font-normal">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: health.color }} />{health.label}
          </Badge>
          <span className="ms-auto flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" /><span className="tnum">{toFaDigits(project.membersCount)}</span>
          </span>
        </div>

        {(project.overdueTasks > 0 || project.blockedTasks > 0) && (
          <div className="mt-3 flex items-center gap-3 rounded-lg bg-muted/60 px-3 py-2 text-xs">
            {project.overdueTasks > 0 && (
              <span className="flex items-center gap-1 text-destructive">
                <Clock className="h-3.5 w-3.5" /><span className="tnum">{toFaDigits(project.overdueTasks)}</span> معوق
              </span>
            )}
            {project.blockedTasks > 0 && (
              <span className="flex items-center gap-1 text-warning">
                <AlertTriangle className="h-3.5 w-3.5" /><span className="tnum">{toFaDigits(project.blockedTasks)}</span> مسدود
              </span>
            )}
            <span className="ms-auto text-muted-foreground"><span className="tnum">{toFaDigits(project.openTasks)}</span> باز</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
