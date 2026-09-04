"""Compose hybrid README hero from SVG layout intent + brand PNGs."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
BRAND = ROOT / "public" / "brand"
OUT_DIR = ROOT / "assets" / "readme"
OUT = OUT_DIR / "hero.png"

W, H = 1200, 420
BG_TOP = (20, 17, 14)
BG_BOT = (42, 33, 24)
GOLD = (212, 160, 106)
CREAM = (247, 241, 234)
MUTED = (196, 182, 166)
DIM = (138, 123, 108)


def lerp(a: int, b: int, t: float) -> int:
    return int(a + (b - a) * t)


def gradient_bg() -> Image.Image:
    im = Image.new("RGB", (W, H))
    px = im.load()
    for y in range(H):
        t = y / (H - 1)
        for x in range(W):
            tx = x / (W - 1)
            r = lerp(BG_TOP[0], BG_BOT[0], 0.35 * t + 0.65 * tx)
            g = lerp(BG_TOP[1], BG_BOT[1], 0.35 * t + 0.65 * tx)
            b = lerp(BG_TOP[2], BG_BOT[2], 0.35 * t + 0.65 * tx)
            px[x, y] = (r, g, b)
    return im.convert("RGBA")


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        r"C:\Windows\Fonts\msyhbd.ttc" if bold else r"C:\Windows\Fonts\msyh.ttc",
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\arial.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def paste_fit(base: Image.Image, path: Path, box: tuple[int, int, int, int], pad: int = 8) -> None:
    src = Image.open(path).convert("RGBA")
    bw, bh = box[2] - box[0] - pad * 2, box[3] - box[1] - pad * 2
    src.thumbnail((bw, bh), Image.Resampling.LANCZOS)
    x = box[0] + pad + (bw - src.width) // 2
    y = box[1] + pad + (bh - src.height) // 2
    base.alpha_composite(src, (x, y))


def rounded_rect(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int, int, int],
    radius: int,
    fill=None,
    outline=None,
    width: int = 1,
) -> None:
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def main() -> None:
    base = gradient_bg()
    draw = ImageDraw.Draw(base)

    rounded_rect(draw, (24, 24, 1176, 396), 20, outline=(212, 160, 106, 55), width=1)

    # Left copy
    draw.text((64, 64), "OPEN SOURCE FILM SUITE", fill=GOLD, font=font(18, True))
    logo = Image.open(BRAND / "logo-on-dark.png").convert("RGBA")
    logo.thumbnail((340, 150), Image.Resampling.LANCZOS)
    base.alpha_composite(logo, (64, 98))
    draw.text((64, 268), "从剧本到成片", fill=CREAM, font=font(36, True))
    draw.text((64, 318), "解析文本 · 生成资产 · 排分镜 · 配音导出", fill=MUTED, font=font(20))
    draw.text((64, 356), "Next.js 15 · MySQL · Redis · BullMQ", fill=DIM, font=font(16))

    # Right pipeline panel
    panel = (560, 70, 1140, 350)
    rounded_rect(draw, panel, 18, fill=(247, 241, 234, 12), outline=(212, 160, 106, 46))
    draw.text((588, 92), "PIPELINE", fill=GOLD, font=font(16, True))

    pipes = [
        ("pipe-story.png", "文本"),
        ("pipe-script.png", "剧本"),
        ("pipe-storyboard.png", "分镜"),
        ("pipe-video.png", "成片"),
        ("pipe-dubbing.png", "配音"),
    ]
    x0, y0 = 588, 130
    gap = 108
    for i, (name, label) in enumerate(pipes):
        x = x0 + i * gap
        box = (x, y0, x + 88, y0 + 88)
        rounded_rect(draw, box, 14, fill=(247, 241, 234, 18), outline=(212, 160, 106, 36))
        paste_fit(base, BRAND / "icons" / name, box, pad=12)
        tw = draw.textlength(label, font=font(16))
        draw.text((x + (88 - tw) / 2, y0 + 96), label, fill=CREAM, font=font(16))
        if i < len(pipes) - 1:
            draw.text((x + 90, y0 + 30), "→", fill=GOLD, font=font(20, True))

    draw.text((588, 268), "一条可回看、可重跑的制作管线", fill=MUTED, font=font(18))
    draw.text((588, 300), "短剧 / 漫剧 · 中英双语 · 本地可部署", fill=DIM, font=font(16))

    # App icon watermark (subtle)
    icon = Image.open(BRAND / "logo-icon-app.png").convert("RGBA")
    icon.thumbnail((120, 120), Image.Resampling.LANCZOS)
    icon.putalpha(icon.getchannel("A").point(lambda a: int(a * 0.18)))
    base.alpha_composite(icon, (1040, 280))

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    base.convert("RGB").save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
