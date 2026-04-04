import { useNavigate } from "react-router-dom";
import { useSuperadmin } from "@/hooks/useSuperadmin";
import { AuditLogViewer } from "@/components/AuditLogViewer";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { PremiumLoader } from "@/components/PremiumLoader";

export default function SuperAdminLogs() {
  const navigate = useNavigate();
  const { isSuperadmin, loading } = useSuperadmin();

  if (loading) {
    return <PremiumLoader fullScreen message="Loading logs..." />;
  }

  if (!isSuperadmin) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="container py-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/superadmin')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Audit Logs</h1>
          <p className="text-muted-foreground mt-1">View all actions across the platform</p>
        </div>
      </div>

      <div className="bg-card border-black/5 dark:border-white/5 shadow-sm rounded-xl overflow-hidden p-6">
        <AuditLogViewer isSuperadmin={true} showRetentionControls={true} />
      </div>
    </div>
  );
}
