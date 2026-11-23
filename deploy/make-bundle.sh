#!/usr/bin/env bash
# Packs the chain and the website into arkthro-bundle.tar.gz to upload to the server.
# Run on your own computer:  bash deploy/make-bundle.sh   (from the arkthro-chain folder)
# Never includes keys or chain data: only code, the explorer and the website.
set -euo pipefail

CHAIN="$(cd "$(dirname "$0")/.." && pwd)"
# The website and assistant folders sit next to this one (older checkouts still use argeni-* names).
pick() { for d in "$@"; do [ -d "$d" ] && { echo "$d"; return; }; done; echo "$1"; }
SITE="${SITE:-$(pick "$CHAIN/../arkthro-site" "$CHAIN/../argeni-site")}"
ASSISTANT="${ASSISTANT:-$(pick "$CHAIN/../arkthro-assistant" "$CHAIN/../argeni-assistant")}"
[ -d "$SITE" ] || { echo "Website folder not found: $SITE (set SITE=/path/to/site)"; exit 1; }
OUT="${OUT:-$PWD/arkthro-bundle.tar.gz}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$TMP/arkthro-bundle/chain" "$TMP/arkthro-bundle/site"
cp -R "$CHAIN/src" "$CHAIN/scripts" "$CHAIN/public" "$CHAIN/deploy" "$CHAIN/package.json" "$CHAIN/README.md" "$TMP/arkthro-bundle/chain/"
# The AI assistant: code only (no node_modules, never its .env with the API key).
if [ -d "$ASSISTANT" ]; then
  mkdir -p "$TMP/arkthro-bundle/assistant"
  cp "$ASSISTANT/server.mjs" "$ASSISTANT/package.json" "$ASSISTANT/package-lock.json" "$TMP/arkthro-bundle/assistant/"
fi
# foundations.html is hidden from the site on purpose, so it is not published.
# tripwire.html is an unpublished draft of the paper; .git is the site's history. Neither goes online.
rsync -a --exclude foundations.html --exclude tripwire.html --exclude '.git' --exclude '.DS_Store' "$SITE/" "$TMP/arkthro-bundle/site/"

# Key files are JSON files holding a private key; none may be published.
if grep -rlqE --include='*.json' 'privateKey' "$TMP/arkthro-bundle" || grep -rlqE 'sk-ant-[A-Za-z0-9_-]{30,}' "$TMP/arkthro-bundle"; then
  echo "Refusing to build: a key file or API key ended up in the bundle."; exit 1
fi
tar -czf "$OUT" -C "$TMP" arkthro-bundle
echo "wrote $OUT ($(du -h "$OUT" | cut -f1))"
