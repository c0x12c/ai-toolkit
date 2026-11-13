# Benchmark Splits

> Full guide: use the `benchmark-splits` skill, or `/spartan:benchmark`

Applies whenever you create, tune against, run or report a benchmark: a scored set of cases graded
against a solution (an eval set, a golden set, a scored live test or end-to-end case). Once a project has
`.claude/rules/benchmark-splits.md` (written by `/spartan:benchmark setup`), that file governs.

| Split | File | Use |
|---|---|---|
| Val | `<name>.val.json` | Tune on it as often as you like |
| Test | `<name>.test.json.gz` | Sealed. Never read, searched, decompressed, printed, summarised or edited |
| Result | `<name>.test-result.json` | Written by the one test run; the split is spent |

- Every benchmark gets both splits: `/spartan:benchmark new "name"` (sets up the project guard first).
- A fresh subagent writes the test split from the source material only and seals it. Never ask it for the
  cases, never resume it, never open its transcript.
- Measure every change on val only. A set already run while the solution changed is val.
- Run the test split exactly once, after val is good and the solution is committed
  (`/spartan:benchmark test "name"`). Report that number as final, next to val.
- After the run, a new final number needs a new test split under a new name. Never rerun, reseal or edit
  a spent split.
- A hook refusal means go back to val. Never route around it with another tool, path, copy or encoding.
