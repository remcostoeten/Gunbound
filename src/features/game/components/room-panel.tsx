"use client";

import { getMapPresentation } from "@/features/game/constants/map-presentation";
import { getMobilePresentation } from "@/features/game/constants/mobile-presentation";
import { normalizeSeed } from "@/features/game/engine/random";
import { getTerrainTheme } from "@/features/game/engine/terrain";
import { getMobileSpriteSource, shouldFlipMobileSprite } from "@/features/game/engine/mobile-sprites";
import type { MatchConfig } from "@/features/game/types/state";
import type { MobileType, PlayerAccent, PlayerTitle } from "@/features/game/types/shared";

export function RoomPanel(props: {
  formState: MatchConfig;
}): React.JSX.Element {
  const terrainTheme = getTerrainTheme(props.formState.mapType);
  const mapPresentation = getMapPresentation(props.formState.mapType);
  const mapSeed = props.formState.seedText || "gunbound-local";
  const seedVariant = normalizeSeed(mapSeed) % 1000;

  return (
    <div className="room-panel">
      <div className="room-panel-head">
        <span className="room-panel-title">Room Info</span>
        <span className="room-panel-badge">Hot Seat</span>
      </div>
      <div className="room-channel">
        <span className="room-channel-name">Channel 1 / Gunbound Local Room</span>
        <span className="room-channel-state">Waiting</span>
      </div>
      <div className="room-map-preview">
        <img
          className="room-map-preview-image"
          src={mapPresentation.previewImage}
          alt={mapPresentation.label + " map preview"}
        />
        <span className="room-map-preview-label">{mapPresentation.label}</span>
      </div>
      <div className="room-grid">
        <div className="room-row">
          <span className="room-key">Map</span>
          <span className="room-value">{mapPresentation.label}</span>
        </div>
        <div className="room-row">
          <span className="room-key">Mode</span>
          <span className="room-value">Tag Match</span>
        </div>
        <div className="room-row">
          <span className="room-key">Variant</span>
          <span className="room-value">{mapSeed} / #{String(seedVariant).padStart(3, "0")}</span>
        </div>
        <div className="room-row">
          <span className="room-key">Wind</span>
          <span className="room-value">Dynamic</span>
        </div>
        <div className="room-row">
          <span className="room-key">Terrain</span>
          <span className="room-value">{getTerrainThemeLabel(terrainTheme)} / Destructible</span>
        </div>
      </div>
      <div className="room-map-copy">{mapPresentation.description}</div>
      <div className="room-slots">
        {renderSlot(1, props.formState.playerOneName, props.formState.playerOneTitle, props.formState.playerOneAccent, props.formState.playerOneMobile)}
        {renderSlot(2, props.formState.playerTwoName, props.formState.playerTwoTitle, props.formState.playerTwoAccent, props.formState.playerTwoMobile)}
      </div>
    </div>
  );
}

function renderSlot(slot: 1 | 2, name: string, title: PlayerTitle, accent: PlayerAccent, mobileType: MobileType): React.JSX.Element {
  return (
    <div className={getRoomSlotClassName(slot)}>
      <span className="room-slot-index">{slot}</span>
      {renderSpriteThumb(mobileType, "room-slot-sprite")}
      <div className="room-slot-copy">
        <span className="room-slot-name">{name || (slot === 1 ? "Player 1" : "Player 2")}</span>
        <span className="room-slot-mobile">
          <img className="room-slot-title-badge" src={"/badges/badge-" + title.toLowerCase() + ".svg"} alt="" width={16} height={16} />
          {title} / {getRoomMobileLabel(mobileType)}
        </span>
      </div>
      <img className="room-slot-accent" src={"/badges/accent-" + accent + ".svg"} alt="" width={12} height={12} />
      <span className="room-slot-ready">Ready</span>
    </div>
  );
}

function getRoomSlotClassName(slot: 1 | 2): string {
  if (slot === 1) {
    return "room-slot player-one";
  }

  return "room-slot player-two";
}

function getRoomMobileLabel(mobileType: MobileType): string {
  return getMobilePresentation(mobileType).label + " Mobile";
}

function getTerrainThemeLabel(theme: ReturnType<typeof getTerrainTheme>): string {
  if (theme === "sunset") {
    return "Sunset";
  }

  if (theme === "midnight") {
    return "Midnight";
  }

  return "Meadow";
}

function renderSpriteThumb(mobileType: MobileType, className: string): React.JSX.Element {
  return (
    <div
      className={className}
      aria-label={getRoomMobileLabel(mobileType)}
      style={getRoomSpriteStyle(mobileType)}
    />
  );
}

function getRoomSpriteStyle(mobileType: MobileType): React.CSSProperties {
  const spriteSource = getMobileSpriteSource(mobileType);
  const needsFlip = shouldFlipMobileSprite(mobileType, 1);
  const scaleX = needsFlip ? -spriteSource.roomScale : spriteSource.roomScale;

  return {
    backgroundImage: 'url("' + spriteSource.path + '")',
    backgroundPosition: "0 0",
    backgroundRepeat: "no-repeat",
    backgroundSize: String(spriteSource.frameCount * 100) + "% 100%",
    transform:
      "scale(" +
      String(scaleX) +
      ", " +
      String(spriteSource.roomScale) +
      ") translate(" +
      String(spriteSource.roomTranslateX) +
      "px, " +
      String(spriteSource.roomTranslateY) +
      "px)"
  };
}
