# Devin CLI helpers — Spartan-style review commands
# Source from ~/.zshrc:  [[ -f ~/.config/devin/spartan.zsh ]] && source ~/.config/devin/spartan.zsh
#
# Install (project-local copy lives at toolkit/devin/spartan.zsh):
#   cp toolkit/devin/spartan.zsh ~/.config/devin/spartan.zsh
#   echo '[[ -f ~/.config/devin/spartan.zsh ]] && source ~/.config/devin/spartan.zsh' >> ~/.zshrc
#   source ~/.zshrc
# Or run `/spartan-devin setup` from inside Devin CLI, or `/spartan:devin setup` from Claude Code.
#
# Devin CLI has no built-in "review --base" shortcut like Codex — every helper
# below tells Devin exactly which git command to inspect before reviewing.

# --- Defaults --------------------------------------------------------------
: "${DVN_BASE:=master}"      # default base branch for diffs
: "${DVN_MODEL:=}"           # optional: pin a model, e.g. DVN_MODEL=claude-opus-4-8
: "${DVN_YOLO:=0}"           # set to 1 to bypass approvals for review helpers

_dvn_model_args() {
  [[ -n "$DVN_MODEL" ]] && echo "--model $DVN_MODEL"
}

_dvn_permission_args() {
  if [[ "$DVN_YOLO" != "0" ]]; then
    echo "--permission-mode bypass"
  else
    echo "--permission-mode normal"
  fi
}

_dvn_devin() {
  devin --print $(_dvn_permission_args) $(_dvn_model_args) "$@"
}

_dvn_exec_review_diff() {
  local base="$1"; shift
  local instructions="$*"
  _dvn_devin "Review every change in the current branch against base '$base', like a full PR review. Start by running 'git diff $base...HEAD --stat' and then read the full diff with file context. Do not review unrelated working-tree noise. ${instructions:-Report only actionable findings with severity and file:line.}"
}

_dvn_resolve_base() {
  # Prefer the user-provided base; otherwise pick the first branch that exists.
  local b="$1"
  if [[ -n "$b" ]]; then echo "$b"; return; fi
  local origin_head
  origin_head=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
  if [[ -n "$origin_head" ]] && git rev-parse --verify "origin/$origin_head" >/dev/null 2>&1; then
    echo "origin/$origin_head"; return
  fi
  for cand in master main dev develop; do
    if git rev-parse --verify "$cand" >/dev/null 2>&1; then echo "$cand"; return; fi
    if git rev-parse --verify "origin/$cand" >/dev/null 2>&1; then echo "origin/$cand"; return; fi
  done
  echo "$DVN_BASE"
}

# --- dvn-review : one-pass review of the current branch -------------------
# Usage: dvn-review [base-branch] [extra prompt...]
dvn-review() {
  local base; base=$(_dvn_resolve_base "$1"); shift 2>/dev/null
  local extra="$*"
  echo "==> Reviewing vs $base"
  _dvn_exec_review_diff "$base" "${extra:+$extra }Each finding must be actionable with file:line and the specific fix."
}

# --- dvn-pr : review a GitHub PR without touching the current checkout -----
# Usage: dvn-pr <pr-number-or-url> [rounds=2]
dvn-pr() {
  local pr="$1"
  local rounds="${2:-2}"
  if [[ -z "$pr" ]]; then
    echo "Usage: dvn-pr <pr-number-or-url> [rounds=2]" >&2
    return 1
  fi
  if ! command -v gh >/dev/null; then
    echo "gh CLI not found. Install gh or check out the PR branch manually." >&2
    return 1
  fi
  if ! [[ "$rounds" =~ ^[0-9]+$ ]] || (( rounds < 1 )); then
    echo "Usage: dvn-pr <pr-number-or-url> [rounds>=1]" >&2
    return 1
  fi

  local meta number base ref tmp exit_code
  meta=$(gh pr view "$pr" --json number,baseRefName --template '{{.number}} {{.baseRefName}}') || return
  number="${meta%% *}"
  base="${meta#* }"
  ref="refs/remotes/origin/pr-$number"

  echo "==> Fetching PR #$number vs $base"
  git fetch origin "refs/heads/${base}:refs/remotes/origin/${base}" "pull/${number}/head:${ref}" --quiet || return

  tmp=$(mktemp -d "${TMPDIR:-/tmp}/dvn-pr-${number}.XXXXXX") || return
  if ! git worktree add --detach "$tmp" "$ref" >/dev/null; then
    rmdir "$tmp" 2>/dev/null || true
    return 1
  fi

  (
    cd "$tmp" || exit 1
    dvn-ship "$rounds" "origin/$base"
  )
  exit_code=$?
  git worktree remove "$tmp" --force >/dev/null 2>&1 || true
  return "$exit_code"
}

