#!/usr/bin/env node
// T32: theme colours as plain CSS, before and after. Run on the PC through demo/e2e/themes.sh:
//   node themes-capture.mjs <before-url> <after-url> <out> <themes.css> <themesV2.json> <shared.css>
// For every base theme, light and dark, at 1280 and 390 (full page, 1x, reduced motion):
// - <before|after>-<slug>-<mode>-<width>.png, and diff-<…>.png (differing pixels in red) when they differ;
// - every variable generated/themes.css sets, read on <html> in both: they must be equal.
// Then, before and after: the board's sequence (start on one theme and mode, then setTheme(mode) and applyTheme(i) at
// runtime, through the page's own @levain/tokens module) against a fresh load of that theme and mode; system mode with
// the OS switching light → dark (after should follow; before is D2); and, after only, a page with no JavaScript at all
// that links themes.css and sets the attribute, against the app's values; the same with shared.css after themes.css
// (its :root and .dark --elevation-* must not win on order). Writes checks.json; exits 1 when a variable
// check fails (pixel differences are reported, not fatal: the report says why each one happens).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const { chromium } = createRequire(path.join(process.env.PW_DIR, 'node_modules/'))('playwright-core');
const [beforeUrl, afterUrl, out, cssPath, jsonPath, sharedPath] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const exe = [process.env.CHROMIUM, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/google-chrome'].find(p => p && fs.existsSync(p));
if (!exe) throw new Error('no Chromium found (set CHROMIUM)');
const browser = await chromium.launch({ executablePath: exe, headless: true });

const css = fs.readFileSync(cssPath, 'utf8');
const sharedCss = fs.readFileSync(sharedPath, 'utf8');
const themes = Object.entries(JSON.parse(fs.readFileSync(jsonPath, 'utf8')));
const slug = name => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const VARS = [...new Set([...css.matchAll(/^\s+(--[a-z0-9-]+):/gm)].map(m => m[1]))].filter(v => v !== '--levain-themes');
const MODES = ['light', 'dark'];
const WIDTHS = [1280, 390];
const SIDES = { before: beforeUrl, after: afterUrl };
const checks = { vars: VARS.length, pixels: {}, varFails: [], board: {}, system: {}, noJs: {}, sharedAfter: {}, errors: [] };

const readVars = page => page.evaluate(names => {
  const s = getComputedStyle(document.documentElement);
  return Object.fromEntries(names.map(n => [n, s.getPropertyValue(n).trim()]));
}, VARS);

const settle = async page => {
  await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--color-surface-canvas').trim() !== '');
  await page.evaluate(() => Promise.all([document.fonts.ready, ...[...document.images].map(i => i.decode().catch(() => {}))]));
  await page.waitForTimeout(800);
};

const open = async (side, query, { width = 1280, colorScheme = 'light', init } = {}) => {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce', colorScheme });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  page.on('pageerror', e => checks.errors.push(`${side} ${query}: ${e.message}`));
  await page.goto(`${SIDES[side]}?${query}`, { waitUntil: 'networkidle' });
  await settle(page);
  return { ctx, page };
};

const diffVars = (label, a, b) => {
  const bad = VARS.filter(n => a[n] !== b[n]).map(n => `${n}: ${a[n]} vs ${b[n]}`);
  if (bad.length) checks.varFails.push({ label, count: bad.length, first: bad.slice(0, 5) });
  return bad.length;
};

// Pixel compare in a blank page: both PNGs on canvases, count differing pixels, draw them red.
const cmpPage = await (await browser.newContext()).newPage();
const comparePngs = async (a, b, diffPath) => {
  const r = await cmpPage.evaluate(async ([a, b]) => {
    const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    if (ia.width !== ib.width || ia.height !== ib.height) return { size: [`${ia.width}x${ia.height}`, `${ib.width}x${ib.height}`] };
    const c = document.createElement('canvas'); c.width = ia.width; c.height = ia.height;
    const x = c.getContext('2d');
    x.drawImage(ia, 0, 0); const da = x.getImageData(0, 0, c.width, c.height);
    x.drawImage(ib, 0, 0); const db = x.getImageData(0, 0, c.width, c.height);
    let n = 0, box = null;
    for (let p = 0; p < da.data.length; p += 4) {
      if (da.data[p] !== db.data[p] || da.data[p + 1] !== db.data[p + 1] || da.data[p + 2] !== db.data[p + 2] || da.data[p + 3] !== db.data[p + 3]) {
        n++;
        const px = (p / 4) % c.width, py = Math.floor(p / 4 / c.width);
        box = box ? [Math.min(box[0], px), Math.min(box[1], py), Math.max(box[2], px), Math.max(box[3], py)] : [px, py, px, py];
        db.data[p] = 255; db.data[p + 1] = 0; db.data[p + 2] = 0; db.data[p + 3] = 255;
      }
    }
    if (!n) return { n };
    x.putImageData(db, 0, 0);
    return { n, box, png: c.toDataURL('image/png') };
  }, [a, b].map(f => `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`));
  if (r.png) fs.writeFileSync(diffPath, Buffer.from(r.png.split(',')[1], 'base64'));
  delete r.png;
  return r;
};

const fresh = {}; // after's values per theme and mode, for the runtime checks
for (const [index, t] of themes) for (const mode of MODES) {
  const s = slug(t.name);
  for (const width of WIDTHS) {
    const key = `${s}-${mode}-${width}`;
    const vals = {};
    for (const side of Object.keys(SIDES)) {
      const { ctx, page } = await open(side, `theme=${index}&mode=${mode}`, { width });
      // Stop animations for the shot: animate-pulse (TimelineList's current dot) runs under reduced motion too, and
      // the first run caught it at different points of its fade (1-2 levels on two dots, in 27 of 32 pairs).
      await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; }' });
      await page.waitForTimeout(200);
      await page.screenshot({ path: `${out}/${side}-${key}.png`, fullPage: true });
      vals[side] = await readVars(page);
      if (side === 'after' && width === 1280) {
        fresh[`${index}-${mode}`] = vals[side];
        const attr = await page.evaluate(() => [document.documentElement.getAttribute('data-levain-theme'), document.documentElement.classList.contains('dark')]);
        if (attr[0] !== s || attr[1] !== (mode === 'dark')) checks.varFails.push({ label: `${key} attribute/class`, first: [JSON.stringify(attr)] });
      }
      await ctx.close();
    }
    diffVars(key, vals.before, vals.after);
    checks.pixels[key] = await comparePngs(`${out}/before-${key}.png`, `${out}/after-${key}.png`, `${out}/diff-${key}.png`);
    console.log(key, JSON.stringify(checks.pixels[key]));
  }
}

