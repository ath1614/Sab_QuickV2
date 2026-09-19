#!/usr/bin/env python3
"""
Generate complete Android launcher mipmap icons and web app icons with a pure white background.
Source: public/brand/app-icon-source.png
Outputs:
  - public/brand/app-icon.png (1024x1024, white BG)
  - public/icon-512.png (512x512, white BG)
  - public/icon-192.png (192x192, white BG)
  - public/favicon.ico (Multi-res 16, 32, 48)
  - android/app/src/main/res/mipmap-*/ic_launcher.png (White BG, centered logo)
  - android/app/src/main/res/mipmap-*/ic_launcher_round.png (Anti-aliased white circle BG, centered logo)
  - android/app/src/main/res/mipmap-*/ic_launcher_foreground.png (Transparent safe zone logo for adaptive icon)
"""
import os
from PIL import Image, ImageDraw

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RES_DIR = os.path.join(PROJECT_ROOT, "android/app/src/main/res")
SRC_ICON = os.path.join(PROJECT_ROOT, "public/brand/app-icon-source.png")

if not os.path.exists(SRC_ICON):
    raise FileNotFoundError(f"Source icon not found at {SRC_ICON}")

raw_img = Image.open(SRC_ICON).convert("RGBA")

# 1. Tightly crop non-transparent bounding box so centering is mathematically exact
bbox = raw_img.getbbox()
cropped_logo = raw_img.crop(bbox)
cw, ch = cropped_logo.size
print(f"📐 Extracted logo bounding box: {cw}x{ch} px")

# Function: Square Icon with Solid White Background
def make_square_icon(size: int, padding_ratio: float = 0.16) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    avail_size = int(size * (1.0 - 2.0 * padding_ratio))
    scale = avail_size / max(cw, ch)
    nw, nh = max(1, int(cw * scale)), max(1, int(ch * scale))
    scaled = cropped_logo.resize((nw, nh), Image.Resampling.LANCZOS)
    ox = (size - nw) // 2
    oy = (size - nh) // 2
    canvas.paste(scaled, (ox, oy), scaled)
    return canvas

# Function: Circular Icon with Smooth Anti-Aliased White Circle on Transparent Canvas
def make_round_icon(size: int, padding_ratio: float = 0.18) -> Image.Image:
    hi_size = size * 4
    canvas = Image.new("RGBA", (hi_size, hi_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    draw.ellipse([(0, 0), (hi_size - 1, hi_size - 1)], fill=(255, 255, 255, 255))
    
    avail_size = int(hi_size * (1.0 - 2.0 * padding_ratio))
    scale = avail_size / max(cw, ch)
    nw, nh = max(1, int(cw * scale)), max(1, int(ch * scale))
    scaled = cropped_logo.resize((nw, nh), Image.Resampling.LANCZOS)
    ox = (hi_size - nw) // 2
    oy = (hi_size - nh) // 2
    canvas.paste(scaled, (ox, oy), scaled)
    return canvas.resize((size, size), Image.Resampling.LANCZOS)

# Function: Adaptive Icon Foreground (Transparent canvas, centered inside the 66dp/72dp safe area)
def make_adaptive_foreground(canvas_size: int, safe_ratio: float = 0.60) -> Image.Image:
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    avail_size = int(canvas_size * safe_ratio)
    scale = avail_size / max(cw, ch)
    nw, nh = max(1, int(cw * scale)), max(1, int(ch * scale))
    scaled = cropped_logo.resize((nw, nh), Image.Resampling.LANCZOS)
    ox = (canvas_size - nw) // 2
    oy = (canvas_size - nh) // 2
    canvas.paste(scaled, (ox, oy), scaled)
    return canvas

# --- Generate Web & PWA Brand Icons ---
print("🎨 Generating web and brand icons with white background...")
app_icon_1024 = make_square_icon(1024, padding_ratio=0.16)
app_icon_1024.save(os.path.join(PROJECT_ROOT, "public/brand/app-icon.png"), "PNG")

icon_512 = make_square_icon(512, padding_ratio=0.16)
icon_512.save(os.path.join(PROJECT_ROOT, "public/icon-512.png"), "PNG")

icon_192 = make_square_icon(192, padding_ratio=0.16)
icon_192.save(os.path.join(PROJECT_ROOT, "public/icon-192.png"), "PNG")

# Generate favicon.ico (multi-resolution 16, 32, 48)
icon_48 = make_square_icon(48, padding_ratio=0.12)
icon_48.save(
    os.path.join(PROJECT_ROOT, "public/favicon.ico"),
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48)],
)

# --- Generate Android Mipmap Icons ---
# DENSITIES: (folder, std_size, canvas_size)
DENSITIES = [
    ("mipmap-mdpi", 48, 108),
    ("mipmap-hdpi", 72, 162),
    ("mipmap-xhdpi", 96, 216),
    ("mipmap-xxhdpi", 144, 324),
    ("mipmap-xxxhdpi", 192, 432),
]

print("📱 Generating Android mipmap launcher icons with white background...")
for folder, std_size, canvas_size in DENSITIES:
    target_dir = os.path.join(RES_DIR, folder)
    os.makedirs(target_dir, exist_ok=True)

    # 1. Standard square launcher icon (solid white BG)
    std_icon = make_square_icon(std_size, padding_ratio=0.16)
    std_icon.save(os.path.join(target_dir, "ic_launcher.png"), "PNG")

    # 2. Standard round launcher icon (anti-aliased white circular BG)
    round_icon = make_round_icon(std_size, padding_ratio=0.18)
    round_icon.save(os.path.join(target_dir, "ic_launcher_round.png"), "PNG")

    # 3. Adaptive foreground icon (safe-zone centered on transparent canvas)
    fg_icon = make_adaptive_foreground(canvas_size, safe_ratio=0.60)
    fg_icon.save(os.path.join(target_dir, "ic_launcher_foreground.png"), "PNG")

    print(f"  ✓ {folder}: ic_launcher ({std_size}x{std_size}), ic_launcher_round ({std_size}x{std_size}), ic_launcher_foreground ({canvas_size}x{canvas_size})")

print("🎉 All Android mipmap icons and web brand assets generated successfully with white background!")
