#!/usr/bin/env bash
# Runs a benchmark's sealed test split, once. Refuses when <name>.test-result.json exists (the split is spent)
# or when tracked files are uncommitted (the result must name the commit it measured). Runs the command with
# BENCHMARK_SPLIT=test and BENCHMARK_REPORT=<file>; the harness writes its score summary to BENCHMARK_REPORT.
# Any run spends the split, failed or not, so check the command on the val split first.
# Rule: .claude/rules/benchmark-splits.md.
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
log=$(mktemp)
report=$(mktemp)
trap 'rm -f "$log" "$report"' EXIT

echo "run-test-once: BENCHMARK_SPLIT=test at commit ${commit:0:9}"
set +e
BENCHMARK_SPLIT=test BENCHMARK_REPORT="$report" "$@" 2>&1 | tee "$log"
code=${PIPESTATUS[0]}
set -e

jq -n \
  --arg benchmark "$(basename "${sealed%.test.json.gz}")" \
  --arg sealed_sha256 "$sha" \
  --arg commit "$commit" \
  --arg date "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg command "$*" \
  --argjson exit_code "$code" \
  --rawfile report "$report" \
  --arg output_tail "$(tail -n 40 "$log")" \
  '{benchmark: $benchmark, sealed_sha256: $sealed_sha256, commit: $commit, date: $date, command: $command,
    exit_code: $exit_code, report: $report, output_tail: $output_tail}' >"$result"

echo "run-test-once: wrote $result (exit $code). The split is now spent; commit the result file:"
echo "  git add $(dirname "$result") && git commit -m \"test(benchmark): $(basename "${sealed%.test.json.gz}") test result\""
exit "$code"
