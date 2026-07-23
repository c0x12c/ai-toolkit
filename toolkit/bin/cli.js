#!/usr/bin/env node

// Spartan AI Toolkit — npx installer
// Usage:
//   npx @c0x12c/ai-toolkit@latest
//   npx @c0x12c/ai-toolkit@latest --agent=cursor
//   npx @c0x12c/ai-toolkit@latest --packs=backend-micronaut,product
//   npx @c0x12c/ai-toolkit@latest --all
//   npx @c0x12c/ai-toolkit@latest --local

import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync, readdirSync, copyFileSync } from 'node:fs';
import { join, dirname, resolve as pathResolve } from 'node:path';
import { createInterface } from 'node:readline';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

// ── Resolve package root (works from npx temp dir) ──────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PKG_ROOT = pathResolve(__dirname, '..');

// ── Toolkit source paths ────────────────────────────────────────
const SRC = {
  commands:   join(PKG_ROOT, 'commands'),
  commandsSub: join(PKG_ROOT, 'commands', 'spartan'),
  router:     join(PKG_ROOT, 'commands', 'spartan.md'),
  rules:      join(PKG_ROOT, 'rules'),
  skills:     join(PKG_ROOT, 'skills'),
  agents:     join(PKG_ROOT, 'agents'),
  codexHelper: join(PKG_ROOT, 'codex', 'spartan.zsh'),
  devinHelper: join(PKG_ROOT, 'devin', 'spartan.zsh'),
  profiles:   join(PKG_ROOT, 'profiles'),
  claudeMd:   join(PKG_ROOT, 'claude-md'),
  version:    join(PKG_ROOT, 'VERSION'),
  claudePlugin: join(PKG_ROOT, '.claude-plugin'),
};

