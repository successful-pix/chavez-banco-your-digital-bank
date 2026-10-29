import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Startup splash shown once when the app document first loads.
 * It does not run again during in-app route changes.
 */
export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [welcome, setWelcome] = useState(false);
  const [fading, setFading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    let fadeTimer = 0;
    let hideTimer = 0;
    let welcomeTimer = 0;

    const start = async () => {
      // Keep the splash visual for a full four seconds, then show the welcome.
      await new Promise<void>((resolve) => window.setTimeout(resolve, 4000));
      if (cancelled) return;
      setWelcome(true);

      // Only redirect from the landing page. Direct links to other app pages
      // remain intact, and authentication is never bypassed.
      welcomeTimer = window.setTimeout(async () => {
        if (cancelled) return;
        const isLandingPage = window.location.pathname === "/";
        if (isLandingPage) {
          const { data } = await supabase.auth.getSession();
          if (cancelled) return;
          if (data.session) {
            await navigate({ to: "/dashboard" });
          } else {
            await navigate({ to: "/auth", search: { mode: "signin" } });
          }
        }
        setFading(true);
        fadeTimer = window.setTimeout(() => {
          if (!cancelled) setVisible(false);
        }, 450);
      }, 850);
    };

    void start();
    return () => {
      cancelled = true;
      window.clearTimeout(welcomeTimer);
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, [navigate]);

  if (!visible) return null;

  return (
    <div
      aria-live="polite"
      aria-label={welcome ? "Welcome to Chavez Banco" : "Loading Chavez Banco"}
      className={`fixed inset-0 z-[9999] flex min-h-[100dvh] flex-col items-center justify-between overflow-hidden bg-[#061B49] px-6 py-[max(2rem,env(safe-area-inset-top))] text-white transition-opacity duration-500 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      style={{ pointerEvents: fading ? "none" : "auto" }}
    >
      <div className="absolute inset-0 splash-glow" />
      <div className="absolute inset-0 splash-grid" />

      <div className="relative h-8 w-full" />

      <div className="relative flex flex-1 flex-col items-center justify-center text-center">
        <div className={`splash-mark ${welcome ? "splash-welcome-mark" : ""}`}>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/25 bg-white/10 text-3xl font-black text-white shadow-lg">C</div>
        </div>

        <h1 className="mt-6 text-2xl font-black tracking-[0.19em] sm:text-3xl">CHAVEZ BANCO</h1>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/60">
          Seu banco digital
        </p>

        {!welcome ? (
          <>
            <div className="relative mt-10 grid h-16 w-16 place-items-center" role="status" aria-label="Carregando">
              <span className="absolute inset-0 rounded-full border-[3px] border-white/15" />
              <span className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-white border-r-white/80 splash-spinner" />
              <span className="h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,.8)]" />
            </div>
            <p className="mt-5 text-sm font-medium text-white/75">Preparando sua experiência segura...</p>
            <div className="mt-6 h-1 w-48 overflow-hidden rounded-full bg-white/15">
              <div className="splash-progress h-full rounded-full bg-white" />
            </div>
          </>
        ) : (
          <div className="mt-9 splash-welcome-copy">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-white/25 bg-white/10 text-2xl">✓</div>
            <p className="mt-4 text-xl font-bold">Bem-vindo ao Chavez Banco</p>
            <p className="mt-2 text-sm text-white/65">Sua experiência digital começa agora.</p>
          </div>
        )}
      </div>

      <div className="relative flex w-full items-center justify-center pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center gap-2 text-[11px] font-medium text-white/50">
          <span className="splash-status-dot" />
          <span>Uma experiência bancária simples e segura</span>
        </div>
      </div>

      <style>{`
        .splash-glow {
          background:
            radial-gradient(circle at 50% 40%, rgba(52,132,255,.35), transparent 32%),
            radial-gradient(circle at 12% 82%, rgba(255,255,255,.09), transparent 28%),
            radial-gradient(circle at 88% 12%, rgba(28,103,255,.18), transparent 28%);
          animation: splash-breathe 2.8s ease-in-out infinite;
        }
        .splash-grid {
          opacity: .12;
          background-image: linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px);
          background-size: 42px 42px;
          mask-image: radial-gradient(ellipse at center, black, transparent 78%);
        }
        .splash-mark {
          display: grid;
          place-items: center;
          width: 90px;
          height: 90px;
          border-radius: 28px;
          background: linear-gradient(145deg, rgba(255,255,255,.18), rgba(255,255,255,.04));
          border: 1px solid rgba(255,255,255,.23);
          box-shadow: 0 20px 70px rgba(0,0,0,.25), 0 0 40px rgba(70,145,255,.25);
          backdrop-filter: blur(14px);
          animation: splash-enter 800ms cubic-bezier(.16,1,.3,1) both, splash-shine 2.2s ease-in-out infinite;
        }
        .splash-welcome-mark { animation: splash-welcome 500ms cubic-bezier(.16,1,.3,1) both; }
        .splash-spinner { animation: splash-spin 900ms linear infinite; }
        .splash-progress { width: 0%; animation: splash-load 4s cubic-bezier(.22,1,.36,1) forwards; }
        .splash-status-dot { width: 6px; height: 6px; border-radius: 999px; background: #a8d0ff; box-shadow: 0 0 12px rgba(168,208,255,.8); animation: splash-pulse 1.4s ease-out infinite; }
        .splash-welcome-copy { animation: splash-welcome 500ms cubic-bezier(.16,1,.3,1) both; }
        @keyframes splash-spin { to { transform: rotate(360deg); } }
        @keyframes splash-enter { 0% { opacity: 0; transform: translateY(18px) scale(.88); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes splash-welcome { 0% { opacity: 0; transform: translateY(10px) scale(.96); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes splash-load { 0% { width: 0%; } 25% { width: 22%; } 65% { width: 70%; } 100% { width: 100%; } }
        @keyframes splash-breathe { 0%,100% { opacity: .7; transform: scale(1); } 50% { opacity: 1; transform: scale(1.04); } }
        @keyframes splash-shine { 0%,100% { box-shadow: 0 20px 70px rgba(0,0,0,.25), 0 0 24px rgba(70,145,255,.16); } 50% { box-shadow: 0 20px 70px rgba(0,0,0,.25), 0 0 46px rgba(70,145,255,.4); } }
        @keyframes splash-pulse { 0%,100% { opacity: .55; transform: scale(.9); } 50% { opacity: 1; transform: scale(1.1); } }
        @media (prefers-reduced-motion: reduce) {
          .splash-glow, .splash-mark, .splash-spinner, .splash-progress, .splash-status-dot, .splash-welcome-copy { animation-duration: .01ms !important; animation-iteration-count: 1 !important; }
          .splash-progress { width: 100%; }
        }
      `}</style>
    </div>
  );
}
