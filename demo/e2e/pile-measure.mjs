#!/usr/bin/env node
// T23: does the pile show behind the front once framer's layout animation has run? Opens the demo's stack from its
// card, then measures the front and behind panels (getBoundingClientRect, computed transform-origin) after the open,
// after Next + Back (the decide comes forward and steps back again: a layout animation on it), and after a resize
// (a layout animation on every panel). Run on the PC: sh demo/e2e/stack.sh <out> pile-measure.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const { chromium } = createRequire(path.join(process.env.PW_DIR, 'node_modules/'))('playwright-core');
const [base, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const exe = [process.env.CHROMIUM, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/google-chrome'].find(p => p && fs.existsSync(p));
if (!exe) throw new Error('no Chromium found (set CHROMIUM)');
const pause = ms => new Promise(r => setTimeout(r, ms));
const settled = async page => { await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {})))); await pause(1200); };
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const errors = [], numbers = {};
const measure = page => page.evaluate(() => {
  const panel = d => document.querySelector(`[data-stack-depth="${d}"]`);
  const box = el => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, w: r.width, h: r.height, origin: getComputedStyle(el).transformOrigin, transform: getComputedStyle(el).transform }; };
  const f = panel(0), b = panel(1);
  if (!f || !b) return { missing: { front: !!f, behind: !!b } };
  const front = box(f), behind = box(b);
  return { front, behind, peekBelow: +(behind.bottom - front.bottom).toFixed(2) };
});
try {
  for (const mode of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base + '?theme=7&mode=' + mode, { waitUntil: 'networkidle' });
    await pause(800);
    const card = page.locator('[data-demo="stack-card"]');
    await card.scrollIntoViewIfNeeded();
    await card.getByText('The strip, second pass').first().click(); await settled(page);
    const r = numbers[mode] = {};
    r.open = await measure(page);
    await page.screenshot({ path: `${out}/pile-${mode}-open.png` });
    await page.getByRole('button', { name: 'Next', exact: true }).click(); await settled(page);
    await page.getByRole('button', { name: 'Back', exact: true }).click(); await settled(page);
    r.nextBack = await measure(page);
    await page.screenshot({ path: `${out}/pile-${mode}-next-back.png` });
    await page.setViewportSize({ width: 1200, height: 900 }); await settled(page);
    r.resized = await measure(page);
    await page.screenshot({ path: `${out}/pile-${mode}-resized.png` });
    await page.close();
  }
} finally {
  await browser.close();
}
fs.writeFileSync(`${out}/pile-numbers.json`, JSON.stringify({ numbers, errors }, null, 2));
console.log(JSON.stringify({ numbers, errors }, null, 2));
if (errors.length) process.exit(1);
