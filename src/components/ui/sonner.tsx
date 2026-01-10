import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      expand={false}
      richColors={false}
      closeButton
      className="toaster group"
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-border/50 group-[.toaster]:shadow-[0_8px_30px_rgb(0,0,0,0.12)] group-[.toaster]:backdrop-blur-xl group-[.toaster]:rounded-xl group-[.toaster]:px-4 group-[.toaster]:py-3",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton:
            "group-[.toast]:bg-accent group-[.toast]:text-accent-foreground group-[.toast]:font-medium group-[.toast]:rounded-lg group-[.toast]:px-3 group-[.toast]:py-1.5",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:font-medium group-[.toast]:rounded-lg",
          closeButton:
            "group-[.toast]:bg-background group-[.toast]:border-border/50 group-[.toast]:text-muted-foreground group-[.toast]:hover:text-foreground group-[.toast]:hover:bg-muted",
          success:
            "group-[.toaster]:!bg-card group-[.toaster]:border-green-500/30 group-[.toaster]:shadow-[0_8px_30px_rgb(34,197,94,0.15)]",
          error:
            "group-[.toaster]:!bg-card group-[.toaster]:border-red-500/30 group-[.toaster]:shadow-[0_8px_30px_rgb(239,68,68,0.15)]",
          warning:
            "group-[.toaster]:!bg-card group-[.toaster]:border-yellow-500/30 group-[.toaster]:shadow-[0_8px_30px_rgb(234,179,8,0.15)]",
          info: "group-[.toaster]:!bg-card group-[.toaster]:border-blue-500/30 group-[.toaster]:shadow-[0_8px_30px_rgb(59,130,246,0.15)]",
          title: "group-[.toast]:font-semibold group-[.toast]:text-sm",
        },
      }}
      icons={{
        success: <CheckCircle2 className="h-5 w-5 text-green-500" />,
        error: <AlertCircle className="h-5 w-5 text-red-500" />,
        warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
        info: <Info className="h-5 w-5 text-blue-500" />,
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
