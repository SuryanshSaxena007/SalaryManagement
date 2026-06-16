#!/usr/bin/env bash
# Guardrail: no `float(` allowed in money paths.
#
# Why: salary and FX rate amounts MUST stay in Decimal end-to-end. A stray
# `float(...)` introduces silent precision loss (0.1 + 0.2 != 0.3) that
# corrupts aggregated reports. This grep is faster than any test and runs
# in CI before pytest.
#
# Scope: backend/app/ only. The seed script (`backend/seeds/seed.py`) uses
# `float(...)` to feed `random.triangular()` for salary distribution
# sampling — that's intentional and explicitly out of scope.
#
# Exit: 0 if clean, 1 if any match found.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$ROOT/backend/app"

if [ ! -d "$TARGET" ]; then
  echo "FAIL: $TARGET not found"
  exit 1
fi

# grep -RnE returns 0 if matches found, 1 if none. Invert for our purposes.
matches=$(grep -RnE 'float\(' "$TARGET" --include='*.py' 2>/dev/null || true)

if [ -z "$matches" ]; then
  echo "OK: no float() in backend/app/ — Decimal discipline holds"
  exit 0
fi

echo "FAIL: float() found in backend/app/ — money paths must stay Decimal"
echo "$matches"
exit 1
