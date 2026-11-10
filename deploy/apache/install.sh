#!/usr/bin/env bash
# Installs (or updates) the Moni Apache vhosts. Run ON THE VPS with sudo, from a copy of this folder:
#
#   scp -r deploy/apache <admin>@<vps>:/tmp/moni-apache
#   ssh -t <admin>@<vps> 'sudo bash /tmp/moni-apache/install.sh'
#
# Backs up the current files, installs the new ones, and only reloads Apache if the configuration
# test passes; otherwise the backup is restored and nothing changes for visitors.
set -euo pipefail

SRC=$(cd "$(dirname "$0")" && pwd)
DEST=/etc/apache2/sites-available
STAMP=$(date +%Y%m%d-%H%M%S)

[ "$(id -u)" = 0 ] || { echo "run with sudo" >&2; exit 1; }
[ -L /var/www/moni/current ] || { echo "/var/www/moni/current is missing: create a release first" >&2; exit 1; }

for f in moni.conf moni-le-ssl.conf; do
  if [ -f "$DEST/$f" ]; then
    cp -a "$DEST/$f" "$DEST/$f.bak-$STAMP"
  fi
  install -m 644 "$SRC/$f" "$DEST/$f"
done

a2enmod -q headers rewrite ssl
a2ensite -q moni moni-le-ssl

if apache2ctl configtest; then
  systemctl reload apache2
  echo "Apache reloaded. Backups: $DEST/*.bak-$STAMP"
else
  echo "Configuration test failed: restoring the previous files" >&2
  for f in moni.conf moni-le-ssl.conf; do
    if [ -f "$DEST/$f.bak-$STAMP" ]; then
      cp -a "$DEST/$f.bak-$STAMP" "$DEST/$f"
    fi
  done
  exit 1
fi
