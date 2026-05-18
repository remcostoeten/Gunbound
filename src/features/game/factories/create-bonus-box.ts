import type { BonusBox } from "@/features/game/types/entities";
import type { BonusType } from "@/features/game/types/shared";

export function createBonusBox(id: string, type: BonusType, x: number, y: number = 76): BonusBox {
  return {
    id,
    type,
    position: {
      x,
      y
    },
    radius: 16,
    verticalVelocity: 0,
    landed: false
  };
}
