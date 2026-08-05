// Short, professional in-app notification chime using WebAudio (no assets to download).
// Autoplay-safe: if the AudioContext is blocked, we resume it on the first user gesture.

let ctx: AudioContext | null = null;
let unlocked = false;
let pending = false;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
}

function bindUnlock() {
  if (typeof window === "undefined" || unlocked) return;
  const handler = () => {
    unlocked = true;
    const c = ensureCtx();
    c?.resume().then(() => {
      if (pending) {
        pending = false;
        chime();
      }
    }).catch(() => {});
    window.removeEventListener("pointerdown", handler);
    window.removeEventListener("keydown", handler);
  };
  window.addEventListener("pointerdown", handler, { once: true });
  window.addEventListener("keydown", handler, { once: true });
}

function blip(c: AudioContext, freq: number, at: number, dur = 0.12) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.06, at + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

function chime() {
  const c = ensureCtx();
  if (!c) return;
  const t = c.currentTime + 0.01;
  blip(c, 880, t);
  blip(c, 1174.66, t + 0.13);
}

/** Play a short notification sound. Silently degrades if autoplay is blocked. */
export function playNotificationSound() {
  const c = ensureCtx();
  if (!c) return;
  if (c.state === "suspended") {
    pending = true;
    bindUnlock();
    c.resume().then(() => {
      if (pending) {
        pending = false;
        chime();
      }
    }).catch(() => {});
    return;
  }
  chime();
}
