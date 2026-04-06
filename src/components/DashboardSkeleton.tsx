import { PremiumLoader } from "@/components/PremiumLoader";

interface DashboardSkeletonProps {
  showSidebar?: boolean;
}

export function DashboardSkeleton(_props: DashboardSkeletonProps) {
  return <PremiumLoader message="Loading dashboard..." size="lg" />;
}

export function PageLoadingSkeleton() {
  return <PremiumLoader message="Loading..." size="lg" />;
}

export function SettingsPageSkeleton() {
  return <PremiumLoader message="Loading settings..." size="lg" />;
}

export function AnalyticsPageSkeleton() {
  return <PremiumLoader message="Loading analytics..." size="lg" />;
}

export function ProfilePageSkeleton() {
  return <PremiumLoader message="Loading profile..." size="lg" />;
}

export function PlansPageSkeleton() {
  return <PremiumLoader message="Loading plans..." size="lg" />;
}

export function SubscribersPageSkeleton() {
  return <PremiumLoader message="Loading subscribers..." size="lg" />;
}
