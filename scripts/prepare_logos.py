"""Turn the source sponsor logos in assets/logos/ into web-ready PNGs in assets/img/sponsors/.

Each logo is trimmed to its visible content (transparent or flat background removed from the edges),
optionally has its flat background made transparent, and is scaled down to OUTPUT_HEIGHT pixels.

    python3 scripts/prepare_logos.py
"""
from pathlib import Path

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "logos"
OUT = ROOT / "assets" / "img" / "sponsors"
OUTPUT_HEIGHT = 160   # 2x the largest display height on the site
BG_TOLERANCE = 24     # how far a pixel may differ from the corner colour and still count as background

# source file -> (output file, make the flat background transparent?)
LOGOS = {
    "T-Mobile-Logo-2020.png": ("t-mobile.png", False),
    "Microsoft_logo_(2012).svg.webp": ("microsoft.png", False),
    "nvidia-logo-vert-blk_thmb.png": ("nvidia.png", True),
    "UW-Medicine-logo.png": ("uw-medicine.png", False),
    "MultiCare-Health-System-logo.png": ("multicare.png", False),
    "DOGU.jpeg": ("dogu.png", True),
    "redesign-collective.png": ("redesign-collective.png", False),
    "heart-pulse.png": ("pulse-heart-institute.png", True),
}


def background_mask(img):
    """White where a pixel is background: transparent, or close to the top-left corner colour."""
    rgb = img.convert("RGB")
    corner = Image.new("RGB", rgb.size, rgb.getpixel((0, 0)))
    diff = ImageChops.difference(rgb, corner).convert("L").point(lambda v: 255 if v <= BG_TOLERANCE else 0)
    transparent = img.getchannel("A").point(lambda a: 255 if a < 16 else 0)
    return ImageChops.lighter(diff, transparent)


def prepare(src, clear_background):
    img = Image.open(src).convert("RGBA")
    bg = background_mask(img)
    box = ImageChops.invert(bg).getbbox()
    if box is None:
        raise ValueError(f"{src.name}: no visible content found")
    if clear_background:
        img = img.copy()
        img.putalpha(ImageChops.multiply(img.getchannel("A"), ImageChops.invert(bg)))
    img = img.crop(box)
    if img.height > OUTPUT_HEIGHT:
        img = img.resize((round(img.width * OUTPUT_HEIGHT / img.height), OUTPUT_HEIGHT), Image.LANCZOS)
    return img


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (out_name, clear_background) in LOGOS.items():
        src = SRC / name
        if not src.exists():
            raise SystemExit(f"Missing source logo: {src}")
        img = prepare(src, clear_background)
        img.save(OUT / out_name, optimize=True)
        print(f"{name} -> {out_name} ({img.width}x{img.height})")


if __name__ == "__main__":
    main()
