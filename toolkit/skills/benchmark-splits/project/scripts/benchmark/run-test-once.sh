#!/usr/bin/env bash
# Runs a benchmark's sealed test split, once. Refuses when the split was already claimed in this repository
# (any worktree) or has a <name>.test-result.json, and when tracked files are uncommitted (the result must
# name the commit it measured). Runs the command with BENCHMARK_SPLIT=test, BENCHMARK_SPLIT_SHA256=<the
# split's sha256> (the harness refuses any other file) and BENCHMARK_REPORT=<file>, where the harness writes
# its totals (never a case). The command's own output is hidden, because a failure message can quote cases.
# The result file is committed when the run starts and again when it ends, so any run spends the split,
# failed or cut short; check the command on the val split first. Rule: .claude/rules/benchmark-splits.md.
#
#   scripts/benchmark/run-test-once.sh <dir>/<name>.test.json.gz -- <command...>
#
# Pass secrets through the environment, never as NAME=value arguments: the command is recorded (with any
# NAME=value value masked) in a committed file.
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
spent() {
  echo "run-test-once: refused, $1." >&2
  echo "This test split is spent. Tune on val; a new final number needs a new test split under a new name." >&2
  exit 3
}
[ -e "$result" ] && spent "$result exists ($(jq -r '"run " + .date + ", commit " + .commit' "$result"))"
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "run-test-once: refused, tracked files are uncommitted. Commit the solution first so the result names it." >&2
  exit 3
fi

commit=$(git rev-parse HEAD)
sha=$( (command -v sha256sum >/dev/null && sha256sum "$sealed" || shasum -a 256 "$sealed") | cut -d' ' -f1)
name=$(basename "${sealed%.test.json.gz}")

# The claim lives in the repository's common git dir, shared by every worktree, and mkdir is atomic: of two
# runs started together, or one per worktree, only the first gets the split.
claims="$(cd "$(git rev-parse --git-common-dir)" && pwd)/benchmark-claims"
mkdir -p "$claims"
mkdir "$claims/$sha" 2>/dev/null || spent "this split (sha256 $sha) was claimed here before ($(cat "$claims/$sha/claim" 2>/dev/null || echo "no details"))"
echo "$name, commit $commit, $(date -u +%Y-%m-%dT%H:%M:%SZ)" >"$claims/$sha/claim"

# Recorded with NAME=value values masked, since the record is committed.
cmdline=""
for arg in "$@"; do
  case "$arg" in [A-Za-z_]*=*) arg="${arg%%=*}=***" ;; esac
  cmdline="${cmdline:+$cmdline }$arg"
done
log=$(mktemp)
report=$(mktemp)
trap 'rm -f "$log" "$report"' EXIT

record() { # exit-code-json report-text commit-label
  jq -n --arg benchmark "$name" --arg sealed_sha256 "$sha" --arg commit "$commit" \
    --arg date "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg command "$cmdline" --argjson exit_code "$1" \
    --arg report "$2" \
    '{benchmark: $benchmark, sealed_sha256: $sealed_sha256, commit: $commit, date: $date, command: $command,
      exit_code: $exit_code, report: $report}' >"$result"
  git add -- "$result" && git commit -q -m "test(benchmark): $name test split $3" -- "$result"
}

# Committed before the run, so a run cut short (Ctrl-C, a crash), a git clean or another clone that pulls
# still finds the split spent. No run without that commit.
if ! record null "started; no result recorded" "started"; then
  echo "run-test-once: could not commit $result, so the split was not run (it stays claimed here)." >&2
  exit 3
fi

echo "run-test-once: BENCHMARK_SPLIT=test at commit ${commit:0:9}. The command's output is hidden; only the"
echo "harness's BENCHMARK_REPORT totals are shown and kept."
set +e
BENCHMARK_SPLIT=test BENCHMARK_SPLIT_SHA256="$sha" BENCHMARK_REPORT="$report" "$@" >"$log" 2>&1
code=$?
set -e

record "$code" "$(cat "$report")" "result" ||
  echo "run-test-once: could not commit the result; commit $result yourself." >&2
echo "run-test-once: exit $code. Report:"
cat "$report"
[ "$code" = 0 ] || echo "The run failed. Run the same command on val to see why; this split is spent either way."
echo "run-test-once: recorded and committed $result. Push it so other clones see the split is spent."
exit "$code"
