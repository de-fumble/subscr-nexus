import { Toaster as Sonner, toast } from "sonner";
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {

  return (
    <Sonner
      theme="light"
      position="top-right"
      expand={false}
      richColors={false}
      closeButton
      className="toaster group"
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            "group toast group-[.toaster]:glass-card group-[.toaster]:border-white/10 dark:group-[.toaster]:border-white/5 group-[.toaster]:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.3)] group-[.toaster]:rounded-2xl group-[.toaster]:px-5 group-[.toaster]:py-4 group-[.toaster]:min-w-[320px] overflow-hidden relative before:absolute before:inset-0 before:z-[-1] before:bg-gradient-to-br before:from-white/10 before:to-transparent before:opacity-0 group-[.toaster]:hover:before:opacity-100 before:transition-opacity",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-xs sm:group-[.toast]:text-sm group-[.toast]:mt-1",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:font-medium group-[.toast]:rounded-xl group-[.toast]:px-4 group-[.toast]:py-2 hover:group-[.toast]:bg-primary/90 transition-colors shadow-sm",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:font-medium group-[.toast]:rounded-xl hover:group-[.toast]:bg-muted/80 transition-colors",
          closeButton:
            "group-[.toast]:bg-background/40 group-[.toast]:backdrop-blur-md group-[.toast]:border-border/50 group-[.toast]:text-foreground/70 group-[.toast]:hover:text-foreground group-[.toast]:hover:bg-background/80 group-[.toast]:rounded-full group-[.toast]:transition-all group-[.toast]:shadow-sm group-[.toast]:-right-2 group-[.toast]:-top-2",
          success:
            "group-[.toaster]:border-l-4 group-[.toaster]:border-l-emerald-500",
          error:
            "group-[.toaster]:border-l-4 group-[.toaster]:border-l-rose-500",
          warning:
            "group-[.toaster]:border-l-4 group-[.toaster]:border-l-amber-500",
          info:
            "group-[.toaster]:border-l-4 group-[.toaster]:border-l-blue-500",
          title: "group-[.toast]:font-semibold group-[.toast]:text-sm sm:group-[.toast]:text-base group-[.toast]:tracking-tight group-[.toast]:text-foreground",
        },
      }}
      icons={{
        success: (
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/15 dark:bg-emerald-400/10 ring-1 ring-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
        ),
        error: (
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-rose-500/15 dark:bg-rose-400/10 ring-1 ring-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
            <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </div>
        ),
        warning: (
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/15 dark:bg-amber-400/10 ring-1 ring-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
        ),
        info: (
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-500/15 dark:bg-blue-400/10 ring-1 ring-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
        ),
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
