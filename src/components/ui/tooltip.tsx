import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

const TooltipArrow = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Arrow>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Arrow>
>(({ className, ...props }, ref) => (
  <TooltipPrimitive.Arrow ref={ref} className={cn("fill-popover", className)} {...props} />
));
TooltipArrow.displayName = TooltipPrimitive.Arrow.displayName;


// Extended tooltip content class for the sidebar
export const sidebarTooltipContentClass =
  "z-[200] overflow-visible rounded-xl border-2 border-violet-400/50 " +
  "bg-gradient-to-br from-white via-white to-violet-50/90 backdrop-blur-md " +
  "max-w-[240px] px-4 py-2.5 text-sm font-semibold leading-snug tracking-wide text-violet-900 " +
  "shadow-[0_16px_48px_-12px_rgba(91,33,182,0.55),0_8px_24px_-8px_rgba(15,23,42,0.2)] " +
  "ring-2 ring-white/80 " +
  "animate-in fade-in-0 zoom-in-95 duration-300 ease-out " +
  "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:duration-200 " +
  "data-[side=right]:slide-in-from-left-4";

export const sidebarTooltipArrowClass =
  "fill-white drop-shadow-[0_4px_12px_rgba(91,33,182,0.4)]";



  // Export the tooltip components

export { Tooltip, TooltipTrigger, TooltipContent, TooltipArrow, TooltipProvider };
