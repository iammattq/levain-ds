#!/usr/bin/env node
// T16: CardStack, levain's beside the board's copy, in Sage and Cobalt Mono, light and dark. Run on the PC:
//   ringmaster heavy t16 --kind capture --on pc --out captures/T16 sh demo/e2e/stack.sh captures/T16 cardstack-capture.mjs
// Writes <theme>-<mode>-<desktop|phone>-<state>.png (desktop: rest, mid, mid2, expanded; phone: rest, mid-levain, mid-board, expanded),
// numbers.json (every card's box, levain's against the board's, in each state, and the largest difference), and
// recordings of the row scrolling and the pile stepping (video-desktop/, video-phone/; CARDSTACK_VIDEO=0 skips them).
// Mid-gesture states hold both stacks at once with synthetic pointers (one pointerId each), so one shot shows both.
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
const errors = [], numbers = {};

/** Every card's box in a stack, relative to the stack, by key. */
const boxes = (page, sel) => page.evaluate(sel => {
  const root = document.querySelector(sel), o = root.getBoundingClientRect();
  return Object.fromEntries([...root.querySelectorAll('[data-stack-card]')].map(c => {
    const r = c.getBoundingClientRect(), s = getComputedStyle(c.closest('[role=listitem]'));
    return [c.dataset.stackCard, { x: +(r.x - o.x).toFixed(1), y: +(r.y - o.y).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), z: s.zIndex, opacity: s.opacity }];
  }));
}, sel);
/** levain's boxes against the board's: the largest difference in any coordinate. */
const compare = async (page, a, b) => {
  const A = await boxes(page, a), B = await boxes(page, b);
  let worst = 0;
  for (const k of Object.keys(B)) for (const f of ['x', 'y', 'w', 'h']) worst = Math.max(worst, Math.abs((A[k]?.[f] ?? Infinity) - B[k][f]));
  return { worst, levain: A, board: B };
};

/** Synthetic pointers held on several stacks at once: press each at its centre (one pointerId each), move each by dx. */
const hold = (page, sels, dx, on = 'self') => page.evaluate(async ({ sels, dx, on }) => {
  const frame = () => new Promise(r => requestAnimationFrame(() => r()));
  const ev = (type, x, y, id) => new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: id, pointerType: 'mouse', isPrimary: id === 11, button: 0, buttons: type === 'pointerup' ? 0 : 1 });
  const starts = sels.map((s, i) => {
    const el = on === 'top' ? document.querySelector(s + ' [data-stack-card]') : document.querySelector(s + ' [role=list]');
    const r = el.getBoundingClientRect();
    return { el, x: r.x + r.width / 2, y: r.y + r.height / 2, id: 11 + i };
  });
  for (const p of starts) p.el.dispatchEvent(ev('pointerdown', p.x, p.y, p.id));
  for (let k = 1; k <= 12; k++) { for (const p of starts) window.dispatchEvent(ev('pointermove', p.x + (dx * k) / 12, p.y, p.id)); await frame(); }
  window.__release = () => { for (const p of starts) window.dispatchEvent(ev('pointerup', p.x + dx, p.y, p.id)); };
}, { sels, dx, on });
const release = page => page.evaluate(() => window.__release?.());

const ROWS = ['[data-demo=stack-row-levain]', '[data-demo=stack-row-board]'];
const PILES = ['[data-demo=stack-pile-levain]', '[data-demo=stack-pile-board]'];
const showAll = async (page, sels) => { for (const s of sels) await page.locator(s).getByRole('button', { name: /^Show all/ }).click(); await settled(page); };

