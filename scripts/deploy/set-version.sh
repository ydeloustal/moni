#!/usr/bin/env bash
# Injects the release version into the app, run from the CI runner (the change is never committed).
#
#   set-version.sh <X.Y.Z>
#
# Writes it into package.json, which app.config.ts reads, then checks that the resolved Expo config
# really carries it. EAS uploads the working directory as is, uncommitted changes included,
# so the cloud build gets the same version.
set -euo pipefail

version=${1:?usage: set-version.sh <X.Y.Z>}
[[ $version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || {
  echo "::error::invalid version '$version' (expected X.Y.Z)"
  exit 1
}

npm pkg set version="$version"

actual=$(npx expo config --type public --json 2>/dev/null |
  node -e 'let s = ""; process.stdin.on("data", d => (s += d)).on("end", () => console.log(JSON.parse(s).version))')

if [ "$actual" != "$version" ]; then
  echo "::error::the Expo config resolves version '$actual', expected '$version'"
  exit 1
fi
echo "App version set to $version"
