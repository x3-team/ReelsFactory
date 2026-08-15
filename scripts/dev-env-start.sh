#!/usr/bin/env bash
# Per-boot runtime init for the dev environment: Postgres + Redis.
# Safe to run repeatedly — every step checks state before acting.
set -euo pipefail

log() { printf '[dev-env:start] %s\n' "$*"; }

start_postgres() {
  if ! command -v pg_isready >/dev/null 2>&1; then
    log "postgres is not installed — skipping (run scripts/dev-env-install.sh)"
    return 0
  fi

  if pg_isready -q 2>/dev/null; then
    log "postgres already accepting connections"
    return 0
  fi

  local ver cluster
  ver="$(pg_lsclusters -h 2>/dev/null | awk 'NR==1{print $1}')"
  cluster="$(pg_lsclusters -h 2>/dev/null | awk 'NR==1{print $2}')"
  if [ -z "${ver}" ] || [ -z "${cluster}" ]; then
    log "no postgres cluster found"
    return 1
  fi

  log "starting postgres cluster ${ver}/${cluster}"
  sudo pg_ctlcluster "${ver}" "${cluster}" start || true

  for _ in $(seq 1 30); do
    if pg_isready -q 2>/dev/null; then
      log "postgres ready"
      return 0
    fi
    sleep 1
  done

  log "postgres did not become ready in time"
  return 1
}

ensure_database() {
  # Matches DATABASE_URL from .env.example: postgres:postgres@localhost:5432/reelsfactory
  sudo -u postgres psql -q -c "ALTER USER postgres WITH PASSWORD 'postgres'" >/dev/null
  if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='reelsfactory'" | grep -q 1; then
    log "creating database reelsfactory"
    sudo -u postgres createdb reelsfactory
  fi
}

start_redis() {
  # Optional in dev: without REDIS_URL the app falls back to the in-process queue.
  if ! command -v redis-server >/dev/null 2>&1; then
    log "redis is not installed — analysis will use the in-process queue"
    return 0
  fi

  if redis-cli ping >/dev/null 2>&1; then
    log "redis already running"
    return 0
  fi

  log "starting redis"
  sudo service redis-server start >/dev/null 2>&1 || redis-server --daemonize yes

  for _ in $(seq 1 20); do
    if redis-cli ping >/dev/null 2>&1; then
      log "redis ready"
      return 0
    fi
    sleep 1
  done

  log "redis did not become ready — continuing without it"
  return 0
}

start_postgres
ensure_database
start_redis
log "done"
