#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  echo "Missing .env at project root"
  exit 1
fi

# shellcheck disable=SC1091
source .env

podman network exists laundry_net || podman network create laundry_net
podman volume exists pg_data || podman volume create pg_data

if podman container exists db; then
  podman start db >/dev/null
else
  podman run -d \
    --name db \
    --network laundry_net \
    -e POSTGRES_DB="$POSTGRES_DB" \
    -e POSTGRES_USER="$POSTGRES_USER" \
    -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
    -v pg_data:/var/lib/postgresql/data \
    -p 5432:5432 \
    postgres:16-alpine >/dev/null
fi

echo "Postgres is running in container: db"
