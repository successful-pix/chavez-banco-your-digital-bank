// Chavez Banco notification sound.
// Single source of truth for playing /chavez-bank-notification.wav.
// No synthetic WebAudio ringing is used anywhere in the app.

const SOUND_URL = "/chavez-bank-notification.wav";

let audio: HTMLAudioElement | null = null;
let unlocked = false;
let pending = false;
let listenersBound = false;
let playingUntil = 0;

function getAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audio) {
    audio = new Audio(SOUND_URL);
    audio.preload = "auto";
    audio.volume = 0.9;
  }
  return audio;
}

/**
 * Unlock audio playback on the user's first interaction.
 * Safe to call many times — listeners are registered only once.
 */
export function primeNotificationSound() {
  if (typeof window === "undefined" || unlocked || listenersBound) return;
  listenersBound = true;

  const unlock = async () => {
    const player = getAudio();
    if (!player) return;
    try {
      const prev = player.volume;
      player.volume = 0;
      player.currentTime = 0;
      await player.play();
      player.pause();
      player.currentTime = 0;
      player.volume = prev || 0.9;
      unlocked = true;
      cleanup();
      if (pending) {
        pending = false;
        playNotificationSound();
      }
    } catch {
      // Keep listeners bound; a later gesture may unlock.
      listenersBound = true;
    }
  };

  const cleanup = () => {
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("touchstart", unlock);
    window.removeEventListener("keydown", unlock);
  };

  window.addEventListener("pointerdown", unlock);
  window.addEventListener("touchstart", unlock);
  window.addEventListener("keydown", unlock);
}

/**
 * Play the Chavez Banco notification sound once.
 * Never throws; silently degrades when autoplay is blocked.
 */
export function playNotificationSound() {
  const player = getAudio();
  if (!player) return;

  // Avoid overlapping copies of the same sound.
  const now = Date.now();
  if (now < playingUntil) return;
  playingUntil = now + 900;

  if (!unlocked) {
    pending = true;
    primeNotificationSound();
  }

  try {
    player.pause();
    player.currentTime = 0;
    const p = player.play();
    if (p) {
      p.then(() => {
        unlocked = true;
      }).catch(() => {
        pending = true;
        unlocked = false;
        listenersBound = false;
        primeNotificationSound();
      });
    }
  } catch {
    // ignore
  }
}

export function isAudioUnlocked() {
  return unlocked;
}
