import type { MapType, TerrainTheme } from "@/features/game/types/shared";

export type MapPresentation = {
  value: MapType;
  label: string;
  description: string;
  theme: TerrainTheme;
};

const mapPresentationList: MapPresentation[] = [
  {
    value: "rolling",
    label: "Rolling Meadow",
    description: "Balanced hills with steady firing lanes and soft cover.",
    theme: "meadow"
  },
  {
    value: "canyon",
    label: "Sunset Canyon",
    description: "Wide basin with steep side walls and punishing low ground.",
    theme: "sunset"
  },
  {
    value: "crater",
    label: "Moon Crater",
    description: "Central bowl that drags both players into close artillery exchanges.",
    theme: "midnight"
  },
  {
    value: "ridge",
    label: "Ridge Line",
    description: "Jagged peaks and shelves that reward angle control.",
    theme: "sunset"
  }
];

export const mapPresentationOptions = mapPresentationList;

export function getMapPresentation(mapType: MapType): MapPresentation {
  let index = 0;

  while (index < mapPresentationList.length) {
    if (mapPresentationList[index].value === mapType) {
      return mapPresentationList[index];
    }
    index += 1;
  }

  return mapPresentationList[0];
}
