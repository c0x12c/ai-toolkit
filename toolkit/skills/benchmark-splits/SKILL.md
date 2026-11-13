---
name: benchmark-splits
description: "Val/test discipline for benchmarks: a val split to tune on and a sealed test split, written by a fresh subagent and run exactly once. Use when creating a benchmark or eval set, tuning a prompt/model/solution against scored cases, running a final evaluation, or reporting a benchmark number."
allowed_tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Agent
---

# Benchmark Splits

Turns "we have some scored cases" into a benchmark whose final number means what it says: tune on val,
report a test split nobody tuned on, run once. `/spartan:benchmark` drives it.

## When to Use

- Creating a benchmark, eval set, golden set or scored live test
- Iterating on a prompt, model, extractor or pipeline against scored cases
- Running or reporting the final number for a change

## Files

| File | Role |
|---|---|
| `<name>.val.json` | Tune on it freely |
| `<name>.test.json.gz` | Sealed test split; never read |
| `<name>.test-result.json` | Written by the one test run; the split is spent |

The project gets the enforcement from `install.sh` (in this skill's folder): the rule
`.claude/rules/benchmark-splits.md`, `scripts/benchmark/seal-test.sh`, `scripts/benchmark/run-test-once.sh`,
the PreToolUse hook `scripts/claude-hooks/guard-benchmark-test.sh` registered in `.claude/settings.json`,
and `scripts/test-benchmark-guard.sh`. Committed, they bind every teammate's Claude Code.

## Process

### 1. Val split
Write it in the main session, in the format the harness reads. Each case states its input, the expected
answer, and why it is hard (what it is confusable with).

### 2. Test split, by a fresh subagent
Spawn a `general-purpose` subagent with a brief that is complete on its own:
- Goal, case format and how the grader scores a case (so every case is gradable).
- Allowed reading: the source material, the answer-key vocabulary, the val split (to avoid repeats).
- Forbidden: the solution (prompts, extractor and grader code, earlier reports), tests, git history.
- Size and spread (how many cases, how many per kind), and that no case may repeat a val case.
- Sealing: one Bash call whose first line is exactly
  `scripts/benchmark/seal-test.sh <dir>/<name>.test.json.gz <<'CASES'`, the JSON array, then `CASES`.
  No temp files, no `cd`, no pipes.
- Reply: only the line the script prints. Never the cases, a sample or a summary.

### 3. Harness
Default run scores val. `BENCHMARK_SPLIT=test` loads the gzip split and scores it alone. If
`BENCHMARK_REPORT` is set, write the totals there (never per-case lines: the result file is committed).
Make the test runner rerun when `BENCHMARK_SPLIT` changes (Gradle: `inputs.property('benchmarkSplit',
System.getenv('BENCHMARK_SPLIT') ?: '')` on the test task; pytest/vitest have no cache to defeat).

### 4. Final run
Val good enough, solution committed, the command checked on val, the user's yes (it spends the split):
`scripts/benchmark/run-test-once.sh <dir>/<name>.test.json.gz -- <command>`. Commit the result file.
Report val and test side by side.

## Gotchas

- **The hook refuses a command that only names a sealed file.** A `gh pr create --body "..."` or a commit
  message mentioning `x.test.json.gz` is blocked. Write the text to a file and pass `--body-file` / `-F`.
  Stage a sealed file by its directory (`git add <dir>`), not by name.
- **A cached test task spends the split for nothing.** Gradle reports a test task UP-TO-DATE when only an
  env var changed, so the run-once script records a run that never ran. Declare the env var as an input.
- **Any run spends the split, failed or not.** A compile error or a missing API key on the test run still
  writes the result file. Run the exact command on val first.
- **The subagent is the only one who saw the cases.** Do not resume it, ask it follow-ups about the cases,
  or read its transcript file. Its context is the leak.
- **A set you have run while changing the solution is val now.** Rename it `<name>.val.json` and seal a
  new test split; do not keep calling it blind or held-out.
- **Hooks load at session start.** After `install.sh` registers the hook, restart Claude Code (or review it
  in `/hooks`) before trusting it in the current session.
- **Env vars go after `--`.** The hook allows only commands that start with the script path:
  `run-test-once.sh <split> -- env LIVE=1 <cmd>`, not `LIVE=1 run-test-once.sh ...`.

## Rules

- Never read, grep, decompress, print, summarise or edit a `*.test.json.gz`, in any session or subagent.
- Never rerun, reseal or edit a spent split; a new final number needs a new split under a new name.
- Never report a val number as the final result.
