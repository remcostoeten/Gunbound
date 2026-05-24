"use client";

import { useEffect, useRef, useState } from "react";
import { mobilePresentationOptions } from "@/features/game/constants/mobile-presentation";
import { getMobileSpriteFrame, getMobileSpriteSource, shouldFlipMobileSprite } from "@/features/game/engine/mobile-sprites";
import { getMobileRiderMount, getMountedRiderFrame, getRiderSpriteSource } from "@/features/game/engine/rider-sprites";
import type { RiderType } from "@/features/game/engine/rider-sprites";
import type { MobileType, Vec2 } from "@/features/game/types/shared";

type DebugCharacter = "none" | RiderType;

type DebugFacing = Record<MobileType, 1 | -1>;

type DebugPositions = Record<MobileType, Vec2>;

const debugMobileTypes: MobileType[] = [
  "armor",
  "knight",
  "dragon",
  "snow",
  "trico",
  "aduko",
  "mage",
  "nak",
  "turtle",
  "frog",
  "sate"
];
const debugRiderTypes: RiderType[] = ["dragon-rider", "pink-rider"];
const stageWidth = 1280;
const stageHeight = 520;
const groundY = 390;

export function MountDebugView(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mobileImagesRef = useRef<Partial<Record<MobileType, HTMLImageElement>>>({});
  const riderCanvasesRef = useRef<Partial<Record<RiderType, HTMLCanvasElement>>>({});
  const [assetVersion, setAssetVersion] = useState(0);
  const [activeMobile, setActiveMobile] = useState<MobileType>("dragon");
  const [activeCharacter, setActiveCharacter] = useState<DebugCharacter>("dragon-rider");
  const [positions, setPositions] = useState<DebugPositions>(createInitialPositions);
  const [facing, setFacing] = useState<DebugFacing>(createInitialFacing);
  const [riderOffset, setRiderOffset] = useState<Vec2>(createInitialRiderOffset);
  const [showAllRiders, setShowAllRiders] = useState(true);

  useEffect(loadDebugAssets, []);
  useEffect(bindMovementKeys, [activeMobile]);
  useEffect(drawDebugStage, [activeCharacter, activeMobile, assetVersion, facing, positions, riderOffset, showAllRiders]);

  function loadDebugAssets(): void {
    let loadedCount = 0;
    const expectedCount = debugMobileTypes.length + debugRiderTypes.length;

    debugMobileTypes.forEach(loadMobileImage);
    debugRiderTypes.forEach(loadRiderImage);

    function markLoaded(): void {
      loadedCount += 1;
      if (loadedCount >= expectedCount) {
        setAssetVersion(function bumpAssetVersion(version) {
          return version + 1;
        });
      }
    }

    function loadMobileImage(type: MobileType): void {
      const image = new Image();
      image.onload = markLoaded;
      image.src = getMobileSpriteSource(type).path;
      mobileImagesRef.current[type] = image;
    }

    function loadRiderImage(type: RiderType): void {
      const riderSource = getRiderSpriteSource(type);
      const image = new Image();
      image.onload = function handleRiderLoad(): void {
        riderCanvasesRef.current[type] = createTransparentRiderCanvas(image);
        markLoaded();
      };
      image.src = riderSource.path;
    }
  }

  function bindMovementKeys(): () => void {
    window.addEventListener("keydown", handleKeyDown);
    return function cleanupMovementKeys(): void {
      window.removeEventListener("keydown", handleKeyDown);
    };

    function handleKeyDown(event: KeyboardEvent): void {
      const movement = getKeyboardMovement(event.key);
      if (movement === null) {
        return;
      }

      event.preventDefault();
      setPositions(function updatePositions(currentPositions) {
        return moveActiveMobile(currentPositions, activeMobile, movement);
      });

      if (movement.x < 0) {
        setFacing(function updateFacing(currentFacing) {
          return { ...currentFacing, [activeMobile]: -1 };
        });
      }

      if (movement.x > 0) {
        setFacing(function updateFacing(currentFacing) {
          return { ...currentFacing, [activeMobile]: 1 };
        });
      }
    }
  }

  function drawDebugStage(): () => void {
    const canvas = canvasRef.current;
    if (canvas === null) {
      return noop;
    }

    const context = canvas.getContext("2d");
    if (context === null) {
      return noop;
    }
    const renderingContext = context;

    let frameId = 0;
    const startedAt = performance.now();

    function drawFrame(time: number): void {
      const visualTime = (time - startedAt) / 1000;
      drawStageBackground(renderingContext);
      debugMobileTypes.forEach(function drawType(type) {
        drawDebugMobile(renderingContext, type, visualTime);
      });
      frameId = window.requestAnimationFrame(drawFrame);
    }

    frameId = window.requestAnimationFrame(drawFrame);
    return function cleanupDebugStage(): void {
      window.cancelAnimationFrame(frameId);
    };
  }

  function drawDebugMobile(context: CanvasRenderingContext2D, type: MobileType, visualTime: number): void {
    const image = mobileImagesRef.current[type];
    if (image === undefined || !image.complete || image.naturalWidth === 0) {
      return;
    }

    const position = positions[type];
    const mobileSource = getMobileSpriteSource(type);
    const frame = getMobileSpriteFrame(visualTime + debugMobileTypes.indexOf(type) * 0.13, 6.5, mobileSource.frameCount);
    const scale = type === activeMobile ? 1.45 : 1.16;
    const destinationWidth = mobileSource.width * mobileSource.battleScale * scale;
    const destinationHeight = mobileSource.height * mobileSource.battleScale * scale;
    const destinationX = position.x - destinationWidth * 0.5 + mobileSource.battleTranslateX * scale;
    const destinationY = position.y - destinationHeight + 4 * scale + mobileSource.battleTranslateY * scale;
    const selected = type === activeMobile;

    context.save();
    drawUnitPlate(context, position, selected);
    if (shouldFlipMobileSprite(type, facing[type])) {
      context.translate(position.x, 0);
      context.scale(-1, 1);
      context.translate(-position.x, 0);
    }
    context.imageSmoothingEnabled = false;
    if (shouldDrawRider(type)) {
      drawDebugRider(context, type, position, visualTime, scale);
    }
    context.drawImage(
      image,
      frame * mobileSource.width,
      0,
      mobileSource.width,
      mobileSource.height,
      destinationX,
      destinationY,
      destinationWidth,
      destinationHeight
    );
    context.restore();
    drawUnitLabel(context, type, position, selected);
  }

  function drawDebugRider(context: CanvasRenderingContext2D, type: MobileType, position: Vec2, visualTime: number, scale: number): void {
    if (activeCharacter === "none") {
      return;
    }

    const riderCanvas = riderCanvasesRef.current[activeCharacter];
    if (riderCanvas === undefined) {
      return;
    }

    const riderSource = getRiderSpriteSource(activeCharacter);
    const mount = getMobileRiderMount(type);
    const frame = getMountedRiderFrame(activeCharacter);
    const riderScale = scale * mount.scale;
    const destinationWidth = riderSource.width * riderSource.battleScale * riderScale;
    const destinationHeight = riderSource.height * riderSource.battleScale * riderScale;
    const destinationX = position.x - destinationWidth * 0.5 + (riderSource.battleTranslateX + mount.x + riderOffset.x) * scale;
    const destinationY = position.y - destinationHeight + (riderSource.battleTranslateY + mount.y + riderOffset.y) * scale;

    context.drawImage(
      riderCanvas,
      frame * riderSource.width,
      0,
      riderSource.width,
      riderSource.height,
      destinationX,
      destinationY,
      destinationWidth,
      destinationHeight
    );
  }

  function shouldDrawRider(type: MobileType): boolean {
    if (activeCharacter === "none") {
      return false;
    }

    return showAllRiders || type === activeMobile;
  }

  function handleCanvasPointerDown(event: React.PointerEvent<HTMLCanvasElement>): void {
    const canvas = canvasRef.current;
    if (canvas === null) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const point = {
      x: ((event.clientX - rect.left) / rect.width) * stageWidth,
      y: ((event.clientY - rect.top) / rect.height) * stageHeight
    };
    const type = findMobileAtPoint(point, positions);
    if (type !== null) {
      setActiveMobile(type);
    }
  }

  function handleMobileSelect(type: MobileType): void {
    setActiveMobile(type);
  }

  function handleCharacterChange(event: React.ChangeEvent<HTMLSelectElement>): void {
    setActiveCharacter(event.target.value as DebugCharacter);
  }

  function handleShowAllRidersChange(event: React.ChangeEvent<HTMLInputElement>): void {
    setShowAllRiders(event.target.checked);
  }

  function handleRiderOffsetXChange(event: React.ChangeEvent<HTMLInputElement>): void {
    setRiderOffset(function updateOffset(offset) {
      return { ...offset, x: Number(event.target.value) };
    });
  }

  function handleRiderOffsetYChange(event: React.ChangeEvent<HTMLInputElement>): void {
    setRiderOffset(function updateOffset(offset) {
      return { ...offset, y: Number(event.target.value) };
    });
  }

  function handleNudgeLeft(): void {
    nudgeActiveMobile({ x: -12, y: 0 });
  }

  function handleNudgeRight(): void {
    nudgeActiveMobile({ x: 12, y: 0 });
  }

  function handleNudgeUp(): void {
    nudgeActiveMobile({ x: 0, y: -12 });
  }

  function handleNudgeDown(): void {
    nudgeActiveMobile({ x: 0, y: 12 });
  }

  function nudgeActiveMobile(movement: Vec2): void {
    setPositions(function updatePositions(currentPositions) {
      return moveActiveMobile(currentPositions, activeMobile, movement);
    });
  }

  return (
    <main className="mount-debug-shell">
      <section className="mount-debug-stage-panel">
        <div className="mount-debug-stage-head">
          <div>
            <p className="mount-debug-kicker">Sprite Mount Debug</p>
            <h1 className="mount-debug-title">Mobiles And Riders</h1>
          </div>
          <div className="mount-debug-active">
            <span>{getActiveMobileLabel(activeMobile)}</span>
            <strong>{getActiveCharacterLabel(activeCharacter)}</strong>
          </div>
        </div>
        <canvas
          ref={canvasRef}
          className="mount-debug-canvas"
          width={stageWidth}
          height={stageHeight}
          onPointerDown={handleCanvasPointerDown}
        />
      </section>

      <aside className="mount-debug-controls">
        <section className="mount-debug-panel">
          <h2>Mobiles</h2>
          <div className="mount-debug-mobile-grid">
            {mobilePresentationOptions.map(renderMobileButton)}
          </div>
        </section>

        <section className="mount-debug-panel">
          <h2>Character</h2>
          <label className="mount-debug-field">
            <span>Mounted sprite</span>
            <select value={activeCharacter} onChange={handleCharacterChange}>
              <option value="none">None</option>
              <option value="dragon-rider">Dragon Rider</option>
              <option value="pink-rider">Pink Rider</option>
            </select>
          </label>
          <label className="mount-debug-check">
            <input type="checkbox" checked={showAllRiders} onChange={handleShowAllRidersChange} />
            <span>Show rider on every mobile</span>
          </label>
        </section>

        <section className="mount-debug-panel">
          <h2>Rider Offset</h2>
          <label className="mount-debug-field">
            <span>X {riderOffset.x}</span>
            <input min="-32" max="32" step="1" type="range" value={riderOffset.x} onChange={handleRiderOffsetXChange} />
          </label>
          <label className="mount-debug-field">
            <span>Y {riderOffset.y}</span>
            <input min="-32" max="32" step="1" type="range" value={riderOffset.y} onChange={handleRiderOffsetYChange} />
          </label>
        </section>

        <section className="mount-debug-panel">
          <h2>Move</h2>
          <div className="mount-debug-pad">
            <button type="button" onClick={handleNudgeUp}>Up</button>
            <button type="button" onClick={handleNudgeLeft}>Left</button>
            <button type="button" onClick={handleNudgeRight}>Right</button>
            <button type="button" onClick={handleNudgeDown}>Down</button>
          </div>
          <p className="mount-debug-note">WASD and arrow keys move the selected mobile.</p>
        </section>
      </aside>
    </main>
  );

  function renderMobileButton(option: (typeof mobilePresentationOptions)[number]): React.JSX.Element {
    const selected = option.value === activeMobile;
    return (
      <button
        key={option.value}
        className={selected ? "mount-debug-mobile is-active" : "mount-debug-mobile"}
        type="button"
        onClick={function selectMobile(): void {
          handleMobileSelect(option.value);
        }}
      >
        <span>{option.label}</span>
        <small>{option.role}</small>
      </button>
    );
  }
}

