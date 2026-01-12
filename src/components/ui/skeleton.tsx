import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "shimmer" | "pulse-glow";
}

function Skeleton({ className, variant = "default", ...props }: SkeletonProps) {
  const variants = {
    default: "animate-pulse rounded-md bg-muted",
    glass: "animate-pulse rounded-lg bg-gradient-to-r from-muted/50 via-muted to-muted/50 backdrop-blur-sm border border-border/30",
    shimmer: "relative overflow-hidden rounded-lg bg-muted/60 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-accent/10 before:to-transparent",
    "pulse-glow": "animate-pulse rounded-lg bg-gradient-to-r from-muted/40 via-accent/5 to-muted/40 shadow-[0_0_15px_hsl(var(--accent)/0.1)]",
  };

  return (
    <div
      className={cn(variants[variant], className)}
      {...props}
    />
  );
}

// Premium skeleton components for consistent styling
function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl p-6 glass-card border border-border/30 space-y-4",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-4">
        <Skeleton variant="glass" className="h-12 w-12 rounded-xl" />
        <div className="space-y-2 flex-1">
          <Skeleton variant="shimmer" className="h-4 w-1/3" />
          <Skeleton variant="shimmer" className="h-3 w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton variant="shimmer" className="h-3 w-full" />
        <Skeleton variant="shimmer" className="h-3 w-4/5" />
      </div>
    </div>
  );
}

function SkeletonStatCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl p-6 glass-card border border-border/30 space-y-4",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        <Skeleton variant="shimmer" className="h-4 w-24" />
        <Skeleton variant="glass" className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton variant="pulse-glow" className="h-8 w-32" />
      <Skeleton variant="shimmer" className="h-3 w-20" />
    </div>
  );
}

function SkeletonTable({ rows = 5, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { rows?: number }) {
  return (
    <div className={cn("rounded-xl glass-card border border-border/30 overflow-hidden", className)} {...props}>
      {/* Header */}
      <div className="flex gap-4 p-4 border-b border-border/30 bg-muted/20">
        <Skeleton variant="shimmer" className="h-4 w-24" />
        <Skeleton variant="shimmer" className="h-4 w-32 flex-1" />
        <Skeleton variant="shimmer" className="h-4 w-20" />
        <Skeleton variant="shimmer" className="h-4 w-16" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 p-4 border-b border-border/20 last:border-0"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <Skeleton variant="glass" className="h-4 w-24" />
          <Skeleton variant="shimmer" className="h-4 flex-1" />
          <Skeleton variant="shimmer" className="h-4 w-20" />
          <Skeleton variant="glass" className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function SkeletonChart({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl p-6 glass-card border border-border/30 space-y-4",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton variant="shimmer" className="h-5 w-32" />
          <Skeleton variant="shimmer" className="h-3 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton variant="glass" className="h-8 w-16 rounded-lg" />
          <Skeleton variant="glass" className="h-8 w-16 rounded-lg" />
        </div>
      </div>
      {/* Chart area */}
      <div className="h-64 flex items-end gap-2 pt-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            variant="pulse-glow"
            className="flex-1 rounded-t-lg"
            style={{
              height: `${Math.random() * 60 + 20}%`,
              animationDelay: `${i * 100}ms`,
            }}
          />
        ))}
      </div>
      {/* X-axis labels */}
      <div className="flex justify-between pt-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="shimmer" className="h-3 w-12" />
        ))}
      </div>
    </div>
  );
}

function SkeletonAvatar({ size = "default", className, ...props }: React.HTMLAttributes<HTMLDivElement> & { size?: "sm" | "default" | "lg" }) {
  const sizes = {
    sm: "h-8 w-8",
    default: "h-10 w-10",
    lg: "h-16 w-16",
  };

  return (
    <Skeleton
      variant="glass"
      className={cn("rounded-full", sizes[size], className)}
      {...props}
    />
  );
}

function SkeletonBadge({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Skeleton
      variant="glass"
      className={cn("h-6 w-16 rounded-full", className)}
      {...props}
    />
  );
}

function SkeletonButton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Skeleton
      variant="glass"
      className={cn("h-10 w-24 rounded-lg", className)}
      {...props}
    />
  );
}

function SkeletonInput({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Skeleton
      variant="shimmer"
      className={cn("h-10 w-full rounded-lg", className)}
      {...props}
    />
  );
}

export { 
  Skeleton, 
  SkeletonCard, 
  SkeletonStatCard, 
  SkeletonTable, 
  SkeletonChart, 
  SkeletonAvatar,
  SkeletonBadge,
  SkeletonButton,
  SkeletonInput,
};
