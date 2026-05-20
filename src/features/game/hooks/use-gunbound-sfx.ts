"use client";

import { useEffect, useRef } from "react";
import { createAudioEventTracker, deriveAudioEvents } from "@/features/game/engine/audio-events";
import { useGameStore } from "@/features/game/store/game-store";
import type { AudioCue, AudioEventTracker } from "@/features/game/engine/audio-events";
import type { GameState } from "@/features/game/types/state";
import { getAudioVolume, subscribeAudioSettings } from "@/lib/audio-settings";

type AudioPool = {
  context: AudioContext | null;
  gain: GainNode | null;
  musicGain: GainNode | null;
  bgMusic: HTMLAudioElement | null;
  sounds: Record<string, HTMLAudioElement>;
};

const BASE_SFX_GAIN = 0.14;
const BASE_MUSIC_GAIN = 0.08;
const BASE_BG_MUSIC_VOLUME = 0.12;

const SOUND_PATHS: Record<string, string> = {
  "match-intro": "/sounds/anos-de-gunbound.mp3",
  "super-shot": "/sounds/super-shot.mp3",
  great: "/sounds/great.mp3",
  "muy-bien": "/sounds/fantastic.mp3",
  adios: "/sounds/bye-m.mp3",
  bien: "/sounds/turn.mp3",
  hola: "/sounds/hi-m.mp3",
  gracias: "/sounds/thanks-m.mp3",
  ayuda: "/sounds/help-m.mp3",
  "dios-mio": "/sounds/omg-m.mp3",
  noobie: "/sounds/noob-m.mp3",
  "critical-hit": "/sounds/critical-hit.mp3",
  "critical-oh-yes": "/sounds/critical-oh-yes.mp3",
  "critical-yes": "/sounds/critical-yes.mp3",
  gold: "/sounds/gold.mp3",
  "level-up": "/sounds/level-up.mp3",
  lose: "/sounds/lose.mp3",
  win: "/sounds/win.mp3",
  unbelievable: "/sounds/unbelievable.mp3",
  "bye-f": "/sounds/bye-f.mp3",
  "help-f": "/sounds/help-f.mp3",
  "hi-f": "/sounds/hi-f.mp3",
  "nice-shot-f": "/sounds/nice-shot-f.mp3",
  "nice-shot-m": "/sounds/nice-shot-m.mp3",
  "nice-try-f": "/sounds/nice-try-f.mp3",
  "nice-try-m": "/sounds/nice-try-m.mp3",
  "noob-f": "/sounds/noob-f.mp3",
  "omg-f": "/sounds/omg-f.mp3",
  "sorry-f": "/sounds/sorry-f.mp3",
  "sorry-m": "/sounds/sorry-m.mp3",
  "thanks-f": "/sounds/thanks-f.mp3",
  "v-nice-shot-f": "/sounds/v-nice-shot-f.mp3",
  "v-nice-shot-m": "/sounds/v-nice-shot-m.mp3",
};

export const lobbyMatchStartAudioEvent = "gunbound:lobby-match-start";
export const lobbyAudioBlockedEvent = "gunbound:lobby-audio-blocked";
export const lobbyAudioStartedEvent = "gunbound:lobby-audio-started";

