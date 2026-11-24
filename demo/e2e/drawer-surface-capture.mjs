#!/usr/bin/env node
// T51: the Drawer's surfaces and its height. Run on the PC through demo/e2e/drawer-surface.sh:
//   node drawer-surface-capture.mjs <base-url> <out>
// WebKit with Playwright's iPhone 14 (touch, DPR 3) at 390 px wide, the iPhone's insets faked in (47 top, 34 bottom,
// the bands drawn faintly, as T36's capture). For Sage (theme 0) and Cobalt Mono (theme 7), light and dark, and each
// surface (?open=menu: elevated, ?open=canvas: canvas): the page loads at 390x700 (a short viewport, as with Safari's
// toolbar out) with the drawer open, it's shot; then the viewport grows to 390x844 under the open drawer (the toolbar
// collapsing) and it's shot again. No headless engine has iOS's toolbar, so this checks the panel follows the viewport
// and fills it, and is never shorter than 100lvh; it can't show iOS's own short fixed viewport.
// Measured each time: the overlay, scrim and panel boxes, the viewport, 100lvh, the panel's background and shadow; and
// pixels sampled from the shot inside the panel near its right edge and on the dimmed page just past it, with their
// contrast ratio. Writes <combo>-<surface>-<short|full>.png, numbers.json and composite.png; exits 1 on a failed check.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const req = createRequire(path.join(process.env.PW_DIR, 'node_modules/'));
const pw = req('playwright-core');
const [base, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const pause = ms => new Promise(r => setTimeout(r, ms));
const settled = async page => { await page.evaluate(() => Promise.race([Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming?.().endTime !== Infinity).map(a => a.finished.catch(() => {}))), new Promise(r => setTimeout(r, 3000))])); await pause(900); };

let browser;
try { browser = await pw.webkit.launch({ headless: true }); } catch {
  execFileSync(process.execPath, [path.join(process.env.PW_DIR, 'node_modules/playwright-core/cli.js'), 'install', 'webkit'], { stdio: 'inherit' });
  browser = await pw.webkit.launch({ headless: true });
}
const W = 390, SHORT = 700, FULL = 844, DPR = 3;
const iphone = { ...(({ defaultBrowserType, ...d }) => d)(pw.devices['iPhone 14']), viewport: { width: W, height: SHORT }, deviceScaleFactor: DPR };
const INSETS = { top: 47, bottom: 34, left: 0, right: 0 };
const fakeInsets = page => page.evaluate(insets => {
  for (const s of document.querySelectorAll('style')) s.textContent = s.textContent.replace(/env\(safe-area-inset-(top|bottom|left|right)(,[^)]*)?\)/g, (_, k) => insets[k] + 'px');
  for (const k of ['top', 'bottom']) {
    const band = document.createElement('div');
    band.style.cssText = `position:fixed;left:0;right:0;${k}:0;height:${insets[k]}px;background:rgba(255,0,80,.18);z-index:2147483647;pointer-events:none`;
    document.documentElement.appendChild(band);
  }
}, INSETS);

const COMBOS = [['sage', 0, 'light'], ['sage', 0, 'dark'], ['cobalt', 7, 'light'], ['cobalt', 7, 'dark']];
const SURFACES = [['elevated', 'menu'], ['canvas', 'canvas']];

const probe = page => page.evaluate(() => {
  const box = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
  const d = document.querySelector('[data-drawer]');
  const lvh = document.createElement('div');
  lvh.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:100lvh;visibility:hidden';
  document.body.appendChild(lvh);
  const lvhPx = lvh.getBoundingClientRect().height;
  lvh.remove();
  const cs = getComputedStyle(d);
  return {
    viewport: { w: innerWidth, h: innerHeight }, lvh: lvhPx,
    overlay: box(document.querySelector('[data-drawer-overlay]')), scrim: box(document.querySelector('[data-sheet-scrim]')), panel: box(d),
    surface: d.dataset.surface, bg: cs.backgroundColor, shadow: cs.boxShadow, page: getComputedStyle(document.body).backgroundColor,
  };
});

