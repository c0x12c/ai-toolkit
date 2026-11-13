#!/usr/bin/env bash
# Installs the benchmark guard into a git repository, so every teammate's Claude Code follows it once the
# files are committed: the rule (.claude/rules/benchmark-splits.md), the two scripts (scripts/benchmark/),
# the PreToolUse hook (scripts/claude-hooks/ + .claude/settings.json) and its check
# (scripts/test-benchmark-guard.sh). Safe to rerun: identical files are skipped, a differing file is left
# alone and reported, the hook is registered once.
#
#   bash <skill-dir>/install.sh [repo-root]
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="${1:-$(git rev-parse --show-toplevel 2>/dev/null || true)}"
# rev-parse, not a .git directory test: in a worktree or submodule .git is a file.
[ -n "$REPO" ] && git -C "$REPO" rev-parse --git-dir >/dev/null 2>&1 ||
  { echo "install: run inside a git repository (or pass its root)" >&2; exit 2; }
command -v jq >/dev/null || { echo "install: needs jq (brew install jq / apt-get install jq)" >&2; exit 2; }
settings="$REPO/.claude/settings.json"
# Checked before anything is copied, so a broken settings file never ends in a half-installed guard.
if [ -s "$settings" ] && ! jq -e 'type == "object"' "$settings" >/dev/null 2>&1; then
  echo "install: $settings is not a JSON object; fix it and rerun. Nothing was changed." >&2
  exit 2
fi

conflicts=0
place() { # src dest
  local src="$1" dest="$REPO/$2"
  if [ -e "$dest" ]; then
    if cmp -s "$src" "$dest"; then echo "  same     $2"; return; fi
    echo "  DIFFERS  $2 (left as is; compare with $src)"
    conflicts=1
    return
  fi
  mkdir -p "$(dirname "$dest")"
  cp "$src" "$dest"
  case "$dest" in *.sh) chmod +x "$dest" ;; esac
  echo "  added    $2"
}

echo "Benchmark guard -> $REPO"
place "$HERE/project/rule.md" .claude/rules/benchmark-splits.md
for f in scripts/benchmark/seal-test.sh scripts/benchmark/run-test-once.sh \
  scripts/claude-hooks/guard-benchmark-test.sh scripts/test-benchmark-guard.sh; do
  place "$HERE/project/$f" "$f"
done

hook_cmd='"$CLAUDE_PROJECT_DIR"/scripts/claude-hooks/guard-benchmark-test.sh'
mkdir -p "$REPO/.claude"
[ -s "$settings" ] || echo '{}' >"$settings"
merged=$(mktemp)
trap 'rm -f "$merged"' EXIT
# Any entry already running this hook is dropped and the full one appended, so a narrower matcher left by
# hand (say "Bash" only) is repaired rather than taken as installed. Other hooks and settings are kept.
jq --arg c "$hook_cmd" '
  .hooks.PreToolUse = ([(.hooks.PreToolUse // [])[] | select(([.hooks[]?.command] | index($c)) == null)] + [{
    matcher: "Read|Edit|Write|MultiEdit|NotebookEdit|Grep|Glob|Bash",
    hooks: [{type: "command", command: $c}]
  }])' "$settings" >"$merged" || { echo "install: could not merge the hook into $settings" >&2; exit 2; }
if jq -e --slurpfile want "$merged" '. == $want[0]' "$settings" >/dev/null; then
  echo "  same     .claude/settings.json (hook already registered)"
else
  cp "$merged" "$settings"
  echo "  updated  PreToolUse hook in .claude/settings.json"
fi

# A gitignored file would stay on this machine only, and teammates would get no rule and no hook.
ignored=$(cd "$REPO" && git check-ignore .claude/rules/benchmark-splits.md .claude/settings.json \
  scripts/benchmark/seal-test.sh scripts/claude-hooks/guard-benchmark-test.sh || true)
if [ -n "$ignored" ]; then
  echo "WARNING: gitignored, so teammates will not get them; add !-exceptions to .gitignore:"
  printf '  %s\n' $ignored
fi

# The template's own check, so a DIFFERS copy in the repo cannot vouch for itself.
"$HERE/project/scripts/test-benchmark-guard.sh"
echo "Commit these files so the whole team gets the rule and the hook. Restart Claude Code to load the hook."
exit "$conflicts"
