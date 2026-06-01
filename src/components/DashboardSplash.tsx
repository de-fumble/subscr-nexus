import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────
   Loading phrase pairs: [short label, detail]
───────────────────────────────────────────────────────────── */
const phases = [
  { label: "Authenticating",   detail: "Verifying your secure workspace session…" },
  { label: "Fetching Plans",   detail: "Pulling live subscription plan data…"     },
  { label: "Syncing Revenue",  detail: "Calculating your latest revenue metrics…"  },
  { label: "Loading Overview", detail: "Assembling your personalised dashboard…"   },
];

/* ─────────────────────────────────────────────────────────────
   SVG arc progress indicator
───────────────────────────────────────────────────────────── */
function ArcProgress({ progress }: { progress: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  // Arc spans 270° (from 135° to 405°). We map progress [0-1] onto that arc.
  const arcLen = circ * 0.75;
  const dash = arcLen * Math.min(progress, 1);
  const gap = circ - dash;

  return (
    <svg
      viewBox="0 0 140 140"
      className="absolute inset-0 w-full h-full"
      style={{ transform: "rotate(135deg)" }}
    >
      {/* Track */}
      <circle
        cx={70} cy={70} r={r}
        fill="none"
        stroke="hsl(var(--border) / 0.25)"
        strokeWidth={5}
        strokeDasharray={`${arcLen} ${circ - arcLen}`}
        strokeLinecap="round"
      />
      {/* Filled arc */}
      <circle
        cx={70} cy={70} r={r}
        fill="none"
        stroke="url(#arcGrad)"
        strokeWidth={5}
        strokeDasharray={`${dash} ${gap}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.4,0,0.2,1)" }}
      />
      <defs>
        <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="hsl(180 97% 42%)" />
          <stop offset="100%" stopColor="hsl(210 100% 60%)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   Metric skeleton cards shown below the main pill
───────────────────────────────────────────────────────────── */
const SKELETONS = [
  { w: "w-20", label: "Revenue" },
  { w: "w-16", label: "Subscribers" },
  { w: "w-14", label: "Failed" },
  { w: "w-18", label: "Balance" },
];

function MetricSkeleton({ w, label, delay }: { w: string; label: string; delay: number }) {
  return (
    <div
      className="flex flex-col gap-1.5 items-center px-3 py-2.5 rounded-xl"
      style={{
        background: "hsl(var(--muted) / 0.35)",
        border: "1px solid hsl(var(--border) / 0.3)",
        animationDelay: `${delay}ms`,
      }}
    >
      <div
        className={cn("h-4 rounded-md bg-muted/60", w)}
        style={{
          animation: `skeletonPulse 1.8s ease-in-out infinite`,
          animationDelay: `${delay}ms`,
        }}
      />
      <span
        className="text-[9px] font-medium text-muted-foreground/60 uppercase tracking-widest"
        style={{ letterSpacing: "0.12em" }}
      >
        {label}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────── */
export function DashboardSplash() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [progress, setProgress]     = useState(0.08);
  const [fadePhase, setFadePhase]   = useState(true); // true = visible
  const progressRef = useRef(0);

  /* Advance progress smoothly, step through phases */
  useEffect(() => {
    let raf: number;
    let elapsed = 0;

    const tick = () => {
      elapsed += 16;

      // Soft-ease progress: never quite reaches 1 so the dashboard replaces it
      const target = Math.min(0.92, elapsed / 4800);
      progressRef.current += (target - progressRef.current) * 0.04;
      setProgress(progressRef.current);

      // Advance phase label every ~1.1 s
      setPhaseIndex(Math.min(phases.length - 1, Math.floor(elapsed / 1100)));

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* Fade the phrase text out/in on phase change */
  useEffect(() => {
    setFadePhase(false);
    const t = setTimeout(() => setFadePhase(true), 220);
    return () => clearTimeout(t);
  }, [phaseIndex]);

  const pct = Math.round(progress * 100);

  return (
    <div className="flex-1 w-full h-[calc(100vh-56px)] flex flex-col items-center justify-center relative overflow-hidden select-none">

      {/* ── Layer 0: deep gradient backdrop ──────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 30%, hsl(180 97% 32% / 0.07) 0%, transparent 70%), " +
            "radial-gradient(ellipse 60% 50% at 70% 80%, hsl(210 100% 12% / 0.06) 0%, transparent 70%)",
        }}
      />

      {/* ── Layer 1: fine grid ───────────────────────────────── */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(to right,hsl(var(--border)/0.3) 1px,transparent 1px)," +
            "linear-gradient(to bottom,hsl(var(--border)/0.3) 1px,transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%,#000 60%,transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 50% 50%,#000 60%,transparent 100%)",
        }}
      />

      {/* ── Main content card ────────────────────────────────── */}
      <div
        className="relative z-10 flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-700"
        style={{ animationFillMode: "backwards" }}
      >

        {/* ── Logo orbit assembly ── */}
        <div className="relative w-[140px] h-[140px] flex items-center justify-center">

          {/* Animated SVG arc progress */}
          <ArcProgress progress={progress} />

          {/* Outer orbit ring */}
          <div
            className="absolute inset-[10px] rounded-full"
            style={{
              border: "1.5px solid hsl(180 97% 42% / 0.18)",
              animation: "orbitSpin 12s linear infinite",
            }}
          >
            {/* Orbit dot */}
            <div
              className="absolute -top-[4px] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
              style={{ background: "hsl(180 97% 52%)", boxShadow: "0 0 8px hsl(180 97% 52%)" }}
            />
          </div>

          {/* Inner orbit ring (counter-rotate) */}
          <div
            className="absolute inset-[22px] rounded-full"
            style={{
              border: "1px dashed hsl(210 100% 60% / 0.2)",
              animation: "orbitSpin 8s linear infinite reverse",
            }}
          >
            <div
              className="absolute -bottom-[3px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
              style={{ background: "hsl(210 100% 65%)", boxShadow: "0 0 6px hsl(210 100% 65%)" }}
            />
          </div>

          {/* Logo circle */}
          <div className="relative z-10 w-[62px] h-[62px] flex items-center justify-center">
            {/* Ambient glow */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle, hsl(180 97% 42% / 0.25) 0%, transparent 70%)",
                animation: "glowPulse 2.5s ease-in-out infinite",
              }}
            />
            <img
              src="/recurra-logo.svg"
              alt="Recurra"
              className="relative w-[62px] h-[62px] rounded-full object-cover"
              style={{
                boxShadow: "0 0 0 2px hsl(var(--background)), 0 0 0 3px hsl(var(--border) / 0.5), 0 8px 24px hsl(180 97% 32% / 0.3)",
              }}
            />
          </div>

          {/* Percentage badge */}
          <div
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[11px] font-semibold tabular-nums"
            style={{
              background: "hsl(var(--background))",
              border: "1px solid hsl(var(--border) / 0.5)",
              color: "hsl(180 97% 36%)",
              boxShadow: "0 2px 8px hsl(var(--foreground)/0.06)",
              minWidth: "3.5rem",
              textAlign: "center",
              letterSpacing: "0.04em",
            }}
          >
            {pct}%
          </div>
        </div>

        {/* ── Phase text ── */}
        <div className="flex flex-col items-center gap-1 text-center mt-2" style={{ minHeight: "3.5rem" }}>
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{
              background: "linear-gradient(90deg, hsl(180 97% 42%), hsl(210 100% 60%))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              opacity: fadePhase ? 1 : 0,
              transition: "opacity 0.22s ease",
            }}
          >
            {phases[phaseIndex].label}
          </span>
          <p
            className="text-xs text-muted-foreground max-w-[220px] leading-relaxed"
            style={{
              opacity: fadePhase ? 1 : 0,
              transition: "opacity 0.22s ease",
            }}
          >
            {phases[phaseIndex].detail}
          </p>
        </div>

        {/* ── Shimmer track ── */}
        <div
          className="w-48 h-[3px] rounded-full overflow-hidden"
          style={{ background: "hsl(var(--border) / 0.3)" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg, hsl(180 97% 42%), hsl(210 100% 55%))",
              transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)",
              boxShadow: "0 0 8px hsl(180 97% 42% / 0.6)",
            }}
          />
        </div>

        {/* ── Metric skeleton cards ── */}
        <div className="flex gap-2 mt-1">
          {SKELETONS.map((s, i) => (
            <MetricSkeleton key={s.label} w={s.w} label={s.label} delay={i * 120} />
          ))}
        </div>

      </div>

      {/* ── Keyframe definitions ── */}
      <style>{`
        @keyframes orbitSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.7; transform: scale(1);   }
          50%       { opacity: 1;   transform: scale(1.15); }
        }

        @keyframes skeletonPulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
