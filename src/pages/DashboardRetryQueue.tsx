import { useState } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
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
import { APPLE_FONT, card, pageWrap, pageInner, sectionLabel, statValue, detailText, thCell, trRow, tdCell, tableDivider, pillBtn } from "@/lib/appleLayout";

const DashboardRetryQueue = () => {
  const navigate = useNavigate();
  const [showComingSoon, setShowComingSoon] = useState(true);

  return (
    <>
      <SidebarInset className={`flex-1 flex flex-col transition-all duration-700 ${showComingSoon ? "blur-xl scale-[0.98] pointer-events-none select-none" : ""}`}>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-black/5 dark:border-white/5 bg-[#f5f5f7]/90 dark:bg-black/90 backdrop-blur-md px-4" style={{ fontFamily: APPLE_FONT }}>
          <SidebarTrigger className="opacity-40 hover:opacity-70 transition-opacity shrink-0" />
          <button 
            onClick={() => navigate("/dashboard")} 
            className="flex items-center gap-1 text-[11px] font-medium text-black/40 hover:text-black/60 dark:text-white/40 dark:hover:text-white/60 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <h1 className="text-[15px] font-semibold text-black dark:text-white tracking-[-0.01em] flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-black/45 dark:text-white/45" />
            Auto Retry Queue
          </h1>
          <button disabled={true} className={`${pillBtn} ml-auto opacity-40`}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </header>

        <main className="flex-1 overflow-auto bg-[#f5f5f7] dark:bg-[#000]" style={{ fontFamily: APPLE_FONT }}>
          <div className="max-w-[1100px] mx-auto px-6 pt-8 pb-16 space-y-7">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className={`${card} px-5 py-4 flex items-center gap-3 opacity-55`}>
                <div className="h-8 w-8 rounded-lg bg-black/5 dark:bg-white/8 flex items-center justify-center">
                  <Users className="h-4.5 w-4.5 text-black/40 dark:text-white/40" />
                </div>
                <div>
                  <p className={statValue}>128</p>
                  <p className="text-[11px] font-medium text-black/40 dark:text-white/40 uppercase tracking-[0.05em]">Total in Queue</p>
                </div>
              </div>
              <div className={`${card} px-5 py-4 flex items-center gap-3 opacity-55`}>
                <div className="h-8 w-8 rounded-lg bg-black/5 dark:bg-white/8 flex items-center justify-center">
                  <Timer className="h-4.5 w-4.5 text-black/40 dark:text-white/40" />
                </div>
                <div>
                  <p className={statValue}>42</p>
                  <p className="text-[11px] font-medium text-black/40 dark:text-white/40 uppercase tracking-[0.05em]">Pending Retries</p>
                </div>
              </div>
              <div className={`${card} px-5 py-4 flex items-center gap-3 opacity-55`}>
                <div className="h-8 w-8 rounded-lg bg-black/5 dark:bg-white/8 flex items-center justify-center">
                  <XCircle className="h-4.5 w-4.5 text-black/40 dark:text-white/40" />
                </div>
                <div>
                  <p className={statValue}>14</p>
                  <p className="text-[11px] font-medium text-black/40 dark:text-white/40 uppercase tracking-[0.05em]">Retries Exhausted</p>
                </div>
              </div>
            </div>

            <div className={card}>
              <div className="p-8 space-y-4">
                <div className="h-5 w-1/3 bg-black/5 dark:bg-white/5 rounded animate-pulse" />
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-9 bg-black/[0.02] dark:bg-white/[0.02] rounded animate-pulse" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </SidebarInset>

      <AlertDialog open={showComingSoon} onOpenChange={setShowComingSoon}>
        <AlertDialogContent className="max-w-md bg-white dark:bg-[#1c1c1e] rounded-[16px] border border-black/5 dark:border-white/5 shadow-[0_12px_40px_rgba(0,0,0,0.15)]" style={{ fontFamily: APPLE_FONT }}>
          <AlertDialogHeader className="items-center text-center">
            <div className="h-20 w-20 rounded-2xl bg-black/5 dark:bg-white/8 flex items-center justify-center mb-6 border border-black/5">
              <img src={logoSvg} alt="Recurra" className="h-12 w-12 object-contain rounded-full" />
            </div>
            <AlertDialogTitle className="text-[18px] font-semibold tracking-[-0.01em] text-black dark:text-white">
              Auto Recovery Engine
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] leading-relaxed text-black/40 dark:text-white/40">
              Our intelligent payment recovery system is currently undergoing final optimization. 
              <span className="block mt-4 font-semibold text-black dark:text-white">
                This feature will roll out to your region soon.
              </span>
              We'll notify you as soon as it's active for your organization.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center mt-6">
            <AlertDialogAction 
              onClick={() => navigate(-1)}
              className="bg-black dark:bg-white text-white dark:text-black rounded-full px-12 h-9 text-[12px] font-medium transition-all hover:opacity-75"
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
