#!/usr/bin/env bash
# Runs a benchmark's sealed test split, once. Refuses when <name>.test-result.json exists (the split is spent)
# or when tracked files are uncommitted (the result must name the commit it measured). Runs the command with
# BENCHMARK_SPLIT=test and BENCHMARK_REPORT=<file>; the harness writes its totals (never a case) there.
# The command's own output is hidden, because a failure message can quote test cases. The result file is
# committed when the run starts and again when it ends, so any run spends the split, failed or cut short;
# check the command on the val split first. Rule: .claude/rules/benchmark-splits.md.
#
#   scripts/benchmark/run-test-once.sh <dir>/<name>.test.json.gz -- <command...>
set -euo pipefail

usage="usage: scripts/benchmark/run-test-once.sh <dir>/<name>.test.json.gz -- <command...>"
sealed="${1:?$usage}"
shift
[ "${1:-}" = "--" ] || { echo "$usage" >&2; exit 2; }
shift
[ $# -gt 0 ] || { echo "$usage" >&2; exit 2; }
case "$sealed" in *.test.json.gz) ;; *) echo "run-test-once: the split must end in .test.json.gz" >&2; exit 2 ;; esac
[ -f "$sealed" ] || { echo "run-test-once: no sealed split at $sealed" >&2; exit 2; }
command -v jq >/dev/null || { echo "run-test-once: needs jq (brew install jq / apt-get install jq)" >&2; exit 2; }

result="${sealed%.test.json.gz}.test-result.json"
if [ -e "$result" ]; then
  echo "run-test-once: refused, $result exists ($(jq -r '"run " + .date + ", commit " + .commit' "$result"))." >&2
  echo "This test split is spent. Tune on val; a new final number needs a new test split under a new name." >&2
  exit 3
fi
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "run-test-once: refused, tracked files are uncommitted. Commit the solution first so the result names it." >&2
  exit 3
fi

commit=$(git rev-parse HEAD)
sha=$( (command -v sha256sum >/dev/null && sha256sum "$sealed" || shasum -a 256 "$sealed") | cut -d' ' -f1)
name=$(basename "${sealed%.test.json.gz}")
cmdline="$*"
log=$(mktemp)
report=$(mktemp)
trap 'rm -f "$log" "$report"' EXIT

record() { # exit-code-json report-text commit-label
  jq -n --arg benchmark "$name" --arg sealed_sha256 "$sha" --arg commit "$commit" \
    --arg date "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg command "$cmdline" --argjson exit_code "$1" \
    --arg report "$2" \
    '{benchmark: $benchmark, sealed_sha256: $sealed_sha256, commit: $commit, date: $date, command: $command,
      exit_code: $exit_code, report: $report}' >"$result"
  git add -- "$result"
  git commit -q -m "test(benchmark): $name test split $3" -- "$result" ||
    echo "run-test-once: could not commit $result; commit it yourself so the split stays spent." >&2
}

# Committed before the run, so a run cut short (Ctrl-C, a crash), a git clean or a fresh worktree still
# finds the split spent.
record null "started; no result recorded" "started"

echo "run-test-once: BENCHMARK_SPLIT=test at commit ${commit:0:9}. The command's output is hidden; only the"
echo "harness's BENCHMARK_REPORT totals are shown and kept."
set +e
BENCHMARK_SPLIT=test BENCHMARK_REPORT="$report" "$@" >"$log" 2>&1
code=$?
set -e

record "$code" "$(cat "$report")" "result"
echo "run-test-once: exit $code. Report:"
cat "$report"
[ "$code" = 0 ] || echo "The run failed. Run the same command on val to see why; this split is spent either way."
echo "run-test-once: recorded and committed $result."
exit "$code"
