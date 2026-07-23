# Spartan Devin Helpers

Spartan-style shell wrappers around the [Devin CLI](https://cli.devin.ai/docs) ("Devin for Terminal"). Use Devin (a second AI) to review what Claude has produced — a cheap second opinion before requesting human review.

## Why

Claude Code has rich slash commands (`/spartan:devin review`) but Devin CLI's own slash-command system is skill-based, not a flat-file command set. These shell helpers give the same ergonomics from Devin CLI itself: multi-round escalating review, security-only audits, pre-commit gut-checks.

Devin CLI has no built-in diff-aware `review --base` subcommand like Codex — every helper below tells Devin exactly which `git` command to run (`git diff`, `git status`, `git show`) before asking it to review, and passes the whole thing as a single `devin --print "<instructions>"` call.

For PR-style review, the helpers compare the current branch against the base branch and make Devin inspect the whole `base...HEAD` diff.

## Install

Three options, pick one:

```bash
# 1. From inside Claude Code (easiest)
/spartan:devin setup

# 2. Manual
cp toolkit/devin/spartan.zsh ~/.config/devin/spartan.zsh
echo '[[ -f ~/.config/devin/spartan.zsh ]] && source ~/.config/devin/spartan.zsh' >> ~/.zshrc
source ~/.zshrc

# 3. Don't install — call directly per-shell
source toolkit/devin/spartan.zsh
```

Devin CLI itself: `curl -fsSL https://cli.devin.ai/install.sh | bash` (one-time).

## Commands

| Command | Mirrors | What it does |
|---|---|---|
| `dvn-review [base] [prompt]` | `/spartan:devin review` | One-pass review of current branch vs base |
| `dvn-pr <pr-number-or-url> [rounds]` | PR second opinion | Fetch a PR into a temporary worktree and run escalating review |
| `dvn-ship [rounds] [base]` | `/spartan:devin ship --rounds N` | Multi-round escalating review (default 2) |
| `dvn-security [base]` | `/spartan:devin security` | Security audit only (OWASP, injection, secrets, authz) |
| `dvn-uncommitted [prompt]` | pre-commit gut-check | Review staged + unstaged + untracked changes |
| `dvn-commit <sha> [prompt]` | spot review | Review a single commit |
| `dvn-yolo [prompt]` | `--permission-mode bypass` | Devin with no approval checks |
| `dvn-help` | — | List these helpers |

## Configuration

Override defaults per-shell or in `~/.zshrc`:

```bash
export DVN_BASE=main                # override the auto-detected default (master → main → dev → develop)
export DVN_MODEL=claude-opus-4-8    # pin a Devin model
export DVN_YOLO=1                   # bypass approvals; default is --permission-mode normal
```

By default these helpers run Devin with `--permission-mode normal`, so review runs still ask before making changes rather than editing the repo silently. Set `DVN_YOLO=1` only when you intentionally want Devin's no-approval `bypass` mode.

## Examples

```bash
dvn-review                       # review HEAD vs master
dvn-pr 504                       # review PR #504 in a temporary worktree
dvn-pr https://github.com/c0x12c/ai-toolkit/pull/504 2
dvn-ship 3                       # 3 escalating review rounds
dvn-security                     # OWASP-focused audit
dvn-review master "focus on the new payout flow and rate limiting"
dvn-uncommitted "I'm about to commit — anything broken?"
dvn-commit 2d1751e6              # spot-check a specific commit
```

## How escalation works in `dvn-ship`

The escalation lives in the prompt — not in Devin itself. The helpers build a single `devin --print --permission-mode normal "<instructions>"` call and pass stricter instructions each round:

| Round | Stance |
|---|---|
| 1 | Surface review. Obvious bugs, missing tests, broken contracts. |
| 2 | Question pass-1's assumptions. Race conditions, N+1, error swallowing, edge cases. |
| 3+ | Brutal. Assume every previous pass missed real issues. Reject AI-generic code, premature abstraction, untested branches. |

Edit the `case` block in `spartan.zsh` if you want different stances.

## Pairing with Claude Code

Typical flow on this repo:

1. Build the feature with Claude (`/spartan:build`)
2. Pre-commit gut-check with Devin: `dvn-uncommitted`
3. Push, open PR
4. Multi-round Devin pass: `dvn-ship 2`
5. Or use `/spartan:devin ship` from inside Claude Code to print the same escalating findings without leaving the session.

Devin catches different things than Claude — different model, different prompt — so it's a useful second pair of eyes, not a replacement.
