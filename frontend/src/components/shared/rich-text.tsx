"use client";
import { useRef, useEffect } from "react";
import { Bold, Italic, List, ListOrdered, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Lightweight rich-text editor (contentEditable) with safe HTML output.
 * Rendering is sanitized (scripts stripped) — see SafeHtml.
 */
export function RichTextEditor({ value, onChange, placeholder = "توضیحات را بنویسید…", minHeight = 120 }: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value && document.activeElement !== ref.current) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    onChange(ref.current?.innerHTML ?? "");
  };

  const tools = [
    { label: "درشت", icon: <Bold className="h-4 w-4" />, run: () => exec("bold") },
    { label: "کج", icon: <Italic className="h-4 w-4" />, run: () => exec("italic") },
    { label: "فهرست", icon: <List className="h-4 w-4" />, run: () => exec("insertUnorderedList") },
    { label: "فهرست شماره‌دار", icon: <ListOrdered className="h-4 w-4" />, run: () => exec("insertOrderedList") },
    {
      label: "پیوند", icon: <Link2 className="h-4 w-4" />,
      run: () => {
        const url = prompt("نشانی پیوند:");
        if (url) exec("createLink", url);
      },
    },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-input bg-card focus-within:ring-2 focus-within:ring-ring">
      <div className="flex items-center gap-1 border-b bg-muted/40 p-1.5">
        {tools.map((t) => (
          <Tip key={t.label} label={t.label}>
            <Button type="button" variant="ghost" size="icon-sm" onMouseDown={(e) => e.preventDefault()} onClick={t.run}>
              {t.icon}
            </Button>
          </Tip>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        data-placeholder={placeholder}
        style={{ minHeight }}
        className={cn(
          "prose-sm max-w-none p-3 text-sm leading-7 outline-none",
          "[&:empty]:before:text-muted-foreground [&:empty]:before:content-[attr(data-placeholder)]",
          "[&_ul]:list-disc [&_ul]:ps-5 [&_ol]:list-decimal [&_ol]:ps-5 [&_a]:text-primary [&_a]:underline",
        )}
      />
    </div>
  );
}

/** XSS-safe HTML renderer: strips scripts/event handlers. */
export function SafeHtml({ html, className }: { html: string; className?: string }) {
  const clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
  if (!clean.trim()) return null;
  return (
    <div
      className={cn("text-sm leading-7 [&_ul]:list-disc [&_ul]:ps-5 [&_ol]:list-decimal [&_ol]:ps-5 [&_a]:text-primary [&_a]:underline [&_b]:font-bold [&_strong]:font-bold", className)}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
