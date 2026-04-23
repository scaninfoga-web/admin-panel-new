#!/usr/bin/env bash
# =============================================================================
# Scaninfoga Admin Panel — Local Deploy Script
# Runs on YOUR machine. Does the following:
#   1. Ask branch + commit message → git commit + push
#   2. Build production .env (copy local, apply PRODUCTION_* overrides)
#   3. SCP .env to server
#   4. SSH → git pull → docker build → stop old → run new container on port 3005
#
# Backend + DB are NOT touched. Container attaches to scaninfoga-network so it
# can reach the backend by alias (primary-backend:3000) if needed.
#
# Usage: bash scripts/deploy.sh
# Requires: git, python3, scp, ssh
# =============================================================================
set -euo pipefail

# ── Server config ─────────────────────────────────────────────────────────────
SERVER_IP="100.97.244.36"
SERVER_USER="scaninfoga"
REPO_DIR="/home/scaninfoga/server_data/admin-panel-new"

CONTAINER_NAME="scaninfoga-admin-panel"
IMAGE_BASE="scaninfoga-admin-panel"
NETWORK="scaninfoga-network"
HOST_PORT=3005
CONTAINER_PORT=3005

err() { printf "ERROR: %s\n" "$*" >&2; }

# Verify we are inside the git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  err "Not inside a git repository."; exit 1
fi

# Local .env must exist — source of truth for production .env
ENV_FILE="$(git rev-parse --show-toplevel)/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  err ".env not found at ${ENV_FILE}"; exit 1
fi

# SSH key passphrase for git ops on server (optional — blank if key has no passphrase)
SERVER_PASSWORD=$(grep -E '^SERVER_PASSWORD=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r' || true)

# ── Local ssh-agent: load the key once so push / scp / ssh don't each prompt ─
LOCAL_KEY="${LOCAL_SSH_KEY:-$HOME/.ssh/id_ed25519}"
_AGENT_STARTED=0
if [[ -f "$LOCAL_KEY" ]]; then
  # Start an agent only if one isn't already exported in this shell
  if [[ -z "${SSH_AUTH_SOCK:-}" ]] || ! ssh-add -l > /dev/null 2>&1; then
    eval "$(ssh-agent -s)" > /dev/null
    _AGENT_STARTED=1
  fi
  # Add the key if not already loaded (prompts for passphrase once)
  if ! ssh-add -l 2>/dev/null | grep -q "$(ssh-keygen -lf "$LOCAL_KEY" 2>/dev/null | awk '{print $2}')"; then
    echo "Loading ${LOCAL_KEY} into ssh-agent (enter passphrase once)..."
    ssh-add "$LOCAL_KEY"
  fi
fi
cleanup() {
  rm -f "${PROD_ENV_TMP:-}"
  [[ "$_AGENT_STARTED" -eq 1 ]] && ssh-agent -k > /dev/null 2>&1 || true
}
trap cleanup EXIT

echo ""
echo "=== Scaninfoga Admin Panel Deploy ==="

# ── PHASE 1 — Branch & Git ────────────────────────────────────────────────────
echo ""
echo "-- Phase 1: Branch & Git"

echo "Select branch: 1) dev  2) main"
printf "Choice [1/2]: "; read -r _choice
case "$_choice" in
  1) BRANCH="dev"  ;;
  2) BRANCH="main" ;;
  *) err "enter 1 or 2"; exit 1 ;;
esac
echo "Branch: ${BRANCH}"

# Switch to branch
if ! git show-ref --verify --quiet "refs/heads/${BRANCH}" 2>/dev/null; then
  git fetch origin "${BRANCH}" 2>/dev/null || { err "branch '${BRANCH}' not on origin"; exit 1; }
  git checkout -b "${BRANCH}" "origin/${BRANCH}"
else
  git checkout "${BRANCH}" --quiet
fi

# Show dirty files
DIRTY=$(git status --short | wc -l | tr -d ' ')
if [[ "$DIRTY" -gt 0 ]]; then
  echo ""
  git status --short | sed 's/^/    /'
  echo ""
  printf "Commit message (Enter = skip, deploy current HEAD): "; read -r COMMIT_MSG

  if [[ -n "$COMMIT_MSG" ]]; then
    git add -A
    git commit -m "$COMMIT_MSG" --quiet
    echo "Committed: $(git rev-parse --short=8 HEAD) — \"${COMMIT_MSG}\""
  else
    echo "Skipping commit — deploying current HEAD"
  fi