// The board's sequence at runtime, through the page's own module instance.
const runtime = async (page, mode, index) => page.evaluate(async ([mode, index]) => {
  const url = performance.getEntriesByType('resource').map(e => e.name).find(n => /packages\/tokens\/index\.ts/.test(n));
  const m = await import(url);
  m.setTheme(mode);
  await m.themeManager.applyTheme(index);
}, [mode, index]);

for (const side of Object.keys(SIDES)) {
  const { ctx, page } = await open(side, 'theme=0&mode=light');
  const runs = [['dark', 3], ['light', 3], ['dark', 7], ['light', 5]];
  checks.board[side] = [];
  for (const [mode, index] of runs) {
    await runtime(page, mode, index);
    await page.waitForTimeout(200);
    const n = diffVars(`board ${side} → ${index} ${mode}`, await readVars(page), fresh[`${index}-${mode}`]);
    checks.board[side].push({ to: `${index} ${mode}`, mismatched: n });
  }
  await ctx.close();
}

// System mode: saved 'system' (both keys, so before and after read it), OS light then dark, no app call in between.
for (const side of Object.keys(SIDES)) {
  const { ctx, page } = await open(side, 'theme=2', {
    init: () => { localStorage.setItem('theme', 'system'); localStorage.setItem('levain-theme-mode', 'system'); },
  });
  const light = diffVars(`system ${side} light`, await readVars(page), fresh['2-light']);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForTimeout(300);
  const darkVals = await readVars(page);
  const darkClass = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  const mism = VARS.filter(n => darkVals[n] !== fresh['2-dark'][n]).length;
  if (side === 'after' && mism) diffVars(`system after dark`, darkVals, fresh['2-dark']);
  checks.system[side] = { lightMismatched: light, darkClass, darkMismatched: mism };
  await ctx.close();
}

// Colour before JavaScript: no script at all, the CSS and the attribute only.
{
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  for (const [index, t] of themes) for (const mode of MODES) {
    await page.setContent(`<!doctype html><html data-levain-theme="${slug(t.name)}" class="${mode === 'dark' ? 'dark' : ''}"><head><style>${css}</style></head><body></body></html>`);
    const n = diffVars(`no-js ${index} ${mode}`, await readVars(page), fresh[`${index}-${mode}`]);
    checks.noJs[`${index}-${mode}`] = n;
    // themes.css first, shared.css after it (an app's @import order the README allows)
    await page.setContent(`<!doctype html><html data-levain-theme="${slug(t.name)}" class="${mode === 'dark' ? 'dark' : ''}"><head><style>${css}</style><style>${sharedCss}</style></head><body></body></html>`);
    checks.sharedAfter[`${index}-${mode}`] = diffVars(`shared.css after ${index} ${mode}`, await readVars(page), fresh[`${index}-${mode}`]);
  }
  await ctx.close();
}

await browser.close();
fs.writeFileSync(`${out}/checks.json`, JSON.stringify(checks, null, 2));
const pixelDiffs = Object.entries(checks.pixels).filter(([, r]) => r.n !== 0);
console.log(`vars checked: ${VARS.length}; var failures: ${checks.varFails.length}; pixel differences: ${pixelDiffs.length}/${Object.keys(checks.pixels).length}; page errors: ${checks.errors.length}`);
console.log('board', JSON.stringify(checks.board));
console.log('system', JSON.stringify(checks.system));
console.log('no-js', JSON.stringify(checks.noJs));
console.log('shared.css after themes.css', JSON.stringify(checks.sharedAfter));
// before is expected to fail system dark (D2); everything else must match
const fatal = checks.varFails.filter(f => !/^system before/.test(f.label));
process.exit(fatal.length ? 1 : 0);
