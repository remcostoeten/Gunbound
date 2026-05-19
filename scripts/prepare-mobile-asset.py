#!/usr/bin/env python3

from __future__ import annotations

import argparse
import math
from collections import Counter, deque
from pathlib import Path

import numpy as np
from PIL import Image


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("input_path")
    parser.add_argument("output_path")
    parser.add_argument("--frame-width", type=int, default=128)
    parser.add_argument("--frame-height", type=int, default=128)
    parser.add_argument("--frame-count", type=int, default=4)
    parser.add_argument("--padding", type=int, default=8)
    parser.add_argument("--tolerance", type=float, default=26.0)
    parser.add_argument("--edge-sample", type=int, default=18)
    parser.add_argument("--motion", choices=["none", "float"], default="float")
    parser.add_argument("--skip-background-removal", action="store_true")
    parser.add_argument("--atlas-columns", type=int, default=1)
    parser.add_argument("--atlas-rows", type=int, default=1)
    parser.add_argument("--atlas-frames")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    source = Image.open(args.input_path).convert("RGBA")
    if args.atlas_columns > 1 or args.atlas_rows > 1:
        prepared_frames = prepare_atlas_frames(
            source,
            atlas_columns=args.atlas_columns,
            atlas_rows=args.atlas_rows,
            atlas_frames=parse_atlas_frames(
                args.atlas_frames,
                total_frames=args.atlas_columns * args.atlas_rows,
                frame_count=args.frame_count,
            ),
            tolerance=args.tolerance,
            edge_sample=args.edge_sample,
            skip_background_removal=args.skip_background_removal,
        )
        sheet = build_atlas_sprite_sheet(
            prepared_frames,
            frame_width=args.frame_width,
            frame_height=args.frame_height,
            padding=args.padding,
        )
    else:
        prepared = prepare_source_image(
            source,
            tolerance=args.tolerance,
            edge_sample=args.edge_sample,
            skip_background_removal=args.skip_background_removal,
        )
        sheet = build_sprite_sheet(
            prepared,
            frame_width=args.frame_width,
            frame_height=args.frame_height,
            frame_count=args.frame_count,
            padding=args.padding,
            motion=args.motion,
        )
    output_path = Path(args.output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path)
    print(str(output_path))


def parse_atlas_frames(value: str | None, total_frames: int, frame_count: int) -> list[int]:
    if value is None:
        return list(range(min(frame_count, total_frames)))
    frames = [int(part.strip()) for part in value.split(",") if part.strip()]
    return [frame for frame in frames if 0 <= frame < total_frames]


def prepare_atlas_frames(
    image: Image.Image,
    atlas_columns: int,
    atlas_rows: int,
    atlas_frames: list[int],
    tolerance: float,
    edge_sample: int,
    skip_background_removal: bool,
) -> list[Image.Image]:
    frames: list[Image.Image] = []
    for frame_index in atlas_frames:
        tile = crop_atlas_tile(image, atlas_columns=atlas_columns, atlas_rows=atlas_rows, frame_index=frame_index)
        prepared = prepare_source_image(
            tile,
            tolerance=tolerance,
            edge_sample=edge_sample,
            skip_background_removal=skip_background_removal,
        )
        frames.append(prepared)
    return frames


def crop_atlas_tile(
    image: Image.Image,
    atlas_columns: int,
    atlas_rows: int,
    frame_index: int,
) -> Image.Image:
    column = frame_index % atlas_columns
    row = frame_index // atlas_columns
    left = math.floor(image.width * column / atlas_columns)
    right = math.floor(image.width * (column + 1) / atlas_columns)
    top = math.floor(image.height * row / atlas_rows)
    bottom = math.floor(image.height * (row + 1) / atlas_rows)
    return image.crop((left, top, right, bottom))


def prepare_source_image(
    image: Image.Image,
    tolerance: float,
    edge_sample: int,
    skip_background_removal: bool,
) -> Image.Image:
    working = image.copy()
    if not skip_background_removal:
        working = remove_background(working, tolerance=tolerance, edge_sample=edge_sample)
    trimmed = trim_transparent_bounds(working)
    return trimmed


