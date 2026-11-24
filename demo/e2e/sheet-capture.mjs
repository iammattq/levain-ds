#!/usr/bin/env node
// T24: StatusCardDialog and StatusCardDialogStack on a phone (390x844) in WebKit and Chromium, light and dark, beside
// the desktop dialog at 1440. Run on the PC through demo/e2e/stack.sh:
//   ringmaster heavy t24 --kind capture --on pc --out <dir> sh demo/e2e/stack.sh <dir> sheet-capture.mjs
// Writes <engine>-<mode>-<width>-<state>.png, numbers.json (each dialog's box against the viewport) and, with
// SHEET_VIDEO=1, recordings (SHEET_REDUCE=1: under Reduce Motion) of the phone sheet opening and closing (video-<engine>/).
// The phone is Playwright's iPhone 14 (390x844, touch, DPR 3). Neither headless engine has a notch, so the phone pages
// fake one: every env(safe-area-inset-*) in the page's stylesheets is rewritten to the iPhone 14's insets (47 px top,
// 34 px bottom), and the two bands are drawn over the page, faintly, so a shot shows what would sit under them.
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
    head: box(dialog?.querySelector('[data-sheet-grab]')),
    body: (b => b && { ...box(b), scrollTop: b.scrollTop, scrollHeight: b.scrollHeight, clientHeight: b.clientHeight })(dialog?.querySelector('[data-sheet-body]')),
    lastButton: box([...(dialog?.querySelectorAll('[data-sheet-body] button') ?? [])].pop()),
    ownWords: box(dialog?.querySelector('[data-demo="sheet-own-words"]')),
  };
});

const INSETS = { top: 47, bottom: 34, left: 0, right: 0 };
// the descriptor's viewport is 390x664 (Safari's bars); the board runs full screen (its screenshot), so 390x844
const iphone = { ...(({ defaultBrowserType, ...d }) => d)(pw.devices['iPhone 14']), viewport: { width: 390, height: 844 } };
const fakeInsets = page => page.evaluate(insets => {
  for (const s of document.querySelectorAll('style')) s.textContent = s.textContent.replace(/env\(safe-area-inset-(top|bottom|left|right)(,[^)]*)?\)/g, (_, k) => insets[k] + 'px');
  for (const [k, css] of [['top', 'top:0'], ['bottom', 'bottom:0']]) {
    const band = document.createElement('div');
    band.dataset.fakeInset = k;
    band.style.cssText = `position:fixed;left:0;right:0;${css};height:${insets[k]}px;background:rgba(255,0,80,.18);z-index:2147483647;pointer-events:none`;
    document.documentElement.appendChild(band);
  }
}, INSETS);
const videoOnly = process.env.SHEET_VIDEO === '1';

const numbers = {}, errors = [];
for (const engine of engines) {
  const browser = await launch(engine);
  try {
    for (const mode of modes) {
      for (const [width, height] of [[390, 844], [1440, 900]].filter(([w]) => (process.env.SHEET_WIDTHS ?? '390,1440').split(',').includes(String(w)))) {
        const phone = width < 768;
        if (videoOnly && !phone) continue;
        const ctx = await browser.newContext(phone ? { ...iphone, ...(process.env.SHEET_REDUCE === '1' ? { reducedMotion: 'reduce' } : {}), ...(videoOnly ? { recordVideo: { dir: `${out}/video-${engine}-${mode}${process.env.SHEET_REDUCE === '1' ? '-reduce' : ''}`, size: { width, height } } } : {}) } : { viewport: { width, height } });
        const page = await ctx.newPage();
        page.on('pageerror', e => errors.push(`${engine} ${mode} ${width}: ${e.message}`));
        const tag = `${engine}-${mode}-${width}`;
        await page.goto(base + `?theme=7&mode=${mode}&only=sheet`, { waitUntil: 'networkidle' });
        await pause(600);
        if (phone) await fakeInsets(page);
        if (videoOnly) {
          // open, scroll the body, close with the ✕; open again, close with a tap on the scrim
          const card = page.getByText('T50: restart words that fit').first();
          await card.click(); await pause(1200);
          await page.evaluate(() => { const b = document.querySelector('[data-sheet-body]'); b?.scrollTo({ top: b.scrollHeight, behavior: 'smooth' }); }); await pause(1200);
          await page.getByRole('button', { name: 'Close' }).first().click(); await pause(1200);
          await card.click(); await pause(1200);
          await page.mouse.click(195, 30); await pause(1200);
          // the handle: a short slow drag springs back; a long one closes; a quick short flick closes
          const handle = async (dy, steps, stepMs) => {
            const h = await page.locator('[data-sheet-handle]').boundingBox();
            const x = h.x + h.width / 2, y = h.y + h.height / 2;
            await page.mouse.move(x, y); await page.mouse.down();
            for (let i = 1; i <= steps; i++) { await page.mouse.move(x, y + (dy * i) / steps); await pause(stepMs); }
            await page.mouse.up();
          };
          await card.click(); await pause(1200);
          await handle(90, 12, 40); await pause(1200);
          await handle(320, 16, 30); await pause(1200);
          await card.click(); await pause(1200);
          await handle(70, 4, 12); await pause(1200);
          await ctx.close();
          continue;
        }
        // the single dialog: open from its card, then its bottom
        await page.getByText('T50: restart words that fit').first().click(); await pause(900); await settled(page);
        await page.screenshot({ path: `${out}/${tag}-single.png` });
        numbers[`${tag}-single`] = await probe(page);
        await page.evaluate(() => { const d = document.querySelector('[role="dialog"]'); for (let e = d.querySelector('[data-demo="sheet-own-words"]'); e; e = e.parentElement) if (e.scrollHeight > e.clientHeight + 1) e.scrollTop = e.scrollHeight; });
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
fs.writeFileSync(`${out}/${videoOnly ? "video-" : ""}numbers.json`, JSON.stringify({ numbers, errors }, null, 2));
console.log(JSON.stringify({ numbers, errors }, null, 2));
if (errors.length) process.exit(1);
