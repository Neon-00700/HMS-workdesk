"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

type OverlayProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>;
type OverlayRef = React.ElementRef<typeof DialogPrimitive.Overlay>;

const DialogOverlay = React.forwardRef<OverlayRef, OverlayProps>(function DialogOverlay({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn("fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] animate-in fade-in-0", className)}
      {...props}
    />
  );
});
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

type ContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  size?: "sm" | "md" | "lg" | "xl";
};
type ContentRef = React.ElementRef<typeof DialogPrimitive.Content>;

const DialogContent = React.forwardRef<ContentRef, ContentProps>(function DialogContent(
  { className, children, size = "md", ...props },
  ref,
) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 grid max-h-[90vh] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-2xl border bg-card p-6 shadow-pop animate-in fade-in-0 zoom-in-95",
          size === "sm" && "max-w-sm",
          size === "md" && "max-w-lg",
          size === "lg" && "max-w-2xl",
          size === "xl" && "max-w-4xl",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute end-4 top-4 rounded-lg p-1 text-muted-foreground opacity-70 transition-opacity hover:bg-muted hover:opacity-100 focus:outline-none">
          <X className="h-4 w-4" />
          <span className="sr-only">بستن</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 text-start", className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-start", className)} {...props} />;
}

type TitleProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>;
type TitleRef = React.ElementRef<typeof DialogPrimitive.Title>;

const DialogTitle = React.forwardRef<TitleRef, TitleProps>(function DialogTitle({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Title ref={ref} className={cn("text-base font-semibold leading-none", className)} {...props} />
  );
});
DialogTitle.displayName = DialogPrimitive.Title.displayName;

type DescProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>;
type DescRef = React.ElementRef<typeof DialogPrimitive.Description>;

const DialogDescription = React.forwardRef<DescRef, DescProps>(function DialogDescription({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Description ref={ref} className={cn("text-[13px] text-muted-foreground", className)} {...props} />
  );
});
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog, DialogPortal, DialogOverlay, DialogTrigger, DialogClose,
  DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
};
