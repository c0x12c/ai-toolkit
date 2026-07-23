# Spartan AI Toolkit

> Workflow-first engineering discipline for AI coding tools. Workflows solve problems end-to-end. Skills provide knowledge at each step. Agent memory carries context across sessions.

---

## Install

Three ways to install. Pick one.

### Option 1: npx (recommended)

```bash
npx @c0x12c/ai-toolkit@latest
```

Interactive menu — pick your AI tool and packs. Works out of the box.

```bash
# Or specify packs directly
npx @c0x12c/ai-toolkit@latest --packs=backend-micronaut,product

# Install everything
npx @c0x12c/ai-toolkit@latest --all

# Install for Cursor instead of Claude Code
npx @c0x12c/ai-toolkit@latest --agent=cursor
```

**Supported agents:** `claude-code` (default), `cursor`, `windsurf`, `codex`, `copilot`

### Option 2: Setup script

```bash
git clone https://github.com/c0x12c/ai-toolkit.git
cd ai-toolkit/toolkit
chmod +x scripts/setup.sh
./scripts/setup.sh --global
```

### Option 3: Claude Code plugin

Search for **"Spartan AI Toolkit"** in the Claude Code plugin marketplace.

### Global vs Local

- `--global` installs to `~/.claude/` — works across all projects (default)
- `--local` installs to `./.claude/` — only this project

After install, open any project, run `claude`, then type `/spartan`.

---

## Demo: Web-to-PRD

Scan a live web app, extract every feature, generate a structured PRD with epics and stories, then export to Notion.

```
/spartan:web-to-prd "https://screensdesign.com"
```

