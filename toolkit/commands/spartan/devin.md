---
name: spartan:devin
description: Run Devin CLI as a second-opinion reviewer. Subcommands mirror Spartan workflow — review, pr, ship (multi-round), security, uncommitted, commit, setup, yolo. Use when you want a different model to review Claude's output before requesting human review.
argument-hint: "[review|pr|ship|security|uncommitted|commit|setup|yolo] [args...]"
allowed-tools: Bash, Read, Write, Edit
---

# /spartan:devin — Second-opinion review via Devin CLI

Args: $ARGUMENTS

Devin (Cognition's coding-agent CLI, "Devin for Terminal") is a separate AI you can use to review what Claude has produced. Different model, different prompt, different blind spots — so it catches things Claude waves through. This command wraps Devin with Spartan-style ergonomics.

Unlike Codex, Devin CLI has no built-in diff-aware `review --base` subcommand — every call below is a plain one-shot prompt (`devin --print "<instructions>"`) that tells Devin exactly which `git` command to run before it reviews.

## Pre-flight

1. **Match the user's language** — see CLAUDE.md core principle #1.
2. Verify Devin CLI is installed:
   ```bash
   command -v devin >/dev/null || { echo "Devin CLI not found. Install: curl -fsSL https://cli.devin.ai/install.sh | bash"; exit 1; }
   ```
3. If args is empty, show the menu (Step 9) and stop.

## Step 1 — Parse the subcommand

Pull the first word from `$ARGUMENTS`. Valid: `review`, `pr`, `ship`, `security`, `uncommitted`, `commit`, `setup`, `yolo`. Unknown → show menu, stop.

The remaining args are passed through to Devin.

## Step 2 — Resolve default base branch

```bash
git fetch origin --quiet
BASE_NAME="${BASE_ARG:-$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')}"
if [ -n "$BASE_NAME" ]; then
  if git rev-parse --verify "origin/$BASE_NAME" >/dev/null 2>&1; then
    BASE="origin/$BASE_NAME"
  elif git rev-parse --verify "$BASE_NAME" >/dev/null 2>&1; then
    BASE="$BASE_NAME"
  fi
fi
[ -z "$BASE" ] && for cand in master main dev develop; do
  if git rev-parse --verify "origin/$cand" >/dev/null 2>&1; then BASE="origin/$cand"; break; fi
  if git rev-parse --verify "$cand" >/dev/null 2>&1; then BASE="$cand"; break; fi
done
[ -z "$BASE" ] && BASE=master
```

## Step 3 — `review` (one-pass)

Single review of the current branch against the resolved base. Always read-only: `--permission-mode normal`, never `bypass`.

```bash
devin --print --permission-mode normal \
  "Review every change in the current branch against base '$BASE', like a full PR review. Start by running 'git diff $BASE...HEAD --stat' and then read the full diff with file context. Do not review unrelated working-tree noise. $EXTRA Return compact findings only. Format each line: path:line: severity: problem. fix. Use severity bug|risk|nit|question. If no actionable findings, say exactly NO_ACTIONABLE_FINDINGS."
```

`$EXTRA` is whatever prose the user passed after the base branch (`/spartan:devin review master focus on auth`), or empty.

## Step 4 — `pr <number-or-url>` (review a PR in a temporary worktree)

Fetch a GitHub PR into a temporary worktree and run escalating review without
moving the current checkout.

```bash
PR="$1"
ROUNDS="${2:-2}"
[ -z "$PR" ] && { echo "Usage: /spartan:devin pr <pr-number-or-url> [rounds]"; exit 1; }
command -v gh >/dev/null || { echo "gh CLI not found. Install gh or check out the PR branch manually."; exit 1; }

META=$(gh pr view "$PR" --json number,baseRefName --template '{{.number}} {{.baseRefName}}')
NUMBER="${META%% *}"
BASE="${META#* }"
REF="refs/remotes/origin/pr-$NUMBER"

git fetch origin "refs/heads/${BASE}:refs/remotes/origin/${BASE}" "pull/${NUMBER}/head:${REF}" --quiet
TMP=$(mktemp -d "${TMPDIR:-/tmp}/devin-pr-${NUMBER}.XXXXXX")
git worktree add --detach "$TMP" "$REF"
(
  cd "$TMP" || exit 1
  for i in $(seq 1 "$ROUNDS"); do
    case "$i" in
      1) STANCE="Pass 1: surface review. Obvious bugs, missing tests, broken contracts." ;;
      2) STANCE="Pass 2: harder. Question every assumption pass 1 made. Race conditions, N+1, error swallowing, edge cases." ;;
      *) STANCE="Pass $i: brutal. Assume every previous pass missed real issues. Reject AI-generic code, premature abstraction, untested branches." ;;
    esac
    devin --print --permission-mode normal \
      "Review every change in the current branch against base 'origin/$BASE', like a full PR review for PR #$NUMBER. Start by running 'git diff origin/$BASE...HEAD --stat' and then read the full diff with file context. Do not review unrelated working-tree noise. $STANCE Return compact findings only. Format each line: path:line: severity: problem. fix. Use severity bug|risk|nit|question. If no actionable findings, say exactly NO_ACTIONABLE_FINDINGS."
  done
)
STATUS=$?
git worktree remove "$TMP" --force >/dev/null 2>&1 || true
exit "$STATUS"
```

## Step 5 — `ship` (multi-round escalating)

Mirrors `/spartan:ship-pr-codex`-style review intensity, but only prints Devin findings. It does not create the PR or apply fixes. Default rounds: 2. Cap at 3 (diminishing returns).

```bash
ROUNDS="${ROUNDS_ARG:-2}"
[ "$ROUNDS" -gt 3 ] && ROUNDS=3

for i in $(seq 1 "$ROUNDS"); do
  echo "================ Round $i / $ROUNDS ================"
  case "$i" in
    1) STANCE="Pass 1: surface review. Obvious bugs, missing tests, broken contracts." ;;
    2) STANCE="Pass 2: harder. Question every assumption pass 1 made. Race conditions, N+1, error swallowing, edge cases." ;;
    *) STANCE="Pass $i: brutal. Assume every previous pass missed real issues. Reject AI-generic code, premature abstraction, untested branches." ;;
  esac
  devin --print --permission-mode normal \
    "Review every change in the current branch against base '$BASE', like a full PR review. Start by running 'git diff $BASE...HEAD --stat' and then read the full diff with file context. Do not review unrelated working-tree noise. $STANCE Return compact findings only. Format each line: path:line: severity: problem. fix. Use severity bug|risk|nit|question. If no actionable findings, say exactly NO_ACTIONABLE_FINDINGS."
done
```

Between rounds, summarize the new findings to the user in 2-3 bullets so they can decide whether to fix-and-rerun or move on.

## Step 6 — `security`

```bash
devin --print --permission-mode normal \
  "Review every change in the current branch against base '$BASE', like a full PR review. Start by running 'git diff $BASE...HEAD --stat' and then read the full diff with file context. Do not review unrelated working-tree noise. Security audit only. Check: input validation, authn/authz, SQL/command injection, SSRF, secrets in code, unsafe deserialization, missing rate limits, IDOR, weak crypto, log injection, OWASP top 10. Ignore style and non-security bugs. Return compact findings only. Format each line: path:line: severity: problem. fix. Use severity critical|high|medium. If no actionable findings, say exactly NO_SECURITY_FINDINGS."
```

## Step 7 — `uncommitted`

```bash
devin --print --permission-mode normal \
  "Run 'git status' and 'git diff HEAD' to see staged, unstaged, and untracked changes, then review them. Catch issues before commit. Return compact findings only. Format each line: path:line: severity: problem. fix."
```

## Step 8 — `commit <sha>`

```bash
SHA="$1"
[ -z "$SHA" ] && { echo "Usage: /spartan:devin commit <sha>"; exit 1; }
devin --print --permission-mode normal \
  "Run 'git show $SHA' to see the commit, then review it. Return compact findings only. Format each line: path:line: severity: problem. fix."
```

## Step 9 — `setup`

Install the shell helpers so the user can also call `dvn-review`, `dvn-ship`, etc. directly from any terminal (without going through Claude).

1. Locate the helper file. Search in this order, use the first that exists:
   - `<repo-root>/toolkit/devin/spartan.zsh` (toolkit repo)
   - `<repo-root>/scripts/devin/spartan.zsh` (project-local copy)
   - `<repo-root>/.claude/devin/spartan.zsh` (local Claude install — carried copy)
   - `~/.claude/devin/spartan.zsh` (global Claude install — carried copy)
   - `<repo-root>/.codex/devin/spartan.zsh` (local Codex install — carried copy)
   - `~/.codex/devin/spartan.zsh` (global Codex install — carried copy)
   - `~/.config/devin/spartan.zsh` (Devin install)
   - `~/.spartan/toolkit/devin/spartan.zsh` (global Spartan install)
   - `<repo-root>/toolkit/devin/spartan.zsh` (toolkit dev mode)

   If none found, tell the user and stop.

2. Copy it to `~/.config/devin/spartan.zsh` (creating `~/.config/devin/` if it doesn't exist).
3. Add this line to `~/.zshrc` (idempotent — check first with `grep -q`):
   ```bash
   [[ -f ~/.config/devin/spartan.zsh ]] && source ~/.config/devin/spartan.zsh
   ```
4. Print the next step: `source ~/.zshrc` or open a new shell, then run `dvn-help`.

## Step 10 — `yolo`

Pass-through to `devin` with `--permission-mode bypass` (Devin's equivalent of Claude's `--dangerously-skip-permissions`). Use only inside an already-isolated sandbox (devcontainer, VM, throwaway repo).

```bash
devin --print --permission-mode bypass "$REMAINING_ARGS"
```

Warn the user once before running. If they're not in a sandbox, refuse and tell them to use plain `/spartan:devin review` instead.

## Menu (when no/invalid subcommand)

```
/spartan:devin — Devin CLI second-opinion review

  review [base] [prompt]      One-pass review of current branch vs base
  pr <number-or-url> [rounds] Review a PR in a temporary worktree
  ship   [rounds] [base]      Multi-round escalating review (default 2, max 3)
  security [base]             Security-only audit (OWASP, injection, secrets)
  uncommitted [prompt]        Review staged + unstaged + untracked
  commit <sha> [prompt]       Review a single commit
  setup                       Install shell helpers (dvn-review, dvn-ship, …)
  yolo [prompt]               Devin with no approval checks

Examples:
  /spartan:devin review
  /spartan:devin pr 504
  /spartan:devin ship 3
  /spartan:devin security
  /spartan:devin review master "focus on the new payout flow"
```

## Notes

- Every subcommand except `yolo` runs with `--permission-mode normal` — Devin still asks before making changes, so a review pass can't silently edit the repo (there is no dedicated read-only sandbox flag documented for Devin CLI the way Codex has `--sandbox read-only`; `normal` mode is the safest default available).
- The `review` subcommand is intended to be read-only — it prints findings to your terminal, it should not modify the repo under normal permission mode.
- For PR-like review, always compare against the base branch so Devin goes over all branch changes, not only local uncommitted edits.
- For pairing with Claude: build with `/spartan:build`, gut-check with `/spartan:devin uncommitted`, then push and open a PR as usual.
- See `toolkit/devin/README.md` for the underlying shell helpers.
