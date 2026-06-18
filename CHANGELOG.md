# Changelog

All notable changes to this project are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.27.0] - 2026-06-18

### Changed
- Terraform scaffolding now points at the **`spartan-sre-wiki`** canonical templates (`templates/`) instead of the archived `template-infra-terraform-*` repos. The `terraform-service-scaffold` skill, the `infrastructure/STRUCTURE` rule, and the CLAUDE.md infra section now instruct "scaffold from the wiki" rather than hand-author HCL, and reference the new data-driven **`service-monorepo`** ArgoCD scaffold (one `infra/deployables.yaml` is the single source of truth read by Terraform, the render workflow, and the deploy matrix). `.codex/` mirror synced.

## [1.26.0] - 2026-05-11

### Added
- New `/spartan:codex` command and `toolkit/codex/spartan.zsh` shell helpers (`cdx-review`, `cdx-pr`, `cdx-ship`, `cdx-security`, `cdx-uncommitted`, `cdx-commit`, `cdx-yolo`) that wrap the Codex CLI with Spartan-style ergonomics. Use Codex as a second-opinion reviewer (different model, different blind spots) before requesting human review. `cdx-pr` fetches a PR into a temporary worktree; `cdx-ship` mirrors `/spartan:ship-pr-codex --rounds N` with escalating prompt stances per round.
- New `/spartan:commit-message-with-codex` and `/spartan:ship-pr-codex` commands for a commit → PR → Codex review/fix loop.

### Fixed
- Installer uninstall flow now removes the Codex shell helper. For `claude-code` it deletes `<base>/codex/spartan.zsh` and removes the parent `codex/` directory only when it ends up empty (so unrelated user files in `~/.claude/codex/` are preserved). For `codex` it deletes `<base>/spartan.zsh` directly.

## [1.25.0] - 2026-05-02

