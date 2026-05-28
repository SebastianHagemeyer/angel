#!/usr/bin/env python3
"""Crossfade two images into an animated GIF.

Usage:
    python morph_gif.py frame1.jpg frame2.jpg out.gif
    python morph_gif.py frame1.jpg frame2.jpg out.gif --frames 30 --duration 60 --hold 600

The white scribbles (or anything else that differs between frames) will
smoothly fade over the transition. Set --pingpong to loop back.
"""

import argparse
from pathlib import Path
from PIL import Image


def crossfade(img_a: Image.Image, img_b: Image.Image, frames: int) -> list[Image.Image]:
    """Linearly blend from img_a to img_b across N frames (inclusive of both ends)."""
    if img_a.size != img_b.size:
        img_b = img_b.resize(img_a.size, Image.LANCZOS)
    img_a = img_a.convert("RGB")
    img_b = img_b.convert("RGB")
    out = []
    for i in range(frames):
        alpha = i / (frames - 1) if frames > 1 else 1.0
        out.append(Image.blend(img_a, img_b, alpha))
    return out


def main() -> None:
    p = argparse.ArgumentParser(description="Crossfade two images into a GIF.")
    p.add_argument("frame1", type=Path)
    p.add_argument("frame2", type=Path)
    p.add_argument("output", type=Path)
    p.add_argument("--frames", type=int, default=30,
                   help="Number of transition frames (default 30).")
    p.add_argument("--duration", type=int, default=60,
                   help="Milliseconds per transition frame (default 60).")
    p.add_argument("--hold", type=int, default=600,
                   help="Milliseconds to hold the first and last frame (default 600).")
    p.add_argument("--max-width", type=int, default=720,
                   help="Resize images down to this width for smaller GIFs (default 720).")
    p.add_argument("--pingpong", action="store_true",
                   help="Append the reverse so it loops back to frame 1.")
    args = p.parse_args()

    a = Image.open(args.frame1)
    b = Image.open(args.frame2)

    # Optional downscale to keep output manageable.
    if args.max_width and a.width > args.max_width:
        ratio = args.max_width / a.width
        a = a.resize((args.max_width, int(a.height * ratio)), Image.LANCZOS)
    if b.size != a.size:
        b = b.resize(a.size, Image.LANCZOS)

    frames = crossfade(a, b, args.frames)
    durations = [args.duration] * len(frames)
    # Hold first and last frames longer.
    durations[0] = args.hold
    durations[-1] = args.hold

    if args.pingpong:
        # Append reverse (without duplicating the turning-points).
        frames = frames + frames[-2:0:-1]
        durations = durations + [args.duration] * (len(frames) - len(durations))
        durations[-1] = args.hold

    frames[0].save(
        args.output,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        optimize=True,
        disposal=2,
    )
    print(f"Wrote {args.output} ({len(frames)} frames, {sum(durations)} ms total).")


if __name__ == "__main__":
    main()
