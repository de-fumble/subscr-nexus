import React, { useState } from "react";
import { MessageCircle, X, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FloatingSupport() {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">

            {/* Support Panel / IFrame Modal */}
            <div
                className={cn(
                    "mb-4 glass-card premium-shadow rounded-2xl flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right shadow-2xl",
                    isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4 pointer-events-none",
                    isExpanded ? "w-[90vw] h-[80vh] sm:w-[80vw] sm:h-[80vh] max-w-5xl" : "w-[350px] h-[550px]"
                )}
            >
                {/* Header */}
                <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shrink-0 shadow-sm z-10">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse ring-2 ring-primary" />
                        <span className="font-semibold text-sm tracking-wide">Recurra IQ</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20 rounded-full transition-colors"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20 rounded-full transition-colors"
                            onClick={() => setIsOpen(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* IFrame Content */}
                <div className="flex-1 w-full bg-background relative overflow-hidden">
                    {(isLoading && isOpen) && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10 gap-3">
                            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs text-muted-foreground font-medium animate-pulse">Starting IQ Assistant...</span>
                        </div>
                    )}
                    {isOpen && (
                        <iframe
                            src="https://iq.recurrra.com"
                            className="w-full h-full border-none"
                            title="Recurra IQ Assistant"
                            onLoad={() => setIsLoading(false)}
                            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                        />
                    )}
                </div>
            </div>

            {/* Floating Button */}
            <Button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "rounded-full shadow-xl premium-shadow hover:scale-105 transition-all duration-300 gap-2.5 backdrop-blur-md",
                    isOpen ? "h-12 w-12 p-0 bg-muted hover:bg-muted/80 text-foreground" : "h-14 pl-5 pr-6 bg-primary hover:bg-primary/90"
                )}
            >
                <div className="relative flex items-center justify-center">
                    {isOpen ? (
                        <X className="h-5 w-5" />
                    ) : (
                        <>
                            <MessageCircle className="h-5 w-5 text-primary-foreground" />
                            <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-400 border-2 border-primary animate-pulse" />
                        </>
                    )}
                </div>
                {!isOpen && <span className="font-semibold tracking-wide text-primary-foreground">AI Support</span>}
            </Button>
        </div>
    );
}
