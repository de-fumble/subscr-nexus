import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-right"
      expand={false}
      richColors={false}
      closeButton
      className="toaster group"
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            "group toast group-[.toaster]:backdrop-blur-2xl group-[.toaster]:bg-background/60 dark:group-[.toaster]:bg-background/40 group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-border/30 dark:group-[.toaster]:border-accent/20 group-[.toaster]:shadow-[0_8px_32px_rgba(0,0,0,0.12),0_0_0_1px_rgba(255,255,255,0.05)_inset] dark:group-[.toaster]:shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_40px_rgba(0,210,200,0.08),0_0_0_1px_rgba(255,255,255,0.05)_inset] group-[.toaster]:rounded-2xl group-[.toaster]:px-5 group-[.toaster]:py-4 group-[.toaster]:min-w-[320px]",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm group-[.toast]:mt-1",
          actionButton:
            "group-[.toast]:bg-accent/90 group-[.toast]:text-accent-foreground group-[.toast]:font-medium group-[.toast]:rounded-xl group-[.toast]:px-4 group-[.toast]:py-2 group-[.toast]:backdrop-blur-sm group-[.toast]:shadow-sm",
          cancelButton:
            "group-[.toast]:bg-muted/50 group-[.toast]:text-muted-foreground group-[.toast]:font-medium group-[.toast]:rounded-xl group-[.toast]:backdrop-blur-sm",
          closeButton:
            "group-[.toast]:bg-background/50 group-[.toast]:backdrop-blur-sm group-[.toast]:border-border/30 group-[.toast]:text-muted-foreground group-[.toast]:hover:text-foreground group-[.toast]:hover:bg-muted/50 group-[.toast]:rounded-full group-[.toast]:transition-all group-[.toast]:duration-200",
          success:
            "group-[.toaster]:!bg-background/60 dark:group-[.toaster]:!bg-background/40 group-[.toaster]:border-green-500/30 dark:group-[.toaster]:border-green-400/30 group-[.toaster]:shadow-[0_8px_32px_rgba(34,197,94,0.15),0_0_0_1px_rgba(34,197,94,0.1)_inset] dark:group-[.toaster]:shadow-[0_8px_32px_rgba(34,197,94,0.2),0_0_40px_rgba(34,197,94,0.1),0_0_0_1px_rgba(34,197,94,0.15)_inset]",
          error:
            "group-[.toaster]:!bg-background/60 dark:group-[.toaster]:!bg-background/40 group-[.toaster]:border-red-500/30 dark:group-[.toaster]:border-red-400/30 group-[.toaster]:shadow-[0_8px_32px_rgba(239,68,68,0.15),0_0_0_1px_rgba(239,68,68,0.1)_inset] dark:group-[.toaster]:shadow-[0_8px_32px_rgba(239,68,68,0.2),0_0_40px_rgba(239,68,68,0.1),0_0_0_1px_rgba(239,68,68,0.15)_inset]",
          warning:
            "group-[.toaster]:!bg-background/60 dark:group-[.toaster]:!bg-background/40 group-[.toaster]:border-yellow-500/30 dark:group-[.toaster]:border-yellow-400/30 group-[.toaster]:shadow-[0_8px_32px_rgba(234,179,8,0.15),0_0_0_1px_rgba(234,179,8,0.1)_inset] dark:group-[.toaster]:shadow-[0_8px_32px_rgba(234,179,8,0.2),0_0_40px_rgba(234,179,8,0.1),0_0_0_1px_rgba(234,179,8,0.15)_inset]",
          info: "group-[.toaster]:!bg-background/60 dark:group-[.toaster]:!bg-background/40 group-[.toaster]:border-blue-500/30 dark:group-[.toaster]:border-blue-400/30 group-[.toaster]:shadow-[0_8px_32px_rgba(59,130,246,0.15),0_0_0_1px_rgba(59,130,246,0.1)_inset] dark:group-[.toaster]:shadow-[0_8px_32px_rgba(59,130,246,0.2),0_0_40px_rgba(59,130,246,0.1),0_0_0_1px_rgba(59,130,246,0.15)_inset]",
          title: "group-[.toast]:font-semibold group-[.toast]:text-sm group-[.toast]:tracking-tight",
        },
      }}
      icons={{
        success: (
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500/20 dark:bg-green-400/20">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
        ),
        error: (
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-500/20 dark:bg-red-400/20">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
        ),
        warning: (
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-500/20 dark:bg-yellow-400/20">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          </div>
        ),
        info: (
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/20 dark:bg-blue-400/20">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
        ),
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
