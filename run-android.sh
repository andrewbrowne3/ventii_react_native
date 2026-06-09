#!/bin/bash
# Launch VENTII on the Android emulator (Pixel 7) with live reload.
set -e
cd "$(dirname "$0")"

SDK="$HOME/Library/Android/sdk"
ADB="$SDK/platform-tools/adb"
export ANDROID_HOME="$SDK" ANDROID_SDK_ROOT="$SDK"
export JAVA_HOME=/opt/homebrew/opt/openjdk@17

# Boot the emulator only if it isn't already running.
if ! "$ADB" devices | grep -q "emulator-5554"; then
  echo "Booting Android emulator…"
  "$SDK/emulator/emulator" -avd Ventii_Pixel7 >/dev/null 2>&1 &
  "$ADB" wait-for-device
  # wait for full boot
  until [ "$("$ADB" -s emulator-5554 shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do
    sleep 2
  done
fi

# Build + install + launch (auto-starts Metro for live reload).
npx react-native run-android --deviceId emulator-5554
