# SabQuick Mobile Application & PWA Roadmap

This guide documents the mobile-first Progressive Web Application (PWA) architecture implemented in SabQuick and outlines the exact steps to package and distribute it onto the **Google Play Store** and **Apple App Store**.

---

## 📱 1. Live Mobile PWA Features Implemented

1. **Native 5-Tab Bottom Navigation Bar**:
   - **Home**: Jump to top of catalog & search.
   - **Aisles**: Instant access to parent categories & subcategories.
   - **Cart**: Dynamic badge displaying live item count and total amount in ₹; opens the checkout drawer.
   - **Orders**: Live tracking and past delivery history.
   - **Account**: Seamless customer profile / staff operations portal (`/owner`, `/manager`, `/rider/dashboard`, `/packer`).
   - Integrated with `env(safe-area-inset-bottom)` for iPhone gesture home indicators.

2. **Smart PWA Installation Engine (`PwaInstallPrompt`)**:
   - **Android / Chrome**: Captures the native `beforeinstallprompt` event and presents a high-converting install card ("Install SabQuick App for 10-15 Min Delivery").
   - **iOS Safari**: Automatically detects iPhone/iPad and provides a clean 2-step guide: *Tap Share ⎋ then 'Add to Home Screen ⊞'*.
   - Dismissible with a 7-day polite cooldown via local storage.

3. **Offline & Low-Connectivity Resilience**:
   - Pre-caches core app shell, fonts, icons, and static assets in [public/sw.js](file:///Users/ath1614/SAB_QUICKV2/public/sw.js).
   - Serves a branded offline recovery screen at [app/offline/page.tsx](file:///Users/ath1614/SAB_QUICKV2/app/offline/page.tsx) with automatic reconnection detection.

4. **Mobile Viewport Optimization**:
   - `viewportFit: "cover"` to extend edge-to-edge behind the iOS Dynamic Island / Notch.
   - `userScalable: false, maximumScale: 1` to eliminate annoying zoom jumps when focusing on phone number / address input fields.

---

## 🤖 2. Packaging for Google Play Store (Android TWA)

You can publish SabQuick to the Google Play Store as an official native Android app **without rewriting any code** by using a **Trusted Web Activity (TWA)**.

### Method A: PWABuilder (Recommended & Fastest — 10 Minutes)
1. Navigate to **[https://www.pwabuilder.com](https://www.pwabuilder.com)**.
2. Enter your live production URL:
   ```text
   https://srv1985371.hstgr.cloud
   ```
3. Click **Start**. PWABuilder will audit the manifest, icons, and service worker (SabQuick scores 100% PWA compliance).
4. Click **Package for Stores** and select **Android**:
   - **Package ID**: `com.sabquick.app`
   - **App Name**: `SabQuick`
   - **Short Name**: `SabQuick`
   - **Version**: `1.0.0`
5. Click **Generate Package**.
6. Download the generated `.zip` containing:
   - `app-release.aab` (Ready for Google Play Console)
   - `assetlinks.json` (Digital Asset Link for full-screen seamless integration without Chrome URL bar).

### Verifying Digital Asset Links on VPS
Upload the generated `assetlinks.json` into `/public/.well-known/assetlinks.json` so Android verifies ownership:
```bash
mkdir -p public/.well-known
cp /path/to/assetlinks.json public/.well-known/assetlinks.json
```

---

## 🍎 3. Packaging for iOS & Android with Capacitor (Advanced Native)

If you want native background push notifications, direct Bluetooth ESC/POS thermal printer integration, or native App Store submission:

### Step 1: Install Capacitor CLI
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init "SabQuick" "com.sabquick.app" --web-dir ".next"
```

### Step 2: Configure `capacitor.config.ts`
Point Capacitor to the live production server:
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sabquick.app',
  appName: 'SabQuick',
  webDir: '.next',
  server: {
    url: 'https://srv1985371.hstgr.cloud',
    cleartext: false,
  },
};

export default config;
```

### Step 3: Add Platforms
```bash
# Add Android Studio project
npx cap add android

# Add Xcode iOS project (macOS only)
npx cap add ios
```

### Step 4: Build & Launch
```bash
# Open in Android Studio
npx cap open android

# Open in Xcode
npx cap open ios
```
From Android Studio, click **Build > Generate Signed Bundle / APK** to create your production `.aab` for Google Play.

---

## 🧪 4. How to Test Installation on Your Phone Right Now

1. On your phone (Android or iPhone), open **Chrome** or **Safari**.
2. Visit **`https://srv1985371.hstgr.cloud`**.
3. **On Android**:
   - The "Install SabQuick App" banner will slide in at the bottom. Click **Install App**.
   - Or tap the Chrome three dots `⋮` > **Install app**.
4. **On iPhone**:
   - Tap the **Share** button `⎋` (middle bottom of Safari).
   - Scroll down and tap **Add to Home Screen ⊞**.
5. Close the browser and tap the **SabQuick** icon on your home screen:
   - It will open full screen without any browser navigation bars, exactly like a native app installed from the app store!
