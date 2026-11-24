#!/usr/bin/env node
// T24: StatusCardDialog and StatusCardDialogStack on a phone (390x844) in WebKit and Chromium, light and dark, beside
// the desktop dialog at 1440. Run on the PC through demo/e2e/stack.sh:
//   ringmaster heavy t24 --kind capture --on pc --out <dir> sh demo/e2e/stack.sh <dir> sheet-capture.mjs
// Writes <engine>-<mode>-<width>-<state>.png and numbers.json (each dialog's box against the viewport).
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const req = createRequire(path.join(process.env.PW_DIR, 'node_modules/'));
const pw = req('playwright-core');
const [base, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const engines = (process.env.SHEET_ENGINES ?? 'webkit,chromium').split(',');
const modes = (process.env.SHEET_MODES ?? 'light,dark').split(',');
const pause = ms => new Promise(r => setTimeout(r, ms));
const settled = async page => { await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {})))); await pause(700); };

const exe = [process.env.CHROMIUM, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/google-chrome'].find(p => p && fs.existsSync(p));
const launch = async engine => {
  if (engine === 'chromium') {
    if (!exe) throw new Error('no Chromium found (set CHROMIUM)');
    return pw.chromium.launch({ executablePath: exe, headless: true });
  }
  // WebKit: Playwright's own build, fetched once into its cache
  try { return await pw.webkit.launch({ headless: true }); } catch {
    execFileSync(process.execPath, [path.join(process.env.PW_DIR, 'node_modules/playwright-core/cli.js'), 'install', 'webkit'], { stdio: 'inherit' });
    return pw.webkit.launch({ headless: true });
  }
};

// every dialog's box, the viewport, and whether the page or the dialog scrolls
const probe = page => page.evaluate(() => {
  const box = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, bottom: r.bottom }; };
  const dialog = document.querySelector('[role="dialog"]');
  const scroller = [...document.querySelectorAll('[role="dialog"], [role="dialog"] *, [data-dialog-stack], .fixed')].find(e => e.scrollHeight > e.clientHeight + 1 && getComputedStyle(e).overflowY !== 'visible');
  return {
    viewport: { w: innerWidth, h: innerHeight },
    dialog: box(dialog),
    pile: [...document.querySelectorAll('[data-stack-depth]')].map(e => ({ depth: e.dataset.stackDepth, ...box(e) })),
    sheet: dialog?.closest('[data-sheet]') ? true : !!dialog?.hasAttribute('data-sheet'),
    overflowsViewport: dialog ? dialog.getBoundingClientRect().bottom > innerHeight + 0.5 : null,
    scroller: scroller ? { tag: scroller.tagName, cls: String(scroller.className).slice(0, 80), scrollHeight: scroller.scrollHeight, clientHeight: scroller.clientHeight } : null,
    focusInDialog: !!dialog?.contains(document.activeElement),
  };
});

const numbers = {}, errors = [];
for (const engine of engines) {
  const browser = await launch(engine);
  try {
    for (const mode of modes) {
      for (const [width, height] of [[390, 844], [1440, 900]]) {
        const phone = width < 768;
        const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: phone ? 3 : 1, hasTouch: phone, isMobile: phone && engine === 'chromium' });
        const page = await ctx.newPage();
        page.on('pageerror', e => errors.push(`${engine} ${mode} ${width}: ${e.message}`));
        const tag = `${engine}-${mode}-${width}`;
        await page.goto(base + `?theme=7&mode=${mode}&only=sheet`, { waitUntil: 'networkidle' });
        await pause(600);
        // the single dialog: open from its card, then its bottom
        await page.getByText('T50: restart words that fit').first().click(); await pause(900); await settled(page);
        await page.screenshot({ path: `${out}/${tag}-single.png` });
        numbers[`${tag}-single`] = await probe(page);
        await page.evaluate(() => { const d = document.querySelector('[role="dialog"]'); for (let e = d.querySelector('[data-demo="sheet-own-words"]'); e; e = e.parentElement) if (e.scrollHeight > e.clientHeight + 1) e.scrollTop = e.scrollHeight; d.querySelector('[data-demo="sheet-own-words"]')?.scrollIntoView({ block: 'end' }); });
        await pause(400);
        await page.screenshot({ path: `${out}/${tag}-single-end.png` });
        numbers[`${tag}-single-end`] = await probe(page);
        await page.keyboard.press('Escape'); await pause(900); await settled(page);
        // the pair: open, then Next (the tall decide in front)
        await page.getByText('The header at 1440, mid-restart').first().click(); await pause(900); await settled(page);
        await page.screenshot({ path: `${out}/${tag}-stack.png` });
        numbers[`${tag}-stack`] = await probe(page);
        await page.locator('[data-demo="sheet-next"]').click(); await pause(900); await settled(page);
        await page.screenshot({ path: `${out}/${tag}-stack-step2.png` });
        numbers[`${tag}-stack-step2`] = await probe(page);
        await ctx.close();
      }
    }
  } finally { await browser.close(); }
}
fs.writeFileSync(`${out}/numbers.json`, JSON.stringify({ numbers, errors }, null, 2));
console.log(JSON.stringify({ numbers, errors }, null, 2));
if (errors.length) process.exit(1);
