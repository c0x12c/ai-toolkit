# Benchmark Splits

Applies whenever you create, tune against, run or report a benchmark: a scored set of cases graded
against a solution (an eval set, a golden set, a scored live test or end-to-end case).

## The Rule

| Split | File | Use |
|---|---|---|
| Val | `<name>.val.json` | Tune on it as often as you like |
| Test | `<name>.test.json.gz` | Sealed. Never read, searched, decompressed, printed, summarised or edited |
| Result | `<name>.test-result.json` | Written by the one test run; the split is spent |

- Every benchmark gets both splits. Use `/spartan:benchmark new "name"`; it sets up the project guard
  (rule, scripts, hook) on first use.
- A fresh subagent writes the test split from the source material only and seals it with
  `scripts/benchmark/seal-test.sh`. It never hands the cases back; never ask it to.
- Every change to the solution is measured on val only.
- The test split runs exactly once, after val is good and the solution is committed, through
  `scripts/benchmark/run-test-once.sh` (`/spartan:benchmark test "name"`). That number is the final result,
  reported next to val.
- After the run, a new final number needs a new test split under a new name. Never rerun, reseal or edit a
  spent split.
- A set you have already run while changing the solution is val, whatever it was called.

## Why

A set you tune on stops measuring anything. A number from it says how well the solution fits those
cases, not how it does on a case nobody tuned for.

## Enforcement

The project hook (`scripts/claude-hooks/guard-benchmark-test.sh`, registered in `.claude/settings.json`)
refuses tool calls on a sealed split. A refusal means stop and go back to val. Never route around it with
another tool, path, copy or encoding.
