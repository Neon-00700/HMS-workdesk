"use client";
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DialogOverlay } from "./dialog";

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

type SheetContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  side?: "left" | "right" | "bottom";
  wide?: boolean;
};
type SheetContentRef = React.ElementRef<typeof DialogPrimitive.Content>;

const SheetContent = React.forwardRef<SheetContentRef, SheetContentProps>(function SheetContent(
  { className, children, side = "left", wide, ...props },
  ref,
) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed z-50 flex flex-col bg-card shadow-pop animate-in",
          side === "left" && "inset-y-0 left-0 h-full w-full slide-in-from-left sm:max-w-xl",
          side === "right" && "inset-y-0 right-0 h-full w-full slide-in-from-right sm:max-w-xl",
          side === "bottom" && "inset-x-0 bottom-0 max-h-[92vh] rounded-t-2xl slide-in-from-bottom",
          wide && side !== "bottom" && "sm:max-w-3xl",
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
    </DialogPrimitive.Portal>
  );
});
SheetContent.displayName = "SheetContent";

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 border-b p-5 text-start", className)} {...props} />;
}

type SheetTitleProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>;
type SheetTitleRef = React.ElementRef<typeof DialogPrimitive.Title>;

const SheetTitle = React.forwardRef<SheetTitleRef, SheetTitleProps>(function SheetTitle({ className, ...props }, ref) {
  return <DialogPrimitive.Title ref={ref} className={cn("text-base font-semibold", className)} {...props} />;
});
SheetTitle.displayName = "SheetTitle";

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle };
