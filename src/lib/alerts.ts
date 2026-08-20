// Chavez Banco alerts: sound + device/PWA notification + deduplication.
import {
  primeNotificationSound,
  playNotificationSound,
} from "@/lib/notification-sound";

const DISMISS_KEY = "chavez.notif.prompt.dismissed";

// Bounded dedupe cache (safe for long-running sessions).
const seen = new Set<string>();
const order: string[] = [];
const MAX_SEEN = 300;

function remember(id: string) {
  if (seen.has(id)) return false;
  seen.add(id);
  order.push(id);
  if (order.length > MAX_SEEN) {
    const old = order.shift();
    if (old) seen.delete(old);
  }
  return true;
}

export function alertAlreadySeen(id: string) {
  return seen.has(id);
}

export function clearAlertCache() {
  seen.clear();
  order.length = 0;
}

/** Unlock the Chavez Banco sound on first user interaction. */
export function primeAlertAudio() {
  primeNotificationSound();
}

/** Play the Chavez Banco notification sound (WAV). */
export function playAlertSound() {
  playNotificationSound();
}

export function notificationPromptDismissed() {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissNotificationPrompt() {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // ignore
  }
}

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

/** Show a Chavez Banco system/PWA notification. */
export async function showDeviceAlert(title: string, body: string, url = "/notifications") {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const options: NotificationOptions & { vibrate?: number[]; renotify?: boolean } = {
    body,
    icon: "/icon-192.png",
    badge: "/favicon-32.png",
    tag: `chavez-${Date.now()}`,
    vibrate: [200, 100, 250],
    data: { url },
  };

  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(title, options);
      return;
    }
  } catch {
    // fall through
  }

  try {
    new Notification(title, options);
  } catch {
    // ignore
  }
}

/**
 * Full Chavez Banco alert: dedupe -> WAV sound -> system notification.
 * Returns false when the event was already handled.
 */
export async function fireAlert(opts: { id: string; title?: string; body: string; url?: string }) {
  if (!remember(opts.id)) return false;

  playNotificationSound();
  await showDeviceAlert("Chavez Banco", opts.body, opts.url ?? "/notifications");

  return true;
}
