#!/usr/bin/env node
// Screenshots and recordings of the demo's dialog stack (T19). Run on the PC through demo/e2e/stack.sh.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const { chromium } = createRequire(path.join(process.env.PW_DIR, 'node_modules/'))('playwright-core');
const [base, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const exe = [process.env.CHROMIUM, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/google-chrome'].find(p => p && fs.existsSync(p));
if (!exe) throw new Error('no Chromium found (set CHROMIUM)');
const pause = ms => new Promise(r => setTimeout(r, ms));
const settled = async page => { await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {})))); await pause(700); };
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const errors = [], numbers = {};
const openStack = async page => { await page.getByText('The strip, second pass').first().click(); await pause(900); await settled(page); };
try {
  for (const mode of ['light', 'dark']) {
    for (const [width, label] of [[390, 'phone'], [1280, 'desktop']]) {
      const page = await browser.newPage({ viewport: { width, height: width > 500 ? 900 : 844 }, deviceScaleFactor: 2 });
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(base + '?bench=1&theme=7&mode=' + mode, { waitUntil: 'networkidle' });
      await pause(800);
      await openStack(page);
      await page.screenshot({ path: `${out}/stack-${mode}-${label}.png` });
      // the pile's geometry: how far each behind edge shows below the front, and its width against the front's
      numbers[`${mode}-${label}`] = await page.evaluate(() => {
        const r = d => document.querySelector(`[data-stack-depth="${d}"]`)?.getBoundingClientRect();
        const f = r(0), b = r(1);
        return { front: { w: f.width, h: f.height }, behind: { w: b.width, h: b.height }, peekBelow: b.bottom - f.bottom, widthRatio: b.width / f.width,
          activeIsFront: document.activeElement === document.querySelector('[data-stack-depth="0"]'), behindInert: document.querySelector('[data-stack-depth="1"]').hasAttribute('inert') };
      });
      await page.getByRole('button', { name: 'Next', exact: true }).click(); await pause(900); await settled(page);
      await page.screenshot({ path: `${out}/stack-${mode}-${label}-step2.png` });
      await page.close();
    }
  }
  // recordings: open, Next (the look goes away, the decide comes forward), Back (the look returns), Escape, Escape
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 760 }, reducedMotion, recordVideo: { dir: `${out}/video-${reducedMotion}`, size: { width: 1000, height: 760 } } });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base + '?bench=1&theme=7&mode=light', { waitUntil: 'networkidle' });
    await page.getByText('The strip, second pass').first().scrollIntoViewIfNeeded();
    await pause(900);
    await page.getByText('The strip, second pass').first().click(); await pause(1400);
    await page.getByRole('button', { name: 'Next', exact: true }).click(); await pause(1400);
    await page.getByRole('button', { name: 'Back', exact: true }).click(); await pause(1400);
    await page.getByRole('button', { name: 'Next', exact: true }).click(); await pause(1400);
    await page.keyboard.press('Escape'); await pause(1400);
    await ctx.close();
  }
} finally {
  await browser.close();
}
fs.writeFileSync(`${out}/numbers.json`, JSON.stringify({ numbers, errors }, null, 2));
console.log(JSON.stringify({ numbers, errors }, null, 2));
if (errors.length) process.exit(1);
