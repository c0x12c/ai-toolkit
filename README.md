<p align="center">
  <h1 align="center">Spartan AI Toolkit</h1>
  <p align="center">
    <strong>Stop AI coding agents from shipping sloppy code.</strong>
    <br />
    Structured workflows &middot; Configurable rules &middot; Quality gates &middot; Any stack
  </p>
  <p align="center">
    <a href="https://www.npmjs.com/package/@c0x12c/ai-toolkit"><img src="https://img.shields.io/npm/v/@c0x12c/ai-toolkit.svg" alt="npm version"></a>
    <a href="https://www.npmjs.com/package/@c0x12c/ai-toolkit"><img src="https://img.shields.io/npm/dm/@c0x12c/ai-toolkit.svg" alt="npm downloads"></a>
    <a href="https://github.com/c0x12c/ai-toolkit/stargazers"><img src="https://img.shields.io/github/stars/c0x12c/ai-toolkit.svg" alt="GitHub stars"></a>
    <a href="https://github.com/c0x12c/ai-toolkit/blob/main/LICENSE"><img src="https://img.shields.io/github/license/c0x12c/ai-toolkit.svg" alt="license"></a>
  </p>
</p>

---

AI coding agents are fast. They're also careless. They skip tests, ignore your coding standards, push without review, and forget everything between sessions.

**Spartan fixes that.** One command runs a full engineering workflow &mdash; spec, plan, TDD, code review, PR &mdash; with quality gates between each step. Your rules, your standards, enforced every time.

```bash
npx @c0x12c/ai-toolkit@latest --local
```

Works with **Claude Code**, **Codex**, **Cursor**, **Windsurf**, and **Copilot**. Rules are plain markdown &mdash; works with any AI tool.

---

## Before & After

| Without Spartan | With Spartan |
|----------------|-------------|
| "Build this feature" &rarr; jumps straight to code, no plan, no tests, pushes broken code | `/spartan:build` &rarr; writes spec, plans tasks, TDD for each, code review, then PR |
| "Fix this bug" &rarr; guesses a fix, no repro, no test, hopes for the best | `/spartan:debug` &rarr; reproduces first, finds root cause, writes test, then fixes |
| 5 devs on the team &rarr; AI writes different code style for each person | Configurable rules &rarr; same standards for everyone, checked automatically |
| 3-week feature &rarr; AI forgets all context between sessions | Agent memory layer &rarr; carries decisions across sessions |
| Code review catches AI slop &rarr; back-and-forth for days | Quality gates &rarr; review happens before PR, not after |

---

## Quick Start

```bash
# 1. Install (30 seconds, interactive menu)
npx @c0x12c/ai-toolkit@latest --local

# 2. Set up rules for your stack
/spartan:init-rules

# 3. Build something
/spartan:build "add user authentication"
```

That's it. The `/spartan:build` command handles the full pipeline:

```
spec → design (if UI) → plan → TDD → code review → PR
  |         |              |      |         |          |
Gate 1   Design Gate    Gate 2  Gate 3   Gate 3.5   Gate 4
```

Nothing ships without passing every gate.

---

## What's Inside

| What | Count | Description |
|------|-------|-------------|
| **Slash commands** | 73 | End-to-end workflows, not just prompts |
| **Coding rules** | 28 | Your standards, enforced automatically |
| **Skills** | 34 | Domain knowledge (Kotlin, React, Python, DB, security, etc.) |
| **Agents** | 10 | Specialized reviewers, researchers, planners |
| **Stack profiles** | 8 | Pre-built configs for Go, Python, Java, Kotlin, React, etc. |
| **Quality gates** | 5 | Automated checkpoints between every step |
| **Agent memory** | 3 layers | Index &rarr; topics &rarr; transcripts (grep-only archive) |

---

## 5 Workflow Leaders

Each leader runs a full pipeline. One command &mdash; it handles the rest.

| Leader | Command | What happens |
|--------|---------|-------------|
| **Build** | `/spartan:build "feature"` | spec &rarr; design &rarr; plan &rarr; TDD &rarr; review &rarr; PR |
| **Debug** | `/spartan:debug "symptom"` | reproduce &rarr; root cause &rarr; test-first fix &rarr; PR |
| **Startup** | `/spartan:startup "idea"` | brainstorm &rarr; validate &rarr; research &rarr; pitch |
| **Onboard** | `/spartan:onboard` | scan codebase &rarr; map architecture &rarr; save to memory |
| **Research** | `/spartan:research "topic"` | frame question &rarr; gather sources &rarr; analyze &rarr; report |

Or just type `/spartan` &mdash; the smart router figures out what you need.

---

