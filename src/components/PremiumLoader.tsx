import { cn } from "@/lib/utils";

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
  const sizes = {
    sm: { container: "h-10 w-10", ring: "h-8 w-8", dot: "h-1.5 w-1.5" },
    md: { container: "h-14 w-14", ring: "h-12 w-12", dot: "h-2 w-2" },
    lg: { container: "h-20 w-20", ring: "h-16 w-16", dot: "h-2.5 w-2.5" },
  };

  const s = sizes[size];

  // Using a minimalist dark teal and white aesthetic
  const loader = (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="relative">
        {/* Outer glow (subtle) */}
        <div className={cn(
          "absolute inset-0 rounded-full blur-xl animate-pulse opacity-20",
          size === "lg" ? "scale-150" : "scale-125"
        )} style={{ backgroundColor: "hsl(var(--sidebar-background))" }} />
        
        {/* Main spinner container */}
        <div className={cn("relative", s.container)}>
          {/* Rotating ring */}
          <div className={cn(
            "absolute inset-0 rounded-full border-2",
            s.ring
          )} 
          style={{ 
            margin: "auto", top: 0, bottom: 0, left: 0, right: 0,
            borderColor: "rgba(10, 77, 77, 0.1)" // Light teal trail
          }}
          />
          <div 
            className={cn(
              "absolute rounded-full border-2 border-transparent",
              s.ring
            )}
            style={{ 
              margin: "auto", top: 0, bottom: 0, left: 0, right: 0,
              borderTopColor: "hsl(var(--sidebar-background))", // Dark teal leading edge
              animation: "spin 1s cubic-bezier(0.5, 0, 0.5, 1) infinite" 
            }}
          />
          
          {/* Center dot container for white inner dot over dark teal inner background */}
          <div className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full",
            s.dot
          )}
          style={{ 
            backgroundColor: "hsl(var(--sidebar-background))",
            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" 
          }}>
            <div className="h-full w-full rounded-full bg-white scale-50" />
          </div>
        </div>
      </div>
      
      {message && (
        <p className="text-xs tracking-wide font-medium animate-pulse" style={{ color: "hsl(var(--sidebar-background))" }}>
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        {loader}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      {loader}
    </div>
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
