import { useEffect, useState } from "react";
import { Logo } from "./logo";

/**
 * Full-screen animated splash. Renders on first paint and fades out
 * after the initial hydration frame. Kept mount-only so route changes
 * don't retrigger it.
 */
export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeAt = window.setTimeout(() => setFading(true), 900);
    const hideAt = window.setTimeout(() => setVisible(false), 1500);
    return () => {
      window.clearTimeout(fadeAt);
      window.clearTimeout(hideAt);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-primary transition-opacity duration-500 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      style={{ pointerEvents: fading ? "none" : "auto" }}
    >
      <div className="splash-logo">
        <Logo variant="light" />
      </div>
      <div className="mt-8 h-1 w-40 overflow-hidden rounded-full bg-white/20">
        <div className="splash-bar h-full rounded-full bg-white/90" />
      </div>
      <style>{`
        .splash-logo {
          animation: splash-pop 700ms cubic-bezier(.2,.9,.3,1.2) both;
        }
        .splash-bar {
          width: 0%;
          animation: splash-load 1200ms cubic-bezier(.4,0,.2,1) forwards;
        }
        @keyframes splash-pop {
          0%   { opacity: 0; transform: scale(.7); }
          60%  { opacity: 1; transform: scale(1.06); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes splash-load {
          0%   { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
}
