#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
README="$ROOT/README.md"
fail=0

echo "=== readme_smoke check ==="

if [ ! -s "$README" ]; then
  echo "FAIL: README.md missing or empty"
  exit 1
fi
echo "  OK README.md exists"

# Must contain setup commands
for cmd in "make install" "make seed" "make test"; do
  if grep -q "$cmd" "$README"; then
    echo "  OK README contains '$cmd'"
  else
    echo "FAIL: README missing '$cmd'"
    fail=1
  fi
done

# Must have working markdown link format
links=$(grep -oE '\]\([^)]+\.md\)' "$README" | sed -E 's/\]\(([^)]+)\)/\1/' || true)
for link in $links; do
  if [ -f "$ROOT/$link" ]; then
    echo "  OK link exists: $link"
  else
    echo "FAIL: broken link $link"
    fail=1
  fi
done

# Line count ≤ 300
lines=$(wc -l < "$README" | tr -d ' ')
if [ "$lines" -le 300 ]; then
  echo "  OK README.md $lines lines (<=300)"
else
  echo "FAIL: README.md $lines lines (>300)"
  fail=1
fi

if [ "$fail" -eq 0 ]; then
  echo "=== readme_smoke: OK ==="
  exit 0
else
  echo "=== readme_smoke: FAILED ==="
  exit 1
fi
