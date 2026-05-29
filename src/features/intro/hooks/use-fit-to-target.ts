import { useEffect, useMemo, useState } from "react";
import { INTRO_LETTERS } from "../config/letters";

export function useFitToTarget(autoFit: boolean, targetWidth: number, targetHeight: number) {
  const [vp, setVp] = useState<{ w: number; h: number }>(() =>
    typeof window === "undefined"
      ? { w: targetWidth, h: targetHeight }
      : { w: window.innerWidth, h: window.innerHeight }
  );

  useEffect(() => {
    if (!autoFit) return;
    function onResize() {
      setVp({ w: window.innerWidth, h: window.innerHeight });
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [autoFit]);

  return useMemo(() => {
    if (!autoFit) return { scale: 1, offsetX: 0, offsetY: 0 };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    INTRO_LETTERS.forEach((l) => {
      const half = l.w / 2;
      minX = Math.min(minX, l.x - half);
      maxX = Math.max(maxX, l.x + half);
      minY = Math.min(minY, l.y - half);
      maxY = Math.max(maxY, l.y + half);
    });
    const w = maxX - minX;
    const h = maxY - minY;
    const effectiveW = Math.min(targetWidth, vp.w * 0.88);
    const effectiveH = Math.min(targetHeight, vp.h * 0.55);
    const scale = Math.min(effectiveW / w, effectiveH / h);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    return { scale, offsetX: -cx, offsetY: -cy };
  }, [autoFit, targetWidth, targetHeight, vp]);
}
