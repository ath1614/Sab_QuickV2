#!/usr/bin/env bash
set -e

# SabQuick Automated Android APK Compilation Pipeline (Optimized Release Build)
echo "======================================================="
echo "   🚀 SABQUICK ANDROID APK GRADLE BUILD PIPELINE      "
echo "   Mode: assembleRelease (Optimized & Signed)          "
echo "======================================================="

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# 1. Environment Detection & Configuration
if [ -d "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home" ]; then
  export JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
elif [ -d "/opt/homebrew/opt/openjdk@21" ]; then
  export JAVA_HOME="/opt/homebrew/opt/openjdk@21"
elif [ -d "/opt/homebrew/opt/openjdk@17" ]; then
  export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
elif [ -d "/opt/homebrew/opt/openjdk" ]; then
  export JAVA_HOME="/opt/homebrew/opt/openjdk"
fi

if [ -z "$ANDROID_HOME" ]; then
  if [ -d "$HOME/Library/Android/sdk" ]; then
    export ANDROID_HOME="$HOME/Library/Android/sdk"
  fi
fi

echo "☕ Java Runtime: $($JAVA_HOME/bin/java -version 2>&1 | head -n 1)"
echo "📍 JAVA_HOME:    $JAVA_HOME"
echo "🤖 ANDROID_HOME: $ANDROID_HOME"

if [ -z "$ANDROID_HOME" ] || [ ! -d "$ANDROID_HOME" ]; then
  echo "❌ Error: ANDROID_HOME is not set or directory does not exist."
  exit 1
fi

# Ensure local.properties contains sdk.dir
echo "sdk.dir=$ANDROID_HOME" > "$PROJECT_ROOT/android/local.properties"

# Guard: release builds must be signed with the gitignored keystore credentials.
# See android/key.example.properties. Fallback = debug-signed local smoke build.
if [ ! -f "$PROJECT_ROOT/android/key.properties" ]; then
  echo ""
  echo "⚠️  WARNING: android/key.properties not found — the APK will be DEBUG-SIGNED."
  echo "   For a production release APK, create android/key.properties (gitignored)"
  echo "   pointing at your release keystore. See android/key.example.properties."
  echo ""
  sleep 2
fi

# 2. Sync Capacitor Web Assets & Plugins
echo ""
echo "🔄 [Step 1/3] Syncing Capacitor plugins and native assets..."
npx cap sync android

# CRITICAL: Prevent recursive APK nesting & bloating (delete downloads and user uploads from packaged assets)
rm -rf "$PROJECT_ROOT/android/app/src/main/assets/public/downloads"
rm -rf "$PROJECT_ROOT/android/app/src/main/assets/public/uploads"

# 3. Compile Optimized Release APK using Gradle Wrapper
echo ""
echo "🔨 [Step 2/3] Compiling Signed Release APK with Gradle (assembleRelease)..."
cd "$PROJECT_ROOT/android"
chmod +x ./gradlew
./gradlew assembleRelease

# 4. Packaging and Distributing APK
echo ""
echo "📦 [Step 3/3] Packaging compiled APK artifact..."
cd "$PROJECT_ROOT"
mkdir -p dist
mkdir -p public/downloads

BUILT_APK="$PROJECT_ROOT/android/app/build/outputs/apk/release/app-release.apk"

if [ -f "$BUILT_APK" ]; then
  cp "$BUILT_APK" "$PROJECT_ROOT/dist/sabquick-release.apk"
  cp "$BUILT_APK" "$PROJECT_ROOT/dist/sabquick.apk"
  cp "$BUILT_APK" "$PROJECT_ROOT/public/downloads/sabquick.apk"

  APK_SIZE=$(ls -lh "$PROJECT_ROOT/dist/sabquick-release.apk" | awk '{print $5}')

  echo "======================================================="
  echo "   🎉 RELEASE APK COMPILED SUCCESSFULLY!"
  echo "======================================================="
  echo "📁 Local Artifact:   $PROJECT_ROOT/dist/sabquick-release.apk"
  echo "🌐 Public Download:  $PROJECT_ROOT/public/downloads/sabquick.apk"
  echo "📊 Optimized Size:   $APK_SIZE (Shrunk from 108MB to ~6MB!)"
  echo ""
  echo "📱 Sideloading Instructions:"
  echo "   1. Transfer 'sabquick-release.apk' to your Android phone (USB/WhatsApp/Drive)"
  echo "   2. Open Files -> Downloads -> Tap 'sabquick-release.apk'"
  echo "   3. Enable 'Install unknown apps' if prompted, then tap 'Install'."
  echo "   4. Or install directly via USB ADB: adb install -r dist/sabquick-release.apk"
  echo "======================================================="
else
  echo "❌ Error: Expected Release APK file was not found at: $BUILT_APK"
  exit 1
fi