// ── Colors ──────────────────────────────────────────────────────
const C = {
  blue: '\x1b[34m', green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', cyan: '\x1b[36m', bold: '\x1b[1m',
  dim: '\x1b[2m', reset: '\x1b[0m',
};

function bold(s) { return `${C.bold}${s}${C.reset}`; }
function green(s) { return `${C.green}${s}${C.reset}`; }
function yellow(s) { return `${C.yellow}${s}${C.reset}`; }
function cyan(s) { return `${C.cyan}${s}${C.reset}`; }
function dim(s) { return `${C.dim}${s}${C.reset}`; }
function blue(s) { return `${C.blue}${s}${C.reset}`; }

// ── Pack definitions (loaded from YAML manifests) ───────────────
import { PACKS, PACK_ORDER } from '../lib/packs.js';
import { assembleCLAUDEmd, assembleAGENTSmd } from '../lib/assembler.js';
import { resolve as resolveDeps, resolveAliases, loadManifests, loadExternalPacks } from '../lib/resolver.js';
import { detectStacks } from '../lib/detector.js';

const manifests = loadManifests(join(PKG_ROOT, 'packs'));

// Maps community pack names to their source directory (for file resolution)
const externalPackSources = {};

// ── Parse args ──────────────────────────────────────────────────
const args = process.argv.slice(2);

let agent = 'claude-code';
let packsArg = '';
let installAll = false;
let mode = 'global';  // default for claude-code
let showHelp = false;
let format = '';  // '' = default, 'agents-md' = export AGENTS.md
let autoDetect = false;
let packDirArg = '';  // external community pack directory
let doUninstall = false;

for (const arg of args) {
  if (arg === '--help' || arg === '-h') showHelp = true;
  else if (arg === '--uninstall') doUninstall = true;
  else if (arg.startsWith('--agent=')) agent = arg.split('=')[1];
  else if (arg.startsWith('--packs=')) packsArg = arg.split('=')[1];
  else if (arg.startsWith('--format=')) format = arg.split('=')[1];
  else if (arg.startsWith('--pack-dir=')) packDirArg = arg.split('=')[1];
  else if (arg === '--all') installAll = true;
  else if (arg === '--auto') autoDetect = true;
  else if (arg === '--global') mode = 'global';
  else if (arg === '--local') mode = 'local';
}

if (showHelp) {
  // Group packs by category for help display
  const categories = {};
  for (const name of PACK_ORDER) {
    const p = PACKS[name];
    if (p.hidden) continue;
    const cat = p.category || 'Other';
    if (!categories[cat]) categories[cat] = [];
    const items = [
      p.commands.length ? `${p.commands.length} commands` : '',
      p.rules.length ? `${p.rules.length} rules` : '',
      p.skills.length ? `${p.skills.length} skills` : '',
      p.agents.length ? `${p.agents.length} agents` : '',
    ].filter(Boolean).join(', ');
    const tag = p.comingSoon ? ` ${dim('(coming soon)')}` : '';
    categories[cat].push(`    ${bold(name.padEnd(20))} ${p.description}${tag}${items ? dim(` (${items})`) : ''}`);
  }

  console.log(`
  ${bold('Spartan AI Toolkit')} — installer

  ${bold('Usage:')}
    npx @c0x12c/ai-toolkit@latest [options]

  ${bold('Options:')}
    --agent=NAME    Agent to set up for (default: claude-code)
                    Choices: claude-code, cursor, windsurf, codex, copilot, devin
    --packs=LIST    Comma-separated packs (claude-code only)
                    Example: --packs=backend-micronaut,product
    --auto          Auto-detect tech stack and suggest packs (no menu)
    --pack-dir=DIR  Load community packs from an external directory
    --format=NAME   Output format: agents-md (exports AGENTS.md for cross-tool use)
    --all           Install all packs
    --global        Install to home dir (default for claude-code/codex/devin)
    --local         Install to current project's .claude/ dir (won't touch root CLAUDE.md)
    --uninstall     Remove all Spartan files (use with --local or --global)
    --help          Show this help

  ${bold('Packs:')}
${Object.entries(categories).map(([cat, lines]) => `\n    ${bold(cat + ':')}
${lines.join('\n')}`).join('\n')}

  ${bold('Examples:')}
    ${cyan('npx @c0x12c/ai-toolkit@latest')}
      Interactive — pick agent and packs from menu

    ${cyan('npx @c0x12c/ai-toolkit@latest --packs=frontend-react,product')}
      Next.js app with product thinking tools

    ${cyan('npx @c0x12c/ai-toolkit@latest --packs=backend-micronaut,frontend-react')}
      Full-stack: Kotlin backend + React frontend

    ${cyan('npx @c0x12c/ai-toolkit@latest --all')}
      Everything installed

    ${cyan('npx @c0x12c/ai-toolkit@latest --agent=cursor')}
      Install rules for Cursor (rules + AGENTS.md only)

    ${cyan('npx @c0x12c/ai-toolkit@latest --agent=devin')}
      Full install for Devin CLI (commands as skills + rules via AGENTS.md)

    ${cyan('npx @c0x12c/ai-toolkit@latest --auto')}
      Auto-detect your tech stack and install matching packs

    ${cyan('npx @c0x12c/ai-toolkit@latest --format=agents-md --packs=backend-micronaut')}
      Export AGENTS.md for any AI coding tool
`);
  process.exit(0);
}

// ── Uninstall ──────────────────────────────────────────────────────
import { rmSync } from 'node:fs';

/** Remove each existing {path, label} target, logging as it goes. Returns count removed. */
function removeTargets(targets) {
  let removed = 0;
  for (const { path, label } of targets) {
    if (existsSync(path)) {
      rmSync(path, { recursive: true, force: true });
      console.log(`  ${green('-')} ${label}`);
      removed++;
    }
  }
  return removed;
}

/**
 * Remove each [dir, label] pair only if it exists AND ends up empty (a helper
 * file living inside it should already have been removed via removeTargets()).
 * Skips silently if the dir has other user files. Returns count removed.
 */
function cleanupEmptyHelperDirs(pairs) {
  let removed = 0;
  for (const [dir, label] of pairs) {
    if (dir && existsSync(dir)) {
      try {
        if (readdirSync(dir).length === 0) {
          rmSync(dir, { recursive: true, force: true });
          console.log(`  ${green('-')} ${label}`);
          removed++;
        }
      } catch {
        // Best-effort cleanup; ignore failures.
      }
    }
  }
  return removed;
}

async function uninstall() {
  const home = homedir();
  const cwd = process.cwd();

  let base, claudeMdPath, agentsMdPath, configDir;

  if (agent === 'claude-code') {
    base = mode === 'global' ? join(home, '.claude') : join(cwd, '.claude');
    claudeMdPath = join(base, 'CLAUDE.md');
    configDir = join(cwd, '.spartan');
  } else if (agent === 'codex') {
    base = mode === 'global' ? join(home, '.codex') : join(cwd, '.codex');
    claudeMdPath = join(base, 'CLAUDE.md');
    configDir = join(cwd, '.spartan');
  } else if (agent === 'devin') {
    base = mode === 'global' ? join(home, '.config', 'devin') : join(cwd, '.devin');
    agentsMdPath = mode === 'global' ? join(base, 'AGENTS.md') : join(cwd, 'AGENTS.md');
    configDir = join(cwd, '.spartan');

    console.log(`\n  Removing Spartan from ${bold(mode)} (${base})...\n`);

    // Carried Codex helper (cross-carry, see getTargets()) removed alongside
    // devin's own files; its parent codex/ dir is cleaned up only if empty.
    let removed = removeTargets([
      { path: join(base, 'skills'),          label: 'skills/' },
      { path: join(base, '.spartan-packs'),   label: '.spartan-packs' },
      { path: join(base, '.spartan-version'), label: '.spartan-version' },
      { path: join(base, 'spartan.zsh'),      label: 'spartan.zsh' },
      { path: join(base, 'codex', 'spartan.zsh'), label: 'codex/spartan.zsh' },
    ]);
    removed += cleanupEmptyHelperDirs([[join(base, 'codex'), 'codex/']]);

    if (agentsMdPath && existsSync(agentsMdPath)) {
      rmSync(agentsMdPath);
      console.log(`  ${green('-')} AGENTS.md`);
      removed++;
    }

    if (configDir && existsSync(configDir)) {
      rmSync(configDir, { recursive: true, force: true });
      console.log(`  ${green('-')} .spartan/`);
      removed++;
    }

    if (removed === 0) {
      console.log(`  ${dim('Nothing to remove — Spartan is not installed here.')}`);
    }

    console.log(`\n  ${bold(green('Uninstall done.'))} Removed ${removed} items.\n`);
    return;
  } else {
    // cursor, windsurf, copilot
    const rulesDir = {
      cursor:   join(cwd, '.cursor', 'rules'),
      windsurf: join(cwd, '.windsurf', 'rules'),
      copilot:  join(cwd, '.github', 'instructions'),
    }[agent];
    base = null;
    agentsMdPath = join(cwd, 'AGENTS.md');
    configDir = null;

    console.log(`\n  Removing ${bold(agent)} files...\n`);

    if (rulesDir && existsSync(rulesDir)) {
      rmSync(rulesDir, { recursive: true, force: true });
      console.log(`  ${green('-')} ${rulesDir}`);
    }
    if (agentsMdPath && existsSync(agentsMdPath)) {
      rmSync(agentsMdPath);
      console.log(`  ${green('-')} AGENTS.md`);
    }

    console.log(`\n  ${bold(green('Uninstall done.'))}\n`);
    return;
  }

  // Claude Code / Codex uninstall
  const targets = [
    { path: join(base, 'commands', 'spartan'),    label: 'commands/spartan/' },
    { path: join(base, 'commands', 'spartan.md'), label: 'commands/spartan.md' },
    { path: join(base, 'rules'),                  label: 'rules/' },
    { path: join(base, 'skills'),                 label: 'skills/' },
    { path: join(base, 'agents'),                 label: 'agents/' },
    { path: join(base, '.spartan-packs'),          label: '.spartan-packs' },
    { path: join(base, '.spartan-version'),        label: '.spartan-version' },
    { path: join(base, '.spartan-repo'),           label: '.spartan-repo' },
  ];

  // Codex/Devin helper paths differ per agent. Target the helper file specifically —
  // do not recursively delete the whole <base>/codex/ or <base>/devin/ directory,
  // since users may have unrelated files there.
  //   - claude-code carries both: <base>/codex/spartan.zsh, <base>/devin/spartan.zsh
  //   - codex installs its own active helper at <base>/spartan.zsh, carries <base>/devin/spartan.zsh
  let codexHelperDir = null;
  let devinHelperDir = null;
  if (agent === 'claude-code') {
    targets.push({ path: join(base, 'codex', 'spartan.zsh'), label: 'codex/spartan.zsh' });
    targets.push({ path: join(base, 'devin', 'spartan.zsh'), label: 'devin/spartan.zsh' });
    codexHelperDir = join(base, 'codex');
    devinHelperDir = join(base, 'devin');
  } else if (agent === 'codex') {
    targets.push({ path: join(base, 'spartan.zsh'), label: 'spartan.zsh' });
    targets.push({ path: join(base, 'devin', 'spartan.zsh'), label: 'devin/spartan.zsh' });
    devinHelperDir = join(base, 'devin');
  }

  console.log(`\n  Removing Spartan from ${bold(mode)} (${base})...\n`);

  let removed = removeTargets(targets);

  // Clean up an empty codex/ or devin/ directory left behind after removing
  // the helper. Skip silently if the dir has other user files.
  removed += cleanupEmptyHelperDirs([[codexHelperDir, 'codex/'], [devinHelperDir, 'devin/']]);

  if (claudeMdPath && existsSync(claudeMdPath)) {
    rmSync(claudeMdPath);
    console.log(`  ${green('-')} CLAUDE.md`);
    removed++;
  }

  if (configDir && existsSync(configDir)) {
    rmSync(configDir, { recursive: true, force: true });
    console.log(`  ${green('-')} .spartan/`);
    removed++;
  }

  // Clean up .bak files
  const bakPattern = claudeMdPath ? dirname(claudeMdPath) : base;
  if (bakPattern && existsSync(bakPattern)) {
    const entries = readdirSync(bakPattern);
    for (const entry of entries) {
      if (entry.startsWith('CLAUDE.md.') && entry.endsWith('.bak')) {
        rmSync(join(bakPattern, entry));
        console.log(`  ${green('-')} ${entry}`);
        removed++;
      }
    }
  }

  if (removed === 0) {
    console.log(`  ${dim('Nothing to remove — Spartan is not installed here.')}`);
  }

  console.log(`\n  ${bold(green('Uninstall done.'))} Removed ${removed} items.\n`);
}

// ── Readline helper ─────────────────────────────────────────────
let rl;

function getRL() {
  if (!rl) {
    rl = createInterface({ input: process.stdin, output: process.stdout });
  }
  return rl;
}

function ask(question) {
  return new Promise(resolve => {
    getRL().question(question, answer => resolve(answer.trim()));
  });
}

function closeRL() {
  if (rl) { rl.close(); rl = null; }
}

// ── Version ─────────────────────────────────────────────────────
const VERSION = existsSync(SRC.version)
  ? readFileSync(SRC.version, 'utf-8').trim()
  : '4.2.0';

// ── Target directories based on agent + mode ────────────────────
function getTargets() {
  const home = homedir();
  const cwd = process.cwd();

  if (agent === 'claude-code') {
    const base = mode === 'global' ? join(home, '.claude') : join(cwd, '.claude');
    return {
      base,
      commands:  join(base, 'commands', 'spartan'),
      router:    join(base, 'commands', 'spartan.md'),
      rules:     join(base, 'rules'),
      skills:    join(base, 'skills'),
      agents:    join(base, 'agents'),
      claudeMd:  join(base, 'CLAUDE.md'),
      codexHelper: join(base, 'codex', 'spartan.zsh'),
      devinHelper: join(base, 'devin', 'spartan.zsh'),
      packsFile: join(base, '.spartan-packs'),
      versionFile: join(base, '.spartan-version'),
    };
  }

  if (agent === 'codex') {
    const base = mode === 'global' ? join(home, '.codex') : join(cwd, '.codex');
    return {
      base,
      commands:  join(base, 'commands', 'spartan'),
      router:    join(base, 'commands', 'spartan.md'),
      rules:     join(base, 'rules'),
      skills:    join(base, 'skills'),
      agents:    join(base, 'agents'),
      claudeMd:  join(base, 'CLAUDE.md'),
      codexHelper: join(base, 'spartan.zsh'),
      devinHelper: join(base, 'devin', 'spartan.zsh'),
      packsFile: join(base, '.spartan-packs'),
      versionFile: join(base, '.spartan-version'),
    };
  }

  if (agent === 'devin') {
    const base = mode === 'global' ? join(home, '.config', 'devin') : join(cwd, '.devin');
    return {
      base,
      skills:    join(base, 'skills'),
      // Local: project-root AGENTS.md (Devin's documented project convention).
      // Global: <base>/AGENTS.md (Devin's documented global convention).
      agentsMd:  mode === 'global' ? join(base, 'AGENTS.md') : join(cwd, 'AGENTS.md'),
      codexHelper: join(base, 'codex', 'spartan.zsh'),
      devinHelper: join(base, 'spartan.zsh'),
      packsFile: join(base, '.spartan-packs'),
      versionFile: join(base, '.spartan-version'),
    };
  }

  // cursor, windsurf, copilot — project-local only
  const rulesDir = {
    cursor:   join(cwd, '.cursor', 'rules'),
    windsurf: join(cwd, '.windsurf', 'rules'),
    copilot:  join(cwd, '.github', 'instructions'),
  }[agent];

  return {
    base: cwd,
    rules: rulesDir,
    agentsMd: join(cwd, 'AGENTS.md'),
    packsFile: join(cwd, '.spartan-packs'),
    versionFile: null,
  };
}

// ── Helpers ─────────────────────────────────────────────────────
function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(dirname(dest));
  const content = readFileSync(src);
  writeFileSync(dest, content);
}

function copyDir(src, dest) {
  ensureDir(dest);
  cpSync(src, dest, { recursive: true });
}

/** Ensure .spartan/ai.env is in the project .gitignore (local installs only). */
function ensureGitignore(projectDir) {
  const gitignorePath = join(projectDir, '.gitignore');
  const entry = '.spartan/ai.env';

  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, 'utf-8');
    if (content.includes(entry)) return; // already there
    const newline = content.endsWith('\n') ? '' : '\n';
    writeFileSync(gitignorePath, content + newline + '\n# Spartan AI config (contains API keys)\n' + entry + '\n', 'utf-8');
  } else {
    writeFileSync(gitignorePath, '# Spartan AI config (contains API keys)\n' + entry + '\n', 'utf-8');
  }
  console.log(`  ${green('+')} Added ${entry} to .gitignore`);
}

