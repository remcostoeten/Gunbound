"use client";

import { useEffect, useRef, useState } from "react";
import { useFitToTarget } from "../hooks/use-fit-to-target";
import { useDustVariants } from "../hooks/use-dust-variants";
import { useIntroSequence } from "../hooks/use-intro-sequence";
import { playIntroMusic } from "../audio/play-music";
import { IntroMascot } from "./intro-mascot";
import { IntroLogoGroup } from "./intro-logo-group";
import type { IntroExitMode } from "../types";

type Props = {
  onComplete?: () => void;
  autoFit?: boolean;
  targetWidth?: number;
  targetHeight?: number;
  replayKey?: number;
};

export function IntroRoot({
  onComplete,
  autoFit = true,
  targetWidth = 760,
  targetHeight = 380,
  replayKey = 0,
}: Props) {
  const [exitMode, setExitMode] = useState<IntroExitMode>("pull");
  const [introArmed] = useState(true);
  const musicRef = useRef<ReturnType<typeof playIntroMusic> | null>(null);
  const fit = useFitToTarget(autoFit, targetWidth, targetHeight);
  const dustVariants = useDustVariants(replayKey);
  const { started, landed, shake, flash, mascotIn, exiting, fading } = useIntroSequence({
    exitMode,
    enabled: introArmed,
    replayKey,
    onComplete,
  });

  const pulling = exiting && exitMode === "pull";

  useEffect(() => {
    musicRef.current?.stop();
    musicRef.current = playIntroMusic();
    return () => {
      musicRef.current?.stop();
      musicRef.current = null;
    };
  }, [replayKey]);

  return (
    <div
      className={`intro-root ${fading ? "intro-fading" : ""}`}
      data-shake={shake > 0 ? "1" : "0"}
      data-flash={flash > 0 ? "1" : "0"}
    >
      <div className="intro-flash" />
      <div className="intro-vignette" />
      <div className="intro-glow" />

      <div className={`intro-stage ${pulling ? "stage-exit" : ""}`}>
        <IntroMascot mascotIn={mascotIn} pulling={pulling} scale={fit.scale} />
        <IntroLogoGroup
          pulled={pulling}
          fit={fit}
          started={started}
          landed={landed}
          dustVariants={dustVariants}
        />
      </div>
    </div>
  );
}
