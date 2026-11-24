#!/usr/bin/env node
// T29: the keyboard path and its focus rings, in Sage (theme 0) light and dark, Chromium at 1440x900, driven by the
// keyboard alone (Tab, Enter, Arrow keys, Escape). Run on the PC:
//   ringmaster heavy t29 --kind capture --on pc --out captures/T29 sh demo/e2e/stack.sh captures/T29 focus-capture.mjs
// Writes, per mode: <mode>-card.png (a StatusCard in the decide column, focused), <mode>-dialog.png (its dialog, the ✕
// focused), <mode>-row.png (the CardStack row, a card past the right pile focused: the row scrolled to it),
// <mode>-pile.png and <mode>-pile-stepped.png (the pile's top card focused, then after ArrowRight); numbers.json (the
// checks below, and each ring's computed box-shadow) and composite.png.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const { chromium } = createRequire(path.join(process.env.PW_DIR, 'node_modules/'))('playwright-core');
const [base, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const exe = [process.env.CHROMIUM, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/google-chrome'].find(p => p && fs.existsSync(p));
if (!exe) throw new Error('no Chromium found (set CHROMIUM)');
const pause = ms => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ executablePath: exe, headless: true });
const errors = [], numbers = {};

/** Tab until the focused element matches `sel` (at most `max` presses); true if it got there. */
const tabTo = async (page, sel, max = 120) => {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate(s => !!document.activeElement?.matches(s), sel)) return true;
  }
  return false;
};
const active = page => page.evaluate(() => {
  const a = document.activeElement;
  return a ? { tag: a.tagName, opens: a.getAttribute('data-opens'), card: a.getAttribute('data-stack-card'), label: a.getAttribute('aria-label'), inDialog: !!a.closest('[role="dialog"]') } : null;
});
/** A screenshot of the box round `sel` (the focused element's ring included), `pad` px on every side. */
const around = async (page, sel, file, pad = 16) => {
  const r = await page.evaluate(s => { const b = document.querySelector(s).getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; }, sel);
  await page.screenshot({ path: file, clip: { x: Math.max(0, r.x - pad), y: Math.max(0, r.y - pad), width: r.w + 2 * pad, height: r.h + 2 * pad }, animations: 'disabled' });
};
const shadow = (page, sel) => page.evaluate(s => getComputedStyle(document.querySelector(s)).boxShadow, sel);