export function useGunboundSfx(): void {
  const poolRef = useRef<AudioPool>({
    context: null,
    gain: null,
    musicGain: null,
    bgMusic: null,
    sounds: {},
  });
  const prevSceneRef = useRef<string>("");
  const lobbyStartedRef = useRef(false);
  const lobbyMatchStartCueAtRef = useRef(0);
  const trackerRef = useRef<AudioEventTracker>(createAudioEventTracker());
  const windAmbientNodeRef = useRef<{ source: AudioBufferSourceNode | null; gain: GainNode | null } | null>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    function unlockAudio(): void {
      ensureAudio(poolRef.current);
      initSounds(poolRef.current);
      resumeLobbyMusicIfNeeded(poolRef.current);
    }
    window.addEventListener("pointerdown", unlockAudio, { passive: true });
    window.addEventListener("keydown", unlockAudio);
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  useEffect(function bindAudioSettings(): () => void {
    function syncAudioVolumes(): void {
      applyAudioVolumes(poolRef.current);
    }

    return subscribeAudioSettings(syncAudioVolumes);
  }, []);

  useEffect(function startLobbyMusicImmediately(): void {
    initSounds(poolRef.current);
    startLobbyMusic(poolRef.current);
    lobbyStartedRef.current = true;
  }, []);

  useEffect(() => {
    function frame(): void {
      syncAudioState(poolRef.current, prevSceneRef, lobbyStartedRef, lobbyMatchStartCueAtRef, trackerRef, windAmbientNodeRef);
      rafRef.current = window.requestAnimationFrame(frame);
    }
    rafRef.current = window.requestAnimationFrame(frame);
    return () => {
      window.cancelAnimationFrame(rafRef.current);
      stopMusic(poolRef.current);
      stopWindAmbient(windAmbientNodeRef);
    };
  }, []);

  useEffect(function bindLobbyMatchStartCue(): () => void {
    function playLobbyMatchStartCue(): void {
      ensureAudio(poolRef.current);
      initSounds(poolRef.current);
      lobbyMatchStartCueAtRef.current = window.performance.now();
      playSfx(poolRef.current, "match-intro");
    }

    window.addEventListener(lobbyMatchStartAudioEvent, playLobbyMatchStartCue);
    return function cleanupLobbyMatchStartCue(): void {
      window.removeEventListener(lobbyMatchStartAudioEvent, playLobbyMatchStartCue);
    };
  }, []);

  function initSounds(pool: AudioPool): void {
    if (Object.keys(pool.sounds).length > 0) return;
    for (const [key, path] of Object.entries(SOUND_PATHS)) {
      const audio = new Audio(path);
      audio.preload = "auto";
      pool.sounds[key] = audio;
    }
  }
}

function ensureAudio(pool: AudioPool): void {
  if (pool.context !== null && pool.gain !== null) {
    if (pool.context.state === "suspended") {
      void pool.context.resume();
    }
    applyAudioVolumes(pool);
    return;
  }

  const context = new window.AudioContext();
  const gain = context.createGain();
  gain.gain.value = BASE_SFX_GAIN * getAudioVolume("sfx");
  gain.connect(context.destination);

  const musicGain = context.createGain();
  musicGain.gain.value = BASE_MUSIC_GAIN * getAudioVolume("music");
  musicGain.connect(context.destination);

  pool.context = context;
  pool.gain = gain;
  pool.musicGain = musicGain;
}

function stopMusic(pool: AudioPool): void {
  if (pool.bgMusic) {
    pool.bgMusic.pause();
    pool.bgMusic.currentTime = 0;
  }
}

function startLobbyMusic(pool: AudioPool): void {
  if (pool.bgMusic !== null && !pool.bgMusic.paused) {
    return;
  }

  if (pool.bgMusic) {
    pool.bgMusic.pause();
    pool.bgMusic = null;
  }
  const audio = new Audio("/sounds/lounge.mp3");
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = BASE_BG_MUSIC_VOLUME * getAudioVolume("music");
  void audio
    .play()
    .then(function handleLobbyMusicStarted(): void {
      window.dispatchEvent(new Event(lobbyAudioStartedEvent));
    })
    .catch(function handleLobbyMusicBlocked(): void {
      window.dispatchEvent(new Event(lobbyAudioBlockedEvent));
    });
  pool.bgMusic = audio;
}

function resumeLobbyMusicIfNeeded(pool: AudioPool): void {
  if (useGameStore.getState().scene !== "start") {
    return;
  }

  if (pool.bgMusic !== null && !pool.bgMusic.paused) {
    return;
  }

  startLobbyMusic(pool);
}

