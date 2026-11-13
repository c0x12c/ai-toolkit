#!/usr/bin/env bash
# Claude Code PreToolUse hook: a sealed benchmark test split (*.test.json.gz) is never read, searched,
# edited or decompressed, BENCHMARK_SPLIT=test runs only through scripts/benchmark/run-test-once.sh, and
# subagent transcripts (where the seal subagent's cases live) are never opened or searched.
# Rule: .claude/rules/benchmark-splits.md. Registered in .claude/settings.json; checked by
# scripts/test-benchmark-guard.sh.
# Limit: this matches strings in the tool call. It stops accidental reads; it is not a sandbox.
set -u

input=$(cat)
# A sealed split by name, or by a glob such as rpa-fill.test* that would match one.
sealed='\.test\.json\.gz|\.test\*|\.test\.json\*'
# An optional backslash too, for the quote as it appears escaped in raw hook JSON.
split_env="BENCHMARK_SPLIT=(\\\\)?[\"']?test"
# Subagent transcripts: a subagents/ directory, a subagent's output file in Claude's background-task folder
# (a<hex>.output; a background shell's b<id>.output stays readable) or that folder searched whole, the
# transcript store (~/.claude/projects, a project or session folder in it, any .jsonl there). Memory files
# stay readable.
end="([[:space:]\"'\\\\]|$)"
transcripts="(^|/)subagents(/|$end)|claude(-[0-9]+)?/[^[:space:]]*/tasks(/a[0-9a-f]+\\.output|/?$end)|\\.claude/projects/?$end|\\.claude/projects/[^/[:space:]]+/?$end|\\.claude/projects/[^/[:space:]]+/[0-9a-f-]{36}|\\.claude/projects/[^[:space:]]*\\.jsonl"
# Reading inside gzip files: a recursive or test-path search with these reaches a sealed split unnamed.
unzip_tools='(^|[^[:alnum:]_-])(zcat|zgrep|zegrep|zfgrep|zless|zmore|zdiff|gunzip|gzcat)([^[:alnum:]_-]|$)|gzip[[:space:]]+(-[a-z]*[dc]|--decompress|--stdout)'
# ripgrep searches inside every gzip file under a directory with -z, so it is refused whatever the path.
rg_zip='(^|[[:space:];&|("])rg[[:space:]]([^;&|]*[[:space:]])?(-[a-zA-Z]*z[a-zA-Z]*|--search-zip)([[:space:]]|$)'
chained='[|;&`<>]|\$\('
# The two scripts' first line may read a heredoc but never redirect output: `> split` would truncate it.
script_chained='[|;&`>]|\$\('

deny() {
  echo "Blocked by the benchmark rule (.claude/rules/benchmark-splits.md): $1" >&2
  echo "Tune on <name>.val.json. The sealed test split is written only by scripts/benchmark/seal-test.sh and run once by scripts/benchmark/run-test-once.sh." >&2
  exit 2
}

if ! command -v jq >/dev/null 2>&1; then
  # Without jq, every check runs on the raw call, and anything naming a split is refused, scripts included.
  if printf '%s' "$input" | grep -Eq "$sealed|$split_env|$transcripts|$rg_zip" ||
    { printf '%s' "$input" | grep -Eq "$unzip_tools" && printf '%s' "$input" | grep -Eq -- 'test|\*|[[:space:]]-[a-zA-Z]*r'; }; then
    deny "this call may reach a sealed test split, and jq is missing to check it precisely (install jq: brew install jq / apt-get install jq)."
  fi
  exit 0
fi

tool=$(printf '%s' "$input" | jq -r '.tool_name // ""')
case "$tool" in
  Read | Edit | Write | MultiEdit | NotebookEdit)
    target=$(printf '%s' "$input" | jq -r '.tool_input | [.file_path, .notebook_path] | map(select(. != null)) | join(" ")')
    printf '%s' "$target" | grep -Eq "$sealed" && deny "$tool on a sealed test split."
    printf '%s' "$target" | grep -Eq "$transcripts" && deny "$tool on a subagent transcript, which can hold sealed cases."
    ;;
  Grep | Glob)
    target=$(printf '%s' "$input" | jq -r '.tool_input | [.path, .glob, .pattern] | map(select(. != null)) | join(" ")')
    printf '%s' "$target" | grep -Eq "$sealed" && deny "$tool on a sealed test split."
    printf '%s' "$target" | grep -Eq "$transcripts" && deny "$tool on subagent transcripts, which can hold sealed cases."
    ;;
  Bash)
    cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // ""')
    first=$(printf '%s\n' "$cmd" | head -n 1)
    lines=$(printf '%s\n' "$cmd" | wc -l | tr -d ' ')
    printf '%s' "$cmd" | grep -Eq "$transcripts" && deny "this command reads subagent transcripts, which can hold sealed cases."
    printf '%s' "$cmd" | grep -Eq "$rg_zip" && deny "rg -z searches inside gzip files, sealed test splits included."
    if printf '%s' "$cmd" | grep -Eq "$unzip_tools" && printf '%s' "$cmd" | grep -Eq -- 'test|\*|[[:space:]]-[a-zA-Z]*r'; then
      deny "this command decompresses or searches inside gzip files where a sealed test split could be."
    fi
    if printf '%s' "$cmd" | grep -Eq "$sealed|$split_env"; then
      # Git bookkeeping that names a sealed file but never prints it: stage, move, list, commit.
      if [ "$lines" = 1 ] && ! printf '%s' "$cmd" | grep -Eq "$chained|$split_env" &&
        printf '%s' "$cmd" | grep -Eq '^[[:space:]]*git[[:space:]]+(add|mv|status|ls-files|commit)([[:space:]]|$)'; then
        exit 0
      fi
      if printf '%s' "$first" | grep -Eq '^[[:space:]]*(\./)?([^[:space:]]*/)?scripts/benchmark/(seal-test|run-test-once)\.sh[[:space:]]' &&
        ! printf '%s' "$first" | grep -Eq "$unzip_tools|$script_chained"; then
        [ "$lines" = 1 ] && ! printf '%s' "$first" | grep -q '<<' && exit 0
        # More lines only as seal-test.sh's heredoc body, with a quoted delimiter (no expansion inside it):
        # the first line opens it and the last line, its only closing line, ends the command.
        delim=$(printf '%s' "$first" | sed -nE "s#^[[:space:]]*(\\./)?([^[:space:]]*/)?scripts/benchmark/seal-test\\.sh[[:space:]].*<<-?[[:space:]]*('([A-Za-z_][A-Za-z0-9_]*)'|\"([A-Za-z_][A-Za-z0-9_]*)\")[[:space:]]*\$#\\4\\5#p")
        last=$(printf '%s\n' "$cmd" | tail -n 1 | sed -E 's/^[[:space:]]+|[[:space:]]+$//g')
        [ -n "$delim" ] && [ "$lines" -gt 1 ] && [ "$last" = "$delim" ] &&
          [ "$(printf '%s\n' "$cmd" | sed '1d' | grep -cx "[[:space:]]*$delim[[:space:]]*")" = 1 ] && exit 0
      fi
      deny "this command touches a sealed test split or BENCHMARK_SPLIT=test outside the two benchmark scripts."
    fi
    ;;
esac
exit 0
