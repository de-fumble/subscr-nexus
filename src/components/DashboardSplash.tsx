import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const loadingPhrases = [
    "Securely connecting to your workspace...",
    "Syncing live subscription data...",
    "Calculating your latest revenue...",
    "Preparing your dashboard experience..."
];

export function DashboardSplash() {
    const [phraseIndex, setPhraseIndex] = useState(0);

    useEffect(() => {
        // Cycle phrases every 1.5 seconds
        const interval = setInterval(() => {
            setPhraseIndex((prev) => (prev + 1) % loadingPhrases.length);
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex-1 w-full h-[calc(100vh-64px)] flex flex-col items-center justify-center relative overflow-hidden bg-background/50">

            {/* Animated Background Grid Elements (Subtle) */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] animate-[pulse_4s_ease-in-out_infinite]" />

            <div className="relative z-10 flex flex-col items-center max-w-sm w-full animate-in fade-in zoom-in duration-500">

                {/* Glow behind the pill */}
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />

                {/* Premium Glass Pill */}
                <div className="relative glass-card premium-shadow px-8 py-10 rounded-3xl w-full flex flex-col items-center text-center space-y-6">

                    {/* System Logo */}
                    <div className="relative h-16 w-16">
                        <div className="absolute inset-0 bg-primary/30 rounded-full animate-ping" />
                        <div className="absolute inset-2 bg-primary/20 rounded-full animate-pulse" />
                        <img
                            src="/recurra-logo.svg"
                            alt="Recurra"
                            className="relative h-16 w-16 rounded-full shadow-lg ring-2 ring-background/50"
                        />
                    </div>

                    <div className="space-y-2 w-full">
                        <h3 className="font-semibold text-foreground text-lg tracking-tight">Loading Workspace</h3>

                        {/* Cycling Text Container */}
                        <div className="h-5 relative overflow-hidden w-full">
                            {loadingPhrases.map((phrase, idx) => (
                                <p
                                    key={idx}
                                    className={cn(
                                        "text-xs sm:text-sm text-muted-foreground absolute inset-0 transition-all duration-500 transform",
                                        idx === phraseIndex
                                            ? "opacity-100 translate-y-0"
                                            : idx < phraseIndex
                                                ? "opacity-0 -translate-y-4"
                                                : "opacity-0 translate-y-4"
                                    )}
                                >
                                    {phrase}
                                </p>
                            ))}
                        </div>
                    </div>

                    {/* Progress Bar Line */}
                    <div className="w-full h-1 bg-muted overflow-hidden rounded-full">
                        <div className="h-full bg-primary rounded-full animate-[progress_1.5s_ease-in-out_infinite]" style={{ width: '40%', transformOrigin: 'left' }} />
                    </div>

                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}} />
        </div>
    );
}
