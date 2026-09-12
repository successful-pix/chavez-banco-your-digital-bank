import { useEffect, useState } from "react";
import { Logo } from "./logo";

/**
 * Premium banking-style startup splash.
 * Mount-only: it never affects routes, authentication, data loading,
 * or any existing app functionality.
 */
export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeAt = window.setTimeout(() => setFading(true), 1700);
    const hideAt = window.setTimeout(() => setVisible(false), 2200);

    return () => {
      window.clearTimeout(fadeAt);
      window.clearTimeout(hideAt);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[9999] flex min-h-[100dvh] flex-col items-center justify-between overflow-hidden bg-gradient-primary px-6 py-[max(2rem,env(safe-area-inset-top))] text-white transition-opacity duration-500 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      style={{ pointerEvents: fading ? "none" : "auto" }}
    >
      <div className="absolute inset-0 splash-glow" />

      <div className="relative h-8 w-full" />

      <div className="relative flex flex-1 flex-col items-center justify-center">
        <div className="splash-mark">
          <Logo />
        </div>

        <div className="mt-7 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60">
            Seu banco digital
          </p>
          <div className="mt-5 h-[3px] w-36 overflow-hidden rounded-full bg-white/20">
            <div className="splash-progress h-full rounded-full bg-white" />
          </div>
        </div>
      </div>

      <div className="relative flex w-full items-center justify-center pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center gap-2 text-[11px] font-medium text-white/55">
          <span className="splash-status-dot" />
          <span>Preparando sua experiência segura</span>
        </div>
      </div>

      <style>{`
        .splash-glow {
          background:
            radial-gradient(circle at 50% 38%, rgba(255,255,255,.16), transparent 30%),
            radial-gradient(circle at 15% 85%, rgba(255,255,255,.08), transparent 28%),
            radial-gradient(circle at 85% 12%, rgba(255,255,255,.07), transparent 25%);
          animation: splash-breathe 3s ease-in-out infinite;
        }

        .splash-mark {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 136px;
          min-height: 72px;
          padding: 18px 24px;
          border-radius: 24px;
          background: rgba(255,255,255,.10);
          border: 1px solid rgba(255,255,255,.16);
          box-shadow: 0 20px 60px rgba(0,0,0,.18);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          animation: splash-enter 850ms cubic-bezier(.16,1,.3,1) both;
        }

        .splash-progress {
          width: 0%;
          animation: splash-load 1900ms cubic-bezier(.22,1,.36,1) forwards;
        }

        .splash-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: rgba(255,255,255,.9);
          box-shadow: 0 0 0 0 rgba(255,255,255,.45);
          animation: splash-pulse 1.5s ease-out infinite;
        }

        @keyframes splash-enter {
          0% { opacity: 0; transform: translateY(18px) scale(.94); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes splash-load {
          0% { width: 0%; }
          20% { width: 18%; }
          65% { width: 72%; }
          100% { width: 100%; }
        }

        @keyframes splash-breathe {
          0%, 100% { opacity: .75; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.04); }
        }

        @keyframes splash-pulse {
          0% { box-shadow: 0 0 0 0 rgba(255,255,255,.4); }
          70% { box-shadow: 0 0 0 8px rgba(255,255,255,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .splash-glow,
          .splash-mark,
          .splash-progress,
          .splash-status-dot {
            animation: none !important;
          }
          .splash-progress { width: 100%; }
        }
      `}</style>
    </div>
  );
}
