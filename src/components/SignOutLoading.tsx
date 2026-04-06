import React from "react";
import { cn } from "@/lib/utils";

export function SignOutLoading() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-500">
      {/* Animated Background Grid Elements (Subtle) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] animate-[pulse_4s_ease-in-out_infinite]" />

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full animate-in zoom-in duration-500">
        {/* Glow behind the logo */}
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />

        {/* Premium Glass Card */}
        <div className="relative glass-card premium-shadow px-8 py-10 rounded-3xl w-full flex flex-col items-center text-center space-y-6 bg-background/40 border border-white/10">
          {/* Pulsing System Logo */}
          <div className="relative h-20 w-20">
            <div className="absolute inset-0 bg-primary/30 rounded-full animate-ping" />
            <div className="absolute inset-2 bg-primary/20 rounded-full animate-pulse" />
            <img
              src="/recurra-logo.svg"
              alt="Recurra"
              className="relative h-20 w-20 rounded-full shadow-2xl ring-2 ring-primary/20 animate-[pulse_2s_ease-in-out_infinite]"
            />
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-foreground text-xl tracking-tight">Signing Out</h3>
            <p className="text-sm text-muted-foreground animate-pulse">
              Securing your session and signing you out...
            </p>
          </div>

          {/* Progress Bar Line */}
          <div className="w-full h-1 bg-muted/30 overflow-hidden rounded-full max-w-[200px]">
            <div 
              className="h-full bg-primary rounded-full animate-[progress_3s_linear_forwards]" 
              style={{ width: '100%', transformOrigin: 'left' }} 
            />
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes progress {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
      `}} />
    </div>
  );
}