def remove_background(image: Image.Image, tolerance: float, edge_sample: int) -> Image.Image:
    rgba = np.array(image, dtype=np.uint8)
    height, width, _ = rgba.shape
    background_colors = detect_background_colors(rgba, edge_sample=edge_sample)
    background_mask = create_background_mask(rgba, background_colors, tolerance=tolerance)
    connected_mask = flood_fill_background(background_mask)
    rgba[connected_mask, 3] = 0
    return Image.fromarray(rgba, mode="RGBA")


def detect_background_colors(rgba: np.ndarray, edge_sample: int) -> list[np.ndarray]:
    height, width, _ = rgba.shape
    sample = max(1, min(edge_sample, height // 2, width // 2))
    strips = [
        rgba[:sample, :, :3].reshape(-1, 3),
        rgba[height - sample :, :, :3].reshape(-1, 3),
        rgba[:, :sample, :3].reshape(-1, 3),
        rgba[:, width - sample :, :3].reshape(-1, 3),
    ]
    edge_pixels = np.concatenate(strips, axis=0)
    quantized = ((edge_pixels.astype(np.int16) + 4) // 8).astype(np.int16)
    counts = Counter(map(tuple, quantized.tolist()))
    colors: list[np.ndarray] = []
    for bucket, _ in counts.most_common(4):
        color = np.array(bucket, dtype=np.float32) * 8.0
        if not has_similar_color(colors, color, max_distance=14.0):
            colors.append(color)
        if len(colors) == 2:
            break
    if not colors:
        colors.append(np.array([255.0, 255.0, 255.0], dtype=np.float32))
    return colors


def has_similar_color(colors: list[np.ndarray], candidate: np.ndarray, max_distance: float) -> bool:
    return any(color_distance(color, candidate) <= max_distance for color in colors)


def create_background_mask(rgba: np.ndarray, background_colors: list[np.ndarray], tolerance: float) -> np.ndarray:
    rgb = rgba[:, :, :3].astype(np.float32)
    alpha = rgba[:, :, 3] > 0
    mask = np.zeros((rgba.shape[0], rgba.shape[1]), dtype=bool)
    for color in background_colors:
        diff = rgb - color.reshape(1, 1, 3)
        distance = np.sqrt(np.sum(diff * diff, axis=2))
        mask |= distance <= tolerance
    return mask & alpha


def flood_fill_background(mask: np.ndarray) -> np.ndarray:
    height, width = mask.shape
    visited = np.zeros((height, width), dtype=bool)
    queue: deque[tuple[int, int]] = deque()
    for x in range(width):
        enqueue_if_background(queue, visited, mask, 0, x)
        enqueue_if_background(queue, visited, mask, height - 1, x)
    for y in range(height):
        enqueue_if_background(queue, visited, mask, y, 0)
        enqueue_if_background(queue, visited, mask, y, width - 1)
    while queue:
        y, x = queue.popleft()
        if y > 0:
            enqueue_if_background(queue, visited, mask, y - 1, x)
        if y + 1 < height:
            enqueue_if_background(queue, visited, mask, y + 1, x)
        if x > 0:
            enqueue_if_background(queue, visited, mask, y, x - 1)
        if x + 1 < width:
            enqueue_if_background(queue, visited, mask, y, x + 1)
    return visited


def enqueue_if_background(
    queue: deque[tuple[int, int]],
    visited: np.ndarray,
    mask: np.ndarray,
    y: int,
    x: int,
) -> None:
    if visited[y, x] or not mask[y, x]:
        return
    visited[y, x] = True
    queue.append((y, x))


def trim_transparent_bounds(image: Image.Image) -> Image.Image:
    alpha = np.array(image.getchannel("A"))
    non_zero = np.argwhere(alpha > 0)
    if non_zero.size == 0:
        return image
    top = int(non_zero[:, 0].min())
    bottom = int(non_zero[:, 0].max()) + 1
    left = int(non_zero[:, 1].min())
    right = int(non_zero[:, 1].max()) + 1
    return image.crop((left, top, right, bottom))


def build_sprite_sheet(
    image: Image.Image,
    frame_width: int,
    frame_height: int,
    frame_count: int,
    padding: int,
    motion: str,
) -> Image.Image:
    frame = fit_image_to_frame(image, frame_width=frame_width, frame_height=frame_height, padding=padding)
    frames = [transform_frame(frame, index=index, frame_count=frame_count, motion=motion) for index in range(frame_count)]
    sheet = Image.new("RGBA", (frame_width * frame_count, frame_height), (0, 0, 0, 0))
    for index, current in enumerate(frames):
        sheet.alpha_composite(current, (index * frame_width, 0))
    return sheet


def build_atlas_sprite_sheet(
    images: list[Image.Image],
    frame_width: int,
    frame_height: int,
    padding: int,
) -> Image.Image:
    frames = fit_images_to_frames(
        images,
        frame_width=frame_width,
        frame_height=frame_height,
        padding=padding,
    )
    sheet = Image.new("RGBA", (frame_width * len(frames), frame_height), (0, 0, 0, 0))
    for index, current in enumerate(frames):
        sheet.alpha_composite(current, (index * frame_width, 0))
    return sheet


def fit_image_to_frame(
    image: Image.Image,
    frame_width: int,
    frame_height: int,
    padding: int,
) -> Image.Image:
    target_width = max(1, frame_width - padding * 2)
    target_height = max(1, frame_height - padding * 2)
    scale = min(target_width / image.width, target_height / image.height)
    resized = image.resize(
        (
            max(1, round(image.width * scale)),
            max(1, round(image.height * scale)),
        ),
        Image.Resampling.LANCZOS,
    )
    frame = Image.new("RGBA", (frame_width, frame_height), (0, 0, 0, 0))
    offset_x = (frame_width - resized.width) // 2
    offset_y = frame_height - padding - resized.height
    frame.alpha_composite(resized, (offset_x, offset_y))
    return frame


def fit_images_to_frames(
    images: list[Image.Image],
    frame_width: int,
    frame_height: int,
    padding: int,
) -> list[Image.Image]:
    target_width = max(1, frame_width - padding * 2)
    target_height = max(1, frame_height - padding * 2)
    max_width = max(image.width for image in images)
    max_height = max(image.height for image in images)
    scale = min(target_width / max_width, target_height / max_height)
    return [
        render_image_frame(
            image,
            frame_width=frame_width,
            frame_height=frame_height,
            padding=padding,
            scale=scale,
        )
        for image in images
    ]


def render_image_frame(
    image: Image.Image,
    frame_width: int,
    frame_height: int,
    padding: int,
    scale: float,
) -> Image.Image:
    resized = image.resize(
        (
            max(1, round(image.width * scale)),
            max(1, round(image.height * scale)),
        ),
        Image.Resampling.LANCZOS,
    )
    frame = Image.new("RGBA", (frame_width, frame_height), (0, 0, 0, 0))
    offset_x = (frame_width - resized.width) // 2
    offset_y = frame_height - padding - resized.height
    frame.alpha_composite(resized, (offset_x, offset_y))
    return frame


def transform_frame(frame: Image.Image, index: int, frame_count: int, motion: str) -> Image.Image:
    if motion == "none" or frame_count <= 1:
        return frame.copy()
    phase = (index / frame_count) * math.tau
    translate_y = round(math.sin(phase) * 2)
    scale = 1.0 + math.sin(phase) * 0.015
    return scale_and_translate(frame, scale=scale, translate_y=translate_y)


def scale_and_translate(frame: Image.Image, scale: float, translate_y: int) -> Image.Image:
    width, height = frame.size
    scaled_width = max(1, round(width * scale))
    scaled_height = max(1, round(height * scale))
    scaled = frame.resize((scaled_width, scaled_height), Image.Resampling.LANCZOS)
    output = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    offset_x = (width - scaled_width) // 2
    offset_y = (height - scaled_height) // 2 + translate_y
    output.alpha_composite(scaled, (offset_x, offset_y))
    return output


def color_distance(a: np.ndarray, b: np.ndarray) -> float:
    diff = a.astype(np.float32) - b.astype(np.float32)
    return float(np.sqrt(np.sum(diff * diff)))


if __name__ == "__main__":
    main()
