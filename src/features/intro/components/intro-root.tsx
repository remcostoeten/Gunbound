"use client";

import { useState } from "react";
import { useFitToTarget } from "../hooks/use-fit-to-target";
import { useDustVariants } from "../hooks/use-dust-variants";
import { useIntroSequence } from "../hooks/use-intro-sequence";
import { IntroMascot } from "./intro-mascot";
import { IntroLogoGroup } from "./intro-logo-group";
import { IntroExitToggle } from "./intro-exit-toggle";
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
  const fit = useFitToTarget(autoFit, targetWidth, targetHeight);
  const dustVariants = useDustVariants(replayKey);
  const { started, landed, shake, flash, mascotIn, exiting, fading } = useIntroSequence({
    exitMode,
    replayKey,
    onComplete,
  });

  const pulling = exiting && exitMode === "pull";

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
        <IntroMascot mascotIn={mascotIn} pulling={pulling} />
        <IntroLogoGroup
          pulled={pulling}
          fit={fit}
          started={started}
          landed={landed}
          dustVariants={dustVariants}
        />
      </div>

      <IntroExitToggle mode={exitMode} onChange={setExitMode} />
    </div>
  );
}
