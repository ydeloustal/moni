#!/usr/bin/env bash
# Release management ON THE VPS. Never copied to the server: the workflows pipe it through SSH,
# as the deploy user:
#
#   ssh vps bash -s -- <base> <command> [arg] < scripts/deploy/remote.sh
#
# Layout under <base> (/var/www/moni):
#   releases/X.Y.Z/          one directory per deployed version
#   releases/X.Y.Z.partial/  upload in progress (rsync target), promoted by "activate"
#   current -> releases/X.Y.Z   symlink served by Apache
#
# Commands:
#   activate X.Y.Z   promote the uploaded release and switch "current" to it;
#                    prints the version served before (empty on the first deployment)
#   switch X.Y.Z     point "current" at an existing release (rollback)
#   previous         print the release just before the current one, in semver order
#   prune N          delete the oldest releases, keep the N most recent (never the current one)
#   list             print the available releases and the current one
set -euo pipefail

BASE=${1:?usage: remote.sh <base> <command> [arg]}
CMD=${2:?usage: remote.sh <base> <command> [arg]}
ARG=${3:-}
RELEASES="$BASE/releases"
SEMVER='^[0-9]+\.[0-9]+\.[0-9]+$'

die() {
  echo "error: $*" >&2
  exit 1
}

require_version() {
  [[ $1 =~ $SEMVER ]] || die "invalid version '$1' (expected X.Y.Z)"
}

current_version() {
  local target
  target=$(readlink "$BASE/current" 2>/dev/null) || return 0
  basename "$target"
}

list_releases() {
  { ls -1 "$RELEASES" | grep -E "$SEMVER" || true; } | sort -V
}

# Atomic switch: a new symlink is created next to the old one, then rename(2) replaces it.
# Apache never sees a missing or half-written "current".
point_current_to() {
  ln -sfn "releases/$1" "$BASE/current.tmp"
  mv -T "$BASE/current.tmp" "$BASE/current"
}

case "$CMD" in
  activate)
    require_version "$ARG"
    [ -d "$RELEASES/$ARG.partial" ] || die "no upload found in $RELEASES/$ARG.partial"
    previous=$(current_version)
    # Re-deploying an existing version (workflow re-run): set the old copy aside, then replace it.
    if [ -d "$RELEASES/$ARG" ]; then
      mv -T "$RELEASES/$ARG" "$RELEASES/$ARG.old.$$"
    fi
    mv -T "$RELEASES/$ARG.partial" "$RELEASES/$ARG"
    rm -rf "${RELEASES:?}/$ARG.old.$$"
    point_current_to "$ARG"
    # Nothing to roll back to when the same version is re-deployed.
    [ "$previous" = "$ARG" ] && previous=''
    echo "$previous"
    ;;

  switch)
    require_version "$ARG"
    [ -d "$RELEASES/$ARG" ] ||
      die "release $ARG not found. Available: $(list_releases | tr '\n' ' ')"
    point_current_to "$ARG"
    echo "current -> $ARG" >&2
    ;;

  previous)
    cur=$(current_version)
    [ -n "$cur" ] || die "no current release"
    prev=$(list_releases | awk -v cur="$cur" '$0 == cur { print last; exit } { last = $0 }')
    [ -n "$prev" ] || die "no release older than $cur on the server"
    echo "$prev"
    ;;

  prune)
    [[ $ARG =~ ^[1-9][0-9]*$ ]] || die "prune expects a positive number"
    cur=$(current_version)
    list_releases | head -n "-$ARG" | while read -r old; do
      [ "$old" = "$cur" ] && continue
      rm -rf "${RELEASES:?}/$old"
      echo "pruned $old" >&2
    done
    # Leftovers of interrupted uploads.
    find "$RELEASES" -mindepth 1 -maxdepth 1 -name '*.partial' -mmin +60 -exec rm -rf {} +
    ;;

  list)
    list_releases
    echo "current: $(current_version)"
    ;;

  *)
    die "unknown command '$CMD'"
    ;;
esac
