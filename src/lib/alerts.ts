// Loud ringing alert + system (phone screen) notification for Chavez Banco.
// Frontend-only: uses WebAudio for the ring and the Service Worker Notification
// API so the alert shows on the phone screen as "Chavez Banco" even when the
// app is in the background / minimized (PWA installed).

let ctx: AudioContext | null = null;
let ringing = false;
const seen = new Set<string>();

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
}

/** Unlock audio on first gesture so later alerts can ring without a click. */
export function primeAlertAudio() {
  const c = ensureCtx();
  if (!c) return;
  const unlock = () => {
    c.resume().catch(() => {});
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  if (c.state === "suspended") {
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
  }
}

function ringTone(c: AudioContext, at: number) {
  // Two-tone telephone style ring burst (loud but clean).
  const dur = 0.9;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.55, at + 0.03);
  gain.gain.setValueAtTime(0.55, at + dur - 0.12);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  gain.connect(c.destination);

  const trem = c.createOscillator();
  const tremGain = c.createGain();
  trem.frequency.value = 20; // warble
  tremGain.gain.value = 120;
  trem.connect(tremGain);

  for (const freq of [880, 1320]) {
    const osc = c.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    tremGain.connect(osc.frequency);
    osc.connect(gain);
    osc.start(at);
    osc.stop(at + dur);
  }
  trem.start(at);
  trem.stop(at + dur);
}

/** Loud ringing sound: 3 bursts, ~3 seconds total. */
export function playLoudRing(bursts = 3) {
  const c = ensureCtx();
  if (!c) return;
  const start = () => {
    if (ringing) return;
    ringing = true;
    const t0 = c.currentTime + 0.02;
    for (let i = 0; i < bursts; i++) ringTone(c, t0 + i * 1.15);
    window.setTimeout(() => {
      ringing = false;
    }, bursts * 1150);
  };
  if (c.state === "suspended") {
    c.resume().then(start).catch(() => {});
    primeAlertAudio();
    return;
  }
  start();
}

/** Ask once for permission to show notifications on the phone screen. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    return (await Notification.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

/** Show a "Chavez Banco" alert on the device, with vibration on mobile. */
export async function showDeviceAlert(title: string, body: string, url = "/notifications") {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const options: NotificationOptions & { vibrate?: number[]; renotify?: boolean } = {
    body,
    icon: "/icon-192.png",
    badge: "/favicon-32.png",
    tag: `chavez-${Date.now()}`,
    requireInteraction: true,
    vibrate: [400, 200, 400, 200, 600],
    data: { url },
  };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, options);
      return;
    }
  } catch {
    /* fall through to page notification */
  }
  try {
    new Notification(title, options);
  } catch {
    /* ignore */
  }
}

/** Full alert: ring loudly + device notification. Deduped by a stable id. */
export async function fireAlert(opts: { id: string; title?: string; body: string; url?: string }) {
  if (seen.has(opts.id)) return false;
  seen.add(opts.id);
  playLoudRing();
  await showDeviceAlert(opts.title ?? "Chavez Banco", opts.body, opts.url);
  return true;
}

export function alertAlreadySeen(id: string) {
  return seen.has(id);
}
