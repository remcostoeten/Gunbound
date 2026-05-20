import { useEffect, useState } from "react";
import { INTRO_LETTERS } from "../config/letters";
import { playThud } from "../audio/play-thud";
import { playEngine } from "../audio/play-engine";
import { playIntroMusic } from "../audio/play-music";
import type { IntroExitMode } from "../types";

type Params = {
  exitMode: IntroExitMode;
  replayKey: number;
  onComplete?: () => void;
};

// Phase durations tuned for a 4–6s total splash on top of letter landing.
const HOLD_AFTER_BUILD_MS = 1000; // logo holds ~1s after last letter settles
const SETTLE_AFTER_LANDING_MS = 520; // matches letterImpact settle in styles.css
const PULL_DURATION_MS = 900; // mascot yanks the logo across-screen
const FADE_DURATION_MS = 700; // root fades to the next screen
const FADE_ONLY_HOLD_BONUS_MS = 900; // give pure-fade mode a longer beat

export function useIntroSequence({ exitMode, replayKey, onComplete }: Params) {
  const [started, setStarted] = useState(false);
  const [landed, setLanded] = useState<Record<string, boolean>>({});
  const [shake, setShake] = useState(0);
  const [flash, setFlash] = useState(0);
  const [mascotIn, setMascotIn] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    setStarted(false);
    setLanded({});
    setMascotIn(false);
    setExiting(false);
    setFading(false);

    const music = playIntroMusic();

    const t0 = window.setTimeout(() => setStarted(true), 50);
    const t1 = window.setTimeout(() => setMascotIn(true), 1600);

    const timers: number[] = [];
    INTRO_LETTERS.forEach((l) => {
      timers.push(
        window.setTimeout(() => {
          setLanded((s) => ({ ...s, [l.alt]: true }));
          setShake((n) => n + 1);
          setFlash((n) => n + 1);
          playThud();
          window.setTimeout(() => setShake((n) => Math.max(0, n - 1)), 320);
          window.setTimeout(() => setFlash((n) => Math.max(0, n - 1)), 260);
        }, l.delay + 380)
      );
    });

    const lastLanding = Math.max(...INTRO_LETTERS.map((l) => l.delay + 380));
    const fullyBuiltAt = lastLanding + SETTLE_AFTER_LANDING_MS;
    const holdBonus = exitMode === "pull" ? 0 : FADE_ONLY_HOLD_BONUS_MS;
    const exitAt = fullyBuiltAt + HOLD_AFTER_BUILD_MS + holdBonus;
    // In pull mode: pull first, then fade. In fade mode: fade immediately.
    const fadeAt = exitMode === "pull" ? exitAt + PULL_DURATION_MS : exitAt;
    const doneAt = fadeAt + FADE_DURATION_MS;

    const tExit = window.setTimeout(() => {
      setExiting(true);
      if (exitMode === "pull") playEngine();
    }, exitAt);
    const tFade = window.setTimeout(() => setFading(true), fadeAt);
    const tDone = window.setTimeout(() => {
      onComplete?.();
    }, doneAt);

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(tExit);
      clearTimeout(tFade);
      clearTimeout(tDone);
      timers.forEach(clearTimeout);
      music.stop();
    };
  }, [exitMode, replayKey, onComplete]);

  return { started, landed, shake, flash, mascotIn, exiting, fading };
}
