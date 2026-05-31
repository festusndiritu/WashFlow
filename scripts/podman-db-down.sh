#!/usr/bin/env bash
set -euo pipefail

if podman container exists db; then
  podman stop db >/dev/null || true
  podman rm db >/dev/null || true
fi

echo "Postgres container removed: db"
