#!/usr/bin/env node
// T67: the demo's default page (before: the test bench; after: the catalogue). Run on the PC through demo/e2e/catalogue.sh:
//   node catalogue-capture.mjs <base-url> <out> <before|after>
// Chromium at 390x844 and 1280x800 (DPR 2), Sage (theme 0) and Cobalt Mono (theme 7), light and dark, reduced motion.
// Into <out>/<side>/: top-<combo>-<w>.png (the first screen), full-<combo>-<w>.png (the whole page, DPR 1), and
// only-tooltip.png (?only=tooltip, Sage light, 1280: must not change). After only: readme-*.png (clean catalogue shots
// for the README) and checks.json (the catalogue's switches write the URL; a board copy shows only under ?bench=1).
// When both sides are in <out>: composite.png, before beside after per theme, mode and width.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const { chromium } = createRequire(path.join(process.env.PW_DIR, 'node_modules/'))('playwright-core');
const [base, outRoot, side] = process.argv.slice(2);
if (!['before', 'after'].includes(side)) throw new Error('side is before or after');
const out = `${outRoot}/${side}`;
fs.mkdirSync(out, { recursive: true });
const pause = ms => new Promise(r => setTimeout(r, ms));
const exe = [process.env.CHROMIUM, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/google-chrome'].find(p => p && fs.existsSync(p));
if (!exe) throw new Error('no Chromium found (set CHROMIUM)');
const browser = await chromium.launch({ executablePath: exe, headless: true });
const COMBOS = [['sage', 0, 'light'], ['sage', 0, 'dark'], ['cobalt', 7, 'light'], ['cobalt', 7, 'dark']];
const SIZES = { 390: { width: 390, height: 844 }, 1280: { width: 1280, height: 800 } };
const errors = [], checks = {};

const open = async (query, size, scale = 2) => {
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: scale, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`${query}: ${e.message}`));
  await page.goto(`${base}${query}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--color-surface-canvas').trim() !== '');
  await page.evaluate(() => document.fonts.ready);
  await pause(600);
  return { ctx, page };
};

for (const [name, theme, mode] of COMBOS) {
  for (const [w, size] of Object.entries(SIZES)) {
    const key = `${name}-${mode}-${w}`, query = `?theme=${theme}&mode=${mode}`;
    let { ctx, page } = await open(query, size);
    await page.screenshot({ path: `${out}/top-${key}.png` });
    await ctx.close();
    ({ ctx, page } = await open(query, size, 1));
    await page.screenshot({ path: `${out}/full-${key}.png`, fullPage: true });
    await ctx.close();
  }
}

{
  const { ctx, page } = await open('?only=tooltip&theme=0&mode=light', SIZES[1280]);
  await page.screenshot({ path: `${out}/only-tooltip.png`, fullPage: true });
  await ctx.close();
}

if (side === 'after') {
  // README shots: the header and first sections at 1280, Sage light and Cobalt Mono dark; one phone shot
  for (const [file, query, size] of [
    ['readme-sage-light', '?theme=0&mode=light', SIZES[1280]],
    ['readme-cobalt-dark', '?theme=7&mode=dark', SIZES[1280]],
    ['readme-phone-sage-dark', '?theme=0&mode=dark', SIZES[390]],
  ]) {
    const { ctx, page } = await open(query, size);
    await page.screenshot({ path: `${out}/${file}.png` });
    await ctx.close();
  }
  // the switches write the URL back; the board copies stay out of the catalogue and come back under ?bench=1
  const { ctx, page } = await open('?theme=0&mode=light', SIZES[1280]);
  checks.title = await page.title();
  checks.sections = await page.$$eval('[data-catalogue-section]', els => els.map(e => e.id));
  checks.toc = await page.$$eval('[data-catalogue-toc] a', els => els.map(a => a.getAttribute('href')));
  checks.boardInCatalogue = await page.locator('[data-who="board"], [data-demo="popover-board"], [data-demo="stack-row-board"]').count();
  await page.locator('[data-catalogue-switch="theme"]').selectOption('7');
  await page.getByRole('radio', { name: 'Dark' }).click();
  await page.getByRole('radio', { name: 'Condensed' }).click();
  await pause(400);
  checks.urlAfterSwitches = new URL(page.url()).search;
  checks.darkAfterSwitch = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  await ctx.close();
  const bench = await open('?bench=1&theme=0&mode=light', SIZES[1280]);
  checks.boardUnderBench = await bench.page.locator('[data-demo="popover-board"], [data-demo="stack-row-board"]').count();
  checks.benchHasCatalogue = await bench.page.locator('[data-catalogue-section]').count();
  await bench.ctx.close();
  fs.writeFileSync(`${out}/checks.json`, JSON.stringify({ ...checks, errors }, null, 2));
  console.log(JSON.stringify(checks, null, 2));
}

// composite.png: before beside after, the first screen, per theme and mode, at 390 and 1280
if (fs.existsSync(`${outRoot}/before/top-sage-light-390.png`) && fs.existsSync(`${outRoot}/after/top-sage-light-390.png`)) {
  const url = f => (fs.existsSync(`${outRoot}/${f}.png`) ? `data:image/png;base64,${fs.readFileSync(`${outRoot}/${f}.png`).toString('base64')}` : '');
  const fig = (label, f, wpx) => `<figure><figcaption>${label}</figcaption><img style="width:${wpx}px" src="${url(f)}"></figure>`;
  const rows = COMBOS.map(([name, , m]) => {
    const k = w => `${name}-${m}-${w}`;
    return `<div class="row"><b>${name === 'cobalt' ? 'Cobalt Mono' : 'Sage'} ${m}</b>${fig('390 · before', `before/top-${k(390)}`, 195)}${fig('390 · after', `after/top-${k(390)}`, 195)}${fig('1280 · before', `before/top-${k(1280)}`, 480)}${fig('1280 · after', `after/top-${k(1280)}`, 480)}</div>`;
  }).join('');
  const sheet = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await sheet.setContent(`<style>body{margin:0;padding:16px;background:#bbb;font:13px system-ui}.row{display:flex;gap:12px;align-items:flex-start;margin-bottom:16px}.row b{width:90px;flex:none}figure{margin:0}figcaption{height:20px}img{display:block}</style><p>T67: the demo's default page, before (the test bench) and after (the catalogue), the first screen.</p>${rows}`);
  await sheet.screenshot({ path: `${outRoot}/composite.png`, fullPage: true });
}
await browser.close();
if (errors.length) { console.log(errors.join('\n')); process.exitCode = 1; }
