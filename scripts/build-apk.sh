#!/usr/bin/env bash
set -e

# SabQuick Automated Android APK Compilation Pipeline
echo "======================================================="
echo "   🚀 SABQUICK ANDROID APK GRADLE BUILD PIPELINE      "
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

# 2. Sync Capacitor Web Assets & Plugins
echo ""
echo "🔄 [Step 1/3] Syncing Capacitor plugins and native assets..."
npx cap sync android

# 3. Compile APK using Gradle Wrapper
echo ""
echo "🔨 [Step 2/3] Compiling Android APK with Gradle (assembleDebug)..."
cd "$PROJECT_ROOT/android"
chmod +x ./gradlew
./gradlew assembleDebug

# 4. Packaging and Distributing APK
echo ""
echo "📦 [Step 3/3] Packaging compiled APK artifact..."
cd "$PROJECT_ROOT"
mkdir -p dist
mkdir -p public/downloads

BUILT_APK="$PROJECT_ROOT/android/app/build/outputs/apk/debug/app-debug.apk"

if [ -f "$BUILT_APK" ]; then
  cp "$BUILT_APK" "$PROJECT_ROOT/dist/sabquick-debug.apk"
  cp "$BUILT_APK" "$PROJECT_ROOT/public/downloads/sabquick.apk"

  APK_SIZE=$(ls -lh "$PROJECT_ROOT/dist/sabquick-debug.apk" | awk '{print $5}')

  echo "======================================================="
  echo "   🎉 APK COMPILED SUCCESSFULLY!"
  echo "======================================================="
  echo "📁 Local Artifact:   $PROJECT_ROOT/dist/sabquick-debug.apk"
  echo "🌐 Public Download:  $PROJECT_ROOT/public/downloads/sabquick.apk"
  echo "📊 File Size:        $APK_SIZE"
  echo ""
  echo "📱 Sideloading Instructions:"
  echo "   1. Transfer 'sabquick-debug.apk' to your Android phone (USB/WhatsApp/Drive)"
  echo "   2. Open Files -> Downloads -> Tap 'sabquick-debug.apk'"
  echo "   3. Enable 'Install unknown apps' if prompted, then tap 'Install'."
  echo "   4. Or install directly via USB ADB: adb install -r dist/sabquick-debug.apk"
  echo "======================================================="
else
  echo "❌ Error: Expected APK file was not found at: $BUILT_APK"
  exit 1
fi