function playSfx(pool: AudioPool, name: string): void {
  if (!pool.sounds[name]) return;
  const clone = pool.sounds[name].cloneNode() as HTMLAudioElement;
  clone.volume = getSfxVolume(name) * getAudioVolume("sfx");
  clone.play().catch(() => {});
}

function getSfxVolume(name: string): number {
  if (name === "super-shot") return 0.3;
  if (name === "match-intro") return 0.22;
  return 0.25;
}

function syncAudioState(
  pool: AudioPool,
  prevSceneRef: React.MutableRefObject<string>,
  lobbyStartedRef: React.MutableRefObject<boolean>,
  lobbyMatchStartCueAtRef: React.MutableRefObject<number>,
  trackerRef: React.MutableRefObject<AudioEventTracker>,
  windAmbientNodeRef: React.MutableRefObject<{ source: AudioBufferSourceNode | null; gain: GainNode | null } | null>
): void {
  const state = useGameStore.getState();
  const context = pool.context;
  const gain = pool.gain;

  if (context === null || gain === null) return;

  applyAudioVolumes(pool);

  routeSceneState(pool, state.scene, prevSceneRef, lobbyStartedRef, lobbyMatchStartCueAtRef, windAmbientNodeRef, context, gain);

  if (state.scene !== "playing") {
    prevSceneRef.current = state.scene;
    return;
  }

  updateWindAmbient(state.wind.x, windAmbientNodeRef);
  const derived = deriveAudioEvents(state, trackerRef.current);
  trackerRef.current = derived.tracker;
  routeAudioCues(pool, context, gain, windAmbientNodeRef, derived.cues);

  prevSceneRef.current = state.scene;
}

function routeSceneState(
  pool: AudioPool,
  scene: GameState["scene"],
  prevSceneRef: React.MutableRefObject<string>,
  lobbyStartedRef: React.MutableRefObject<boolean>,
  lobbyMatchStartCueAtRef: React.MutableRefObject<number>,
  windAmbientNodeRef: React.MutableRefObject<{ source: AudioBufferSourceNode | null; gain: GainNode | null } | null>,
  context: AudioContext,
  gain: GainNode
): void {
  if (scene === "playing" && prevSceneRef.current === "start") {
    stopMusic(pool);
    if (window.performance.now() - lobbyMatchStartCueAtRef.current > 2500) {
      playSfx(pool, "super-shot");
    }
    startWindAmbient(context, gain, windAmbientNodeRef);
  }

  if (scene === "end" && prevSceneRef.current !== "end") {
    playSfx(pool, "adios");
    stopWindAmbient(windAmbientNodeRef);
  }

  if (scene === "start" && prevSceneRef.current === "end") {
    startLobbyMusic(pool);
    lobbyStartedRef.current = true;
  }
}

