import type { BattleItemType } from "@/features/game/types/shared";

export type BattleItemInventory = Record<BattleItemType, number>;

export const battleItemTypes: readonly BattleItemType[] = ["power", "bunge"];

const itemDelay: Record<BattleItemType, number> = {
  power: 150,
  bunge: 80
};

export function createBattleItemInventory(): BattleItemInventory {
  return {
    power: 1,
    bunge: 1
  };
}

export function createBattleItemInventories(): [BattleItemInventory, BattleItemInventory] {
  return [createBattleItemInventory(), createBattleItemInventory()];
}

export function getBattleItemDisplayName(item: BattleItemType): string {
  if (item === "power") {
    return "Power Up";
  }

  return "Bunge Shot";
}

export function getBattleItemDelay(item: BattleItemType | null): number {
  if (item === null) {
    return 0;
  }

  return itemDelay[item];
}

export function getNextAvailableBattleItem(inventory: BattleItemInventory, current: BattleItemType | null): BattleItemType | null {
  const availableItems = battleItemTypes.filter((item) => inventory[item] > 0);
  if (availableItems.length === 0) {
    return null;
  }

  if (current === null) {
    return availableItems[0];
  }

  const currentIndex = availableItems.indexOf(current);
  if (currentIndex === -1) {
    return availableItems[0];
  }

  return availableItems[currentIndex + 1] ?? null;
}

export function consumeBattleItem(inventory: BattleItemInventory, item: BattleItemType | null): BattleItemInventory {
  if (item === null) {
    return inventory;
  }

  return {
    ...inventory,
    [item]: Math.max(0, inventory[item] - 1)
  };
}

export function hasBattleItem(inventory: BattleItemInventory, item: BattleItemType | null): boolean {
  return item !== null && inventory[item] > 0;
}
