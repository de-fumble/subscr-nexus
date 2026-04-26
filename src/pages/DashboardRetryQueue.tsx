import { useState } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  RefreshCw,
  XCircle,
  RotateCcw,
  Users,
  Timer,
} from "lucide-react";
import logoSvg from "@/assets/logo.svg";

const DashboardRetryQueue = () => {
  const navigate = useNavigate();
  const [showComingSoon, setShowComingSoon] = useState(true);

  return (
    <>
      <SidebarInset className={`flex-1 flex flex-col transition-all duration-700 ${showComingSoon ? "blur-xl scale-[0.98] pointer-events-none select-none" : ""}`}>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border/50 glass-card px-4">
          <SidebarTrigger />
          <div className="flex-1 flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-primary" />
              Auto Retry Queue
            </h1>
          </div>
          <Button variant="outline" size="sm" disabled={true} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="glass-card opacity-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">128</p>
                      <p className="text-sm text-muted-foreground">Total in Queue</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card opacity-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <Timer className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">42</p>
                      <p className="text-sm text-muted-foreground">Pending Retries</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card opacity-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                      <XCircle className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">14</p>
                      <p className="text-sm text-muted-foreground">Retries Exhausted</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="glass-card overflow-hidden">
              <div className="p-8 space-y-4">
                <div className="h-8 w-1/3 bg-muted rounded animate-pulse" />
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </main>
      </SidebarInset>

      <AlertDialog open={showComingSoon} onOpenChange={setShowComingSoon}>
        <AlertDialogContent className="max-w-md border-primary/20 shadow-2xl backdrop-blur-xl bg-background/95">
          <AlertDialogHeader className="items-center text-center">
            <div className="h-24 w-24 rounded-full bg-white flex items-center justify-center mb-6 relative overflow-hidden border-4 border-primary/10 shadow-xl">
              <div className="absolute inset-0 rounded-full bg-primary/5 animate-pulse" />
              <img src={logoSvg} alt="Recurra" className="h-16 w-16 relative z-10 transform scale-125 object-contain rounded-full" />
            </div>
            <AlertDialogTitle className="text-2xl font-bold tracking-tight">
              Auto Recovery Engine
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base leading-relaxed">
              Our intelligent payment recovery system is currently undergoing final optimization. 
              <span className="block mt-4 font-semibold text-foreground">
                This feature will roll out to your region soon.
              </span>
              We'll notify you as soon as it's active for your organization.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center mt-6">
            <AlertDialogAction 
              onClick={() => navigate(-1)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-12 rounded-full h-11 transition-all hover:scale-105 active:scale-95"
            >
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DashboardRetryQueue;
