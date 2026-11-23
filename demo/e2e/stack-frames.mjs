#!/usr/bin/env node
// T22: frame strips of the dialog stack's morphs. Opens the demo's stack from its card, sends the front away (Next),
// then closes the last one (Escape), screenshotting as fast as Chromium allows after each, and lays the frames out as
// contact sheets (frames-<case>.png) with each frame's time since the action. Cases: Cobalt Mono light and dark, with
// and without the stack's cardId (?stackCard=0 is without). Run on the PC: sh demo/e2e/stack.sh <out> stack-frames.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const { chromium } = createRequire(path.join(process.env.PW_DIR, 'node_modules/'))('playwright-core');
const [base, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const exe = [process.env.CHROMIUM, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/google-chrome'].find(p => p && fs.existsSync(p));
if (!exe) throw new Error('no Chromium found (set CHROMIUM)');
const pause = ms => new Promise(r => setTimeout(r, ms));
const settled = async page => { await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {})))); await pause(900); };
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const errors = [], probes = {};
const cases = (process.env.FRAME_CASES ?? 'card-light,card-dark,nocard-light,nocard-dark').split(',');
// every panel and surface on screen: where it is and how visible, to find a doubled or flashing one in the numbers too
const probe = page => page.evaluate(() => [...document.querySelectorAll('[data-stack-depth], [data-stack-surface]')].map(el => {
  const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
  return { el: el.hasAttribute('data-stack-surface') ? 'surface' : 'panel', depth: el.closest('[data-stack-depth]')?.getAttribute('data-stack-depth'),
    top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), w: Math.round(r.width), opacity: +(+cs.opacity).toFixed(2) };
}));
async function frames(page, act, ms = 760) {
  const shots = [];
  const t0 = Date.now();
  await act();
  while (Date.now() - t0 < ms) {
    const t = Date.now() - t0;
    const buf = await page.screenshot({ type: 'jpeg', quality: 70 });
    shots.push({ t, src: 'data:image/jpeg;base64,' + buf.toString('base64'), probe: await probe(page) });
  }
  return shots;
}
try {
  for (const name of cases) {
    const [kind, mode] = name.split('-');
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 760 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${base}?theme=7&mode=${mode}&stackCard=${kind === 'card' ? 1 : 0}`, { waitUntil: 'networkidle' });
    const card = page.locator('[data-demo="stack-card"]');
    await card.scrollIntoViewIfNeeded();
    await pause(800);
    const rows = [];
    rows.push(['open', await frames(page, () => card.getByText('The strip, second pass').first().click())]); await settled(page);
    rows.push(['front leaves (Next)', await frames(page, () => page.getByRole('button', { name: 'Next', exact: true }).click())]); await settled(page);
    rows.push(['last close (Escape)', await frames(page, () => page.keyboard.press('Escape'))]); await settled(page);
    probes[name] = rows.map(([label, shots]) => ({ label, frames: shots.map(s => ({ t: s.t, probe: s.probe })) }));
    await ctx.close();
    // the contact sheet: one row per action, each frame with its time
    const sheet = await browser.newPage({ viewport: { width: 1800, height: 400 }, deviceScaleFactor: 1 });
    await sheet.setContent(`<style>body{margin:0;padding:12px;font:13px system-ui;background:#fff}h2{font-size:14px;margin:14px 0 6px}
      .row{display:flex;flex-wrap:wrap;gap:6px}figure{margin:0}img{width:280px;display:block;border:1px solid #ccc}figcaption{font-size:11px;color:#555}</style>
      <h1 style="font-size:16px;margin:0">${name}: stack ${kind === 'card' ? 'with cardId' : 'without cardId'}, Cobalt Mono ${mode}</h1>` +
      rows.map(([label, shots]) => `<h2>${label}</h2><div class="row">${shots.map(s => `<figure><img src="${s.src}"><figcaption>${s.t} ms</figcaption></figure>`).join('')}</div>`).join(''));
    await sheet.screenshot({ path: `${out}/frames-${name}.png`, fullPage: true });
    await sheet.close();
  }
} finally {
  await browser.close();
}
fs.writeFileSync(`${out}/frames-probes.json`, JSON.stringify({ probes, errors }, null, 1));
console.log(JSON.stringify({ cases, errors }));
if (errors.length) process.exit(1);