try {
  for (const mode of ['light', 'dark']) {
    const n = (numbers[mode] = {});
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('pageerror', e => errors.push(`${mode}: ${e.message}`));

    // StatusCard in a SortableGroup (the decide column): Tab to its open target, Enter opens, Tab stays in, Escape back
    await page.goto(`${base}?only=decide&theme=0&mode=${mode}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await pause(600);
    n.cardReached = await tabTo(page, '[data-opens^="status-card-"]');
    const opens = (await active(page))?.opens;
    const target = `[data-opens="${opens}"]`;
    await pause(200);
    n.cardRing = await shadow(page, `:has(> ${target})`);
    await around(page, `:has(> ${target})`, `${out}/${mode}-card.png`);
    await page.keyboard.press('Enter');
    await pause(900);
    n.dialogOpen = await page.evaluate(() => !!document.querySelector('[role="dialog"]'));
    n.focusInDialog = (await active(page))?.inDialog ?? false;
    const inside = [];
    for (let i = 0; i < 8; i++) { await page.keyboard.press('Tab'); inside.push((await active(page))?.inDialog ?? false); }
    n.trapHeldOver8Tabs = inside.every(Boolean);
    const back = [];
    for (let i = 0; i < 8; i++) { await page.keyboard.press('Shift+Tab'); back.push((await active(page))?.inDialog ?? false); }
    n.trapHeldOver8ShiftTabs = back.every(Boolean);
    await tabTo(page, '[role="dialog"] button[aria-label="Close"]', 10);
    await pause(150);
    await page.screenshot({ path: `${out}/${mode}-dialog.png`, animations: 'disabled' });
    await page.keyboard.press('Escape');
    await pause(1100);
    n.dialogClosed = await page.evaluate(() => !document.querySelector('[role="dialog"]'));
    n.focusBackOnCard = (await active(page))?.opens === opens;

    // CardStack row: Tab through levain's row to a card that starts under the right pile: the row scrolls to it
    await page.goto(`${base}?only=cardstack&theme=0&mode=${mode}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await pause(600);
    const row = '[data-demo="stack-row-levain"]';
    n.rowReached = await tabTo(page, `${row} [data-stack-card]`);
    const walked = [(await active(page))?.card];
    for (let i = 0; i < 5; i++) { await page.keyboard.press('Tab'); walked.push((await active(page))?.card); }
    n.rowWalk = walked;
    await pause(900);
    const last = walked.at(-1);
    n.rowFocusedLive = await page.evaluate(s => { const el = document.querySelector(s); const r = el.getBoundingClientRect(), rr = el.closest('[data-stack-row]').getBoundingClientRect(); return r.left >= rr.left - 1 && r.right <= rr.right + 1; }, `${row} [data-stack-card="${last}"]`);
    n.rowRing = await shadow(page, `${row} [data-stack-card="${last}"]`);
    await around(page, `${row} [data-stack-row]`, `${out}/${mode}-row.png`);
    await page.keyboard.press('Enter');
    await pause(900);
    n.rowEnterOpens = await page.evaluate(() => !!document.querySelector('[role="dialog"]'));
    await page.keyboard.press('Escape');
    await pause(1100);
    n.rowFocusBack = (await active(page))?.card === last;

    // CardStack pile: Tab to its top card (the one Tab stop), then ArrowRight steps it and focus follows
    const pile = '[data-demo="stack-pile-levain"]';
    n.pileReached = await tabTo(page, `${pile} [data-stack-card]`);
    const topBefore = (await active(page))?.card;
    await pause(200);
    await around(page, `${pile} [role="list"]`, `${out}/${mode}-pile.png`);
    await page.keyboard.press('ArrowRight');
    await pause(900);
    const topAfter = (await active(page))?.card;
    n.pileStep = { topBefore, topAfter, stepped: !!topAfter && topAfter !== topBefore };
    n.pileRing = await shadow(page, `${pile} [data-stack-card="${topAfter}"]`);
    await around(page, `${pile} [role="list"]`, `${out}/${mode}-pile-stepped.png`);
    await page.keyboard.press('Tab');
    n.pileOneTabStop = !(await page.evaluate(s => !!document.activeElement?.closest(s), pile));
    await page.close();
    console.log(`${mode}: ${JSON.stringify(n)}`);
  }

  {
    const img = f => `data:image/png;base64,${fs.readFileSync(`${out}/${f}`).toString('base64')}`;
    const cell = mode => `<div class="col"><h2>Sage · ${mode}</h2>
      <h3>StatusCard, focused (Tab)</h3><img class="s" src="${img(`${mode}-card.png`)}">
      <h3>Its dialog, opened with Enter, the ✕ focused</h3><img src="${img(`${mode}-dialog.png`)}">
      <h3>CardStack row: Tab to a card under the right pile scrolls it into the open</h3><img src="${img(`${mode}-row.png`)}">
      <h3>Pile: the top card focused, then ArrowRight</h3><div class="pair"><img src="${img(`${mode}-pile.png`)}"><img src="${img(`${mode}-pile-stepped.png`)}"></div></div>`;
    const page = await browser.newPage({ viewport: { width: 2400, height: 800 } });
    await page.setContent(`<style>body{margin:0;padding:24px;background:#888;font:16px system-ui,sans-serif;color:#111}.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}.col{background:#fff;padding:16px;border-radius:8px}
      h2{margin:0 0 8px}h3{margin:16px 0 6px;font-size:14px;font-weight:500;color:#444}img{max-width:100%}img.s{max-width:50%}.pair{display:flex;gap:12px}.pair img{width:48%}</style>
      <div class="grid">${cell('light')}${cell('dark')}</div>`);
    await page.evaluate(() => Promise.all([...document.images].map(i => i.decode())));
    await page.screenshot({ path: `${out}/composite.png`, fullPage: true });
    await page.close();
  }
} finally {
  await browser.close();
  fs.writeFileSync(`${out}/numbers.json`, JSON.stringify({ errors, numbers }, null, 2));
  console.log(`errors ${errors.length}`);
}