## Works With Any Stack

Pick a built-in profile or write your own rules in markdown:

| Profile | Stack | Rules included |
|---------|-------|---------------|
| `kotlin-micronaut` | Kotlin + Micronaut | 8 backend + 3 database rules |
| `react-nextjs` | React + Next.js | Frontend conventions |
| `go-standard` | Go | Error handling, interfaces, concurrency, project layout |
| `python-django` | Python + Django | Models, views, ORM, testing |
| `python-fastapi` | Python + FastAPI | Endpoints, Pydantic, async patterns |
| `java-spring` | Java + Spring Boot | Controllers, services, JPA, security |
| `typescript-node` | TypeScript + Node.js | Express/Fastify, Zod, strict mode |
| `custom` | Anything | Blank template &mdash; bring your own rules |

Not on this list? Create rules in markdown, point the config at them. The toolkit reads whatever you give it.

```yaml
# .spartan/config.yaml — you control everything
stack: go-standard
architecture: clean

rules:
  backend:
    - rules/go/ERROR_HANDLING.md
    - rules/go/INTERFACES.md
    - rules/custom/OUR_AUTH_RULES.md

commands:
  test:
    backend: "go test ./..."
  lint:
    backend: "golangci-lint run"
```

---

## Install

Three ways. Pick one.

### Option 1: npx (recommended)

```bash
npx @c0x12c/ai-toolkit@latest --local
```

Interactive menu. Pick your AI tool and packs. Done in 30 seconds.

```bash
# Pick specific packs
npx @c0x12c/ai-toolkit@latest --local --packs=backend-micronaut,frontend-react

# Install everything
npx @c0x12c/ai-toolkit@latest --local --all
```

### Option 2: Setup script

```bash
git clone https://github.com/c0x12c/ai-toolkit.git
cd ai-toolkit/toolkit
chmod +x scripts/setup.sh && ./scripts/setup.sh --local
```

### Option 3: Claude Code plugin

Search for **"Spartan AI Toolkit"** in the Claude Code plugin marketplace.

### Local vs Global

- **`--local`** (recommended) &mdash; installs to `./.claude/` in your project. Your team can see, review, and version-control the setup.
- **`--global`** &mdash; installs to `~/.claude/`, works across all your projects.

### Not using Claude Code?

```bash
npx @c0x12c/ai-toolkit@latest --local --agent=claude-code  # default
npx @c0x12c/ai-toolkit@latest --local --agent=codex        # full install
npx @c0x12c/ai-toolkit@latest --local --agent=devin        # full install
npx @c0x12c/ai-toolkit@latest --local --agent=cursor       # rules only
npx @c0x12c/ai-toolkit@latest --local --agent=windsurf     # rules only
npx @c0x12c/ai-toolkit@latest --local --agent=copilot      # rules only
```

| Tool | What gets installed | Where |
|------|-------------------|-------|
| **Claude Code** | Commands + rules + skills + agents + CLAUDE.md | `.claude/` |
| **Codex** | Commands + rules + skills + agents + CLAUDE.md | `.codex/` |
| **Devin CLI** | Commands (as skills) + rules via AGENTS.md | `.devin/` (root `AGENTS.md`) |
| **Cursor** | Rules + AGENTS.md | `.cursor/rules/` |
| **Windsurf** | Rules + AGENTS.md | `.windsurf/rules/` |
| **Copilot** | Rules + AGENTS.md | `.github/instructions/` |

### Uninstall

```bash
# Remove from current project
npx @c0x12c/ai-toolkit@latest --uninstall --local

# Remove global install
npx @c0x12c/ai-toolkit@latest --uninstall --global

# Remove for other agents
npx @c0x12c/ai-toolkit@latest --uninstall --local --agent=cursor
npx @c0x12c/ai-toolkit@latest --uninstall --local --agent=devin
```

---

## How It Works

### Review uses your rules

When `/spartan:build` reaches the review step:
1. Reads `.spartan/config.yaml` to find your rules
2. Spawns a separate review agent (fresh eyes, not the same AI that wrote the code)
3. The reviewer reads all your rule files, then checks the code against them
4. Issues found &rarr; fix &rarr; re-review &rarr; repeat until clean

No config? The reviewer still runs &mdash; it just uses a generic checklist.

### Skills: domain knowledge at each step

Leaders call the right skill at the right time based on your stack:

| Skill | When the leader calls it |
|-------|------------------------|
| `kotlin-best-practices` | During build (Kotlin files) |
| `database-patterns` | During plan + build (migration tasks) |
| `ui-ux-pro-max` | During design + build (React components) |
| `testing-strategies` | During build (test tasks) |
| `security-checklist` | During review (security scan) |

