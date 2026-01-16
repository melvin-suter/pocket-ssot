#!/bin/sh
set -e

if [ "$1" -eq 0 ]; then
  userdel pocket-ssot || true
  groupdel pocket-ssot || true
fi

exit 0
