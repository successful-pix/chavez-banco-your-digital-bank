// Chavez Banco notification sound.
// Plays the custom WAV file from /public.
//
// File location:
// public/chavez-bank-notification.wav

let audio: HTMLAudioElement | null = null;
let unlocked = false;
let pending = false;

function getAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;

  if (!audio) {
    audio = new Audio("/chavez-bank-notification.wav");
    audio.preload = "auto";
    audio.volume = 0.85;
  }

  return audio;
}

/**
 * Prepare/unlock audio after the user's first interaction.
 */
export function primeNotificationSound() {
  if (typeof window === "undefined" || unlocked) return;

  const unlock = async () => {
    const player = getAudio();

    if (!player) return;

    try {
      player.volume = 0;
      player.currentTime = 0;

      await player.play();

      player.pause();
      player.currentTime = 0;
      player.volume = 0.85;

      unlocked = true;

      if (pending) {
        pending = false;
        playNotificationSound();
      }
    } catch {
      unlocked = false;
    }
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
 */
export function playNotificationSound() {
  const player = getAudio();

  if (!player) return;

  if (!unlocked) {
    pending = true;
    primeNotificationSound();
    return;
  }

  try {
    player.pause();
    player.currentTime = 0;
    player.volume = 0.85;

    const promise = player.play();

    promise.catch(() => {
      pending = true;
      unlocked = false;
      primeNotificationSound();
    });
  } catch {
    pending = true;
    unlocked = false;
    primeNotificationSound();
  }
}

/**
 * Play the notification sound multiple times if needed.
 */
export function playNotificationSoundMultiple(
  count = 1
) {
  const total = Math.max(1, Math.min(count, 3));

  let current = 0;

  const play = () => {
    current += 1;

    playNotificationSound();

    if (current < total) {
      window.setTimeout(play, 1200);
    }
  };

  play();
}