try {
  for (const [theme, tname] of [[0, 'sage'], [7, 'cobalt']]) {
    for (const mode of ['light', 'dark']) {
      // desktop: the rows
      {
        const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
        page.on('pageerror', e => errors.push(e.message));
        await page.goto(`${base}?only=cardstack&theme=${theme}&mode=${mode}`, { waitUntil: 'networkidle' });
        // a fresh vite may reload the page once it has optimised its dependencies: wait for the cards themselves
        await page.waitForSelector('[data-demo=stack-pile-board] [data-stack-card]', { timeout: 30000 });
        await settled(page);
        const rows = page.locator('[data-demo=stack-rows]');
        const step = await page.evaluate(() => { const c = [...document.querySelectorAll('[data-demo=stack-row-levain] [data-stack-card]')]; return c[1].getBoundingClientRect().x - c[0].getBoundingClientRect().x; });
        const key = `${tname}-${mode}-desktop`;
        numbers[key] = { step, rest: await compare(page, ...ROWS) };
        await rows.screenshot({ path: `${out}/${key}-rest.png` });
        // mid-scroll: half a card, held (the right pile's top half peeled off, the first card half into the left pile)
        await hold(page, ROWS, -step * 0.5);
        await settled(page);
        numbers[key].mid = await compare(page, ...ROWS);
        await rows.screenshot({ path: `${out}/${key}-mid.png` });
        await release(page); await settled(page);
        // two and a half cards: a left pile of two, settling on three once let go
        await hold(page, ROWS, -step * 2.5);
        await settled(page);
        numbers[key].mid2 = await compare(page, ...ROWS);
        await rows.screenshot({ path: `${out}/${key}-mid2.png` });
        await release(page); await settled(page);
        numbers[key].settled = await compare(page, ...ROWS);
        await showAll(page, ROWS);
        numbers[key].expanded = await compare(page, ...ROWS);
        await rows.screenshot({ path: `${out}/${key}-expanded.png` });
        await page.close();
      }
      // phone: the piles
      {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true });
        page.on('pageerror', e => errors.push(e.message));
        await page.goto(`${base}?only=cardstack&theme=${theme}&mode=${mode}`, { waitUntil: 'networkidle' });
        // a fresh vite may reload the page once it has optimised its dependencies: wait for the cards themselves
        await page.waitForSelector('[data-demo=stack-pile-board] [data-stack-card]', { timeout: 30000 });
        await settled(page);
        const piles = page.locator('[data-demo=stack-piles]');
        await piles.scrollIntoViewIfNeeded();
        const key = `${tname}-${mode}-phone`;
        numbers[key] = { rest: await compare(page, ...PILES) };
        await piles.screenshot({ path: `${out}/${key}-rest.png` });
        // mid-swipe: framer lets one sideways drag run at a time (a global lock), so each pile is held in turn and
        // levain's held boxes are compared with the board's held ones
        const held = {};
        for (const [who, s] of [['levain', PILES[0]], ['board', PILES[1]]]) {
          await hold(page, [s], -70, 'top');
          await pause(400);
          held[who] = await boxes(page, s);
          await piles.screenshot({ path: `${out}/${key}-mid-${who}.png` });
          await release(page); await settled(page);
        }
        let worst = 0;
        for (const k of Object.keys(held.board)) for (const f of ['x', 'y', 'w', 'h']) worst = Math.max(worst, Math.abs((held.levain[k]?.[f] ?? Infinity) - held.board[k][f]));
        numbers[key].mid = { worst, ...held };
        await showAll(page, PILES);
        numbers[key].expanded = await compare(page, ...PILES);
        await piles.screenshot({ path: `${out}/${key}-expanded.png` });
        await page.close();
      }
    }
  }

  if (process.env.CARDSTACK_VIDEO !== '0') {
    // the row: dragged slowly across and back, then a sideways wheel; levain's, then the board's
    {
      const ctx = await browser.newContext({ viewport: { width: 1100, height: 520 }, recordVideo: { dir: `${out}/video-desktop`, size: { width: 1100, height: 520 } } });
      const page = await ctx.newPage();
      await page.goto(`${base}?only=cardstack&mode=light`, { waitUntil: 'networkidle' });
      await page.locator('[data-demo=stack-rows]').scrollIntoViewIfNeeded();
      await pause(800);
      for (const s of ROWS) {
        const r = await page.locator(s + ' [role=list]').boundingBox();
        const y = r.y + r.height / 2;
        await page.mouse.move(r.x + r.width * 0.8, y); await page.mouse.down();
        await page.mouse.move(r.x + r.width * 0.2, y, { steps: 60 }); await page.mouse.up(); await pause(900);
        await page.mouse.move(r.x + r.width * 0.3, y); await page.mouse.down();
        await page.mouse.move(r.x + r.width * 0.9, y, { steps: 60 }); await page.mouse.up(); await pause(900);
        await page.mouse.move(r.x + r.width / 2, y);
        for (let k = 0; k < 12; k++) { await page.mouse.wheel(40, 0); await pause(30); }
        await pause(1200);
      }
      await ctx.close();
    }
    // the pile: the top card swiped on twice and back once; levain's, then the board's
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 700 }, deviceScaleFactor: 2, recordVideo: { dir: `${out}/video-phone`, size: { width: 390, height: 700 } } });
      const page = await ctx.newPage();
      await page.goto(`${base}?only=cardstack&mode=light`, { waitUntil: 'networkidle' });
      await page.locator('[data-demo=stack-piles]').scrollIntoViewIfNeeded();
      await pause(800);
      for (const s of PILES) {
        for (const dx of [-160, -160, 160]) {
          const r = await page.locator(s + ' [role=listitem]:not([aria-hidden]) [data-stack-card]').first().boundingBox();
          const y = r.y + r.height / 2, x = r.x + r.width / 2;
          await page.mouse.move(x, y); await page.mouse.down();
          await page.mouse.move(x + dx, y, { steps: 25 }); await page.mouse.up(); await pause(900);
        }
        await page.locator(s).getByRole('button', { name: /^Show all/ }).click(); await pause(1200);
        await page.locator(s).getByRole('button', { name: 'Stack' }).click(); await pause(1200);
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  fs.writeFileSync(`${out}/numbers.json`, JSON.stringify({ errors, numbers }, null, 2));
}
const worst = Object.entries(numbers).flatMap(([k, v]) => Object.entries(v).filter(([, s]) => s?.worst !== undefined).map(([st, s]) => `${k}/${st}: ${s.worst}`));
console.log(worst.join('\n'));
console.log(errors.length ? `page errors:\n${errors.join('\n')}` : 'no page errors');