function createInitialPositions(): DebugPositions {
  return {
    armor: { x: 90, y: groundY },
    knight: { x: 200, y: groundY },
    dragon: { x: 310, y: groundY },
    snow: { x: 420, y: groundY },
    trico: { x: 530, y: groundY },
    aduko: { x: 640, y: groundY },
    mage: { x: 750, y: groundY },
    nak: { x: 860, y: groundY },
    turtle: { x: 970, y: groundY },
    frog: { x: 1080, y: groundY },
    sate: { x: 1190, y: groundY }
  };
}

function createInitialFacing(): DebugFacing {
  return {
    armor: 1,
    knight: 1,
    dragon: 1,
    snow: 1,
    trico: 1,
    aduko: 1,
    mage: 1,
    nak: 1,
    turtle: 1,
    frog: 1,
    sate: 1
  };
}

function createInitialRiderOffset(): Vec2 {
  return { x: 0, y: 0 };
}

function createTransparentRiderCanvas(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (context === null) {
    return canvas;
  }

  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  let index = 0;
  while (index < data.length) {
    if (isRiderBackdropPixel(data[index], data[index + 1], data[index + 2])) {
      data[index + 3] = 0;
    }
    index += 4;
  }
  context.putImageData(imageData, 0, 0);
  return canvas;
}

