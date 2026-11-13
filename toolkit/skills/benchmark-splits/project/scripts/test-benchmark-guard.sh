#!/usr/bin/env bash
# Checks the benchmark guard: the Claude hook refuses a sealed test split and allows val and the two benchmark
# scripts; seal-test.sh never rewrites a split; run-test-once.sh runs a split once and then refuses.
set -euo pipefail

# The directory holding scripts/, so this runs from a project and from a template folder alike.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOOK="$ROOT/scripts/claude-hooks/guard-benchmark-test.sh"
SEAL="$ROOT/scripts/benchmark/seal-test.sh"
RUN="$ROOT/scripts/benchmark/run-test-once.sh"
fail=0

hook() { # expected-exit tool json-input
  local got=0
  jq -n --arg tool "$2" --argjson input "$3" '{tool_name: $tool, tool_input: $input}' | "$HOOK" 2>/dev/null || got=$?
  if [ "$got" != "$1" ]; then echo "FAIL hook $2 $3: exit $got, want $1"; fail=1; fi
}

S=x/rpa-fill.test.json.gz
hook 2 Read "{\"file_path\":\"$S\"}"
hook 2 Edit "{\"file_path\":\"$S\"}"
hook 2 Grep "{\"pattern\":\"close\",\"path\":\"$S\"}"
hook 2 Grep '{"pattern":"close","glob":"*.test.json.gz"}'
hook 2 Bash "{\"command\":\"zcat $S | head\"}"
hook 2 Bash "{\"command\":\"gzip -dc $S\"}"
hook 2 Bash '{"command":"BENCHMARK_SPLIT=test ./gradlew test"}'
hook 2 Bash "{\"command\":\"scripts/benchmark/run-test-once.sh $S -- zcat $S\"}"
hook 2 Bash "{\"command\":\"scripts/benchmark/seal-test.sh $S; cat $S\"}"
hook 2 Bash "{\"command\":\"scripts/benchmark/seal-test.sh $S </dev/null\\nzcat $S\"}"
hook 2 Bash "{\"command\":\"scripts/benchmark/seal-test.sh $S <<'CASES'\\n[]\\nCASES\\nzcat $S\"}"
hook 2 Bash "{\"command\":\"scripts/benchmark/seal-test.sh $S <<'CASES'\\n[]\\nCASES\\nzcat $S\\nCASES\"}"
hook 2 Bash '{"command":"zcat x/rpa-fill.test*"}'
hook 2 Bash '{"command":"zgrep -r close src/main/resources"}'
hook 2 Bash '{"command":"rg -z close service/"}'
hook 2 Bash '{"command":"rg --search-zip close"}'
hook 2 Bash '{"command":"BENCHMARK_SPLIT=\"test\" ./gradlew test"}'
hook 2 Bash "{\"command\":\"export BENCHMARK_SPLIT='test'\"}"
hook 2 Read '{"file_path":"/private/tmp/claude/proj/tasks/a1b2.output"}'
hook 2 Bash '{"command":"tail ~/.claude/projects/p/s/subagents/agent-1.jsonl"}'
hook 0 Read '{"file_path":"x/rpa-fill.val.json"}'
hook 0 Bash '{"command":"rg -n zone service/"}'
hook 0 Bash '{"command":"gzip -9 build/report.txt"}'
hook 0 Write '{"file_path":"docs/BENCH.md","content":"name the split <name>.test.json.gz"}'
hook 0 Grep '{"pattern":"close","path":"service/src/test/resources"}'
hook 0 Bash '{"command":"git status"}'
hook 0 Bash "{\"command\":\"scripts/benchmark/seal-test.sh $S <<'CASES'\\n[{\\\"id\\\":\\\"a\\\"}]\\nCASES\"}"
hook 0 Bash "{\"command\":\"scripts/benchmark/run-test-once.sh $S -- ./gradlew -p service test\"}"

# seal-test.sh and run-test-once.sh, in a throwaway repo.
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
git -C "$tmp" init -q
git -C "$tmp" config user.email t@t
git -C "$tmp" config user.name t
git -C "$tmp" commit -q --allow-empty -m init
sealed="$tmp/demo.test.json.gz"

echo '[{"id":"a"},{"id":"b"}]' | "$SEAL" "$sealed" | grep -q "sealed 2 cases" || { echo "FAIL seal"; fail=1; }
if echo '[{"id":"c"}]' | "$SEAL" "$sealed" >/dev/null 2>&1; then echo "FAIL seal rewrote a split"; fail=1; fi
if echo '{}' | "$SEAL" "$tmp/other.test.json.gz" >/dev/null 2>&1; then echo "FAIL seal took a non-array"; fail=1; fi

out=$(cd "$tmp" && "$RUN" "$sealed" -- sh -c 'test "$BENCHMARK_SPLIT" = test && echo "a quoted case" && echo "score 9/10" >"$BENCHMARK_REPORT"') ||
  { echo "FAIL first run"; fail=1; }
jq -e '.report == "score 9/10" and .exit_code == 0' "$tmp/demo.test-result.json" >/dev/null || { echo "FAIL result file"; fail=1; }
case "$out" in *"a quoted case"*) echo "FAIL the command's output was shown"; fail=1 ;; esac
case "$out" in *"score 9/10"*) ;; *) echo "FAIL the report was not shown"; fail=1 ;; esac
[ "$(git -C "$tmp" log --oneline | grep -c 'demo test split')" = 2 ] || { echo "FAIL the result was not committed at start and end"; fail=1; }
if (cd "$tmp" && "$RUN" "$sealed" -- true) >/dev/null 2>&1; then echo "FAIL second run was not refused"; fail=1; fi

# A run killed halfway still spends its split.
echo '[{"id":"a"}]' | "$SEAL" "$tmp/cut.test.json.gz" >/dev/null
(cd "$tmp" && "$RUN" "$tmp/cut.test.json.gz" -- sh -c 'kill -TERM "$PPID"; sleep 5') >/dev/null 2>&1 || true
[ -f "$tmp/cut.test-result.json" ] || { echo "FAIL an interrupted run left no result"; fail=1; }

[ "$fail" = 0 ] && echo "benchmark guard: ok"
exit "$fail"
