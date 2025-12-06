import { useNavigate } from "react-router-dom";
import { useSuperadmin } from "@/hooks/useSuperadmin";
import { AuditLogViewer } from "@/components/AuditLogViewer";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";

export default function SuperAdminLogs() {
  const navigate = useNavigate();
  const { isSuperadmin, loading } = useSuperadmin();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperadmin) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/superadmin')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Platform Audit Logs</h1>
          <p className="text-muted-foreground">View all actions across the platform</p>
        </div>
      </div>

      <AuditLogViewer isSuperadmin={true} />
    </div>
  );
}