### Added
- `/spartan:ship-pr` now supports a `--rounds N` flag (default `1`, capped at `3`) that loops the request → wait → fix → reply cycle. Each round re-requests Copilot review, fetches only the new comments by pairing `created_at >= REQUESTED_AT` with a `commit_id == HEAD_SHA` SHA guard (the timestamp alone isn't sufficient - a delayed previous-round review can land after the next request and would slip past a time-only filter, so the SHA pin is what actually isolates rounds). It then applies fixes, pushes, replies, and resolves threads before deciding whether to start the next round. Short-circuits when a round produces zero applied fixes (nothing new for Copilot to re-review).
- New `Step 1.5 - Parse round configuration` initializes `ROUND`, `ROUND_LOG`, `REJECTION_REASONS`, `HEAD_SHA`, and totals; rejects `--no-request --rounds N>1` (multi-round requires API access); and refuses malformed `--rounds` values (e.g. `--rounds foo`, `--rounds 2x`) instead of silently defaulting to `1`.
- New `Step 7.5 - Continue or finish?` decides whether to loop based on remaining rounds, applied count, and user `quit`. Round transitions refresh both `REQUESTED_AT` and `HEAD_SHA` so the next round's wait/fetch is pinned to the post-push commit.
- `Step 8` wrap-up now prints a per-round log followed by totals across all rounds, including a per-rejection `path:line - reason` listing under the rejected count (or "no new comments - Copilot satisfied" for a zero-comment round).

### Changed
- `Step 2` header is now scoped to the active round (`Request Copilot review (round $ROUND of $ROUNDS)`) so the user can see progress through the loop.
- `Step 3` review-wait loop and `Step 4` inline-comment + review-summary fetches now all pair `submitted_at`/`created_at >= REQUESTED_AT` with `commit_id == HEAD_SHA`, so a stale previous-round review can't be mistaken for current-round feedback.
- `Step 7` adds a "Track this round's tally" subsection that updates `ROUND_LOG`, `TOTAL_*` counters, the `COMMITS` array, and the cross-round `REJECTION_REASONS` list. The round-log line branches on `COMMENTS_THIS_ROUND` so a zero-comment round is recorded as "Copilot satisfied" rather than a misleading 0/0/0 row.
- Frontmatter `description` and `argument-hint` updated to document the new flag and trigger conditions.

## [1.24.2] - 2026-05-02

### Fixed
- Removed `Co-Authored-By: Claude <noreply@anthropic.com>` template lines from `rules/core/GIT_COMMIT.md` and `commands/spartan/commit-message.md` (and the `.codex` mirrors). The repo policy forbids AI/bot attribution in commits, so the templates would have generated policy-violating commit messages. Each file now carries an explicit "do not add Co-Authored-By or AI attribution" instruction instead.

## [1.24.1] - 2026-05-02

### Fixed
- Installer crashed with `Error: Unknown pack: 'project-mgmt'` when re-installing on a machine that previously had the v1.23 GSD pack saved in `.spartan-packs`. Both the npx CLI (`resolver.js`) and the bash setup (`setup.sh`) now silently drop removed packs with a one-line warning instead of throwing.
- Removed `--packs=backend-micronaut,project-mgmt` example from CLI help (project-mgmt no longer exists).

## [1.24.0] - 2026-05-02

### Removed (BREAKING)
- **GSD pack removed entirely.** The `project-mgmt` pack and all its commands are gone:
  - Commands: `gsd-upgrade`, `project`, `phase`, `workstreams`, `forensics`, `map-codebase`, `team`
  - Agent: `team-coordinator`
  - Pack file: `packs/project-mgmt.yaml`
  - Claude-md section: `30-project-mgmt.md`
- **`get-shit-done-cc` npm install** removed from `setup.sh` (Step 4) - Spartan no longer depends on the GSD engine
- **GSD version checking** removed from `spartan-check-update.js` and `spartan-statusline.js`
- **"Atomic Commits" core principle** removed from `CLAUDE.md` and `01-core.md`

### Changed
- `epic` and `brownfield` commands moved into the `core` pack (always installed)
- `/spartan:build` Agent Teams flow now uses ONE shared team `spartan-{feature-slug}` for the entire session (Stage 4 implement → Stage 5 review → Stage 6 ship). Fixes the bug where Stage 5 tried to call `TeamCreate` again and failed (Claude Code allows only 1 team per session)
- Single `TeamDelete` at end of Stage 6 (was 2 - one per stage)
- Setup script step count adjusted; removed redundant GSD-replacement hook patching logic

### Migration notes
If you were using GSD commands (`/spartan:project`, `/spartan:phase`, `/spartan:workstreams`, etc.), use this replacement workflow:
- Multi-feature work → `/spartan:epic` + `/spartan:spec` + `/spartan:plan` + `/spartan:build` for each feature
- Codebase mapping → `/spartan:brownfield` or `/spartan:onboard`
- Run `/spartan:update` to clean up the deprecated commands and hooks

## [1.23.0] - 2026-04-27

### Added
- `/spartan:js-security` command - NPM security audit covering setup, dependency hygiene, CI/CD, Dependabot, and incident response
- `js-security-audit` skill - sourced from c0x12c NPM Security Guidelines, with supporting files: `audit-checklist.md`, `eslint-security.md`, `incident-playbook.md`, `package-manager.md`
- Recommended permission allowlist (`npm/yarn/pnpm audit`, `outdated`, `explain`, `lockfile-lint`, `npq`) so audits run without prompting
- Registered in `frontend-react` pack
- `/spartan:team` command - manage Claude Code Agent Teams (create, status, wave, review, research, build, clean)
- `team-coordinator` agent for multi-agent parallel work coordination
- Agent Teams integration in 6 workflows: build, phase execute, gate-review, map-codebase, startup, onboard, research
- Conditional detection: workflows check `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` and offer parallel execution when enabled
- `make bump v=X.Y.Z` target to sync all 5 version files at once
- Session tracking, browser QA command, and contributor mode
- `--pack-dir` flag for loading community packs from external directories
- `--auto` flag for stack-based pack auto-selection
- `--format=agents-md` export for Cursor, Windsurf, Codex, Copilot
- AGENTS.md assembly from pack manifests
- Pack validation and external pack loading in resolver
- Tech stack auto-detection (Kotlin, Next.js, Python, Django, FastAPI)
- Community pack authoring guide

### Fixed
- Root marketplace.json version sync
- Stale `rules/project/` paths updated to pack-based layout
- AGENTS.md output formatting cleanup
- Stale counts in docs (48 commands not 44, 13 templates not 6)
- Publish workflow now installs npm dependencies before publish
- Core principles renumbered - language rule is #1
- Commands now respond in the user's language

## [1.22.1] - 2026-04-19

### Fixed
- `/spartan:build` no longer commits after every task - it now batches commits by logical layer (target 2–5 commits per feature, not 10–20). This drastically cuts token usage during Stage 4 Implement and Stage 5 Review fix loops.
- Stage 4 now skips `git status` / `git diff` / `git log` pre-commit checks during batch commits (they waste tokens - the agent already knows what it changed).
- Stage 5 Review fix loop now makes ONE commit per review round instead of one commit per fix.
- Teammate prompt in Agent Teams mode updated to match the new batched commit strategy.

## [1.22.0] - 2026-04-08

### Added
- `rules/backend-micronaut/PERFORMANCE.md` - new rule covering N+1 query prevention, redundant DB calls, unbounded queries, fire-and-forget async, and magic numbers, with a pre-commit checklist
- `rules/backend-micronaut/BATCH_PROCESSING.md` - "Chunked Collection Pattern" section for in-memory lists using `chunked` + `forEach` + `runCatching` (complements the existing paginated while-loop pattern)
- `rules/database/ORM_AND_REPO.md` - "Sorting Pattern for List Endpoints" section requiring a Sort DTO with `SortOrder?` properties and the `Query.sorting()` extension, replacing string-based `sortBy`/`sortDir` query params
- `rules/frontend-react/FRONTEND.md` - "API Error Messages (CRITICAL)" section requiring extraction of `response.data.error.message` instead of surfacing the generic Axios `"Request failed with status code N"` string

All four rule changes synced to both `toolkit/rules/` (published templates) and `.codex/rules/` (toolkit's own rules) so they stay in lockstep.

## [1.21.1] - 2026-04-06

### Fixed
- `/spartan:build` now **hard-enforces** Agent Teams when `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is set. Previously the check was a soft conditional buried in Stage 4 that Claude often skipped, causing the command to ignore the global flag, run sequentially, and skip the review stage.
- Agent Teams detection moved to the Preamble - one `AGENT_TEAMS` variable is computed at the start and treated as binding for the rest of the build (Stage 4 Implement, Stage 5 Review, Stage E.3 Epic Implement).
- Stage 5 Review now always runs - either as a single reviewer (`AGENT_TEAMS=off`) or as a 3-agent parallel team (quality + tests + security, `AGENT_TEAMS=on`). No silent skip path.
- Stage 6 Ship now verifies `TeamDelete` cleanup before creating the PR to avoid orphan team state in `~/.claude/teams/`.

### Added
- `.spartan/build.yaml` → `agent-teams` field (`auto` / `force` / `off`) to override the env var per project. Default `auto` preserves existing behavior.
- New "Agent Teams Mode Gate" section in `/spartan:build` that announces team mode to the user and forbids falling back to sequential execution without explicit `agent-teams: off`.

## [1.2.0] - 2026-03-25

### Added
- Manual trigger for publish workflow

### Changed
- Context optimization - trimmed rules, claude-md sections, skills, removed emoji
- Rule improvements and skill refinements
- README rewritten - removed duplicates, tightened pack descriptions, workflows first

### Fixed
- Publish workflow now triggers after release completes

## [1.1.0] - 2026-03-25

### Added
- Workflow layer - build, fix, research, startup, onboard (5 guided workflows)
- Workflow pipelines, templates, and stack-specific dev guides
- Root-level marketplace.json for Claude Code plugin install

### Removed
- Credits section from toolkit README

## [1.0.1] - 2026-03-25

### Fixed
- npm blocks re-publish of unpublished 1.0.0 - bumped to 1.0.1

## [1.0.0] - 2026-03-25

### Added
- Pack system with YAML manifests and dependency resolver (BFS, cycle detection)
- npx CLI installer with interactive menu and multi-agent support
- 11 packs: core, backend-micronaut, frontend-react, database, shared-backend, project-mgmt, product, ops, research, backend-nodejs, backend-python
- 51 slash commands across all packs
- 11 coding rules (NAMING_CONVENTIONS, ARCHITECTURE, SCHEMA, ORM_AND_REPO, TRANSACTIONS, KOTLIN, CONTROLLERS, SERVICES_AND_BEANS, API_DESIGN, RETROFIT_PLACEMENT, FRONTEND)
- 19 skills for backend, frontend, research, and product workflows
- 4 agents (micronaut-backend-expert, solution-architect-cto, idea-killer, research-planner)
- 13 frameworks and 13 templates for startup/product workflows
- Telegram bridge with provider/engine architecture for remote session control
- Claude Code plugin manifest for marketplace distribution
- Setup script with global/local install modes
- CI/CD pipeline with structure validation, content checks, and auto-release

[Unreleased]: https://github.com/c0x12c/ai-toolkit/compare/v1.23.0...HEAD
[1.23.0]: https://github.com/c0x12c/ai-toolkit/compare/v1.22.1...v1.23.0
[1.2.0]: https://github.com/c0x12c/ai-toolkit/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/c0x12c/ai-toolkit/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/c0x12c/ai-toolkit/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/c0x12c/ai-toolkit/releases/tag/v1.0.0
