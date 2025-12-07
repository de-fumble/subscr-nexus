import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function RestrictedPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="rounded-full bg-destructive/10 p-6 mb-6">
        <ShieldX className="h-12 w-12 text-destructive" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">Access Restricted</h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        You don't have permission to access this page. Only organization owners can view this section.
      </p>
      <Button onClick={() => navigate("/dashboard")} variant="outline">
        Return to Dashboard
      </Button>
    </div>
  );
}