function routeAudioCues(
  pool: AudioPool,
  context: AudioContext,
  gain: GainNode,
  windAmbientNodeRef: React.MutableRefObject<{ source: AudioBufferSourceNode | null; gain: GainNode | null } | null>,
  cues: AudioCue[]
): void {
  let index = 0;
  while (index < cues.length) {
    const cue = cues[index];
    if (cue.kind === "scene-playing-start") {
      startWindAmbient(context, gain, windAmbientNodeRef);
    }
    if (cue.kind === "scene-ended") {
      stopWindAmbient(windAmbientNodeRef);
    }
    if (cue.kind === "wind-intensity-up") {
      playWindGust(context, gain, cue.bucket);
    }
    if (cue.kind === "low-health") {
      playLowHealthAlarm(context, gain, cue.isCurrentTurn);
    }
    if (cue.kind === "shot-fire") {
      playShotFire(context, gain, cue.isSecondary, cue.mobileType, cue.power);
    }
    if (cue.kind === "ricochet") {
      playRicochet(context, gain);
    }
    if (cue.kind === "explosion-hit") {
      playExplosion(context, gain, cue.radius);
      playSfx(pool, "great");
    }
    if (cue.kind === "explosion-terrain") {
      playTerrainThud(context, gain, cue.radius);
    }
    if (cue.kind === "turn-cue") {
      playTurnCue(context, gain, cue.turn);
      playSfx(pool, "bien");
    }
    if (cue.kind === "charge-start") {
      playChargeStart(context, gain, cue.power);
    }
    if (cue.kind === "charge-release") {
      playChargeRelease(context, gain, cue.power);
    }
    if (cue.kind === "weapon-switch") {
      playWeaponSwitch(context, gain);
    }
    if (cue.kind === "history-move") {
      playMovementTread(context, gain);
    }
    if (cue.kind === "history-hit") {
      playImpactAlarm(context, gain);
      playSfx(pool, "dios-mio");
    }
    if (cue.kind === "history-bonus") {
      playSupplyPickup(context, gain);
      playSfx(pool, "muy-bien");
    }
    if (cue.kind === "history-round-end") {
      playSfx(pool, "adios");
    }
    index += 1;
  }
}

function applyAudioVolumes(pool: AudioPool): void {
  if (pool.gain !== null) {
    pool.gain.gain.value = BASE_SFX_GAIN * getAudioVolume("sfx");
  }

  if (pool.musicGain !== null) {
    pool.musicGain.gain.value = BASE_MUSIC_GAIN * getAudioVolume("music");
  }

  if (pool.bgMusic !== null) {
    pool.bgMusic.volume = BASE_BG_MUSIC_VOLUME * getAudioVolume("music");
  }
}

function updateWindAmbient(horizontalWind: number, windAmbientNodeRef: React.MutableRefObject<{ source: AudioBufferSourceNode | null; gain: GainNode | null } | null>): void {
  const node = windAmbientNodeRef.current;
  if (node === null || node.gain === null || node.source === null) {
    return;
  }

  const now = node.source.context.currentTime;
  const intensity = Math.min(1, Math.abs(horizontalWind) / 0.75);
  node.gain.gain.cancelScheduledValues(now);
  node.gain.gain.linearRampToValueAtTime(0.025 + intensity * 0.035, now + 0.18);
}

function startWindAmbient(
  context: AudioContext,
  gain: GainNode,
  windAmbientNodeRef: React.MutableRefObject<{ source: AudioBufferSourceNode | null; gain: GainNode | null } | null>
): void {
  if (windAmbientNodeRef.current !== null) return;

  const bufferSize = Math.ceil(context.sampleRate * 2);
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const channel = buffer.getChannelData(0);
  let i = 0;
  while (i < bufferSize) {
    channel[i] = (Math.random() * 2 - 1) * (0.3 + Math.sin(i * 0.008) * 0.07 + Math.sin(i * 0.003) * 0.04);
    i += 1;
  }

  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(380, context.currentTime);
  filter.Q.setValueAtTime(0.5, context.currentTime);

  const envelope = context.createGain();
  envelope.gain.setValueAtTime(0, context.currentTime);
  envelope.gain.linearRampToValueAtTime(0.035, context.currentTime + 1.5);

  source.connect(filter);
  filter.connect(envelope);
  envelope.connect(gain);
  source.start();

  windAmbientNodeRef.current = { source, gain: envelope };
}

function stopWindAmbient(windAmbientNodeRef: React.MutableRefObject<{ source: AudioBufferSourceNode | null; gain: GainNode | null } | null>): void {
  if (windAmbientNodeRef.current === null) return;
  const now = (windAmbientNodeRef.current.source?.context.currentTime) || 0;
  if (windAmbientNodeRef.current.gain) {
    windAmbientNodeRef.current.gain.gain.linearRampToValueAtTime(0, now + 0.5);
  }
  if (windAmbientNodeRef.current.source) {
    try { windAmbientNodeRef.current.source.stop(now + 0.6); } catch {}
  }
  windAmbientNodeRef.current = null;
}

