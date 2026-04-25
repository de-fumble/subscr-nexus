import React from "react";
import { Toaster as Sonner } from "sonner";
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      position="top-right"
      expand={false}
      richColors={false}
      closeButton
      gap={8}
      className="toaster group"
      toastOptions={{
        duration: 4500,
        classNames: {
          toasts: "!gap-2",
          toast: [
            // Base structure
            "group toast",
            "!bg-background/95 !backdrop-blur-md",
            "!border !border-border/60",
            "!shadow-[0_4px_24px_-4px_rgba(0,0,0,0.18),0_1px_4px_-1px_rgba(0,0,0,0.08)]",
            "!rounded-xl",
            "!px-4 !py-3.5",
            "!min-w-[300px] !max-w-[380px]",
            "transition-all",
          ].join(" "),
          title: [
            "!font-semibold !text-[13px] !tracking-tight !text-foreground",
            "!leading-snug",
          ].join(" "),
          description: [
            "!text-muted-foreground !text-xs !mt-0.5 !leading-relaxed",
          ].join(" "),
          success: "!border-t-[2px] !border-t-emerald-500",
          error:   "!border-t-[2px] !border-t-rose-500",
          warning: "!border-t-[2px] !border-t-amber-500",
          info:    "!border-t-[2px] !border-t-blue-500",
          actionButton: [
            "!bg-foreground !text-background !text-xs !font-medium",
            "!rounded-lg !px-3 !py-1.5",
            "hover:!opacity-90 !transition-opacity",
          ].join(" "),
          cancelButton: [
            "!bg-muted !text-muted-foreground !text-xs !font-medium",
            "!rounded-lg !px-3 !py-1.5",
            "hover:!bg-muted/80 !transition-colors",
          ].join(" "),
          closeButton: [
            "!bg-transparent !border-0",
            "!text-muted-foreground hover:!text-foreground",
            "!transition-colors !rounded-md",
            "!h-5 !w-5 !flex !items-center !justify-center",
          ].join(" "),
        },
      }}
      icons={{
        success: (
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-emerald-500/10 ring-1 ring-emerald-500/20 shrink-0">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
          </div>
        ),
        error: (
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-rose-500/10 ring-1 ring-rose-500/20 shrink-0">
            <AlertCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" strokeWidth={2.5} />
          </div>
        ),
        warning: (
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-amber-500/10 ring-1 ring-amber-500/20 shrink-0">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" strokeWidth={2.5} />
          </div>
        ),
        info: (
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-500/10 ring-1 ring-blue-500/20 shrink-0">
            <Info className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" strokeWidth={2.5} />
          </div>
        ),
      }}
      {...props}
    />
  );
};

export { Toaster };
