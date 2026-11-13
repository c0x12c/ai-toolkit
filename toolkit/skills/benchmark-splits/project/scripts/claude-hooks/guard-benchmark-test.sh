#!/usr/bin/env bash
# Claude Code PreToolUse hook: a sealed benchmark test split (*.test.json.gz) is never read, searched,
# edited or decompressed, and BENCHMARK_SPLIT=test runs only through scripts/benchmark/run-test-once.sh.
# Rule: .claude/rules/benchmark-splits.md. Registered in .claude/settings.json; checked by
# scripts/test-benchmark-guard.sh.
# ponytail: string matching on the tool call, a guardrail against accidental reads, not a sandbox.
set -u

input=$(cat)
sealed='\.test\.json\.gz'

deny() {
  echo "Blocked by the benchmark rule (.claude/rules/benchmark-splits.md): $1" >&2
  echo "Tune on <name>.val.json. The sealed test split is written only by scripts/benchmark/seal-test.sh and run once by scripts/benchmark/run-test-once.sh." >&2
  exit 2
}

if ! command -v jq >/dev/null 2>&1; then
  # Without jq, refuse any call that mentions a sealed split at all, rather than letting it through.
  if printf '%s' "$input" | grep -Eq "$sealed|BENCHMARK_SPLIT=test"; then
    deny "this call names a sealed test split, and jq is missing to check it precisely (install jq: brew install jq / apt-get install jq)."
  fi
  exit 0
fi

tool=$(printf '%s' "$input" | jq -r '.tool_name // ""')
case "$tool" in
  Read | Edit | Write | MultiEdit | NotebookEdit)
    target=$(printf '%s' "$input" | jq -r '.tool_input | [.file_path, .notebook_path] | map(select(. != null)) | join(" ")')
    printf '%s' "$target" | grep -Eq "$sealed" && deny "$tool on a sealed test split."
    ;;
  Grep | Glob)
    target=$(printf '%s' "$input" | jq -r '.tool_input | [.path, .glob, .pattern] | map(select(. != null)) | join(" ")')
    printf '%s' "$target" | grep -Eq "$sealed" && deny "$tool on a sealed test split."
    ;;
  Bash)
    cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // ""')
    if printf '%s' "$cmd" | grep -Eq "$sealed|BENCHMARK_SPLIT=test"; then
      first=$(printf '%s' "$cmd" | head -n 1)
      if printf '%s' "$first" | grep -Eq '^[[:space:]]*(\./)?([^[:space:]]*/)?scripts/benchmark/(seal-test|run-test-once)\.sh[[:space:]]' &&
        ! printf '%s' "$first" | grep -Eq 'zcat|gunzip|gzip[[:space:]]+(-[a-z]*d|--decompress|--stdout)|[|;&`]|\$\('; then
        exit 0
      fi
      deny "this command touches a sealed test split or BENCHMARK_SPLIT=test outside the two benchmark scripts."
    fi
    ;;
esac
exit 0
