import { cn } from "@/lib/utils";
import { RecurraLogoLoader } from "@/components/RecurraLogoLoader";

interface PremiumLoaderProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  fullScreen?: boolean;
}

export function PremiumLoader({ 
  message, 
  size = "md", 
  className,
  fullScreen = true 
}: PremiumLoaderProps) {
  return (
    <RecurraLogoLoader
      message={message}
      size={size}
      className={className}
      fullScreen={fullScreen}
    />
  );
}

/** Inline spinner for buttons/small areas */
export function PremiumSpinner({ className }: { className?: string }) {
  return (
    <div className={cn(
      "h-4 w-4 rounded-full border-2 border-transparent",
      className
    )}
    style={{ 
      borderTopColor: "hsl(var(--sidebar-background))", 
      borderRightColor: "rgba(10, 77, 77, 0.1)",
      borderBottomColor: "rgba(10, 77, 77, 0.1)",
      borderLeftColor: "rgba(10, 77, 77, 0.1)",
      animation: "spin 1s cubic-bezier(0.5, 0, 0.5, 1) infinite" 
    }}
    />
  );
}