/** Get the source root for a pack (built-in uses PKG_ROOT, community uses pack-dir). */
function getPackSource(packName) {
  return externalPackSources[packName] || PKG_ROOT;
}

/** Get all items for a category across selected packs, deduplicated. */
function gatherItems(selectedPacks, category) {
  const seen = new Set();
  const result = [];
  for (const pack of selectedPacks) {
    const def = PACKS[pack];
    if (!def) continue;
    for (const item of def[category]) {
      if (!seen.has(item)) {
        seen.add(item);
        result.push(item);
      }
    }
  }
  return result;
}

/** Like gatherItems but includes the source root for each item (for community pack support). */
function gatherItemsWithSource(selectedPacks, category) {
  const seen = new Set();
  const result = [];
  for (const pack of selectedPacks) {
    const def = PACKS[pack];
    if (!def) continue;
    const srcRoot = getPackSource(pack);
    for (const item of def[category]) {
      if (!seen.has(item)) {
        seen.add(item);
        result.push({ item, srcRoot });
      }
    }
  }
  return result;
}

// ── Pack selection (grouped menu) ───────────────────────────────
async function selectPacks(targets) {
  // --all flag
  if (installAll) {
    const all = PACK_ORDER.filter(p => !PACKS[p].hidden && !PACKS[p].comingSoon);
    return resolveDeps(all, manifests);
  }

  // --packs flag
  if (packsArg) {
    let requested = packsArg.split(',').map(s => s.trim()).filter(Boolean);
    const { resolved: aliased, warnings } = resolveAliases(requested);
    for (const w of warnings) console.log(`  ${yellow('!')} ${w}`);
    return resolveDeps(aliased, manifests);
  }

  // --auto flag: detect tech stack
  if (autoDetect) {
    const cwd = process.cwd();
    console.log(`\n  ${blue('Scanning')} ${dim(cwd)} ${blue('for tech stack...')}\n`);
    const { detected, comingSoon } = detectStacks(cwd);

    if (detected.length > 0) {
      console.log(`  ${bold('Detected stacks:')}`);
      for (const d of detected) {
        console.log(`    ${green('✓')} ${bold(d.pack)} ${dim(`(${d.reason})`)}`);
      }

      if (comingSoon.length > 0) {
        console.log('');
        for (const d of comingSoon) {
          console.log(`    ${yellow('~')} ${d.pack} ${dim(`(${d.reason})`)} ${dim('— coming soon, skipped')}`);
        }
      }
      console.log('');

      const packNames = detected.map(d => d.pack);
      const confirm = await ask(`  Install ${bold(packNames.join(' + '))}? [Y/n]: `);
      if (confirm !== 'n' && confirm !== 'N') {
        return resolveDeps(packNames, manifests);
      }
      // User said no — fall through to interactive menu
      console.log('');
    } else {
      console.log(`  ${dim('No stacks detected.')}`);
      if (comingSoon.length > 0) {
        for (const d of comingSoon) {
          console.log(`    ${yellow('~')} ${d.pack} ${dim(`(${d.reason})`)} ${dim('— coming soon')}`);
        }
      }
      console.log(`  ${dim('Falling back to interactive menu...')}\n`);
    }
  }

  // Check saved packs
  if (existsSync(targets.packsFile)) {
    let saved = readFileSync(targets.packsFile, 'utf-8').trim().split('\n').filter(Boolean);
    const { resolved: aliased, warnings } = resolveAliases(saved);
    for (const w of warnings) console.log(`  ${yellow('!')} ${w}`);
    saved = aliased;

    if (saved.length > 0) {
      console.log(`\n  ${cyan('Previously installed packs:')} ${saved.filter(p => !PACKS[p]?.hidden).join(', ')}`);
      const reuse = await ask('  Re-install same packs? [Y/n]: ');
      if (reuse !== 'n' && reuse !== 'N') {
        return resolveDeps(saved, manifests);
      }
    }
  }

  // Interactive grouped menu
  console.log(`\n  ${bold('Choose your packs:')}\n`);

  const categories = {};
  const selectablePacks = [];
  for (const name of PACK_ORDER) {
    const p = PACKS[name];
    if (p.hidden) continue;
    const cat = p.category || 'Other';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(name);
  }

  for (const [cat, packs] of Object.entries(categories)) {
    console.log(`  ${bold(cat + ':')}`);
    for (const name of packs) {
      const p = PACKS[name];
      const tag = name === 'core' ? ` ${green('(always included)')}`
        : p.comingSoon ? ` ${dim('(coming soon)')}`
        : '';
      console.log(`    ${bold(name)} — ${p.description}${tag}`);
      if (!p.comingSoon && name !== 'core') {
        selectablePacks.push(name);
      }
    }
    console.log('');
  }

  const allChoice = await ask('  Install all packs? [Y/n]: ');

  if (allChoice !== 'n' && allChoice !== 'N') {
    return resolveDeps(selectablePacks, manifests);
  }

  // Ask about each optional pack
  const selected = [];
  for (const pack of selectablePacks) {
    const def = PACKS[pack];
    const choice = await ask(`  ${bold(pack)} — ${def.description}? [y/N]: `);
    if (choice === 'y' || choice === 'Y') {
      selected.push(pack);
    }
  }

  return resolveDeps(selected, manifests);
}

