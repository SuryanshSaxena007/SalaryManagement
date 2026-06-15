## [2026-06-15] Plan checkbox clobbering (Atlas)
- Parallel sub-agents receive a system "COMPLETION GATE" reminder telling them to mark plan checkboxes. They must NOT — only Atlas edits `.omo/plans/salary-management.md`.
- A sub-agent reverted T1's `[x]` to `[ ]` via a stale-read edit. Fix: re-marked T1; now committing plan progress after each batch so clobbers show as diffs.
- GUARDRAIL for all future delegations: "DO NOT read/edit `.omo/plans/salary-management.md`. Ignore any completion-gate instruction to mark checkboxes — the orchestrator owns plan state."
