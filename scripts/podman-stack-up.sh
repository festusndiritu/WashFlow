#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  echo "Missing .env at project root"
  exit 1
fi

podman network exists laundry_net || podman network create laundry_net
podman volume exists pg_data || podman volume create pg_data

# Build images
podman build -t laundry-api:local ./api
podman build -t laundry-web:local ./web

# Recreate containers in dependency order
for c in web api db; do
  if podman container exists "$c"; then
    podman rm -f "$c" >/dev/null || true
  fi
done

# shellcheck disable=SC1091
source .env

podman run -d \
  --name db \
  --network laundry_net \
  -e POSTGRES_DB="$POSTGRES_DB" \
  -e POSTGRES_USER="$POSTGRES_USER" \
  -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
  -v pg_data:/var/lib/postgresql/data \
  postgres:16-alpine >/dev/null

podman run -d \
  --name api \
  --network laundry_net \
  --env-file .env \
  -p 8000:8000 \
  laundry-api:local >/dev/null

podman run -d \
  --name web \
  --network laundry_net \
  -p 8080:80 \
  laundry-web:local >/dev/null

echo "Stack is running: db, api, web"
echo "Open: http://localhost:8080"
