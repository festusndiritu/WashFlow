#!/usr/bin/env bash
set -euo pipefail

for c in web api db; do
  if podman container exists "$c"; then
    podman rm -f "$c" >/dev/null || true
  fi
done

echo "Stack containers removed: web, api, db"
