"""Turn the source student headshots in assets/headshots/ into web-ready square JPEGs in assets/img/students/.

Most sources are full-resolution, three-quarter-length studio portraits, so each one is cropped to a square
around the head and shoulders and scaled down to OUTPUT_SIZE pixels. Square sources are only scaled.

Only students listed in HEADSHOTS are processed. Keys are the names used in assets/js/data.js; values are
the source file names, which sometimes use a preferred name. Never add a student who opted out of directory
release: their photo must not appear on the site.

    python3 scripts/prepare_headshots.py
"""
import re
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "headshots"
OUT = ROOT / "assets" / "img" / "students"
OUTPUT_SIZE = 480      # 2x the largest display size on the site
JPEG_QUALITY = 82

# Crop for portrait sources, as fractions of the image: square side (of width) and top edge (of height).
PORTRAIT_SIDE = 0.62
PORTRAIT_TOP = 0.04

# Per-file crop overrides: (left, top, side) as fractions of width, height, and the shorter edge.
CROP_OVERRIDES: dict[str, tuple[float, float, float]] = {
    "Finnick Chen.jpg": (0.32, 0.02, 0.62),
    "Youngpyung Lee.jpg": (0.33, 0.0, 0.62),
}

# data.js name -> source file name
HEADSHOTS = {
    "Lewis Liu": "Lewis Liu.jpg",
    "Mary Chen": "Mary Chen.jpg",
    "Taya Li": "Taya Li.jpg",
    "Coleman Bryant": "Coleman Bryant.jpg",
    "Yan Zhang": "Yan Zhang.jpg",
    "Youngpyung Lee": "Youngpyung Lee.jpg",
    "Toby Zhao": "Toby Zhao.jpg",
    "Josephine Zhang": "Spencer Zhang.jpg",
    "Yuwen Chen": "Yuwen Chen.jpg",
    "Murphy Wei": "Murphy Wei.jpg",
    "Finnick Chen": "Finnick Chen.jpg",
    "Lukina Chen": "Lukina Chen.jpg",
    "Ruotong Yu": "Ruotong Yu.jpg",
    "Peizhong Gao": "Peizhong Gao.jpg",
    "Xin Luo": "Xin Luo.jpg",
    "Anuj Nathan Kamasamudram": "Anuj Kamasamudram.jpg",
    "Polly Yao": "Polly Yao.jpg",
    "Yewen Zhou": "Yewen Zhou.jpg",
    "Linghao Meng": "Eric Meng.jpg",
    "Chuhan Ji": "Chuhan Ji.jpg",
    "Su Hyun Jung": "Su Hyun Jung.jpg",
    "Peeraya Dumrongpun": "Proud Dumrongpun.jpg",
    "Mengqi Shi": "Mengqi Shi.jpg",
    "Qianyu Yang": "Cindy Yang.jpg",
    "Anthony Chen": "Tony Chen.jpg",
    "Yutong Luo": "Yutong Luo.jpg",
    "Sienna Zhang": "Sienna Zhang.jpg",
    "Xiaotong Shen": "Lucia Shen.jpg",
    "Yicheng Sun": "Eason Sun.jpg",
    "Hanyang Wang": "Hanyang Wang.jpg",
    "Shirley He": "Shirley He.jpg",
    "Xiangpeng Yu": "Xiangpeng Yu.jpg",
    "Emmanuel Makinde": "Emmanuel Makinde.jpg",
    "Alan Liu": "Alan Liu.jpg",
    "Youqian Cui": "Yongqian Cui.jpg",
    "Kitty Li": "Kitty Li.jpg",
    "Suzy Hong": "Shuxian Hong.jpg",
    "Chenming Ge": "Chenming Ge.jpg",
    "Phoenix Hua": "Phoenix Hua.jpg",
    "Yuhang Sun": "Yuhang Sun.jpg",
    "Alan Nur": "Alan Nur.jpg",
    "Rushav Dash": "Rushav Dash.jpg",
    "Cidney Ho": "Cidney Ho.jpg",
    "John Huang": "John Huang.jpg",
    "Keochonodom Taing": "Dom Taing.jpg",
    "Elina Zhao": "Elina Zhao.jpg",
    "Xirui Zhu": "Xirui Zhu.jpg",
    "Joyce Zhou": "Joyce Zhou.jpg",
    "Aaron Yeung": "Aaron Yeung.jpg",
    "YunXiao Du": "Yunxiao Du.jpg",
    "Veronika Sermeno Pan": "Verionika Sermeno Pon.jpg",
    "Mengting Li": "Ting Li.jpg",
    "Lisa Li": "Lisa Li.jpg",
    "Iris Yang": "Iris Yang.jpg",
    "Rebecca Yang": "Rebecca Yang.jpg",
    "Davi Dai": "Davi Dai.jpg",
    "Sijia Shao": "Sijia Shao.jpg",
    "Jason Jin": "Jason Jin.jpg",
    "Lya Liu": "Lya Liu.jpg",
}


def slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def crop_box(source: str, size: tuple[int, int]) -> tuple[int, int, int, int]:
    """The square to keep, as (left, top, right, bottom) pixels."""
    w, h = size
    if source in CROP_OVERRIDES:
        left, top, side = CROP_OVERRIDES[source]
        s = side * min(w, h)
        x, y = left * w, top * h
    elif h > w:
        s = PORTRAIT_SIDE * w
        x, y = (w - s) / 2, PORTRAIT_TOP * h
    else:
        s = min(w, h)
        x, y = (w - s) / 2, (h - s) / 2
    return tuple(round(v) for v in (x, y, x + s, y + s))


def prepare(name: str, source: str) -> Path:
    src = SRC / source
    if not src.exists():
        raise FileNotFoundError(f"{name}: missing source headshot {src}")
    with Image.open(src) as img:
        upright = ImageOps.exif_transpose(img).convert("RGB")
    square = upright.crop(crop_box(source, upright.size)).resize((OUTPUT_SIZE, OUTPUT_SIZE), Image.LANCZOS)
    out = OUT / f"{slug(name)}.jpg"
    square.save(out, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
    return out


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, source in HEADSHOTS.items():
        out = prepare(name, source)
        print(f"{source} -> {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
