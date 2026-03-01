import { Skeleton, SkeletonStatCard, SkeletonTable, SkeletonChart } from "@/components/ui/skeleton";
import { PremiumLoader } from "@/components/PremiumLoader";

interface DashboardSkeletonProps {
  showSidebar?: boolean;
}

export function DashboardSkeleton({ showSidebar = false }: DashboardSkeletonProps) {
  return (
    <div className="flex-1 overflow-auto p-3 sm:p-6 space-y-4 sm:space-y-8">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton variant="shimmer" className="h-6 sm:h-8 w-32 sm:w-48" />
          <Skeleton variant="shimmer" className="h-3 sm:h-4 w-48 sm:w-64" />
        </div>
        <div className="hidden sm:flex gap-3">
          <Skeleton variant="glass" className="h-10 w-32 rounded-lg" />
          <Skeleton variant="glass" className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-3 sm:gap-6 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} style={{ animationDelay: `${i * 100}ms` }} />
        ))}
      </div>

      {/* Charts section */}
      <div className="grid gap-3 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <SkeletonChart />
        <SkeletonChart />
      </div>

      {/* Table section */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton variant="shimmer" className="h-5 sm:h-6 w-28 sm:w-40" />
          <div className="flex gap-2">
            <Skeleton variant="glass" className="h-8 sm:h-9 w-20 sm:w-24 rounded-lg" />
          </div>
        </div>
        <SkeletonTable rows={5} />
      </div>
    </div>
  );
}

export function PageLoadingSkeleton() {
  return <PremiumLoader message="Loading..." size="lg" />;
}

