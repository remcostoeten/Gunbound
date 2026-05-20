import { useMemo } from "react";
import { INTRO_LETTERS } from "../config/letters";

export function useFitToTarget(autoFit: boolean, targetWidth: number, targetHeight: number) {
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
    const scale = Math.min(targetWidth / w, targetHeight / h);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    return { scale, offsetX: -cx, offsetY: -cy };
  }, [autoFit, targetWidth, targetHeight]);
}