else
  echo "Nothing to commit"
fi

LOCAL_SHA=$(git rev-parse --short=8 HEAD)

# Push
git config advice.ignoredHook false 2>/dev/null || true
echo "Pushing ${BRANCH} to origin..."
git push origin "${BRANCH}"
echo "Pushed"

# ── PHASE 2 — Stage local .env for upload ────────────────────────────────────
echo ""
echo "-- Phase 2: Staging local .env"

PROD_ENV_TMP=$(mktemp /tmp/.env.admin.XXXXXX)

cp "$ENV_FILE" "$PROD_ENV_TMP"
chmod 600 "$PROD_ENV_TMP"
echo ".env staged"

# ── PHASE 3 — Tailscale check ─────────────────────────────────────────────────
echo ""
echo "-- Phase 3: Tailscale"
echo "Pinging ${SERVER_IP}..."
if [[ "$(uname)" == "Darwin" ]]; then
  PING_CMD="ping -c 2 -t 3"
else
  PING_CMD="ping -c 2 -W 3"
fi

if ! $PING_CMD "$SERVER_IP" > /dev/null 2>&1; then
  echo "ERROR: cannot reach ${SERVER_IP} — run: tailscale up" >&2; exit 1
fi
echo "Server reachable"

# ── PHASE 4 — Copy .env to server ─────────────────────────────────────────────
echo ""
echo "-- Phase 4: Copy .env to server"

# Ensure repo dir exists on server before scp
ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 \
    "${SERVER_USER}@${SERVER_IP}" "mkdir -p '${REPO_DIR}'"

scp -o StrictHostKeyChecking=accept-new \
    -o ConnectTimeout=10 \
    "$PROD_ENV_TMP" \
    "${SERVER_USER}@${SERVER_IP}:${REPO_DIR}/.env"

echo ".env copied to server"

# ── PHASE 5 — Remote deploy ───────────────────────────────────────────────────
echo ""
echo "-- Phase 5: Remote deploy on ${SERVER_USER}@${SERVER_IP}"
echo ""

ssh -o StrictHostKeyChecking=accept-new \
    -o ConnectTimeout=10 \
    -o ServerAliveInterval=30 \
    -o ServerAliveCountMax=40 \
    "${SERVER_USER}@${SERVER_IP}" \
    "export DEPLOY_BRANCH='${BRANCH}' DEPLOY_SHA='${LOCAL_SHA}' REPO_DIR='${REPO_DIR}' GIT_KEY_PASS='${SERVER_PASSWORD}' CONTAINER_NAME='${CONTAINER_NAME}' IMAGE_BASE='${IMAGE_BASE}' NETWORK='${NETWORK}' HOST_PORT='${HOST_PORT}' CONTAINER_PORT='${CONTAINER_PORT}'; bash -s" << 'REMOTE'

set -euo pipefail

ENV_FILE="${REPO_DIR}/.env"
chmod 600 "${ENV_FILE}"
echo "Machine: $(hostname) | User: $(whoami) | Branch: ${DEPLOY_BRANCH} | SHA: ${DEPLOY_SHA}"

# ── 5.1 Git pull ──────────────────────────────────────────────────────────────
echo ""
echo "--- 5.1 git pull: ${DEPLOY_BRANCH}"

cd "${REPO_DIR}"

# Load SSH key passphrase non-interactively via ssh-agent + SSH_ASKPASS (if set)
if [[ -n "${GIT_KEY_PASS:-}" ]]; then
  eval "$(ssh-agent -s)" > /dev/null 2>&1
  _ASKPASS=$(mktemp)
  printf '#!/bin/sh\nprintf "%%s" "%s"\n' "${GIT_KEY_PASS}" > "${_ASKPASS}"
  chmod 700 "${_ASKPASS}"
  SSH_ASKPASS="${_ASKPASS}" SSH_ASKPASS_REQUIRE=force DISPLAY=:0 \
    ssh-add ~/.ssh/id_ed25519 < /dev/null 2>/dev/null || true
  rm -f "${_ASKPASS}"
fi

