#!/usr/bin/env bash
set -euo pipefail

VERSION=$(tr -d ' \n' < version.txt)

export VERSION
export VITE_VERSION="$VERSION"

echo "Building version $VERSION"

echo "Building npm"
cd web
npm run build > /dev/null
cd ..

echo "Building go"

go build -ldflags "-X main.Version=$VERSION" > /dev/null



chmod 775 pocket-ssot
chmod 755 package/postinst
chmod 755 package/postrm
chmod 755 package/postinstall.sh
chmod 755 package/postuninstall.sh


echo "Building .deb"

fpm -s dir -t deb \
  -n pocket-ssot \
  -v $VERSION \
  --after-install package/postinst \
  --after-remove package/postrm \
  \
  ./pocket-ssot=/usr/bin/pocket-ssot \
  package/pocket-ssot.service=/lib/systemd/system/pocket-ssot.service \
  package/pocket-ssot.env=/etc/pocket-ssot/pocket-ssot.env \
  docs/README.md=/usr/share/doc/pocket-ssot/README.md \
  docs/LICENSE=/usr/share/doc/pocket-ssot/LICENSE > /dev/null


echo "Building .rpm"

fpm -s dir -t rpm \
  -n pocket-ssot \
  -v $VERSION \
  --after-install package/postinstall.sh \
  --after-remove package/postuninstall.sh \
  \
  ./pocket-ssot=/usr/bin/pocket-ssot \
  package/pocket-ssot.service=/lib/systemd/system/pocket-ssot.service \
  package/pocket-ssot.env=/etc/pocket-ssot/pocket-ssot.env \
  docs/README.md=/usr/share/doc/pocket-ssot/README.md \
  docs/LICENSE=/usr/share/doc/pocket-ssot/LICENSE > /dev/null
