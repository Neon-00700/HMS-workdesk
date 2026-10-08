"use client";
import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useUsers } from "@/services/queries";
import { cn } from "@/lib/utils";

export function UserPicker({ value, onChange, multiple, placeholder = "انتخاب کاربر", membersOnly }: {
  value: string | string[] | undefined;
  onChange: (v: string | string[] | undefined) => void;
  multiple?: boolean;
  placeholder?: string;
  membersOnly?: { name: string; id: string }[];
}) {
  const { data: users = [] } = useUsers();
  const [q, setQ] = useState("");
  const list = membersOnly ?? users;
  const filtered = list.filter((u) => !q || u.name.includes(q) || ("username" in u && (u.username as string).includes(q)));
  const selected = multiple ? ((value as string[]) ?? []) : value ? [value as string] : [];

  const toggle = (id: string) => {
    if (!multiple) return onChange(id === value ? undefined : id);
    const cur = (value as string[]) ?? [];
    onChange(cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  };

  const selectedUsers = list.filter((u) => selected.includes(u.id));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-auto min-h-10 w-full justify-between gap-2 px-3 py-1.5">
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            {selectedUsers.length === 0 && <span className="text-muted-foreground">{placeholder}</span>}
            {selectedUsers.map((u) => (
              <span key={u.id} className="flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs">
                <UserAvatar name={u.name} size="xs" />
                {u.name}
                <span
                  role="button" tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); toggle(u.id); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); toggle(u.id); } }}
                  aria-label={`حذف ${u.name}`}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </span>
              </span>
            ))}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72 p-2" align="start">
        <Input placeholder="جست‌وجوی کاربر…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-1 h-9" onKeyDown={(e) => e.stopPropagation()} />
        <div className="max-h-60 overflow-y-auto">
          {filtered.map((u) => (
            <DropdownMenuItem key={u.id} onSelect={(e) => { e.preventDefault(); toggle(u.id); }} className="gap-2.5">
              <UserAvatar name={u.name} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{u.name}</span>
                {"position" in u && <span className="block truncate text-[11px] text-muted-foreground">{u.position as string}</span>}
              </span>
              <Check className={cn("h-4 w-4 text-primary", selected.includes(u.id) ? "opacity-100" : "opacity-0")} />
            </DropdownMenuItem>
          ))}
          {filtered.length === 0 && <p className="p-3 text-center text-xs text-muted-foreground">کاربری یافت نشد.</p>}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
