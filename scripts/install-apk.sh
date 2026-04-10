#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=/dev/null
source "$ROOT/scripts/android-env.sh"

# Default: release APK (JS bundled in APK — works offline). Pass path for debug + Metro.
APK="${1:-$ROOT/dist/Pulse-release.apk}"
if [[ ! -f "$APK" ]]; then
  echo "APK not found: $APK"
  echo "Build first: npm run android:build   (release, offline-capable)"
  exit 1
fi

echo "Devices:"
adb devices -l
# Note: grep -E does not treat \s/\S as whitespace on all systems; use adb get-state or awk.
if ! adb devices 2>/dev/null | awk 'NF >= 2 && $2 == "device" { found = 1 } END { exit found ? 0 : 1 }'; then
  echo ""
  echo "No authorized device. On your phone:"
  echo "  1. Unlock the screen"
  echo "  2. When prompted, tap 'Allow USB debugging' (check 'Always allow' for this computer)"
  echo "  3. Unplug/replug USB if needed"
  echo ""
  echo "If you see 'no permissions', install udev rules (once, needs sudo):"
  echo "  sudo cp $ROOT/scripts/99-android-adb.rules /etc/udev/rules.d/"
  echo "  sudo udevadm control --reload-rules && sudo udevadm trigger"
  exit 1
fi

echo "Installing $APK ..."
adb install -r "$APK"
echo "Done. Open 'Pulse' on your phone."
