#!/usr/bin/env node
//
// Extract a single-theme copy of this web app.
//
//   npm run extract-theme -- <themeKey> [destination] [--force]
//   npm run extract-theme -- theme1
//   npm run extract-theme -- theme3 ~/builds/acme-web --force
//
// Copies the whole app to <destination> but keeps ONLY the chosen theme under
// src/themes/. Nothing else has to change: the registry discovers whatever theme
// folders are present (src/themes/registry.js), so the copy installs, builds and
// runs on its own.
//
// Skipped: node_modules, .next, .git and other build output — run `npm install`
// in the copy. Local .env files ARE copied so the copy points at the same API;
// review them before shipping the copy anywhere.

import { existsSync } from 'node:fs';
import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const THEMES_DIR = join(WEB_ROOT, 'src', 'themes');

// Never copied: reinstallable, regenerable, or another machine's state.
const SKIP_NAMES = new Set(['node_modules', '.next', '.git', '.DS_Store', 'out', 'coverage']);

function fail(message) {
  console.error(`\n  ✗ ${message}\n`);
  process.exit(1);
}

// Theme folders present in this checkout (anything with a manifest).
async function listThemes() {
  const entries = await readdir(THEMES_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && existsSync(join(THEMES_DIR, e.name, 'index.js')))
    .map((e) => e.name)
    .sort();
}

// Route keys the app dispatches (<ThemePage routeKey="…">), so we can report what
// the extracted theme does and doesn't implement.
async function appRouteKeys() {
  const keys = new Set();
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name.endsWith('.jsx') || entry.name.endsWith('.js')) {
        const src = await readFile(full, 'utf8');
        for (const m of src.matchAll(/routeKey="([A-Za-z]+)"/g)) keys.add(m[1]);
      }
    }
  };
  await walk(join(WEB_ROOT, 'src', 'app'));
  return [...keys].sort();
}

// Route keys the theme's manifest maps, read as text (the manifest is JSX-importing
// ESM, so it can't simply be imported by plain node).
async function themeRouteKeys(themeKey) {
  const src = await readFile(join(THEMES_DIR, themeKey, 'index.js'), 'utf8');
  const pages = src.match(/pages:\s*{([\s\S]*?)\n  }/);
  if (!pages) return [];
  return [...pages[1].matchAll(/^\s{4}([A-Za-z]+):/gm)].map((m) => m[1]).sort();
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const [themeKey, destArg] = args.filter((a) => !a.startsWith('--'));

  const themes = await listThemes();
  if (!themeKey) {
    fail(
      `Usage: npm run extract-theme -- <themeKey> [destination] [--force]\n` +
        `    Available themes: ${themes.join(', ')}`,
    );
  }
  if (!themes.includes(themeKey)) {
    fail(`Unknown theme "${themeKey}". Available: ${themes.join(', ')}`);
  }

  // Default destination sits beside the repo, never inside it (a copy target
  // inside WEB_ROOT would recurse into itself).
  const dest = destArg
    ? resolve(isAbsolute(destArg) ? destArg : join(process.cwd(), destArg))
    : resolve(WEB_ROOT, '..', '..', '..', `dollara-web-${themeKey}`);

  if (dest === WEB_ROOT || !relative(WEB_ROOT, dest).startsWith('..')) {
    fail(`Destination must be outside the app itself (got ${dest}).`);
  }
  if (existsSync(dest)) {
    const existing = await readdir(dest);
    if (existing.length && !force) {
      fail(`Destination ${dest} is not empty. Re-run with --force to overwrite.`);
    }
  }

  const otherThemes = themes.filter((t) => t !== themeKey);
  const excludedThemeDirs = new Set(otherThemes.map((t) => join(THEMES_DIR, t)));

  await mkdir(dest, { recursive: true });
  await cp(WEB_ROOT, dest, {
    recursive: true,
    filter: (src) => {
      const name = src.split(sep).pop();
      if (SKIP_NAMES.has(name)) return false;
      if (excludedThemeDirs.has(src)) return false; // the other themes
      return true;
    },
  });

  // Record what this copy is, for whoever picks it up later.
  await writeFile(
    join(dest, 'THEME'),
    `${themeKey}\n\nSingle-theme build extracted from dollara/web on ${new Date().toISOString()}.\n` +
      `Run: npm install && npm run dev\n`,
    'utf8',
  );

  // Coverage report: routes this theme implements itself vs. routes that will
  // render the shared "not available" notice (their fallback theme isn't shipped).
  const routes = await appRouteKeys();
  const covered = await themeRouteKeys(themeKey);
  const missing = routes.filter((r) => !covered.includes(r));

  console.log(`\n  ✓ Extracted ${themeKey} → ${dest}`);
  console.log(`    Themes removed: ${otherThemes.join(', ') || 'none'}`);
  console.log(`    Routes implemented: ${covered.length}/${routes.length}`);
  if (missing.length) {
    console.log(
      `\n  ! ${themeKey} has no page for: ${missing.join(', ')}\n` +
        `    Those routes render the shared "This page isn't available" notice —\n` +
        `    the build and every other route are unaffected. Add pages under\n` +
        `    src/themes/${themeKey}/pages/ and map them in index.js to fill them in.`,
    );
  }
  console.log(`\n    Next: cd ${dest} && npm install && npm run dev\n`);
}

main().catch((err) => fail(err.message));