export function SettingsPageSkeleton() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="container max-w-3xl py-8 px-6 space-y-6">
        {/* API Keys Card */}
        <div className="rounded-xl p-6 glass-card border border-border/30 space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton variant="glass" className="h-12 w-12 rounded-xl" />
            <div className="space-y-2 flex-1">
              <Skeleton variant="shimmer" className="h-5 w-40" />
              <Skeleton variant="shimmer" className="h-3 w-64" />
            </div>
          </div>
          <div className="text-center py-8 space-y-4">
            <Skeleton variant="glass" className="h-20 w-20 rounded-2xl mx-auto" />
            <Skeleton variant="shimmer" className="h-5 w-32 mx-auto" />
            <Skeleton variant="shimmer" className="h-3 w-48 mx-auto" />
            <Skeleton variant="glass" className="h-10 w-36 rounded-lg mx-auto" />
          </div>
        </div>

        {/* License Card */}
        <div className="rounded-xl p-6 glass-card border border-border/30 border-l-4 border-l-muted">
          <div className="flex items-center gap-4">
            <Skeleton variant="glass" className="h-12 w-12 rounded-xl" />
            <div className="space-y-2 flex-1">
              <Skeleton variant="shimmer" className="h-5 w-32" />
              <Skeleton variant="shimmer" className="h-3 w-48" />
            </div>
            <Skeleton variant="glass" className="h-10 w-32 rounded-lg" />
          </div>
        </div>

        {/* Bank Account Card */}
        <div className="rounded-xl p-6 glass-card border border-border/30 space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton variant="glass" className="h-12 w-12 rounded-xl" />
            <div className="space-y-2 flex-1">
              <Skeleton variant="shimmer" className="h-5 w-40" />
              <Skeleton variant="shimmer" className="h-3 w-56" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Skeleton variant="shimmer" className="h-4 w-20" />
              <Skeleton variant="glass" className="h-10 w-full rounded-lg" />
            </div>
            <div className="space-y-2">
              <Skeleton variant="shimmer" className="h-4 w-24" />
              <Skeleton variant="glass" className="h-10 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AnalyticsPageSkeleton() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="container py-8 px-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Skeleton variant="shimmer" className="h-4 w-64" />
          <Skeleton variant="glass" className="h-9 w-32 rounded-lg" />
        </div>

        {/* Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonChart />
          <SkeletonChart />
        </div>

        {/* Pie Chart */}
        <div className="rounded-xl p-6 glass-card border border-border/30 space-y-4">
          <div className="space-y-2">
            <Skeleton variant="shimmer" className="h-5 w-32" />
            <Skeleton variant="shimmer" className="h-3 w-48" />
          </div>
          <div className="h-64 flex items-center justify-center">
            <div className="relative">
              <Skeleton variant="pulse-glow" className="h-40 w-40 rounded-full" />
              <div className="absolute inset-4">
                <Skeleton variant="glass" className="h-32 w-32 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton variant="shimmer" className="h-6 w-28" />
            <Skeleton variant="glass" className="h-9 w-40 rounded-lg" />
          </div>
          <div className="rounded-xl p-6 glass-card border border-border/30 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton variant="glass" className="h-10 w-10 rounded-xl" />
              <div className="space-y-2 flex-1">
                <Skeleton variant="shimmer" className="h-4 w-32" />
                <Skeleton variant="shimmer" className="h-3 w-48" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton variant="shimmer" className="h-3 w-full" />
              <Skeleton variant="shimmer" className="h-3 w-4/5" />
              <Skeleton variant="shimmer" className="h-3 w-3/4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfilePageSkeleton() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="container max-w-3xl py-8 px-6 space-y-6">
        {/* Profile Card */}
        <div className="rounded-xl p-6 glass-card border border-border/30 space-y-6">
          <div className="flex items-center gap-6">
            <Skeleton variant="glass" className="h-24 w-24 rounded-2xl" />
            <div className="space-y-3 flex-1">
              <Skeleton variant="shimmer" className="h-6 w-48" />
              <Skeleton variant="shimmer" className="h-4 w-64" />
              <div className="flex gap-2">
                <Skeleton variant="glass" className="h-6 w-20 rounded-full" />
                <Skeleton variant="glass" className="h-6 w-16 rounded-full" />
              </div>
            </div>
            <Skeleton variant="glass" className="h-10 w-24 rounded-lg" />
          </div>
        </div>

        {/* Form sections */}
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl p-6 glass-card border border-border/30 space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton variant="glass" className="h-12 w-12 rounded-xl" />
              <div className="space-y-2">
                <Skeleton variant="shimmer" className="h-5 w-40" />
                <Skeleton variant="shimmer" className="h-3 w-56" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="space-y-2">
                  <Skeleton variant="shimmer" className="h-4 w-24" />
                  <Skeleton variant="glass" className="h-10 w-full rounded-lg" />
                </div>
              ))}
            </div>
            <Skeleton variant="glass" className="h-10 w-32 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlansPageSkeleton() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="container py-8 px-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton variant="shimmer" className="h-8 w-48" />
            <Skeleton variant="shimmer" className="h-4 w-72" />
          </div>
          <Skeleton variant="glass" className="h-10 w-32 rounded-lg" />
        </div>

        {/* Plans Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl p-6 glass-card border border-border/30 space-y-4"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-center justify-between">
                <Skeleton variant="shimmer" className="h-5 w-32" />
                <Skeleton variant="glass" className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton variant="shimmer" className="h-3 w-full" />
              <div className="pt-2">
                <Skeleton variant="pulse-glow" className="h-8 w-24" />
                <Skeleton variant="shimmer" className="h-3 w-16 mt-1" />
              </div>
              <div className="pt-2 space-y-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <Skeleton variant="glass" className="h-4 w-4 rounded" />
                    <Skeleton variant="shimmer" className="h-3 w-32" />
                  </div>
                ))}
              </div>
              <Skeleton variant="glass" className="h-10 w-full rounded-lg mt-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SubscribersPageSkeleton() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="container py-8 px-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton variant="shimmer" className="h-8 w-40" />
            <Skeleton variant="shimmer" className="h-4 w-56" />
          </div>
          <div className="flex gap-3">
            <Skeleton variant="glass" className="h-10 w-32 rounded-lg" />
            <Skeleton variant="glass" className="h-10 w-24 rounded-lg" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <Skeleton variant="glass" className="h-10 flex-1 max-w-md rounded-lg" />
          <Skeleton variant="glass" className="h-10 w-32 rounded-lg" />
          <Skeleton variant="glass" className="h-10 w-32 rounded-lg" />
        </div>

        {/* Table */}
        <SkeletonTable rows={8} />
      </div>
    </div>
  );
}
