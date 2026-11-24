#!/usr/bin/env node
// T31 (D13): ColorInput and GradientInput opened with their swatch at the window's left edge, before and after. Run on
// the PC through demo/e2e/picker.sh, which serves "before" then "after" and calls this once for each:
//   node picker-capture.mjs <base-url> <out> before|after [compare]
// Chromium, ?only=picker, Sage light, at 1024x900 (the page's column sits against the left edge) and 390x844. Per case
// a viewport shot with the picker open and the picker's box (<phase>/numbers.json: left, right, and whether it is
// inside the window). With `compare`: composite.png, each case a row, before then after.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const { chromium } = createRequire(path.join(process.env.PW_DIR, 'node_modules/'))('playwright-core');
const [base, out, phase, compare] = process.argv.slice(2);
const dir = `${out}/${phase}`;
fs.mkdirSync(dir, { recursive: true });
const exe = [process.env.CHROMIUM, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/google-chrome'].find(p => p && fs.existsSync(p));
if (!exe) throw new Error('no Chromium found (set CHROMIUM)');
const pause = ms => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ executablePath: exe, headless: true });
const WIDTHS = [[1024, 900], [390, 844]];
const PIECES = ['colour-input', 'gradient-input'];
const errors = [], numbers = {};

try {
  for (const [w, h] of WIDTHS) {
    for (const piece of PIECES) {
      const key = `${piece}-${w}`;
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      page.on('pageerror', e => { errors.push(`${key}: ${e.message}`); console.log(`pageerror ${key}: ${e.stack ?? e.message}`); });
      try {
        await page.goto(`${base}?only=picker&theme=0&mode=light`, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        await pause(500);
        await page.locator(`[data-piece="${piece}"] button`).first().click({ timeout: 5000 });
        await page.locator('[role="dialog"]').waitFor({ timeout: 5000 });
        await pause(400);
        numbers[key] = await page.evaluate(() => {
          const r = document.querySelector('[role="dialog"]').getBoundingClientRect();
          return { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), viewport: innerWidth, onScreen: r.left >= 0 && r.right <= innerWidth };
        });
        await page.screenshot({ path: `${dir}/${key}.png` });
      } catch (e) {
        errors.push(`${key}: ${e.message.split('\n')[0]}`);
        console.log(`step failed ${key}: ${e.message.split('\n')[0]}`);
      }
      await page.close();
    }
  }

  if (compare) {
    const img = f => fs.existsSync(f) ? `<img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}">` : '<i>missing</i>';
    const before = fs.existsSync(`${out}/before/numbers.json`) ? JSON.parse(fs.readFileSync(`${out}/before/numbers.json`, 'utf8')).numbers : {};
    const label = (n) => n ? `left ${n.left}, right ${n.right} of ${n.viewport}: ${n.onScreen ? 'on screen' : 'OFF SCREEN'}` : '';
    const keys = WIDTHS.flatMap(([w]) => PIECES.map(p => `${p}-${w}`));
    const rows = keys.map(k => `<tr><th>${k}</th><td>${img(`${out}/before/${k}.png`)}<p>${label(before[k])}</p></td><td>${img(`${out}/after/${k}.png`)}<p>${label(numbers[k])}</p></td></tr>`).join('');
    const page = await browser.newPage({ viewport: { width: 1600, height: 800 } });
    await page.setContent(`<style>body{margin:0;padding:24px;background:#888;font:14px system-ui,sans-serif;color:#111}table{border-collapse:separate;border-spacing:8px;background:#fff;border-radius:8px}
      th{font-weight:600;text-align:right;vertical-align:top;white-space:nowrap}td{vertical-align:top}img{width:600px;display:block;border:1px solid #ccc}</style>
      <table><tr><th></th><th style="text-align:center">before</th><th style="text-align:center">after</th></tr>${rows}</table>`);
    await page.evaluate(() => Promise.all([...document.images].map(i => i.decode())));
    await page.screenshot({ path: `${out}/composite.png`, fullPage: true });
    await page.close();
  }
} finally {
  await browser.close();
  fs.writeFileSync(`${dir}/numbers.json`, JSON.stringify({ errors, numbers }, null, 2));
  console.log(`${phase}: errors ${errors.length}; ${JSON.stringify(numbers)}`);
}
