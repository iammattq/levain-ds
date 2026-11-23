#!/usr/bin/env node
// T17: a Decide StatusCard with actions opening into its dialog and closing back. Run on the PC through demo/e2e/decide.sh.
// Every animation frame the page notes where the card, its actions row, the dialog and the dialog's head are, so the
// claims are numbers: the row keeps its place inside the card's shape on every frame (no jump), and it never sits over
// the dialog's head while that head is visible.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const { chromium } = createRequire(path.join(process.env.PW_DIR, 'node_modules/'))('playwright-core');
const [base, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const exe = [process.env.CHROMIUM, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/google-chrome'].find(p => p && fs.existsSync(p));
if (!exe) throw new Error('no Chromium found (set CHROMIUM)');
const pause = ms => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const errors = [], result = {};

// installed in the page: samples every frame until stopped
const sampler = () => {
  const box = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
  const alpha = el => { let a = 1; for (let e = el; e && e !== document.body; e = e.parentElement) a *= parseFloat(getComputedStyle(e).opacity); return a; };
  const frames = [], t0 = performance.now();
  let on = true;
  const tick = () => {
    // the opened card's row (D14's), not another card's: the dialog itself has no actions row
    const row = [...document.querySelectorAll('[data-status-card-actions]')].find(r => r.parentElement?.textContent?.includes('Strip or arc for the progress mark'));
    const dialog = document.querySelector('[role="dialog"]');
    const head = dialog?.querySelector('[aria-label="Close"]')?.parentElement;
    frames.push({ t: Math.round(performance.now() - t0), card: box(row?.parentElement), row: box(row), rowAlpha: row ? alpha(row) : 0,
      dialog: box(dialog), head: box(head), headAlpha: head ? alpha(head) : 0 });
    if (on) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  window.__stop = () => { on = false; return frames; };
};

const analyse = frames => {
  // the row's place inside the card's shape, as fractions of the shape: constant while the shape morphs = moves with it
  const rel = frames.filter(f => f.card && f.row && f.card.w > 0 && f.card.h > 0)
    .map(f => ({ t: f.t, top: (f.row.y - f.card.y) / f.card.h, bottom: (f.card.y + f.card.h - f.row.y - f.row.h) / f.card.h, left: (f.row.x - f.card.x) / f.card.w }));
  let maxStep = 0, at = null;
  for (let i = 1; i < rel.length; i++) {
    const d = Math.max(Math.abs(rel[i].top - rel[i - 1].top), Math.abs(rel[i].bottom - rel[i - 1].bottom), Math.abs(rel[i].left - rel[i - 1].left));
    if (d > maxStep) { maxStep = d; at = rel[i].t; }
  }
  const hit = (a, b) => a && b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const overlaps = frames.filter(f => f.rowAlpha > 0.05 && f.headAlpha > 0.05 && hit(f.row, f.head)).map(f => ({ t: f.t, rowAlpha: +f.rowAlpha.toFixed(2), headAlpha: +f.headAlpha.toFixed(2) }));
  const cards = frames.filter(f => f.card).map(f => f.card);
  const range = k => cards.length ? [Math.round(Math.min(...cards.map(c => c[k]))), Math.round(Math.max(...cards.map(c => c[k])))] : null;
  return { frames: frames.length, framesWithRow: rel.length, cardWidthRange: range('w'), cardHeightRange: range('h'), rowPlaceMaxStepPerFrame: +maxStep.toFixed(4), at, rowPlaceRange: rel.length ? {
    top: [Math.min(...rel.map(r => r.top)), Math.max(...rel.map(r => r.top))].map(v => +v.toFixed(3)),
    bottom: [Math.min(...rel.map(r => r.bottom)), Math.max(...rel.map(r => r.bottom))].map(v => +v.toFixed(3)) } : null,
    rowOverHeadFrames: overlaps.length, rowOverHead: overlaps.slice(0, 20) };
};

try {
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 760 }, reducedMotion, recordVideo: { dir: `${out}/video-${reducedMotion}`, size: { width: 1000, height: 760 } } });
    const page = await ctx.newPage();
    const t0 = Date.now(); // the recording starts with the page: press times below are offsets into the webm (roughly)
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base + '?only=decide&theme=0&mode=light', { waitUntil: 'networkidle' });
    await pause(1200);
    const title = page.getByText('Strip or arc for the progress mark').first();
    // open
    // a real mouse press at the title (Playwright's actionability check reports the sortable list over it), then proof
    // that it opened: the dialog is there
    const b = await title.boundingBox();
    const hitAt = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.tagName + (e.getAttribute('role') ? '[role=' + e.getAttribute('role') + ']' : '') + ' ' + (e.textContent ?? '').slice(0, 40) : null; }, [b.x + b.width / 2, b.y + b.height / 2]);
    await page.evaluate(sampler);
    result[`${reducedMotion}-openAtSec`] = (Date.now() - t0) / 1000;
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    try { await page.getByRole('dialog').waitFor({ timeout: 3000 }); } catch (e) {
      const stack = await page.evaluate(([x, y]) => document.elementsFromPoint(x, y).slice(0, 8).map(e => {
        const cs = getComputedStyle(e), r = e.getBoundingClientRect();
        return `${e.tagName}${e.getAttribute('role') ? '[' + e.getAttribute('role') + ']' : ''} pe=${cs.pointerEvents} z=${cs.zIndex} pos=${cs.position} tf=${cs.transform} op=${cs.opacity} box=${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)}x${Math.round(r.height)} cls=${(e.className?.baseVal ?? e.className ?? '').toString().slice(0, 60)}`;
      }), [b.x + b.width / 2, b.y + b.height / 2]);
      console.log(JSON.stringify({ hitAt, title: b, stack }, null, 2));
      await page.screenshot({ path: `${out}/failed-open-${reducedMotion}.png` });
      throw e;
    }
    await pause(1400);
    result[`${reducedMotion}-hitAtTitle`] = hitAt;
    result[`${reducedMotion}-open`] = analyse(await page.evaluate(() => window.__stop()));
    await page.screenshot({ path: `${out}/open-${reducedMotion}.png` });
    // close
    await page.evaluate(sampler);
    result[`${reducedMotion}-closeAtSec`] = (Date.now() - t0) / 1000;
    await page.keyboard.press('Escape');
    await pause(1400);
    result[`${reducedMotion}-close`] = analyse(await page.evaluate(() => window.__stop()));
    await page.screenshot({ path: `${out}/closed-${reducedMotion}.png` });
    await ctx.close();
  }
} finally {
  await browser.close();
}
fs.writeFileSync(`${out}/geometry.json`, JSON.stringify({ result, errors }, null, 2));
console.log(JSON.stringify({ result, errors }, null, 2));
if (errors.length) process.exit(1);
