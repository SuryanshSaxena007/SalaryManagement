#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOCS="$ROOT/docs"
fail=0

require_nonempty() {
  if [ ! -s "$1" ]; then echo "FAIL: $1 missing or empty"; fail=1; fi
}

echo "=== docs_smoke check ==="

require_nonempty "$DOCS/requirements.md"
[ $? -eq 0 ] && echo "  OK requirements.md exists"

require_nonempty "$DOCS/architecture.md"
[ $? -eq 0 ] && echo "  OK architecture.md exists"

require_nonempty "$DOCS/decisions.md"
[ $? -eq 0 ] && echo "  OK decisions.md exists"

require_nonempty "$DOCS/tradeoffs.md"
[ $? -eq 0 ] && echo "  OK tradeoffs.md exists"

require_nonempty "$DOCS/ai-prompts.md"
[ $? -eq 0 ] && echo "  OK ai-prompts.md exists"

require_nonempty "$DOCS/design-notes.md"
[ $? -eq 0 ] && echo "  OK design-notes.md exists"

require_nonempty "$DOCS/performance.md"
[ $? -eq 0 ] && echo "  OK performance.md exists"

if grep -q 'mermaid' "$DOCS/architecture.md" 2>/dev/null; then
  echo "  OK architecture.md contains mermaid codeblock"
else
  echo "FAIL: architecture.md missing mermaid block"
  fail=1
fi

req_lines=$(wc -l < "$DOCS/requirements.md" | tr -d ' ')
if [ "$req_lines" -le 100 ]; then
  echo "  OK requirements.md $req_lines lines (<=100)"
else
  echo "FAIL: requirements.md $req_lines lines (>100)"
  fail=1
fi

dec_count=$(grep -c '^### ' "$DOCS/decisions.md" || true)
if [ "$dec_count" -ge 10 ]; then
  echo "  OK decisions.md has $dec_count ADR headings (>=10)"
else
  echo "FAIL: decisions.md has $dec_count ADR headings (<10)"
  fail=1
fi

prompt_count=$(grep -c '^## Prompt' "$DOCS/ai-prompts.md" || true)
if [ "$prompt_count" -ge 5 ]; then
  echo "  OK ai-prompts.md has $prompt_count prompts (>=5)"
else
  echo "FAIL: ai-prompts.md has $prompt_count prompts (<5)"
  fail=1
fi

# Performance doc must cover indexes + scaling
if grep -qi 'index' "$DOCS/performance.md" && grep -qi '10x\|10×\|scale' "$DOCS/performance.md"; then
  echo "  OK performance.md mentions indexes and scaling"
else
  echo "FAIL: performance.md should mention indexes and scaling"
  fail=1
fi

# Design notes must cover layers + invariants
if grep -qi 'layer\|service\|repository' "$DOCS/design-notes.md" && grep -qi 'invariant\|decimal\|all-or-nothing' "$DOCS/design-notes.md"; then
  echo "  OK design-notes.md covers layers and invariants"
else
  echo "FAIL: design-notes.md should cover layers and invariants"
  fail=1
fi

if [ "$fail" -eq 0 ]; then
  echo "=== docs_smoke: OK ==="
  exit 0
else
  echo "=== docs_smoke: FAILED ==="
  exit 1
fi