### Agent memory: context across sessions

AI forgets everything when you close the terminal. Agent memory fixes that with 3 layers:

```
.memory/
  index.md        — Layer 1: always loaded, pointers only (~150 chars per line)
  decisions/      — Layer 2: loaded on demand when relevant
  patterns/       —   architecture decisions, code patterns
  knowledge/      —   domain facts, API gotchas
  blockers/       —   known issues and workarounds
  transcripts/    — Layer 3: never loaded, grep-only archive
```

| Layer | Loaded | Purpose |
|-------|--------|---------|
| Index | Every turn | Quick lookup &mdash; what do we know? |
| Topics | On demand | Full knowledge when the task needs it |
| Transcripts | Never (grep only) | "What did we try last week?" without wasting context |

Leaders read and write memory automatically. `/spartan:memory-consolidate` cleans stale entries. `/spartan:magic-doc` keeps docs in sync with code.

### Configurable rules

Rules load every session. The AI follows them without you asking.

```bash
/spartan:init-rules go-standard      # Pick a profile
/spartan:scan-rules                   # Or auto-detect from your code
/spartan:lint-rules                   # Validate your config
```

### Parallel builds

Build 2+ features at the same time. Each `/spartan:build` automatically creates a git worktree &mdash; no manual setup:

```bash
# Terminal 1                          # Terminal 2
/spartan:build auth                   /spartan:build payments
# → .worktrees/auth/ (feature/auth)  # → .worktrees/payments/ (feature/payments)
# → PR #1                            # → PR #2
```

Each build creates its own worktree, branch, and PR. No conflicts. Worktrees are cleaned up after PR merge.

### Project config

Customize any command per project. Two config files in `.spartan/`:

**`.spartan/build.yaml`** &mdash; controls the build workflow:

```yaml
branch-prefix: "feature"    # branch name: [prefix]/[slug]
max-review-rounds: 3        # review-fix cycles before asking user
skip-stages: []             # skip: spec, design, plan, ship (never review)

prompts:                    # inject custom instructions per stage
  spec: |
    Always include performance requirements.
  review: |
    Check all API responses include request_id.
  ship: |
    PR title: [PROJ-123] Short description.
```

**`.spartan/commands.yaml`** &mdash; inject prompts into any command:

```yaml
prompts:
  review: "Flag any function longer than 50 lines."
  pr-ready: "Always add Reviewers: @backend-team."
  daily: "Include blockers section."
  debug: "Always check CloudWatch logs first."
```

Templates in `toolkit/templates/`. The AI reads your config every session &mdash; no manual reminders needed.

---

## Pick Your Packs

Packs group commands, rules, skills, and agents by use case. **Core is always installed.** You pick the rest.

### Common setups

| Situation | Command |
|-----------|---------|
| Kotlin + Micronaut backend | `--packs=backend-micronaut` |
| React + Next.js frontend | `--packs=frontend-react` |
| Full-stack (Kotlin + Next.js) | `--packs=backend-micronaut,frontend-react` |
| Exploring startup ideas | `--packs=research` |
| Everything | `--all` |

### All packs

| Pack | Category | Auto-pulls | What's inside |
|------|----------|------------|---------------|
| **core** | Core | &mdash; | Always installed. Workflows + safety + configurable rules |
| **backend-micronaut** | Backend | database, shared-backend | Kotlin + Micronaut: commands, rules, skills, agents |
| **backend-nodejs** | Backend | database, shared-backend | Coming soon |
| **backend-python** | Backend | database, shared-backend | Coming soon |
| **frontend-react** | Frontend | &mdash; | React + Next.js: commands, rules, skills |
| **product** | Planning | &mdash; | Product thinking before building |
| **ops** | Ship | &mdash; | Deploy + environment management |
| **research** | Research | product | Full startup pipeline: idea to investor |

---

## All Commands

Type `/spartan` for the smart router. Or go direct:

### Workflow Leaders

| Leader | Command | Pipeline |
|--------|---------|----------|
| **Build** | `build [mode] [feature]` | context &rarr; spec &rarr; design? &rarr; plan &rarr; TDD &rarr; review &rarr; PR |
| **Debug** | `debug [symptom]` | known issues &rarr; reproduce &rarr; investigate &rarr; test-first fix &rarr; PR |
| **Startup** | `startup [idea]` | resume check &rarr; brainstorm &rarr; validate &rarr; research &rarr; pitch |
| **Onboard** | `onboard` | memory check &rarr; scan &rarr; map &rarr; setup &rarr; save to memory |
| **Research** | `research [topic]` | frame &rarr; gather &rarr; analyze &rarr; report |

