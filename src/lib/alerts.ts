// Chavez Banco notification alerts.
// Plays the custom Chavez Banco notification sound and shows
// a system/PWA notification on supported devices.

let alertAudio: HTMLAudioElement | null = null;
let ringing = false;

const seen = new Set<string>();

/**
 * Prepare the Chavez Banco notification sound.
 *
 * The audio is created after the application loads so that
 * the browser can preload it. Playback still requires the
 * browser's normal user-gesture permission rules.
 */
function ensureAlertAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;

  if (!alertAudio) {
    alertAudio = new Audio("/chavez-bank-notification.wav");

    alertAudio.preload = "auto";
    alertAudio.volume = 0.55;
  }

  return alertAudio;
}

/**
 * Unlock audio after the user's first interaction.
 *
 * Browsers may block audio until the user interacts with
 * the page at least once.
 */
export function primeAlertAudio() {
  if (typeof window === "undefined") return;

  const audio = ensureAlertAudio();
  if (!audio) return;

  const unlock = () => {
    audio.load();

    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchstart", unlock);
  };

  window.addEventListener("pointerdown", unlock, {
    once: true,
  });

  window.addEventListener("keydown", unlock, {
    once: true,
  });

  window.addEventListener("touchstart", unlock, {
    once: true,
  });
}

/**
 * Play the Chavez Banco notification sound.
 *
 * `bursts` controls how many times the short sound plays.
 * Default is one clean notification chime.
 */
export function playLoudRing(bursts = 1) {
  if (typeof window === "undefined") return;

  if (ringing) return;

  const audio = ensureAlertAudio();

  if (!audio) return;

  ringing = true;

  let count = 0;

  const playOnce = () => {
    count++;

    try {
      audio.currentTime = 0;

      const promise = audio.play();

      if (promise) {
        promise.catch(() => {
          // Browser blocked autoplay.
          // The next user interaction can unlock it.
        });
      }
    } catch {
      // Ignore audio errors.
    }

    if (count < bursts) {
      window.setTimeout(playOnce, 750);
    } else {
      window.setTimeout(() => {
        ringing = false;
      }, 1200);
    }
  };

  playOnce();
}

/**
 * Ask for permission to show notifications.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (
    typeof window === "undefined" ||
    !("Notification" in window)
  ) {
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission === "denied") {
    return false;
  }

  try {
    return (
      (await Notification.requestPermission()) ===
      "granted"
    );
  } catch {
    return false;
  }
}

/**
 * Show a Chavez Banco notification on the device.
 */
export async function showDeviceAlert(
  title: string,
  body: string,
  url = "/notifications",
) {
  if (
    typeof window === "undefined" ||
    !("Notification" in window)
  ) {
    return;
  }

  if (Notification.permission !== "granted") {
    return;
  }

  const options: NotificationOptions & {
    vibrate?: number[];
    renotify?: boolean;
  } = {
    body,

    icon: "/icon-192.png",

    badge: "/favicon-32.png",

    tag: `chavez-${Date.now()}`,

    requireInteraction: true,

    vibrate: [200, 100, 250],

    data: {
      url,
    },
  };

  try {
    const registration =
      await navigator.serviceWorker?.getRegistration();

    if (registration) {
      await registration.showNotification(
        title,
        options,
      );

      return;
    }
  } catch {
    // Fall through to normal browser notification.
  }

  try {
    new Notification(title, options);
  } catch {
    // Ignore notification errors.
  }
}

/**
 * Full Chavez Banco alert:
 *
 * 1. Play the custom notification tone.
 * 2. Show the device notification.
 * 3. Prevent the same alert from firing repeatedly.
 */
export async function fireAlert(opts: {
  id: string;
  title?: string;
  body: string;
  url?: string;
}) {
  if (seen.has(opts.id)) {
    return false;
  }

  seen.add(opts.id);

  // One short professional bank-style chime.
  playLoudRing(1);

  await showDeviceAlert(
    opts.title ?? "Chavez Banco",
    opts.body,
    opts.url ?? "/notifications",
  );

  return true;
}

/**
 * Check whether an alert has already been shown.
 */
export function alertAlreadySeen(id: string) {
  return seen.has(id);
}
