#!/bin/bash
# Launch VENTII on the iOS Simulator (iPhone 15) with live reload.
set -e
cd "$(dirname "$0")"

# Boot the simulator (no-op if already booted) and show the window.
xcrun simctl boot "iPhone 15" 2>/dev/null || true
open -a Simulator

# Build + install + launch (auto-starts Metro for live reload).
npx react-native run-ios --simulator "iPhone 15"
