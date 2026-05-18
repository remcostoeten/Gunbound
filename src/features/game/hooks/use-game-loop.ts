"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/features/game/store/game-store";

type FrameHandler = {
  (): void;
};

export function useGameLoop(onFrame: FrameHandler): void {
  const drawRef = useRef(onFrame);
  drawRef.current = onFrame;
  useEffect(startLoop, []);

  function startLoop(): FrameHandler {
    let frameId = 0;
    let previousTime = 0;
    let accumulator = 0;
    const step = 1 / 60;

    function frame(time: number): void {
      if (previousTime === 0) {
        previousTime = time;
      }

      const delta = Math.min(0.05, (time - previousTime) / 1000);
      previousTime = time;
      accumulator += delta;

      while (accumulator >= step) {
        useGameStore.getState().stepSimulation(step);
        accumulator -= step;
      }

      drawRef.current();
      frameId = window.requestAnimationFrame(frame);
    }

    frameId = window.requestAnimationFrame(frame);

    return function cleanup(): void {
      window.cancelAnimationFrame(frameId);
    };
  }
}