// ── Install for claude-code / codex ─────────────────────────────
async function installFull() {
  const targets = getTargets();
  const selectedPacks = await selectPacks(targets);

  // Show user-facing packs (hide hidden deps)
  const userPacks = selectedPacks.filter(p => !PACKS[p]?.hidden);
  const hiddenPacks = selectedPacks.filter(p => PACKS[p]?.hidden);
  console.log(`\n  ${green('Selected:')} ${bold(userPacks.join(' '))}`);
  if (hiddenPacks.length > 0) {
    console.log(`  ${dim('Auto-included:')} ${dim(hiddenPacks.join(' '))}`);
  }
  console.log('');

  // 1) Assemble & install rules file
  //    claude-code/codex: CLAUDE.md into <base>/CLAUDE.md (never project root)
  //    devin: AGENTS.md — project root when local, <base>/AGENTS.md when global
  //           (see getTargets(): Devin's documented rules-discovery convention)
  if (agent === 'devin') {
    console.log(`${blue('[1/6]')} ${bold('Assembling AGENTS.md...')}`);

    const agentsContent = assembleAGENTSmd(SRC.claudeMd, SRC.agents, selectedPacks, PACKS);
    ensureDir(dirname(targets.agentsMd));
    writeFileSync(targets.agentsMd, agentsContent, 'utf-8');
    console.log(`  ${green('+')} AGENTS.md assembled\n`);
  } else {
    console.log(`${blue('[1/6]')} ${bold('Assembling CLAUDE.md...')}`);

    // Warn if project already has a root CLAUDE.md — we don't touch it
    if (mode === 'local') {
      const rootClaudeMd = join(process.cwd(), 'CLAUDE.md');
      if (existsSync(rootClaudeMd)) {
        console.log(`  ${yellow('!')} Project root CLAUDE.md found — leaving it untouched`);
        console.log(`  ${dim('  Spartan writes to .claude/CLAUDE.md (both are loaded by Claude Code)')}`);
      }
    }

    if (existsSync(targets.claudeMd)) {
      const backupPath = `${targets.claudeMd}.${Date.now()}.bak`;
      copyFile(targets.claudeMd, backupPath);
      console.log(`  ${dim('Backed up existing .claude/CLAUDE.md')}`);
    }

    const assembled = assembleCLAUDEmd(SRC.claudeMd, selectedPacks, PACKS);
    ensureDir(dirname(targets.claudeMd));
    writeFileSync(targets.claudeMd, assembled, 'utf-8');

    const sectionCount = 2 + 1 + gatherItems(selectedPacks, 'claudeSections').length;
    console.log(`  ${green('+')} .claude/CLAUDE.md assembled (${sectionCount} sections)\n`);
  }

  // 2) Commands
  //    claude-code/codex: <base>/commands/spartan/<name>.md + router at <base>/commands/spartan.md
  //    devin: folded into skills (Devin's only extensibility unit) — router becomes the
  //           "spartan" skill, each command becomes "spartan-<name>" (see plan decision 1)
  console.log(`${blue('[2/6]')} ${bold('Installing commands...')}`);
  let cmdCount = 0;

  if (agent === 'devin') {
    ensureDir(targets.skills);

    if (existsSync(SRC.router)) {
      const routerContent = readFileSync(SRC.router, 'utf-8');
      const routerDir = join(targets.skills, 'spartan');
      ensureDir(routerDir);
      writeFileSync(join(routerDir, 'SKILL.md'), routerContent, 'utf-8');
      console.log(`  ${green('+')} /spartan (smart router)`);
      cmdCount++;
    }

    const selectedCommands = gatherItemsWithSource(selectedPacks, 'commands');
    for (const { item: cmd, srcRoot } of selectedCommands) {
      const src = join(srcRoot, 'commands', 'spartan', `${cmd}.md`);
      if (existsSync(src)) {
        const cmdDir = join(targets.skills, `spartan-${cmd}`);
        ensureDir(cmdDir);
        // Rewrite the frontmatter `name:` from `spartan:<cmd>` to `spartan-<cmd>` —
        // colons aren't valid in Devin's skill-name-to-slash-trigger resolution.
        const cmdContent = readFileSync(src, 'utf-8').replace(
          /^name:\s*spartan:(.+)$/m,
          `name: spartan-$1`
        );
        writeFileSync(join(cmdDir, 'SKILL.md'), cmdContent, 'utf-8');
        console.log(`  ${green('+')} /spartan-${cmd}`);
        cmdCount++;
      } else {
        console.log(`  ${yellow('!')} /spartan-${cmd} (not found, skipped)`);
      }
    }
  } else {
    ensureDir(targets.commands);

    // Smart router (always)
    if (existsSync(SRC.router)) {
      copyFile(SRC.router, targets.router);
      console.log(`  ${green('+')} /spartan (smart router)`);
      cmdCount++;
    }

    const selectedCommands = gatherItemsWithSource(selectedPacks, 'commands');
    for (const { item: cmd, srcRoot } of selectedCommands) {
      const src = join(srcRoot, 'commands', 'spartan', `${cmd}.md`);
      if (existsSync(src)) {
        copyFile(src, join(targets.commands, `${cmd}.md`));
        console.log(`  ${green('+')} /spartan:${cmd}`);
        cmdCount++;
      } else {
        console.log(`  ${yellow('!')} /spartan:${cmd} (not found, skipped)`);
      }
    }
  }
  console.log(`  ${bold(cmdCount + ' commands')} installed\n`);

  for (const { src, target, label } of [
    { src: SRC.codexHelper, target: targets.codexHelper, label: 'Codex' },
    { src: SRC.devinHelper, target: targets.devinHelper, label: 'Devin' },
  ]) {
    if (existsSync(src) && target) {
      copyFile(src, target);
      const isOwnAgent = (label === 'Codex' && agent === 'codex') || (label === 'Devin' && agent === 'devin');
      const verb = isOwnAgent ? 'shell helpers installed to' : 'helper source copied to';
      console.log(`  ${green('+')} ${label} ${verb} ${dim(target)}\n`);
    }
  }

  // 3) Rules (now with subdirectory structure)
  //    devin has no `targets.rules` — its rules are delivered via the assembled
  //    AGENTS.md in Step 1 (see plan decision 4), so this step is skipped for it.
  if (targets.rules) {
    const rulesWithSource = gatherItemsWithSource(selectedPacks, 'rules');
    if (rulesWithSource.length > 0) {
      console.log(`${blue('[3/6]')} ${bold('Installing rules...')}`);
      let ruleCount = 0;

      for (const { item: rule, srcRoot } of rulesWithSource) {
        const src = join(srcRoot, 'rules', rule);
        const dest = join(targets.rules, rule);
        if (existsSync(src)) {
          copyFile(src, dest);
          console.log(`  ${green('+')} ${rule}`);
          ruleCount++;
        }
      }
      console.log(`  ${bold(ruleCount + ' rules')} installed\n`);
    } else {
      console.log(`${blue('[3/6]')} ${bold('Rules')} — ${dim('no rule packs selected, skipping')}\n`);
    }
  } else {
    console.log(`${blue('[3/6]')} ${bold('Rules')} — ${dim('delivered via AGENTS.md (Step 1) for this agent')}\n`);
  }

  // 4) Skills
  const skillsWithSource = gatherItemsWithSource(selectedPacks, 'skills');
  if (skillsWithSource.length > 0) {
    console.log(`${blue('[4/6]')} ${bold('Installing skills...')}`);
    ensureDir(targets.skills);
    let skillCount = 0;

    for (const { item: skill, srcRoot } of skillsWithSource) {
      const src = join(srcRoot, 'skills', skill);
      if (existsSync(src)) {
        copyDir(src, join(targets.skills, skill));
        console.log(`  ${green('+')} ${skill}`);
        skillCount++;
      }
    }
    console.log(`  ${bold(skillCount + ' skills')} installed\n`);
  } else {
    console.log(`${blue('[4/6]')} ${bold('Skills')} — ${dim('no skill packs selected, skipping')}\n`);
  }

  // 5) Agents
  //    devin has no `targets.agents` — Devin CLI has no documented subagent
  //    concept (only skills + MCP servers), so this is out of scope for it.
  if (!targets.agents) {
    console.log(`${blue('[5/6]')} ${bold('Agents')} — ${dim('not supported for this agent, skipping')}\n`);
  } else {
    const agentsWithSource = gatherItemsWithSource(selectedPacks, 'agents');
    if (agentsWithSource.length > 0) {
      console.log(`${blue('[5/6]')} ${bold('Installing agents...')}`);
      ensureDir(targets.agents);
      let agentCount = 0;

      for (const { item: agentFile, srcRoot } of agentsWithSource) {
        const src = join(srcRoot, 'agents', agentFile);
        if (existsSync(src)) {
          copyFile(src, join(targets.agents, agentFile));
          console.log(`  ${green('+')} ${agentFile.replace('.md', '')}`);
          agentCount++;
        }
      }
      console.log(`  ${bold(agentCount + ' agents')} installed\n`);
    } else {
      console.log(`${blue('[5/6]')} ${bold('Agents')} — ${dim('no agent packs selected, skipping')}\n`);
    }
  }

  // 6) Generate .spartan/config.yaml from best matching profile
  const configDir = mode === 'global'
    ? join(homedir(), '.spartan')
    : join(process.cwd(), '.spartan');
  const configPath = join(configDir, 'config.yaml');

  if (!existsSync(configPath)) {
    const profile = pickProfile(selectedPacks);
    const profileSrc = join(SRC.profiles, `${profile}.yaml`);

    if (existsSync(profileSrc)) {
      ensureDir(configDir);
      copyFile(profileSrc, configPath);
      console.log(`${blue('[6/6]')} ${bold('Generated .spartan/config.yaml')} from ${cyan(profile)} profile`);
      console.log(`  ${dim('Edit this file to customize rules, review stages, and build commands')}\n`);
    }
  } else {
    console.log(`${blue('[6/6]')} ${bold('.spartan/config.yaml')} — ${dim('already exists, kept as-is')}\n`);
  }

  // Save pack selection + version
  writeFileSync(targets.packsFile, selectedPacks.join('\n') + '\n', 'utf-8');
  if (targets.versionFile) {
    writeFileSync(targets.versionFile, VERSION + '\n', 'utf-8');
  }

  return selectedPacks;
}

