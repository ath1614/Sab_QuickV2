#!/usr/bin/env python3
"""
Generate complete Android launcher and adaptive icons from public/icon-512.png.
Handles standard mipmap icons and Android 8.0+ adaptive icons.
"""
import os
from PIL import Image

RES_DIR = "android/app/src/main/res"
SRC_ICON = "public/icon-512.png"

if not os.path.exists(SRC_ICON):
    raise FileNotFoundError(f"Source icon not found at {SRC_ICON}")

src_img = Image.open(SRC_ICON).convert("RGBA")

# Mipmap densities and their dimensions
# (folder, standard_size, adaptive_canvas_size, adaptive_logo_size)
DENSITIES = [
    ("mipmap-mdpi", 48, 108, 72),
    ("mipmap-hdpi", 72, 162, 108),
    ("mipmap-xhdpi", 96, 216, 144),
    ("mipmap-xxhdpi", 144, 324, 216),
    ("mipmap-xxxhdpi", 192, 432, 288),
]

for folder, std_size, canvas_size, logo_size in DENSITIES:
    target_dir = os.path.join(RES_DIR, folder)
    os.makedirs(target_dir, exist_ok=True)

    # 1. Standard icon (ic_launcher.png and ic_launcher_round.png)
    std_img = src_img.resize((std_size, std_size), Image.Resampling.LANCZOS)
    std_img.save(os.path.join(target_dir, "ic_launcher.png"), "PNG")
    std_img.save(os.path.join(target_dir, "ic_launcher_round.png"), "PNG")

    # 2. Adaptive foreground (ic_launcher_foreground.png)
    # Transparent canvas with centered logo within the 72dp safe zone
    fg_canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    resized_logo = src_img.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    offset = ((canvas_size - logo_size) // 2, (canvas_size - logo_size) // 2)
    fg_canvas.paste(resized_logo, offset, resized_logo)
    fg_canvas.save(os.path.join(target_dir, "ic_launcher_foreground.png"), "PNG")

print("✅ All standard and adaptive mipmap icons generated successfully!")
