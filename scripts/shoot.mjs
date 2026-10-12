#!/usr/bin/env node
// Screenshot routes of the web build at iPhone 15/16 size (393 × 852 @2x) for visual QA.
//
//   node scripts/shoot.mjs [--out <dir>] [--no-build] [--full] [--port <n>] [--wait <ms>] <route> [<route> ...]
//   npm run shoot -- --out /tmp/chill-shots /dev/kit "/?seed=demo" /saved
//
// - Builds with `npx expo export --platform web` into dist/ (skip with --no-build to reuse dist/).
// - Serves dist/ on a free port with an SPA fallback (unknown paths → index.html).
// - Opens every route in ONE browser context, in order, so app state persists between routes
//   (AsyncStorage → localStorage): `/?seed=demo` first, then `/saved`, `/insights`, …
// - Waits for fonts + network idle + 1200ms, then saves <out>/<NN>-<slug>.png.
// - --full: grow the viewport to the content height (for long scroll views such as /dev/kit).
// Web test hooks (see src/lib/testHooks.ts): ?seed=demo, ?ff=<hours>, ?reset=1.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PLAYWRIGHT = '/opt/node22/lib/node_modules/playwright';
const BROWSERS = '/opt/pw-browsers';

// ---------------------------------------------------------------------------
// CLI

function parseArgs(argv) {
  const opts = { out: '/tmp/chill-shots', build: true, full: false, port: 0, wait: 1200, routes: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') opts.out = argv[++i];
    else if (a === '--no-build') opts.build = false;
    else if (a === '--full') opts.full = true;
    else if (a === '--port') opts.port = Number(argv[++i]);
    else if (a === '--wait') opts.wait = Number(argv[++i]);
    else if (a === '-h' || a === '--help') opts.help = true;
    else if (a.startsWith('--')) throw new Error(`Unknown option ${a}`);
    else opts.routes.push(a.startsWith('/') ? a : `/${a}`);
  }
  if (!opts.out) throw new Error('--out needs a directory');
  return opts;
}

const USAGE = `Usage: node scripts/shoot.mjs [--out <dir>] [--no-build] [--full] [--port <n>] [--wait <ms>] <route>...
Example: node scripts/shoot.mjs --out /tmp/chill-shots /dev/kit "/?seed=demo" /saved`;

// ---------------------------------------------------------------------------
// Static server with SPA fallback

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function serve(dir, port) {
  const index = path.join(dir, 'index.html');
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let file = path.normalize(path.join(dir, decodeURIComponent(url.pathname)));
    if (!file.startsWith(dir)) file = index; // no path traversal
    let isFile = false;
    try {
      isFile = statSync(file).isFile();
    } catch {
      isFile = false;
    }
    if (!isFile) {
      // SPA fallback: routes like /saved or /item/abc render index.html; missing assets 404.
      if (path.extname(url.pathname) && !url.pathname.endsWith('.html')) {
        res.writeHead(404).end('Not found');
        return;
      }
      file = index;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(readFileSync(file));
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

// ---------------------------------------------------------------------------

function slug(route, i) {
  const s =
    route
      .replace(/^\//, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'home';
  return `${String(i + 1).padStart(2, '0')}-${s}`;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || opts.routes.length === 0) {
    console.log(USAGE);
    process.exit(opts.help ? 0 : 1);
  }

  if (opts.build) {
    console.log('› expo export --platform web → dist/');
    const r = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', 'dist'], {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, EXPO_OFFLINE: '1', CI: '1' },
    });
    if (r.status !== 0) throw new Error(`expo export failed (exit ${r.status})`);
  }
  if (!existsSync(path.join(DIST, 'index.html'))) throw new Error('dist/index.html missing — run without --no-build');

  process.env.PLAYWRIGHT_BROWSERS_PATH ??= BROWSERS;
  const require = createRequire(import.meta.url);
  const { chromium } = require(PLAYWRIGHT);

  const port = opts.port || (await freePort());
  const server = await serve(DIST, port);
  const base = `http://127.0.0.1:${port}`;
  mkdirSync(opts.out, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });

  const saved = [];
  try {
    for (const [i, route] of opts.routes.entries()) {
      await page.setViewportSize({ width: 393, height: 852 });
      await page.goto(base + route, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(opts.wait);
      if (opts.full) {
        const height = await page.evaluate(() => {
          let max = document.documentElement.scrollHeight;
          for (const el of document.querySelectorAll('*')) {
            const s = getComputedStyle(el);
            if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
              max = Math.max(max, el.scrollHeight + el.getBoundingClientRect().top);
            }
          }
          return Math.min(Math.ceil(max), 16000);
        });
        if (height > 852) {
          await page.setViewportSize({ width: 393, height });
          await page.waitForTimeout(600);
        }
      }
      const file = path.join(opts.out, `${slug(route, i)}.png`);
      await page.screenshot({ path: file });
      saved.push(file);
      console.log(`✓ ${route} → ${file}  (now at ${new URL(page.url()).pathname})`);
    }
  } finally {
    await browser.close();
    server.close();
  }
  if (errors.length) {
    console.log(`\n${errors.length} browser error(s):`);
    for (const e of [...new Set(errors)].slice(0, 20)) console.log(`  ${e}`);
  }
  console.log(`\nSaved ${saved.length} screenshot(s) to ${opts.out}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