# --- dvn-ship : multi-round escalating review (mirrors /spartan:ship-pr-codex) ----
# Usage: dvn-ship [rounds=2] [base-branch]
dvn-ship() {
  local rounds=${1:-2}
  local base; base=$(_dvn_resolve_base "$2")
  if ! [[ "$rounds" =~ ^[0-9]+$ ]] || (( rounds < 1 )); then
    echo "Usage: dvn-ship [rounds>=1] [base-branch]" >&2; return 1
  fi
  echo "==> ship-pr-devin: $rounds round(s) vs $base"
  for i in $(seq 1 "$rounds"); do
    echo
    echo "================ Round $i / $rounds ================"
    local stance
    case "$i" in
      1) stance="Pass 1: surface review. Catch obvious bugs, missing tests, broken contracts." ;;
      2) stance="Pass 2: harder. Question every assumption pass 1 made. Find what was waved through. Look for race conditions, N+1, error swallowing, missing edge cases." ;;
      *) stance="Pass $i: brutal. Assume every previous pass missed real issues. Find them. Reject anything that smells like AI-generic code, premature abstraction, or untested branches." ;;
    esac
    echo "==> $stance"
    _dvn_exec_review_diff "$base" "$stance Each finding must be actionable with file:line and the specific fix."
  done
}

# --- dvn-security : security-focused review --------------------------------
# Usage: dvn-security [base-branch]
dvn-security() {
  local base; base=$(_dvn_resolve_base "$1")
  echo "==> Security review vs $base"
  _dvn_exec_review_diff "$base" \
    "Security audit only. Check: input validation, authn/authz, SQL/command injection, SSRF, secrets in code, unsafe deserialization, missing rate limits, IDOR, weak crypto, log injection, OWASP top 10. Ignore style and non-security bugs. Rate severity critical/high/medium and give the exact fix."
}

# --- dvn-uncommitted : review what's in the worktree, not yet committed ----
dvn-uncommitted() {
  local extra="$*"
  echo "==> Reviewing uncommitted changes"
  _dvn_devin "Run 'git status' and 'git diff HEAD' to see staged, unstaged, and untracked changes, then review them. ${extra:-Catch issues before commit. Report only actionable findings with severity and file:line.}"
}

# --- dvn-commit : review a single commit -----------------------------------
# Usage: dvn-commit <sha>
dvn-commit() {
  local sha="$1"
  if [[ -z "$sha" ]]; then echo "Usage: dvn-commit <sha>" >&2; return 1; fi
  shift
  local extra="$*"
  _dvn_devin "Run 'git show $sha' to see the commit, then review it. ${extra:-Report only actionable findings with severity and file:line.}"
}

# --- dvn-yolo : Devin with no approval checks -------------------------------
# Equivalent of Claude's --dangerously-skip-permissions. Use with care, inside
# an already-isolated sandbox (devcontainer, VM, throwaway repo) only.
dvn-yolo() {
  devin --print --permission-mode bypass $(_dvn_model_args) "$@"
}

# --- dvn-help : list these helpers -----------------------------------------
dvn-help() {
  cat <<'EOF'
Devin helpers (override defaults: DVN_BASE=master DVN_MODEL=claude-opus-4-8 DVN_YOLO=1)

  dvn-review [base] [prompt...]    One-pass review of current branch vs base
  dvn-pr <pr-number-or-url> [rounds] Review a PR in a temporary worktree
  dvn-ship   [rounds] [base]       Multi-round escalating review (default 2)
  dvn-security [base]              Security-only audit
  dvn-uncommitted [prompt...]      Review staged + unstaged + untracked
  dvn-commit <sha> [prompt...]     Review a single commit
  dvn-yolo   [prompt...]           Devin with no approval checks
  dvn-help                         This message
EOF
}