![Web-to-PRD scanning screensdesign.com](https://raw.githubusercontent.com/c0x12c/ai-toolkit/main/docs/images/web-to-prd-demo.png)

Uses Playwright MCP (browser control) + Notion MCP (export). Auto-installs prerequisites, handles login, and asks for confirmation at each step.

---

## How to Use

### The core workflow

Every feature follows the same pipeline. Skip steps that don't apply.

```
/spartan:spec → /spartan:ux → /spartan:plan → /spartan:build → /spartan:pr-ready
      ↑             ↑               ↑              ↑ + 3.5           ↑
    Gate 1     Design Gate       Gate 2          Gate 3           Gate 4
```

| Step | What happens |
|------|-------------|
| `spec` | Interactive Q&A &rarr; saved spec &rarr; Gate 1 checks quality |
| `design` | Design doc + dual-agent review (skip for backend-only) |
| `plan` | Architecture + task breakdown from spec &rarr; Gate 2 |
| `build` | TDD task by task, picks up saved spec/plan |
| `gate-review` | Builder + reviewer agent both must accept |
| `pr-ready` | Rebase, test, lint, create PR |

**Bigger work?** Use `/spartan:epic` to break it into ordered features, then run the pipeline for each one.

**Skills load automatically** based on your stack. Kotlin files &rarr; `kotlin-best-practices`. React components &rarr; `ui-ux-pro-max`. Migrations &rarr; `database-patterns`. You don't pick them.

**Agent memory** (`.planning/`, `.memory/`) carries specs, plans, decisions, and patterns across sessions. The AI builds on what it already knows instead of starting from scratch.

**Rules** load every session with zero tokens. They enforce coding standards silently.

---

## Pick Your Packs

Packs group commands, rules, skills, and agents by use case. **Core is always installed.** Pick the rest based on what you're building.

### "I'm building a Kotlin + Micronaut backend"

```bash
npx @c0x12c/ai-toolkit@latest --packs=backend-micronaut
```

This pulls in `backend-micronaut` + its dependencies (`database` and `shared-backend` auto-included). You get migration commands, API design rules, Kotlin coding standards, test patterns, and two expert agents.

### "I'm building a React + Next.js frontend"

```bash
npx @c0x12c/ai-toolkit@latest --packs=frontend-react
```

You get Next.js scaffolding, Figma-to-code, E2E testing setup, frontend review, and the UI/UX design skill.

### "Full-stack Kotlin + Next.js"

```bash
npx @c0x12c/ai-toolkit@latest --packs=backend-micronaut,frontend-react
```

### "I'm managing AWS infrastructure with Terraform"

```bash
npx @c0x12c/ai-toolkit@latest --packs=infrastructure
```

You get Terraform scaffolding (ECS + EKS), module creation, security audits, drift detection, cost optimization, and two infrastructure agents. Rules enforce naming, state management, provider placement, and security patterns.

### "I'm exploring startup ideas"

```bash
npx @c0x12c/ai-toolkit@latest --packs=research
```

Research pack pulls in `product` as a dependency. You get brainstorming, validation, market research, competitor teardowns, pitch materials, and investor outreach.

### "Give me everything"

```bash
npx @c0x12c/ai-toolkit@latest --all
```

---

## All Packs

| Pack | Category | Depends on | What you get |
|------|----------|------------|--------------|
| **core** | Core | — | Always installed. Workflows (build, fix, onboard), spec, plan, gate-review, pr-ready, daily, safety commands, phase-reviewer agent |
| **backend-micronaut** | Backend | database, shared-backend | Kotlin service scaffold, code review, testcontainers, API/DB/Kotlin rules, 5 skills, 2 agents |
| **backend-nodejs** | Backend | database, shared-backend | Coming soon |
| **backend-python** | Backend | database, shared-backend | Coming soon |
| **frontend-react** | Frontend | — | Design workflow, Next.js scaffold, Figma-to-code, E2E, frontend review, UI/UX + design-workflow skills, design-critic agent |
| **product** | Planning | — | Think-before-build, validate, teardown, interview, lean canvas, brainstorm |
| **infrastructure** | Ops | — | Terraform + AWS: scaffold, modules, review, plan, deploy, import, drift, cost, security. 7 rules, 5 skills, 2 agents |
| **ops** | Ship | — | Deploy + env-setup, 2 skills (ops-investigate-alert, ops-oncall-log) |
| **research** | Research | product | Startup + research workflows, kickoff to investor outreach, 10 skills, 2 agents |

Hidden packs (`database`, `shared-backend`) get pulled in as dependencies — you don't pick them directly.

---

## Commands

All commands start with `/spartan:` (e.g., `/spartan:spec "feature"`).

Type `/spartan` to get the smart router — it asks what you need and picks the right command.

### Workflows (core + research packs)
| Command | What it does |
|---------|-------------|
| `build [mode] [feature]` | Build a feature end-to-end (backend, frontend, or auto-detect) |
| `fix [symptom]` | Find and fix a bug with structured investigation |
| `research [topic]` | Deep research with source tracking and report |
| `startup [idea]` | Full startup pipeline: brainstorm to investor-ready |
| `onboard` | Understand a new codebase and set up tooling |

### Core (always installed)
| Command | What it does |
|---------|-------------|
| `spec "feature"` | Write a feature spec — saves to `.planning/specs/` |
| `plan "feature"` | Write implementation plan from spec — saves to `.planning/plans/` |
| `gate-review [phase]` | Dual-agent review (Gate 3.5) — builder + reviewer both accept |
| `daily` | Standup summary from git history |
| `pr-ready` | Full checklist before creating any PR |
| `codex` | Run Codex as a second-opinion reviewer |
| `commit-message-with-codex` | Commit, open PR, then chain into Codex PR review |
| `ship-pr-codex` | Run Codex PR review rounds and apply clear fixes |
| `init-project` | Auto-generate CLAUDE.md from codebase scan |
| `context-save` | Save session state to resume later |
| `update` | Check for toolkit updates |
| `careful` | Warn before destructive ops |
| `freeze <dir>` | Lock edits to one directory |
| `unfreeze` | Remove directory lock |
| `guard <dir>` | careful + freeze combined |
| `epic "name"` | Break big work into ordered features |
| `brownfield "svc"` | Map unfamiliar codebase before touching it |

### Backend (backend-micronaut pack)
| Command | What it does |
|---------|-------------|
| `kotlin-service "name"` | Scaffold new Micronaut microservice |
| `review` | PR review with Kotlin/Micronaut conventions |
| `testcontainer "type"` | Setup Testcontainers integration testing |
| `migration "desc"` | Create Flyway database migration |

### Frontend (frontend-react pack)
| Command | What it does |
|---------|-------------|
| `design "feature"` | Design workflow with dual-agent review (Design Gate) |
| `next-app "name"` | Scaffold new Next.js app |
| `next-feature "name"` | Add feature to existing Next.js app |
| `fe-review` | PR review with Next.js conventions |
| `figma-to-code "url"` | Figma design to production React |
| `e2e "feature"` | Setup Playwright E2E testing |

### Product (product pack)
| Command | What it does |
|---------|-------------|
| `think` | Guided thinking before coding |
| `validate` | Score an idea — GO / TEST MORE / KILL |
| `teardown` | Deep competitor analysis |
| `interview` | Mom Test interview questions |
| `lean-canvas` | Fill out a 9-block Lean Canvas |
| `brainstorm` | Generate and rank ideas |
| `web-to-prd "URL"` | Scan a live web app with Playwright, extract features, generate PRD with epics/stories, export to Notion |

### Infrastructure (infrastructure pack)
| Command | What it does |
|---------|-------------|
| `tf-scaffold "service"` | Scaffold service-level Terraform (ECS or EKS) |
| `tf-module "name"` | Create/extend Terraform modules |
| `tf-review` | PR review for Terraform changes (8-stage checklist) |
| `tf-plan "env"` | Guided plan workflow with destructive change flagging |
| `tf-deploy "env"` | Deployment checklist with pre/post verification |
| `tf-import "resource"` | Import existing AWS resources into state |
| `tf-drift "env"` | Detect and categorize infrastructure drift |
| `tf-cost` | Cost estimation and optimization guidance |
| `tf-security` | Security audit (IAM, network, encryption, secrets) |

### Ship (ops pack)
| Command | What it does |
|---------|-------------|
| `deploy "svc" "target"` | Deploy + verify |
| `env-setup "svc"` | Audit env vars across environments |

### Research (research pack)
| Command | What it does |
|---------|-------------|
| `startup [idea]` | Full pipeline from brainstorm to outreach |
| `kickoff [theme]` | Start new idea — brainstorm + validate |
| `deep-dive [project]` | Market research + competitor teardowns |
| `fundraise [project]` | Pitch materials + investor outreach |
| `research [topic]` | Deep research with source checking |
| `pitch [type]` | Investor-facing materials |
| `outreach [investor]` | Draft investor emails |
| `content [source]` | Turn ideas into platform-native content |
| `write [topic]` | Write blog posts and articles |

---

## Skills

Skills give Claude deeper knowledge in specific areas. They're loaded automatically when you use related commands.

| Skill | Pack | What it does |
|-------|------|-------------|
| `api-endpoint-creator` | backend-micronaut | Generate Controller → Manager → Repository stack |
| `database-table-creator` | database | SQL migration → Table → Entity → Repository → Tests |
| `backend-api-design` | backend-micronaut | RPC-style API design patterns |
| `database-patterns` | database | Schema design, migrations, Exposed ORM |
| `kotlin-best-practices` | backend-micronaut | Null safety, Either, coroutines |
| `testing-strategies` | backend-micronaut | Integration test patterns for Micronaut |
| `security-checklist` | backend-micronaut | Auth, validation, OWASP prevention |
| `ui-ux-pro-max` | frontend-react | Design intelligence — styles, palettes, font pairings, stacks |
| `terraform-service-scaffold` | infrastructure | Scaffold service Terraform (ECR, RDS, Redis, S3, ECS/EKS) |
| `terraform-module-creator` | infrastructure | Create reusable Terraform modules |
| `terraform-review` | infrastructure | PR review checklist for Terraform |
| `terraform-security-audit` | infrastructure | 6-area security audit for Terraform |
| `terraform-best-practices` | infrastructure | Quick reference for Terraform conventions |
| `brainstorm` | research | Idea generation and ranking |
| `idea-validation` | research | Score ideas with structured checklist |
| `market-research` | research | Market sizing, trends, opportunities |
| `competitive-teardown` | research | Deep competitor analysis |
| `deep-research` | research | Multi-source research with citations |
| `investor-materials` | research | Pitch deck, one-pager, financial model |
| `investor-outreach` | research | Investor targeting and outreach |
| `article-writing` | research | Long-form content creation |
| `content-engine` | research | Content strategy and production |
| `startup-pipeline` | research | Full startup research pipeline |
| `web-to-prd` | product | Scan web apps, extract features, generate PRD, export to Notion |
| `ops-investigate-alert` | ops | Investigate monitoring alerts end-to-end |
| `ops-oncall-log` | ops | Create on-call log from monitoring alerts |

---

## Agents

| Agent | Pack | What it does |
|-------|------|-------------|
| `micronaut-backend-expert` | backend-micronaut | Micronaut framework, database design, API architecture |
| `solution-architect-cto` | backend-micronaut | System design, scalability, tech decisions |
| `infrastructure-expert` | infrastructure | AWS + Terraform, c0x12c modules, EKS/ECS, security |
| `sre-architect` | infrastructure | Multi-account strategy, cost optimization, DR planning |
| `idea-killer` | research | Stress-test ideas, find weaknesses |
| `research-planner` | research | Plan and coordinate research workflows |

---

## Rules

Rules are enforced automatically every session. No action needed — they're active as long as the pack is installed.

| Rule | Pack |
|------|------|
| `NAMING_CONVENTIONS` | core |
| `TIMEZONE` | core |
| `ARCHITECTURE` | shared-backend |
| `SCHEMA` | database |
| `ORM_AND_REPO` | database |
| `TRANSACTIONS` | database |
| `KOTLIN` | backend-micronaut |
| `CONTROLLERS` | backend-micronaut |
| `SERVICES_AND_BEANS` | backend-micronaut |
| `API_DESIGN` | backend-micronaut |
| `RETROFIT_PLACEMENT` | backend-micronaut |
| `FRONTEND` | frontend-react |
| `STRUCTURE` | infrastructure |
| `MODULES` | infrastructure |
| `STATE_AND_BACKEND` | infrastructure |
| `NAMING` | infrastructure |
| `SECURITY` | infrastructure |
| `VARIABLES` | infrastructure |
| `PROVIDERS` | infrastructure |

---

## Using with Other AI Tools

All content is standard markdown. The npx installer supports multiple agents:

```bash
# Cursor — installs rules to .cursor/rules/
npx @c0x12c/ai-toolkit@latest --agent=cursor

# Windsurf — installs rules to .windsurf/rules/
npx @c0x12c/ai-toolkit@latest --agent=windsurf

# Codex — installs to .codex/
npx @c0x12c/ai-toolkit@latest --agent=codex

# Devin CLI — installs to .devin/ (rules via root AGENTS.md)
npx @c0x12c/ai-toolkit@latest --agent=devin

# Copilot — installs to .github/copilot/
npx @c0x12c/ai-toolkit@latest --agent=copilot
```

For other tools, copy the rule files from `toolkit/rules/` into your tool's config directory.

---

## Project Config

Customize any Spartan command per project. Two config files in `.spartan/`:

### `.spartan/build.yaml` — Build workflow config

Controls `/spartan:build` behavior:

```yaml
branch-prefix: "feature"    # branch name: [prefix]/[slug]
max-review-rounds: 3        # review-fix cycles before asking user
skip-stages: []             # skip: spec, design, plan, ship (never review)

prompts:
  spec: |
    Always include performance requirements.
  plan: |
    Every task must reference a Jira ticket.
  implement: |
    Add structured logging to new service methods.
  review: |
    Check all API responses include request_id.
  ship: |
    PR title: [PROJ-123] Short description.
```

### `.spartan/commands.yaml` — Per-command prompt injection

Inject custom instructions into ANY Spartan command:

```yaml
prompts:
  review: |
    Flag any function longer than 50 lines.
  pr-ready: |
    Always add "Reviewers: @backend-team" for backend changes.
  daily: |
    Include blockers section. Tag by project area.
  debug: |
    Always check CloudWatch logs first.
  migration: |
    Migration files must start with ticket number.
```

Templates for both files are in `toolkit/templates/`.

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

## Target Stack

Rules and skills are tuned for this stack, but the command framework works with anything:

| Layer | Technology |
|-------|-----------|
| Backend | Kotlin + Micronaut |
| Frontend | React + Next.js + TypeScript |
| Infrastructure | Terraform + AWS (EKS/ECS, RDS, ElastiCache, S3) |
| Database | PostgreSQL |
| CI/CD | GitHub Actions |

> **Different stack?** Fork the repo, edit the rules and skills, run the installer. Commands work with any language or framework.
