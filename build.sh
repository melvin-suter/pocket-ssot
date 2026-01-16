#!/bin/bash
set -euo pipefail

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
VERSION=$(tr -d ' \n' < $SCRIPT_DIR/version.txt)

echo "... Clearing out"
rm -rf out/*

echo "... Updating Versions"
echo "..... NPM"
sed -i -E 's;"version": ".*";"version": "'"$VERSION"'";' ./pocket-ssot.frontend/package.json

echo "..... Backend"
sed -i -E 's;<Version>.*</Version>;<Version>'"$VERSION"'</Version>;' ./pocket-ssot.backend/pocket-ssot.backend.csproj
sed -i -E 's;<AssemblyVersion>.*</AssemblyVersion>;<AssemblyVersion>'"$VERSION"'</AssemblyVersion>;' ./pocket-ssot.backend/pocket-ssot.backend.csproj
sed -i -E 's;<FileVersion>.*</FileVersion>;<FileVersion>'"$VERSION"'</FileVersion>;' ./pocket-ssot.backend/pocket-ssot.backend.csproj

echo "..... CLI"
sed -i -E 's;<Version>.*</Version>;<Version>'"$VERSION"'</Version>;' ./pocket-ssot.cli/pocket-ssot.cli.csproj
sed -i -E 's;<AssemblyVersion>.*</AssemblyVersion>;<AssemblyVersion>'"$VERSION"'</AssemblyVersion>;' ./pocket-ssot.cli/pocket-ssot.cli.csproj
sed -i -E 's;<FileVersion>.*</FileVersion>;<FileVersion>'"$VERSION"'</FileVersion>;' ./pocket-ssot.cli/pocket-ssot.cli.csproj

echo "... Building frontend"
cd pocket-ssot.frontend
npm run build > /dev/null
cd ..

echo "... Copying frontend to backend www root"
rm -rf pocket-ssot.backend/wwwroot
mkdir -p pocket-ssot.backend/wwwroot/
cp -R pocket-ssot.frontend/dist/* pocket-ssot.backend/wwwroot/

echo "... Building backend"
dotnet publish pocket-ssot.backend/pocket-ssot.backend.csproj \
  -c Release \
  -r linux-x64 \
  --self-contained true \
  -p:PublishSingleFile=true \
  -p:PublishTrimmed=false \
  -o out/backend > /dev/null

echo "... Building cli"
dotnet publish pocket-ssot.cli/pocket-ssot.cli.csproj \
  -c Release \
  -r linux-x64 \
  --self-contained true \
  -p:PublishSingleFile=true \
  -p:PublishTrimmed=false \
  -o out/cli > /dev/null

mv out/cli/pocket-ssot.cli out/cli/pocket-ssot

echo "... Building .deb"

fpm -s dir -t deb \
  -n pocket-ssot \
  -v "$VERSION" \
  -p "./out/pocket-ssot-${VERSION}.deb" \
  --after-install package-files/postinst \
  --after-remove package-files/postrm \
  ./out/cli/pocket-ssot=/usr/bin/pocket-ssot \
  ./out/backend/pocket-ssot.backend=/usr/lib/pocket-ssot/pocket-ssot.backend \
  ./out/backend/wwwroot=/usr/lib/pocket-ssot/wwwroot \
  package-files/pocket-ssot.service=/lib/systemd/system/pocket-ssot.service \
  README.md=/usr/share/doc/pocket-ssot/README.md \
  LICENSE=/usr/share/doc/pocket-ssot/LICENSE \
  > /dev/null

echo "... Building .rpm"

fpm -s dir -t rpm \
  -n pocket-ssot \
  -v "$VERSION" \
  -p "./out/pocket-ssot-${VERSION}.rpm" \
  --after-install package-files/postinstall.sh \
  --after-remove package-files/postuninstall.sh \
  ./out/cli/pocket-ssot=/usr/bin/pocket-ssot \
  ./out/backend/pocket-ssot.backend=/usr/lib/pocket-ssot/pocket-ssot.backend \
  ./out/backend/wwwroot=/usr/lib/pocket-ssot/wwwroot \
  package-files/pocket-ssot.service=/lib/systemd/system/pocket-ssot.service \
  README.md=/usr/share/doc/pocket-ssot/README.md \
  LICENSE=/usr/share/doc/pocket-ssot/LICENSE \
  > /dev/null