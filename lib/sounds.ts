import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

let ringtone: AudioPlayer | null = null;
let message: AudioPlayer | null = null;
let notification: AudioPlayer | null = null;
let callEnd: AudioPlayer | null = null;
let configured = false;
let ringing = false;

async function configure() {
  if (configured) return;
  configured = true;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
      allowsRecording: false,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    });
  } catch {
    // Audio is an enhancement; ignore unavailable sessions.
  }
}

function player(
  source: number,
  volume: number,
  loop = false,
): AudioPlayer | null {
  try {
    const created = createAudioPlayer(source);
    created.volume = volume;
    created.loop = loop;
    return created;
  } catch {
    return null;
  }
}

export async function startRingtone() {
  if (ringing) return;
  ringing = true;
  await configure();
  try {
    if (!ringtone) {
      ringtone = player(require('../assets/sounds/ringtone.wav'), 0.85, true);
    }
    if (!ringtone) return;
    ringtone.loop = true;
    ringtone.volume = 0.85;
    await ringtone.seekTo(0);
    ringtone.play();
  } catch {
    // Browsers can block audio before a user gesture; ignore.
  }
}

export function stopRingtone() {
  ringing = false;
  try {
    ringtone?.pause();
    void ringtone?.seekTo(0);
  } catch {
    // Player may already be released.
  }
}

export async function playMessageSound() {
  await configure();
  try {
    if (!message) message = player(require('../assets/sounds/message.wav'), 0.55);
    if (!message) return;
    await message.seekTo(0);
    message.play();
  } catch {
    // Ignore autoplay restrictions.
  }
}

export async function playNotificationSound() {
  await configure();
  try {
    if (!notification) {
      notification = player(require('../assets/sounds/notification.wav'), 0.7);
    }
    if (!notification) return;
    await notification.seekTo(0);
    notification.play();
  } catch {
    // Ignore autoplay restrictions.
  }
}

export async function playCallEndSound() {
  await configure();
  try {
    if (!callEnd) callEnd = player(require('../assets/sounds/call-end.wav'), 0.6);
    if (!callEnd) return;
    await callEnd.seekTo(0);
    callEnd.play();
  } catch {
    // Ignore autoplay restrictions.
  }
}
