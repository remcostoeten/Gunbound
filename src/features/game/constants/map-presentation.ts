import type { MapType, TerrainTheme } from "@/features/game/types/shared";

export type MapPresentation = {
  value: MapType;
  label: string;
  description: string;
  previewImage: string;
  theme: TerrainTheme;
};

const mapPresentationList: MapPresentation[] = [
  {
    value: "rolling",
    label: "Rolling Meadow",
    description: "Balanced hills with steady firing lanes and soft cover.",
    previewImage: "/maps/rolling-meadow.png",
    theme: "meadow"
  },
  {
    value: "canyon",
    label: "Sunset Canyon",
    description: "Wide basin with steep side walls and punishing low ground.",
    previewImage: "/maps/sunset-canyon.png",
    theme: "sunset"
  },
  {
    value: "crater",
    label: "Moon Crater",
    description: "Central bowl that drags both players into close artillery exchanges.",
    previewImage: "/maps/moon-crater.png",
    theme: "midnight"
  },
  {
    value: "ridge",
    label: "Ridge Line",
    description: "Jagged peaks and shelves that reward angle control.",
    previewImage: "/maps/ridge-line.png",
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

export function parseMapType(value: string | null | undefined, fallback: MapType = mapPresentationList[0].value): MapType {
  return mapPresentationList.find((option) => option.value === value)?.value ?? fallback;
}
