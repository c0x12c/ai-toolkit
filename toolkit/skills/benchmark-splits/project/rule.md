# Benchmarks: tune on val, run the sealed test split once

No `paths:` key on purpose: this rule loads in every session. It applies whenever you create, change,
run or report a benchmark (a scored set of cases graded against a solution: a live model test, an eval
script, a scored end-to-end case). `/spartan:benchmark` runs the workflow below.

## Every benchmark has two splits

| File | What it is |
|---|---|
| `<name>.val.json` | The val split. Read it, add to it, run it as often as you like. All tuning happens here. |
| `<name>.test.json.gz` | The sealed test split. Never read, searched, decompressed, printed, summarised or edited. |
| `<name>.test-result.json` | Written once by `scripts/benchmark/run-test-once.sh`. Its existence means the test split is spent. |

The three sit side by side, next to the harness that scores them.

## Creating a benchmark

1. Write the val split in your own session, from the source material and the solution's needs.
2. Have a **new subagent** write the test split. Brief it with the source material (the document, the
   spec, the answer-key vocabulary, the val split so it does not repeat a case) and the case format.
   Forbid it the solution: prompts, extractor or grader code, earlier run reports. It pipes the cases
   straight into `scripts/benchmark/seal-test.sh <dir>/<name>.test.json.gz` and returns only the line
   that script prints (count and sha256). Never ask it for the cases, a sample, or a summary of them, never
   resume it, and never open its transcript or task output file: they hold every case.
3. The harness scores val by default. It reads the test split (gzip) only when `BENCHMARK_SPLIT=test`,
   then scores the whole test split alone (no case filter), and only if the file's sha256 equals
   `BENCHMARK_SPLIT_SHA256`. On a test run it turns logging off and prints totals only, in its report files
   and its assertion messages alike, and writes them to the file named by `BENCHMARK_REPORT`.

## Improving a solution

- Measure every change on val only. Do not look at the test split to find what is missing.
- When val is good enough, commit the solution, check the run command on val, then run the test once,
  from the repository root:
  `scripts/benchmark/run-test-once.sh <dir>/<name>.test.json.gz -- <command>` (put env vars after `--`,
  e.g. `-- env LIVE=1 ./gradlew test ...`). It hides the command's output, shows the `BENCHMARK_REPORT`
  totals, and commits the result file when the run starts and again when it ends. Push it, so no other
  branch or worktree runs the split again.
- Report the test number as the final result, next to the val number, in the PR.
- After the test run, changes are measured on val again. A new final number needs a new test split
  under a new name, written the same way. Never rerun, reseal, or edit a spent split.

## Enforcement

`.claude/settings.json` runs `scripts/claude-hooks/guard-benchmark-test.sh` before every Read, Edit,
Write, Grep, Glob and Bash call. It refuses a call on a `*.test.json.gz` file (by name or by a
`*.test*` glob), any command naming one or setting `BENCHMARK_SPLIT=test` other than the two
`scripts/benchmark/` scripts, a recursive or test-path search inside gzip files (`zgrep -r`, `rg -z`), and
any read of a subagent transcript. A command that only mentions a sealed file's name (a PR body, a commit
message) is refused too: write that text to a file and pass the file. A refusal means: stop and go back to
val. Do not work around it (another tool, another path, a copy, an encoded read). The hook catches
mistakes; this rule is what you follow. `scripts/test-benchmark-guard.sh` checks the hook and both scripts.
