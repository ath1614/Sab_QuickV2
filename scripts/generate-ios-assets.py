#!/usr/bin/env python3
"""
Generate complete iOS assets for SabQuick, strictly matching the rolled-out Android assets:
- Source: public/brand/sabquick-master-logo.png (cropped to SAB+QUICK core: (59, 66, 948, 504))
- Optical center-of-mass alignment identical to Android mipmap launcher
- App Store Universal Icon: 1024x1024, RGB mode, NO alpha channel (strictly enforced by Apple App Store)
- Splash images: 2732x2732, RGB mode, pure white background with centered public/brand/splash-logo.png
"""
import os
import numpy as np
from PIL import Image

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ASSETS_DIR = os.path.join(PROJECT_ROOT, "ios/App/App/Assets.xcassets")
MASTER_LOGO = os.path.join(PROJECT_ROOT, "public/brand/sabquick-master-logo.png")
SPLASH_LOGO = os.path.join(PROJECT_ROOT, "public/brand/splash-logo.png")

if not os.path.exists(MASTER_LOGO):
    raise FileNotFoundError(f"Master logo not found at {MASTER_LOGO}")

# 1. Load and crop the canonical master logo (matching Android step 710)
img = Image.open(MASTER_LOGO)
crop_clean = img.crop((59, 66, 948, 504))

# 2. Calculate alpha center of mass for exact optical centering
arr_clean = np.array(crop_clean)
alpha = arr_clean[:, :, 3]
y_idx, x_idx = np.indices(alpha.shape)
tot = np.sum(alpha)
com_x = np.sum(x_idx * alpha) / tot
com_y = np.sum(y_idx * alpha) / tot

print(f"Calculated optical center of mass: com_x={com_x:.2f}, com_y={com_y:.2f}")

# 3. Generate iOS 1024x1024 App Store Universal Icon (0.78 scale matching Android ic_launcher)
size = 1024
logo_w = int(size * 0.78)
logo_h = int(crop_clean.height * (logo_w / crop_clean.width))
scaled = crop_clean.resize((logo_w, logo_h), Image.Resampling.LANCZOS)
scaled_com_x = com_x * (logo_w / crop_clean.width)
scaled_com_y = com_y * (logo_h / crop_clean.height)
paste_x = int((size / 2) - scaled_com_x)
paste_y = int((size / 2) - scaled_com_y)

# Pure white background, RGB mode (Apple App Store strictly forbids alpha channel)
ios_icon = Image.new("RGB", (size, size), (255, 255, 255))
ios_icon.paste(scaled, (paste_x, paste_y), scaled)

appicon_dest = os.path.join(ASSETS_DIR, "AppIcon.appiconset/AppIcon-512@2x.png")
ios_icon.save(appicon_dest, "PNG")
print(f"✓ Saved iOS App Store Icon (1024x1024, RGB, no-alpha, identical to Android): {appicon_dest}")

# 4. Generate iOS Splash Screen (identical to Android step 1413 using public/brand/splash-logo.png)
splash_img = Image.open(SPLASH_LOGO).convert("RGBA")
splash_w, splash_h = splash_img.size

splash_canvas_size = 2732
# In Android step 1413: logoMaxW = 55% of width, logoMaxH = 35% of height
target_max_w = int(splash_canvas_size * 0.55)
target_max_h = int(splash_canvas_size * 0.35)

scale = min(target_max_w / splash_w, target_max_h / splash_h)
nw, nh = int(splash_w * scale), int(splash_h * scale)
scaled_splash_logo = splash_img.resize((nw, nh), Image.Resampling.LANCZOS)

ios_splash = Image.new("RGB", (splash_canvas_size, splash_canvas_size), (255, 255, 255))
paste_sp_x = (splash_canvas_size - nw) // 2
paste_sp_y = (splash_canvas_size - nh) // 2
ios_splash.paste(scaled_splash_logo, (paste_sp_x, paste_sp_y), scaled_splash_logo)

splash_dir = os.path.join(ASSETS_DIR, "Splash.imageset")
for name in ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]:
    sp_path = os.path.join(splash_dir, name)
    ios_splash.save(sp_path, "PNG")
    print(f"✓ Saved iOS Splash Screen ({name}): {sp_path}")

print("🎉 iOS icon and splash screens successfully aligned 1:1 with Android!")
