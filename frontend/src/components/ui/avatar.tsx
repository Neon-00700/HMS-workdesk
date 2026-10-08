"use client";
import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";
import { initialsOf, avatarStyle } from "@/lib/utils";

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & { size?: "xs" | "sm" | "md" | "lg" | "xl" }
>(({ className, size = "md", ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-muted font-medium",
      size === "xs" && "h-6 w-6 text-[10px]",
      size === "sm" && "h-8 w-8 text-xs",
      size === "md" && "h-9 w-9 text-[13px]",
      size === "lg" && "h-11 w-11 text-sm",
      size === "xl" && "h-16 w-16 text-xl",
      className,
    )}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image ref={ref} className={cn("aspect-square h-full w-full object-cover", className)} {...props} />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback ref={ref} className={cn("flex h-full w-full items-center justify-center", className)} {...props} />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

/** Domain avatar: presence dot + deterministic color. */
export function UserAvatar({ name, src, size = "md", online, className }: {
  name: string; src?: string; size?: "xs" | "sm" | "md" | "lg" | "xl"; online?: boolean; className?: string;
}) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)} title={name}>
      <Avatar size={size}>
        {src && <AvatarImage src={src} alt={name} />}
        <AvatarFallback style={avatarStyle(name)}>{initialsOf(name)}</AvatarFallback>
      </Avatar>
      {online !== undefined && (
        <span
          className={cn(
            "absolute bottom-0 end-0 block rounded-full ring-2 ring-card",
            size === "xs" ? "h-1.5 w-1.5" : "h-2.5 w-2.5",
            online ? "bg-emerald-500" : "bg-muted-foreground/40",
          )}
        />
      )}
    </span>
  );
}

export function AvatarStack({ names, max = 4, size = "sm" as const }: { names: { name: string; src?: string }[]; max?: number; size?: "xs" | "sm" | "md" }) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return (
    <span className="flex items-center -space-x-2 space-x-reverse">
      {shown.map((n, i) => (
        <UserAvatar key={i} name={n.name} src={n.src} size={size} className="ring-2 ring-card" />
      ))}
      {rest > 0 && (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[11px] font-semibold ring-2 ring-card">
          +{rest}
        </span>
      )}
    </span>
  );
}

export { Avatar, AvatarImage, AvatarFallback };