# If the repo isn't cloned yet, bail with a clear message — first-time setup is manual
if [[ ! -d "${REPO_DIR}/.git" ]]; then
  echo "ERROR: ${REPO_DIR} is not a git repo. Clone it first:" >&2
  echo "  git clone git@github.com:scaninfoga-web/admin-panel-new.git ${REPO_DIR}" >&2
  exit 1
fi

CURRENT=$(git branch --show-current)
if [[ "${CURRENT}" != "${DEPLOY_BRANCH}" ]]; then
  echo "Switching branch: ${CURRENT} -> ${DEPLOY_BRANCH}"
  git checkout "${DEPLOY_BRANCH}" --quiet
fi

git pull origin "${DEPLOY_BRANCH}" --rebase
SERVER_SHA=$(git rev-parse --short=8 HEAD)
echo "Repo at ${SERVER_SHA}"

ssh-agent -k > /dev/null 2>&1 || true

IMAGE_TAG="${IMAGE_BASE}:${SERVER_SHA}"

# ── 5.2 Ensure network exists ────────────────────────────────────────────────
# scaninfoga-network is normally created by the backend infra compose. If it's
# missing (admin panel deployed before backend on a fresh host) create it so
# the container can still come up standalone.
echo ""
echo "--- 5.2 Docker network: ${NETWORK}"
if ! docker network inspect "${NETWORK}" > /dev/null 2>&1; then
  echo "Network not found — creating ${NETWORK}"
  docker network create "${NETWORK}" > /dev/null
fi
echo "Network ready"

# ── 5.3 Read NEXT_PUBLIC_BACKEND_URL from .env for build-arg ─────────────────
# NEXT_PUBLIC_* vars are baked into the client bundle at build time.
NEXT_PUBLIC_BACKEND_URL=$(grep -E '^NEXT_PUBLIC_BACKEND_URL=' "${ENV_FILE}" | cut -d= -f2- | tr -d '\r' || true)
if [[ -z "${NEXT_PUBLIC_BACKEND_URL}" ]]; then
  echo "WARN: NEXT_PUBLIC_BACKEND_URL empty — client will call relative URLs"
else
  echo "Build-arg NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}"
fi

# ── 5.4 Build image ──────────────────────────────────────────────────────────
echo ""
echo "--- 5.4 Building ${IMAGE_TAG}"

T0=$(date +%s)
DOCKER_BUILDKIT=1 docker build \
  --file "${REPO_DIR}/Dockerfile" \
  --tag  "${IMAGE_TAG}" \
  --tag  "${IMAGE_BASE}:latest" \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  --build-arg "NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}" \
  --progress plain \
  "${REPO_DIR}"

echo "Built in $(( $(date +%s) - T0 ))s"

# ── 5.5 Stop + remove old container ──────────────────────────────────────────
echo ""
echo "--- 5.5 Replacing container ${CONTAINER_NAME}"

if docker ps -a --format '{{.Names}}' | grep -qx "${CONTAINER_NAME}"; then
  docker stop "${CONTAINER_NAME}" > /dev/null 2>&1 || true
  docker rm   "${CONTAINER_NAME}" > /dev/null 2>&1 || true
  echo "Old container removed"
else
  echo "No existing container"
fi

# ── 5.6 Run new container ────────────────────────────────────────────────────
echo ""
echo "--- 5.6 Starting new container"

docker run -d \
  --name "${CONTAINER_NAME}" \
  --restart unless-stopped \
  --network "${NETWORK}" \
  --env-file "${ENV_FILE}" \
  -e NODE_ENV=production \
  -e PORT="${CONTAINER_PORT}" \
  -p "${HOST_PORT}:${CONTAINER_PORT}" \
  --security-opt no-new-privileges:true \
  --log-driver json-file \
  --log-opt max-size=50m \
  --log-opt max-file=5 \
  "${IMAGE_TAG}" > /dev/null

echo "Container started"

# ── 5.7 Prune old images ─────────────────────────────────────────────────────
PRUNED=$(docker image prune -f --filter "until=24h" 2>&1 | grep -o "[0-9.]* [KMGB]*B reclaimed" || echo "0B")
echo "Pruned: ${PRUNED}"

echo ""
echo "Container status:"
docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "Deploy complete. SHA: ${SERVER_SHA}  Port: ${HOST_PORT}"

REMOTE

echo ""
echo "=== Deploy finished ==="