function playChargeStart(context: AudioContext, gain: GainNode, power: number): void {
  const peak = 320 + power * 400;
  playOscillatorSweep(context, gain, 320, peak, 0.16 + power * 0.06, "square", 0.18 + power * 0.06);
}

function playChargeRelease(context: AudioContext, gain: GainNode, power: number): void {
  const startFreq = 540 + power * 300;
  playOscillatorSweep(context, gain, startFreq, 420 + power * 200, 0.08, "triangle", 0.12 + power * 0.04);
  if (power > 0.7) {
    playNoiseBurst(context, gain, 0.06, 0.06);
  }
}

function playShotFire(context: AudioContext, gain: GainNode, isSecondary: boolean, mobileType: string, power: number): void {
  const powerScale = 0.7 + power * 0.3;
  if (mobileType === "armor" || mobileType === "turtle") {
    playOscillatorSweep(context, gain, 60, 35, 0.16, "sine", 0.18 * powerScale);
    playOscillatorSweep(context, gain, isSecondary ? 200 : 280, isSecondary ? 60 : 90, 0.14, "sawtooth", 0.22 * powerScale);
    playNoiseBurst(context, gain, 0.1, 0.14 * powerScale);
  } else if (mobileType === "snow" || mobileType === "sate") {
    playOscillatorSweep(context, gain, 70, 42, 0.18, "triangle", 0.17 * powerScale);
    playOscillatorSweep(context, gain, isSecondary ? 190 : 250, isSecondary ? 72 : 100, 0.16, "sawtooth", 0.2 * powerScale);
    playNoiseBurst(context, gain, 0.09, 0.12 * powerScale);
  } else if (mobileType === "aduko" || mobileType === "mage") {
    playOscillatorSweep(context, gain, 220, 110, 0.08, "triangle", 0.14 * powerScale);
    playOscillatorSweep(context, gain, isSecondary ? 680 : 560, isSecondary ? 180 : 240, 0.18, "square", 0.2 * powerScale);
    playNoiseBurst(context, gain, 0.04, 0.06 * powerScale);
  } else if (mobileType === "dragon" || mobileType === "trico" || mobileType === "nak" || mobileType === "frog") {
    playOscillatorSweep(context, gain, 160, 92, 0.1, "triangle", 0.12 * powerScale);
    playOscillatorSweep(context, gain, isSecondary ? 420 : 520, isSecondary ? 130 : 180, 0.14, "square", 0.18 * powerScale);
    playNoiseBurst(context, gain, 0.05, 0.08 * powerScale);
  } else {
    playOscillatorSweep(context, gain, 110, 60, 0.1, "sine", 0.12 * powerScale);
    playOscillatorSweep(context, gain, isSecondary ? 350 : 480, isSecondary ? 100 : 140, 0.12, "square", 0.18 * powerScale);
    playNoiseBurst(context, gain, 0.06, 0.1 * powerScale);
  }
}

function playExplosion(context: AudioContext, gain: GainNode, radius: number): void {
  playOscillatorSweep(context, gain, 55, 22, 0.35, "sine", 0.32);
  playNoiseBurst(context, gain, 0.28, 0.28);
  playOscillatorSweep(context, gain, 180 + radius * 0.5, 45, 0.32, "triangle", 0.2);
}

function playTerrainThud(context: AudioContext, gain: GainNode, radius: number): void {
  playOscillatorSweep(context, gain, 50, 30, 0.12, "sine", 0.1);
  playNoiseBurst(context, gain, 0.08, 0.06);
}

function playTurnCue(context: AudioContext, gain: GainNode, turn: 1 | 2): void {
  const base = turn === 1 ? 520 : 460;
  playTone(context, gain, base, 0.08, "triangle", 0.12, 0);
  playTone(context, gain, base * 1.22, 0.11, "triangle", 0.1, 0.09);
}

