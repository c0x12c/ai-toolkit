#!/usr/bin/env bash
# Seals a benchmark's test split: reads a JSON array of cases on stdin, writes <name>.test.json.gz and prints
# only the case count and sha256, so whoever asked for the split never sees a case. A sealed split is never
# rewritten. Rule: .claude/rules/benchmark-splits.md.
#
#   scripts/benchmark/seal-test.sh <dir>/<name>.test.json.gz <<'CASES'
#   [ {...}, {...} ]
#   CASES
set -euo pipefail

usage="usage: scripts/benchmark/seal-test.sh <dir>/<name>.test.json.gz < cases.json"
out="${1:?$usage}"
case "$out" in *.test.json.gz) ;; *) echo "seal-test: the file must end in .test.json.gz" >&2; exit 2 ;; esac
command -v jq >/dev/null || { echo "seal-test: needs jq (brew install jq / apt-get install jq)" >&2; exit 2; }
if [ -e "$out" ]; then
  echo "seal-test: $out exists. A sealed split is never rewritten; seal a new one under a new name." >&2
  exit 3
fi
[ -d "$(dirname "$out")" ] || { echo "seal-test: no directory $(dirname "$out")" >&2; exit 2; }

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
cat >"$tmp"
if ! jq -e 'type == "array" and length > 0' "$tmp" >/dev/null 2>&1; then
  echo "seal-test: stdin must be a non-empty JSON array of cases" >&2
  exit 2
fi
count=$(jq length "$tmp")
jq . "$tmp" | gzip -n -9 >"$out"
sha=$( (command -v sha256sum >/dev/null && sha256sum "$out" || shasum -a 256 "$out") | cut -d' ' -f1)
echo "sealed $count cases into $out (sha256 $sha)"
