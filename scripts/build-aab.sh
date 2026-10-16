#!/usr/bin/env bash
set -e

echo "======================================================="
echo "   🚀 SABQUICK ANDROID APP BUNDLE (.AAB) PIPELINE     "
echo "   Target: Google Play Console Release                 "
echo "======================================================="

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# 1. Java 21 Environment Detection
if [ -d "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home" ]; then
  export JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
elif [ -d "/opt/homebrew/opt/openjdk@21" ]; then
  export JAVA_HOME="/opt/homebrew/opt/openjdk@21"
fi
export PATH="$JAVA_HOME/bin:$PATH"

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

echo "sdk.dir=$ANDROID_HOME" > "$PROJECT_ROOT/android/local.properties"

# 2. Sync Capacitor Web Assets & Plugins
echo ""
echo "🔄 [Step 1/3] Syncing Capacitor plugins and native assets..."
npx cap sync android

# Clean unwanted large files from assets
rm -rf "$PROJECT_ROOT/android/app/src/main/assets/public/downloads"
rm -rf "$PROJECT_ROOT/android/app/src/main/assets/public/uploads"

# 3. Compile Signed Release AAB using Gradle
echo ""
echo "🔨 [Step 2/3] Compiling Signed Release App Bundle (bundleRelease)..."
cd "$PROJECT_ROOT/android"
chmod +x ./gradlew
./gradlew bundleRelease

# 4. Package Artifact
echo ""
echo "📦 [Step 3/3] Packaging compiled AAB artifact..."
cd "$PROJECT_ROOT"
mkdir -p dist

BUILT_AAB="$PROJECT_ROOT/android/app/build/outputs/bundle/release/app-release.aab"

if [ -f "$BUILT_AAB" ]; then
  cp "$BUILT_AAB" "$PROJECT_ROOT/dist/sabquick-release.aab"
  AAB_SIZE=$(ls -lh "$PROJECT_ROOT/dist/sabquick-release.aab" | awk '{print $5}')

  echo "======================================================="
  echo "   🎉 RELEASE AAB COMPILED SUCCESSFULLY!"
  echo "======================================================="
  echo "📁 Google Play Bundle: $PROJECT_ROOT/dist/sabquick-release.aab"
  echo "📊 Size:               $AAB_SIZE"
  echo "======================================================="
else
  echo "❌ Error: Expected Release AAB file was not found at: $BUILT_AAB"
  exit 1
fi
