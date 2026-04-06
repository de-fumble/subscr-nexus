import { cn } from "@/lib/utils";
import logoImage from "@/assets/logo.svg";

interface RecurraLogoLoaderProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  fullScreen?: boolean;
}

const sizeMap = {
  sm: {
    shell: "h-14 w-14",
    logo: "h-9 w-9",
  },
  md: {
    shell: "h-16 w-16 sm:h-20 sm:w-20",
    logo: "h-10 w-10 sm:h-12 sm:w-12",
  },
  lg: {
    shell: "h-20 w-20 sm:h-24 sm:w-24",
    logo: "h-12 w-12 sm:h-14 sm:w-14",
  },
};

export function RecurraLogoLoader({
  message,
  size = "md",
  className,
  fullScreen = true,
}: RecurraLogoLoaderProps) {
  const selected = sizeMap[size];

  const loader = (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-[#0A4D4D]/35 blur-2xl animate-pulse scale-125" />
        <div
          className={cn(
            "relative mx-auto flex items-center justify-center rounded-full bg-background shadow-xl border border-border/50",
            selected.shell
          )}
        >
        <img
          src={logoImage}
          alt="Recurra Logo"
          className={cn(
            "object-contain rounded-full animate-pulse",
            selected.logo
          )}
        />
        </div>
      </div>
      {message ? (
        <p className="text-xs sm:text-sm text-muted-foreground animate-pulse">
          {message}
        </p>
      ) : null}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        {loader}
      </div>
    );
  }

  return <div className="flex items-center justify-center py-12">{loader}</div>;
}
