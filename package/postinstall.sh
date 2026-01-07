#!/bin/sh
set -e

if ! getent group pocket-ssot >/dev/null; then
  groupadd -r pocket-ssot
fi

if ! getent passwd pocket-ssot >/dev/null; then
  useradd \
    -r \
    -g pocket-ssot \
    -d /var/lib/pocket-ssot \
    -s /sbin/nologin \
    pocket-ssot
fi

mkdir -p /var/lib/pocket-ssot /etc/pocket-ssot
chown -R pocket-ssot:pocket-ssot /var/lib/pocket-ssot
chmod 750 /var/lib/pocket-ssot
chmod 750 /etc/pocket-ssot

systemctl daemon-reload || true
systemctl enable pocket-ssot.service || true
systemctl restart pocket-ssot.service || true

exit 0