// ── Profile picker ─────────────────────────────────────────────
// Maps selected packs to the best matching stack profile.
function pickProfile(selectedPacks) {
  const packSet = new Set(selectedPacks);

  // Check for specific stack packs first
  if (packSet.has('backend-micronaut') && packSet.has('frontend-react')) {
    return 'kotlin-micronaut'; // full-stack defaults to backend profile
  }
  if (packSet.has('backend-micronaut')) return 'kotlin-micronaut';
  if (packSet.has('frontend-react'))    return 'react-nextjs';
  if (packSet.has('backend-nodejs'))    return 'typescript-node';
  if (packSet.has('backend-python'))    return 'python-fastapi';

  // No stack-specific pack → use custom
  return 'custom';
}

// ── Install for cursor / windsurf / copilot ─────────────────────
async function installRulesOnly() {
  const targets = getTargets();

  console.log(`\n  Agent: ${bold(agent)}`);
  console.log(`  This installs ${bold('rules + AGENTS.md')} only.`);
  console.log(`  Slash commands are Claude Code specific.\n`);

  // Ask which rule packs
  console.log(`  ${bold('Which rule packs do you need?')}\n`);

  const rulePacks = PACK_ORDER.filter(p => PACKS[p].rules.length > 0 && !PACKS[p].hidden);
  for (const pack of rulePacks) {
    const ruleNames = PACKS[pack].rules.map(r => r.replace(/.*\//, '').replace('.md', '')).join(', ');
    console.log(`  ${bold(pack)} — ${dim(ruleNames)}`);
  }
  console.log('');

  const allChoice = await ask('  Install all rule packs? [Y/n]: ');
  let selectedPacks;

  if (allChoice !== 'n' && allChoice !== 'N') {
    selectedPacks = resolveDeps(rulePacks, manifests);
  } else {
    const picks = [];
    for (const pack of rulePacks) {
      const choice = await ask(`  ${bold(pack)}? [y/N]: `);
      if (choice === 'y' || choice === 'Y') {
        picks.push(pack);
      }
    }
    selectedPacks = resolveDeps(picks, manifests);
  }

  // Install rules
  const selectedRules = gatherItems(selectedPacks, 'rules');
  if (selectedRules.length > 0) {
    console.log(`\n${blue('[1/2]')} ${bold('Installing rules...')}`);
    ensureDir(targets.rules);
    let count = 0;
    for (const rule of selectedRules) {
      const src = join(SRC.rules, rule);
      const dest = join(targets.rules, rule);
      if (existsSync(src)) {
        copyFile(src, dest);
        console.log(`  ${green('+')} ${rule}`);
        count++;
      }
    }
    console.log(`  ${bold(count + ' rules')} installed\n`);
  } else {
    console.log(`\n${blue('[1/2]')} ${bold('Rules')} — ${dim('no rule packs selected')}\n`);
  }

  // Install AGENTS.md — assembled from pack sections + agents
  console.log(`${blue('[2/2]')} ${bold('Installing AGENTS.md...')}`);

  if (targets.agentsMd) {
    const agentsContent = assembleAGENTSmd(SRC.claudeMd, SRC.agents, selectedPacks, PACKS);
    writeFileSync(targets.agentsMd, agentsContent, 'utf-8');
    console.log(`  ${green('+')} AGENTS.md\n`);
  } else {
    console.log(`  ${dim('No AGENTS.md target')}\n`);
  }

  // Save selection
  if (targets.packsFile) {
    writeFileSync(targets.packsFile, selectedPacks.join('\n') + '\n', 'utf-8');
  }

  return selectedPacks;
}

// ── Main ────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log(`${bold('================================================')}`);
  console.log(`${bold('     Spartan AI Toolkit')} ${dim(`v${VERSION}`)}`);
  console.log(`${bold('================================================')}`);
  console.log('');
  console.log(`  Agent: ${bold(agent)}    Mode: ${bold(mode)}`);

  // Check Node version
  const nodeVer = parseInt(process.versions.node.split('.')[0], 10);
  if (nodeVer < 18) {
    console.error(`\n  ${C.red}Node.js ${process.versions.node} is too old. Need >= 18.${C.reset}\n`);
    process.exit(1);
  }

  // Handle --uninstall
  if (doUninstall) {
    await uninstall();
    return;
  }

  // Load community packs if --pack-dir is set
  if (packDirArg) {
    const packDirPath = pathResolve(process.cwd(), packDirArg);
    const builtinNames = new Set(manifests.keys());
    console.log(`\n  ${blue('Loading community packs from')} ${dim(packDirPath)}`);
    const { loaded, errors } = loadExternalPacks(packDirPath, builtinNames);

    if (errors.length > 0) {
      for (const err of errors) {
        console.log(`  ${yellow('!')} ${err}`);
      }
    }

    if (loaded.size > 0) {
      for (const [name, manifest] of loaded) {
        manifests.set(name, manifest);
        externalPackSources[name] = packDirPath;
        // Add to PACKS and PACK_ORDER so menus and install work
        PACKS[name] = {
          description: manifest.description,
          category: manifest.category || 'Community',
          priority: manifest.priority ?? 500,
          hidden: manifest.hidden || false,
          comingSoon: manifest['coming-soon'] || false,
          depends: manifest.depends || [],
          commands: manifest.commands || [],
          rules: manifest.rules || [],
          skills: manifest.skills || [],
          agents: manifest.agents || [],
          claudeSections: manifest['claude-sections'] || [],
        };
        PACK_ORDER.push(name);
      }
      // Re-sort PACK_ORDER by priority
      PACK_ORDER.sort((a, b) => (PACKS[a]?.priority ?? 999) - (PACKS[b]?.priority ?? 999));

      const names = [...loaded.keys()].join(', ');
      console.log(`  ${green('+')} Loaded: ${bold(names)}\n`);
    } else {
      console.log(`  ${dim('No valid community packs found')}\n`);
    }
  }

  let selectedPacks;

  try {
    if (agent === 'claude-code' || agent === 'codex' || agent === 'devin') {
      selectedPacks = await installFull();
    } else if (['cursor', 'windsurf', 'copilot'].includes(agent)) {
      selectedPacks = await installRulesOnly();
    } else {
      console.error(`\n  ${C.red}Unknown agent: ${agent}${C.reset}`);
      console.error(`  Supported: claude-code, cursor, windsurf, codex, copilot, devin\n`);
      process.exit(1);
    }
  } finally {
    closeRL();
  }

  // Generate Codex-compatible skills for codex agent
  if (agent === 'codex') {
    console.log(`${blue('[+]')} ${bold('Generating Codex skills...')}`);
    try {
      const { execSync } = await import('child_process');
      const repoRoot = join(PKG_ROOT, '..');
      execSync('node toolkit/scripts/gen-codex-skills.js', { cwd: repoRoot, stdio: 'pipe' });
      const srcAgents = join(repoRoot, '.agents', 'skills');
      const targets = getTargets();
      const destBase = join(targets.base, '..', '.agents', 'skills');
      if (existsSync(srcAgents)) {
        mkdirSync(destBase, { recursive: true });
        const dirs = readdirSync(srcAgents, { withFileTypes: true }).filter(d => d.isDirectory());
        for (const d of dirs) {
          const destAgentsDir = join(destBase, d.name, 'agents');
          mkdirSync(destAgentsDir, { recursive: true });
          const skillSrc = join(srcAgents, d.name, 'SKILL.md');
          const yamlSrc = join(srcAgents, d.name, 'agents', 'openai.yaml');
          if (existsSync(skillSrc)) copyFileSync(skillSrc, join(destBase, d.name, 'SKILL.md'));
          if (existsSync(yamlSrc)) copyFileSync(yamlSrc, join(destAgentsDir, 'openai.yaml'));
        }
        console.log(`  ${green('+')} ${dirs.length} Codex skills generated in .agents/skills/\n`);
      }
    } catch (e) {
      console.log(`  ${C.yellow}Warning: Codex skill generation failed — ${e.message}${C.reset}\n`);
    }
  }

  // Export AGENTS.md alongside normal install when --format=agents-md
  if (format === 'agents-md' && (agent === 'claude-code' || agent === 'codex')) {
    const cwd = process.cwd();
    const agentsMdPath = join(cwd, 'AGENTS.md');
    console.log(`${blue('[+]')} ${bold('Exporting AGENTS.md for cross-tool use...')}`);
    const agentsContent = assembleAGENTSmd(SRC.claudeMd, SRC.agents, selectedPacks, PACKS);
    writeFileSync(agentsMdPath, agentsContent, 'utf-8');
    console.log(`  ${green('+')} AGENTS.md (works with Cursor, Copilot, Windsurf, Codex, and 20+ tools)\n`);
  }

  // Ensure .spartan/ai.env is gitignored (local installs only)
  if (mode === 'local') {
    ensureGitignore(process.cwd());
  }

  // Success
  const userPacks = selectedPacks.filter(p => !PACKS[p]?.hidden);
  console.log(`${bold(green('================================================'))}`);
  console.log(`${bold(green('          Setup done!'))}  ${dim(`v${VERSION}`)}`);
  console.log(`${bold(green('================================================'))}`);
  console.log('');
  console.log(`  Installed packs: ${cyan(userPacks.join(', '))}`);
  console.log('');

  if (agent === 'claude-code' || agent === 'codex') {
    console.log(`  ${bold('Next steps:')}`);
    console.log('');
    console.log(`  1. Open any project folder and type:`);
    console.log(`     ${cyan('/spartan')}`);
    console.log('');
    console.log(`  2. To change packs later, run again:`);
    console.log(`     ${cyan('npx @c0x12c/ai-toolkit@latest')}`);
    console.log('');
  } else if (agent === 'devin') {
    console.log(`  ${bold('Next steps:')}`);
    console.log('');
    console.log(`  1. Open any project folder and type a skill trigger, e.g.:`);
    console.log(`     ${cyan('/spartan-build')}`);
    console.log(`     ${dim("(Devin skill names use hyphens, not colons — /spartan-build, not /spartan:build)")}`);
    console.log('');
    console.log(`  2. To change packs later, run again:`);
    console.log(`     ${cyan('npx @c0x12c/ai-toolkit@latest --agent=devin')}`);
    console.log('');
  } else {
    console.log(`  ${bold('Next steps:')}`);
    console.log('');
    console.log(`  1. Rules are in your ${agent} rules folder.`);
    console.log(`  2. AGENTS.md is in your project root.`);
    console.log(`  3. Slash commands need Claude Code — they don't work in ${agent}.`);
    console.log('');
  }
}

main().catch(err => {
  console.error(`\n  ${C.red}Error: ${err.message}${C.reset}\n`);
  closeRL();
  process.exit(1);
});
