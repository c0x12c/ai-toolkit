---
name: spartan:benchmark
description: Benchmark with a val split to tune on and a sealed test split run once. Sets up the guard in the repo, creates a benchmark, runs the final test, or shows status.
argument-hint: "[setup | new \"name\" | test \"name\" | status]"
---

# Benchmark: {{ args[0] | default: "status" }}

Tune on val, report a sealed test split nobody tuned on, run it exactly once. Load the
`benchmark-splits` skill first and follow it; this command only routes.

## Find the skill folder

First that exists: `${CLAUDE_PLUGIN_ROOT}/skills/benchmark-splits` (plugin install; skip it if the
placeholder was not filled in), `.claude/skills/benchmark-splits`, `~/.claude/skills/benchmark-splits`.
Call it `SKILL_DIR`. None → tell the user to run `npx @c0x12c/ai-toolkit@latest` and stop.

## Steps

### setup (also runs first for `new` and `test` when the repo has no `scripts/benchmark/seal-test.sh`)
1. Must be in a git repo; `jq` must be installed.
2. Run `bash "$SKILL_DIR/install.sh"` from the repo root. Show its output.
3. A `DIFFERS` line: show the diff and ask before replacing. A gitignore warning: propose the
   `!`-exceptions so teammates get the files.
4. Tell the user to commit the added files and restart Claude Code so the hook loads.
5. If `install.sh` printed `added` or `updated` for anything, **stop here**, even when `new` or `test` was
   asked for and even in auto mode: the hook is not loaded in this session, so nothing guards a split
   yet. Ask the user to restart Claude Code and rerun the command. Go on only when every line says `same`.

### new "name"
6. Ask (or derive from the code) what is scored, where the harness lives, the case format, how a case is
   graded, and the source material the cases come from.
7. Write `<dir>/<name>.val.json` in this session.
8. Spawn a fresh subagent to write and seal `<dir>/<name>.test.json.gz` with the brief in the skill
   (step 2). Relay only the line it returns.
9. Wire the harness: val by default; under `BENCHMARK_SPLIT=test` the whole split alone, only if its
   sha256 is `BENCHMARK_SPLIT_SHA256`, logging off, totals only to `BENCHMARK_REPORT`; the runner reruns
   when the env vars change.
10. Run val once to prove the harness. Never run the test split here.

### test "name"
11. Check: the result file does not exist, tracked files are committed, the command passes on val.
12. Say plainly that this spends the split, and wait for the user's yes, even in auto mode.
13. `scripts/benchmark/run-test-once.sh <dir>/<name>.test.json.gz -- <command>` (env vars after `--`).
    It hides the command's output, shows the totals, and commits the result file itself.
14. Push the branch: worktrees of this repo already see the split as claimed, other clones only once the
    result commit reaches them. Report val and test side by side.

### status
15. `find . -name '*.val.json' -not -path '*/node_modules/*'` and, beside each, whether a sealed split
    and a result file exist (list names only). Say which benchmarks have no test split and which are spent.

## Rules

- Never read, grep, decompress or summarise a sealed split, and never ask the subagent about its cases.
- A hook refusal means go back to val; never route around it.
- One test run per split. A new final number needs a new split under a new name.
