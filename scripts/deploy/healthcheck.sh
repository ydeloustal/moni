#!/usr/bin/env bash
# Post-deployment health check, run from the CI runner.
#
#   healthcheck.sh <public-url> <expected-version>
#
# Passes when, within HEALTHCHECK_ATTEMPTS x HEALTHCHECK_DELAY seconds (default 12 x 5 s):
#   GET /                      -> 200
#   GET /version.txt           -> <expected-version>  (the NEW release is the one being served)
#   GET /healthcheck/deep-link -> 200                 (SPA fallback to index.html works)
set -euo pipefail

url=${1:?usage: healthcheck.sh <public-url> <expected-version>}
url=${url%/}
expected=${2:?usage: healthcheck.sh <public-url> <expected-version>}
attempts=${HEALTHCHECK_ATTEMPTS:-12}
delay=${HEALTHCHECK_DELAY:-5}

# Prints the HTTP status, or 000 when the server cannot be reached (curl already writes 000 then).
http_code() {
  local code
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 "$1" 2>/dev/null) || true
  echo "${code:-000}"
}

check() {
  local code served
  code=$(http_code "$url/")
  [ "$code" = 200 ] || { echo "GET / returned HTTP $code"; return 1; }

  served=$(curl -fsS --max-time 10 "$url/version.txt?nocache=$RANDOM" 2>/dev/null) || served='(unreachable)'
  [ "$served" = "$expected" ] || { echo "version.txt is '$served', expected '$expected'"; return 1; }

  code=$(http_code "$url/healthcheck/deep-link")
  [ "$code" = 200 ] || { echo "SPA fallback (GET /healthcheck/deep-link) returned HTTP $code"; return 1; }
}

last=''
for i in $(seq 1 "$attempts"); do
  if last=$(check); then
    echo "OK: $url serves version $expected"
    exit 0
  fi
  echo "attempt $i/$attempts: $last"
  [ "$i" -lt "$attempts" ] && sleep "$delay"
done

echo "::error title=Health check failed::$url does not serve version $expected ($last)"
exit 1