// pixels from a PNG, read in the browser (no image library in the job's node)
const sampler = await browser.newPage();
const pixels = (file, points) => sampler.evaluate(async ({ src, points }) => {
  const img = new Image(); img.src = src; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  return points.map(([x, y]) => [...g.getImageData(Math.round(x), Math.round(y), 1, 1).data.slice(0, 3)]);
}, { src: `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`, points });
const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return +((hi + 0.05) / (lo + 0.05)).toFixed(2); };

const checks = [], errors = [], numbers = {}, shots = {};
const check = (name, ok, data) => { checks.push({ name, ok: !!ok, data }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${data === undefined ? '' : ' ' + JSON.stringify(data)}`); };
const near = (a, b) => Math.abs(a - b) < 1;

for (const [name, theme, mode] of COMBOS) for (const [surface, open] of SURFACES) {
  const key = `${name}-${mode}-${surface}`;
  const ctx = await browser.newContext(iphone);
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`${key}: ${e.message}`));
  await page.goto(`${base}?theme=${theme}&mode=${mode}&only=drawer&open=${open}`, { waitUntil: 'networkidle' });
  await pause(600);
  await fakeInsets(page);
  await settled(page);
  shots[key] = [];
  for (const [state, h] of [['short', SHORT], ['full', FULL]]) {
    if (h !== SHORT) { await page.setViewportSize({ width: W, height: h }); await settled(page); }
    const file = `${out}/${key}-${state}.png`;
    await page.screenshot({ path: file });
    const n = await probe(page);
    const y = n.panel.h * 0.7, edge = n.panel.x + n.panel.w;
    const [inside, past, far] = await pixels(file, [[(edge - 6) * DPR, y * DPR], [(edge + 4) * DPR, y * DPR], [(edge + 40) * DPR, y * DPR]]);
    n.edge = { inside, past, far, contrastPast: ratio(inside, past), contrastFar: ratio(inside, far) };
    numbers[`${key}-${state}`] = n;
    shots[key].push([`${state} (${n.viewport.h})`, file]);
    check(`${key}-${state}: overlay, scrim and panel run the viewport's full height`, near(n.overlay.y, 0) && near(n.overlay.h, n.viewport.h) && near(n.scrim.h, n.overlay.h) && near(n.panel.y, 0) && near(n.panel.h, n.overlay.h), { vp: n.viewport.h, overlay: n.overlay.h, scrim: n.scrim.h, panel: n.panel.h });
    check(`${key}-${state}: never shorter than 100lvh`, n.overlay.h >= n.lvh - 1 && n.panel.h >= n.lvh - 1, { lvh: n.lvh, panel: n.panel.h });
    check(`${key}-${state}: on its surface`, n.surface === surface, { bg: n.bg, edge: n.edge });
  }
  await ctx.close();
}
const bgs = COMBOS.map(([name, , mode]) => [numbers[`${name}-${mode}-elevated-full`].bg, numbers[`${name}-${mode}-canvas-full`].bg]);
check('canvas differs from elevated in every combo', bgs.every(([e, c]) => e !== c), bgs);

// composite.png: a row per combo; columns elevated short/full, canvas short/full
const sheet = await browser.newPage({ viewport: { width: 1400, height: 600 } });
const img = f => `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`;
const rows = COMBOS.map(([name, , mode]) => {
  const cells = SURFACES.flatMap(([s]) => shots[`${name}-${mode}-${s}`].map(([label, f]) => `<figure><figcaption>${s}: ${label}</figcaption><img src="${img(f)}"></figure>`));
  return `<div class="row"><b>${name === 'cobalt' ? 'Cobalt Mono' : 'Sage'} ${mode}</b>${cells.join('')}</div>`;
}).join('');
await sheet.setContent(`<style>body{margin:0;padding:16px;background:#ccc;font:13px system-ui}.row{display:flex;gap:12px;align-items:flex-start;margin-bottom:16px}.row b{width:110px;flex:none}figure{margin:0}figcaption{height:20px}img{display:block;width:240px}</style>${rows}`);
await sheet.screenshot({ path: `${out}/composite.png`, fullPage: true });
await browser.close();
fs.writeFileSync(`${out}/numbers.json`, JSON.stringify({ engine: 'webkit', numbers, checks, errors }, null, 2));
if (errors.length) console.log(`errors: ${JSON.stringify(errors)}`);
if (checks.some(c => !c.ok) || errors.length) process.exitCode = 1;
