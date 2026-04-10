#!/usr/bin/env bash
# Source before Gradle/adb:  source scripts/android-env.sh
if [[ -z "${JAVA_HOME:-}" ]]; then
  JAVA_HOME="$(ls -d "$HOME"/.jdks/jdk-17* 2>/dev/null | head -1 || true)"
fi
export JAVA_HOME
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
