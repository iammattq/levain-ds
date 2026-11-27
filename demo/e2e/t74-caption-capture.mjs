#!/usr/bin/env node
// T74: the type-caption line in the FabMenu Journal level. Run on the PC through demo/e2e/t74-caption.sh:
//   node t74-caption-capture.mjs <before-url> <after-url> <out>
// Chromium 1280x800, Sage (theme 0) and Cobalt Mono (theme 7), dark, ?only=fab. Opens the menu, chooses Journal, and
// writes <combo>-journal-{before,after}.png plus numbers.json: the caption's colour, the panel's fill, and their contrast.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const req = createRequire(path.join(process.env.PW_DIR, 'node_modules/'));
const pw = req('playwright-core');
const [beforeUrl, afterUrl, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const pause = ms => new Promise(r => setTimeout(r, ms));
const settled = async page => { await page.evaluate(() => Promise.race([Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming?.().endTime !== Infinity).map(a => a.finished.catch(() => {}))), new Promise(r => setTimeout(r, 3000))])); await pause(400); };
const exe = [process.env.CHROMIUM, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/google-chrome'].find(p => p && fs.existsSync(p));
if (!exe) throw new Error('no Chromium found (set CHROMIUM)');
const browser = await pw.chromium.launch({ executablePath: exe, headless: true });
const rgb = s => (s.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
const lum = c => { const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const press = async (p, sel) => { const b = await p.evaluate(sel => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel); await p.mouse.click(b.x, b.y); };

const numbers = {}, errors = [];
for (const [name, theme] of [['sage', 0], ['cobalt', 7]]) {
  for (const [side, base] of [['before', beforeUrl], ['after', afterUrl]]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(`${name} ${side}: ${e.message}`));
    await page.goto(`${base}?only=fab&theme=${theme}&mode=dark`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => document.querySelector('[data-demo="fab-stage"]').scrollIntoView({ block: 'end' }));
    await settled(page);
    await press(page, '[data-fab-trigger]'); await settled(page);
    await page.focus('[data-fab-item="journal"]'); await page.keyboard.press('Enter'); await settled(page);
    const clip = await page.evaluate(() => { const r = document.querySelector('[data-demo="fab-stage"]').getBoundingClientRect(); const w = Math.min(r.width, 440); return { x: Math.round(r.right - w), y: Math.round(r.top), width: Math.round(w), height: Math.round(r.height) }; });
    await page.screenshot({ path: `${out}/${name}-dark-journal-${side}.png`, clip });
    const n = await page.evaluate(() => ({ caption: getComputedStyle(document.querySelector('[data-demo="fab-caption"]')).color, bg: getComputedStyle(document.querySelector('[data-fab-menu]')).backgroundColor }));
    numbers[`${name}-${side}`] = { ...n, contrast: +ratio(rgb(n.caption), rgb(n.bg)).toFixed(2) };
    await ctx.close();
  }
}
await browser.close();
const ok = ['sage', 'cobalt'].every(k => numbers[`${k}-after`].contrast >= 4.5) && !errors.length;
fs.writeFileSync(`${out}/numbers.json`, JSON.stringify({ ok, numbers, errors }, null, 2));
console.log(JSON.stringify(numbers, null, 1));
if (!ok) process.exitCode = 1;