### Core (always installed)

| Command | What it does |
|---------|-------------|
| `spec "feature"` | Write a feature spec &mdash; saves to `.planning/specs/` |
| `plan "feature"` | Implementation plan from spec &mdash; saves to `.planning/plans/` |
| `gate-review` | Dual-agent review (builder + reviewer both accept) |
| `daily` | Standup summary from git history |
| `pr-ready` | Full checklist before creating any PR |
| `codex` | Run Codex as a second-opinion reviewer |
| `commit-message-with-codex` | Commit, open PR, then chain into Codex PR review |
| `ship-pr-codex` | Run Codex PR review rounds and apply clear fixes |
| `init-project` | Auto-generate CLAUDE.md from codebase scan |
| `init-rules` | Set up configurable rules for your stack |
| `scan-rules` | Auto-generate rules from code patterns |
| `lint-rules` | Validate your config and rule files |
| `context-save` | Save session state to resume later |
| `magic-doc [file]` | Auto-update a doc file to match current codebase |
| `memory-consolidate` | Clean up agent memory &mdash; deduplicate, remove stale entries |
| `update` | Check for toolkit updates |
| `careful` | Warn before destructive ops |
| `freeze <dir>` | Lock edits to one directory |
| `guard <dir>` | careful + freeze combined |
| `epic "name"` | Break big work into ordered features |
| `brownfield [svc]` | Map existing codebase before touching legacy code |

### Backend (backend-micronaut pack)

| Command | What it does |
|---------|-------------|
| `kotlin-service "name"` | Scaffold new Micronaut microservice |
| `review` | PR review with your configured rules |
| `testcontainer "type"` | Setup Testcontainers |
| `migration "desc"` | Create database migration |

### Frontend (frontend-react pack)

| Command | What it does |
|---------|-------------|
| `design "feature"` | Design workflow with dual-agent review |
| `next-app "name"` | Scaffold new Next.js app |
| `next-feature "name"` | Add feature to existing Next.js app |
| `fe-review` | PR review for frontend code |
| `figma-to-code "url"` | Figma design to production React |
| `e2e "feature"` | Setup Playwright E2E testing |
| `js-security` | NPM security audit — setup, deps, CI, Dependabot, incident response |

### Product (product pack)

| Command | What it does |
|---------|-------------|
| `validate` | Score an idea &mdash; GO / TEST MORE / KILL |
| `teardown` | Deep competitor analysis |
| `interview` | Mom Test interview questions |
| `lean-canvas` | 9-block Lean Canvas |
| `brainstorm` | Generate and rank ideas |

### Ship (ops pack)

| Command | What it does |
|---------|-------------|
| `deploy "svc" "target"` | Deploy + verify |
| `env-setup "svc"` | Audit env vars across environments |

### Research (research pack)

| Command | What it does |
|---------|-------------|
| `startup [idea]` | Full pipeline: brainstorm to investor outreach |
| `kickoff [theme]` | Start new idea &mdash; brainstorm + validate |
| `deep-dive [project]` | Market research + competitor teardowns |
| `fundraise [project]` | Pitch materials + investor outreach |
| `pitch [type]` | Investor-facing materials |
| `outreach [investor]` | Draft investor emails |
| `content [source]` | Turn ideas into platform-native content |
| `write [topic]` | Write blog posts and articles |

---

## AI-Powered Design (Optional)

The design workflow (`/spartan:ux`) can generate real images for prototypes using Google Gemini.

### Setup

1. Get a [Gemini API key](https://aistudio.google.com/apikey)

2. Create `.spartan/ai.env` in your project root:

```bash
echo "GEMINI_API_KEY=your-key-here" > .spartan/ai.env
```

3. Install Python dependencies:

```bash
pip install google-genai Pillow
```

4. Use it:

```bash
/spartan:ux prototype    # generates images for your design
```

> **Note:** The installer adds `.spartan/ai.env` to `.gitignore` automatically. If you set this up manually, make sure `.spartan/ai.env` is in your `.gitignore` &mdash; never commit API keys.

---

## Telegram Bridge

Control your AI coding sessions from your phone.

```
Phone (Telegram) <-> Bridge (Node.js) <-> Claude Agent SDK <-> Claude API
```

See [`bridges/`](bridges/) for setup.

---

## Star History

<a href="https://www.star-history.com/?repos=c0x12c%2Fai-toolkit&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/image?repos=c0x12c/ai-toolkit&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/image?repos=c0x12c/ai-toolkit&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/image?repos=c0x12c/ai-toolkit&type=date&legend=top-left" />
 </picture>
</a>

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add commands, skills, rules, and agents.

---

## License

MIT