function isRiderBackdropPixel(red: number, green: number, blue: number): boolean {
  const redToGreen = Math.abs(red - green);
  const greenToBlue = Math.abs(green - blue);
  const average = (red + green + blue) / 3;
  return redToGreen <= 7 && greenToBlue <= 7 && average >= 236;
}

function drawStageBackground(context: CanvasRenderingContext2D): void {
  context.clearRect(0, 0, stageWidth, stageHeight);
  const skyGradient = context.createLinearGradient(0, 0, 0, stageHeight);
  skyGradient.addColorStop(0, "#ffbd8d");
  skyGradient.addColorStop(0.58, "#ef8d72");
  skyGradient.addColorStop(1, "#1a3858");
  context.fillStyle = skyGradient;
  context.fillRect(0, 0, stageWidth, stageHeight);

  context.fillStyle = "rgba(255, 255, 255, 0.62)";
  context.beginPath();
  context.ellipse(170, 92, 72, 28, 0, 0, Math.PI * 2);
  context.ellipse(230, 84, 108, 34, 0, 0, Math.PI * 2);
  context.ellipse(760, 76, 92, 30, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "rgba(77, 50, 73, 0.34)";
  context.beginPath();
  context.moveTo(0, groundY + 18);
  context.lineTo(150, 250);
  context.lineTo(315, groundY + 18);
  context.lineTo(430, 278);
  context.lineTo(650, groundY + 18);
  context.lineTo(790, 255);
  context.lineTo(stageWidth, groundY + 18);
  context.closePath();
  context.fill();

  context.fillStyle = "#8a5133";
  context.fillRect(0, groundY, stageWidth, stageHeight - groundY);
  context.fillStyle = "#e6cd67";
  context.fillRect(0, groundY - 7, stageWidth, 8);
  context.fillStyle = "#78b45b";
  context.fillRect(0, groundY - 13, stageWidth, 7);
}

function drawUnitPlate(context: CanvasRenderingContext2D, position: Vec2, selected: boolean): void {
  context.fillStyle = selected ? "rgba(254, 213, 93, 0.32)" : "rgba(13, 32, 54, 0.28)";
  context.beginPath();
  context.ellipse(position.x, position.y + 14, selected ? 62 : 48, selected ? 14 : 10, 0, 0, Math.PI * 2);
  context.fill();
}

function drawUnitLabel(context: CanvasRenderingContext2D, type: MobileType, position: Vec2, selected: boolean): void {
  context.font = "12px sans-serif";
  context.textAlign = "center";
  context.fillStyle = selected ? "#fff4bb" : "#eaf5ff";
  context.fillText(getActiveMobileLabel(type), position.x, position.y + 48);
}

function moveActiveMobile(positions: DebugPositions, type: MobileType, movement: Vec2): DebugPositions {
  const current = positions[type];
  return {
    ...positions,
    [type]: {
      x: clamp(current.x + movement.x, 64, stageWidth - 64),
      y: clamp(current.y + movement.y, 190, groundY + 34)
    }
  };
}

function getKeyboardMovement(key: string): Vec2 | null {
  if (key === "ArrowLeft" || key.toLowerCase() === "a") {
    return { x: -12, y: 0 };
  }

  if (key === "ArrowRight" || key.toLowerCase() === "d") {
    return { x: 12, y: 0 };
  }

  if (key === "ArrowUp" || key.toLowerCase() === "w") {
    return { x: 0, y: -12 };
  }

  if (key === "ArrowDown" || key.toLowerCase() === "s") {
    return { x: 0, y: 12 };
  }

  return null;
}

function findMobileAtPoint(point: Vec2, positions: DebugPositions): MobileType | null {
  let match: MobileType | null = null;
  debugMobileTypes.forEach(function testMobile(type) {
    const position = positions[type];
    const distance = Math.hypot(point.x - position.x, point.y - position.y);
    if (distance <= 72) {
      match = type;
    }
  });
  return match;
}

function getActiveMobileLabel(type: MobileType): string {
  const option = mobilePresentationOptions.find(function findOption(candidate) {
    return candidate.value === type;
  });
  if (option === undefined) {
    return type;
  }

  return option.label;
}

function getActiveCharacterLabel(type: DebugCharacter): string {
  if (type === "pink-rider") {
    return "Pink Rider";
  }

  if (type === "dragon-rider") {
    return "Dragon Rider";
  }

  return "No Rider";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function noop(): void {}