function playMovementTread(context: AudioContext, gain: GainNode): void {
  playOscillatorSweep(context, gain, 80, 55, 0.12, "sine", 0.1);
  playNoiseBurst(context, gain, 0.08, 0.04);
}

function playRicochet(context: AudioContext, gain: GainNode): void {
  playTone(context, gain, 2200, 0.06, "sine", 0.1, 0);
  playTone(context, gain, 1800, 0.08, "triangle", 0.06, 0.03);
  playNoiseBurst(context, gain, 0.04, 0.04);
}

function playWeaponSwitch(context: AudioContext, gain: GainNode): void {
  playTone(context, gain, 800, 0.03, "square", 0.06, 0);
  playTone(context, gain, 1100, 0.04, "square", 0.05, 0.04);
}

function playImpactAlarm(context: AudioContext, gain: GainNode): void {
  playOscillatorSweep(context, gain, 280, 120, 0.1, "sawtooth", 0.12);
  playTone(context, gain, 190, 0.07, "sawtooth", 0.08, 0);
  playTone(context, gain, 146, 0.09, "triangle", 0.06, 0.06);
}

function playSupplyPickup(context: AudioContext, gain: GainNode): void {
  playTone(context, gain, 660, 0.08, "triangle", 0.08, 0);
  playTone(context, gain, 880, 0.12, "triangle", 0.09, 0.07);
}

function playWindGust(context: AudioContext, gain: GainNode, intensity: number): void {
  playNoiseBurst(context, gain, 0.1 + intensity * 0.03, 0.04 + intensity * 0.02);
  playOscillatorSweep(context, gain, 280, 180 - intensity * 16, 0.14, "triangle", 0.04 + intensity * 0.015);
}

function playLowHealthAlarm(context: AudioContext, gain: GainNode, isCurrentTurn: boolean): void {
  playTone(context, gain, isCurrentTurn ? 340 : 300, 0.09, "square", 0.06, 0);
  playTone(context, gain, isCurrentTurn ? 270 : 240, 0.1, "square", 0.05, 0.11);
}

function playTone(
  context: AudioContext,
  gain: GainNode,
  frequency: number,
  duration: number,
  type: OscillatorType,
  volume: number,
  delay: number
): void {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  const start = context.currentTime + delay;
  const end = start + duration;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.linearRampToValueAtTime(volume, start + 0.01);
  envelope.gain.exponentialRampToValueAtTime(0.0001, end);
  oscillator.connect(envelope);
  envelope.connect(gain);
  oscillator.start(start);
  oscillator.stop(end + 0.02);
}

function playOscillatorSweep(
  context: AudioContext,
  gain: GainNode,
  startFrequency: number,
  endFrequency: number,
  duration: number,
  type: OscillatorType,
  volume: number
): void {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  const start = context.currentTime;
  const end = start + duration;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(startFrequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, endFrequency), end);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.linearRampToValueAtTime(volume, start + 0.01);
  envelope.gain.exponentialRampToValueAtTime(0.0001, end);
  oscillator.connect(envelope);
  envelope.connect(gain);
  oscillator.start(start);
  oscillator.stop(end + 0.02);
}

function playNoiseBurst(context: AudioContext, gain: GainNode, duration: number, volume: number): void {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
  const channel = buffer.getChannelData(0);
  let index = 0;
  while (index < channel.length) {
    channel[index] = (Math.random() * 2 - 1) * (1 - index / channel.length);
    index += 1;
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const envelope = context.createGain();
  const start = context.currentTime;
  const end = start + duration;

  source.buffer = buffer;
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(900, start);
  envelope.gain.setValueAtTime(volume, start);
  envelope.gain.exponentialRampToValueAtTime(0.0001, end);
  source.connect(filter);
  filter.connect(envelope);
  envelope.connect(gain);
  source.start(start);
  source.stop(end + 0.02);
}
