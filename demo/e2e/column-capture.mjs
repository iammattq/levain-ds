#!/usr/bin/env node
// T8: Column, levain's three columns beside the board's copy (demo/src/compare/BoardColumn.tsx), in Sage (theme 0) and
// Cobalt Mono (theme 7), light and dark, Chromium at 1440x900. Run on the PC:
//   ringmaster heavy t8 --kind capture --on pc --out captures/T8 sh demo/e2e/stack.sh captures/T8 column-capture.mjs
// Writes <theme>-<mode>-levain.png and -board.png (the kanbans), <theme>-<mode>-scroll.png (the scroll column, its body
// scrolled to the end), numbers.json (each part's box and colours, levain's against the board's, and the largest
// difference per combo; the scroll checks) and composite.png (levain above the board, all four combos).
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
const COMBOS = [['sage', 0, 'light'], ['sage', 0, 'dark'], ['cobalt', 7, 'light'], ['cobalt', 7, 'dark']];
const errors = [], numbers = {};

/** Every part of each column in a kanban, relative to the kanban: the column, head, glyph, h2, count, action, cards. */
const measure = (page, which) => page.evaluate(which => {
  const root = document.querySelector(`[data-compare="${which}"][data-demo="columns"]`), o = root.getBoundingClientRect();
  const r1 = n => +n.toFixed(1);
  const box = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r1(r.x - o.x), y: r1(r.y - o.y), w: r1(r.width), h: r1(r.height) }; };
  const cs = el => getComputedStyle(el);
  return [...root.children].map(col => {
    const head = col.querySelector('header'), body = head.nextElementSibling;
    const h2 = head.querySelector('h2'), count = h2.nextElementSibling;
    return {
      title: h2.textContent,
      column: { ...box(col), bg: cs(col).backgroundColor, radius: cs(col).borderTopLeftRadius },
      head: box(head),
      glyph: box(head.querySelector('svg')),
      h2: { ...box(h2), font: `${cs(h2).fontWeight} ${cs(h2).fontSize}`, color: cs(h2).color },
      count: { ...box(count), text: count.textContent, font: `${cs(count).fontWeight} ${cs(count).fontSize}`, color: cs(count).color },
      marks: box(head.querySelector('.marks')),
      action: box(head.querySelector('.ml-auto')),
      cards: [...body.children].map(box),
    };
  });
}, which);

/** The largest difference in any box coordinate, and every colour or font that differs. */
const diff = (a, b) => {
  let worst = 0; const unlike = [];
  const walk = (x, y, at) => {
    if (x && typeof x === 'object') { for (const k of Object.keys(x)) walk(x[k], y?.[k], `${at}.${k}`); return; }
    if (typeof x === 'number') { const d = Math.abs(x - (y ?? Infinity)); if (d > worst) worst = d; if (d > 0.5) unlike.push({ at, levain: x, board: y }); }
    else if (x !== y) unlike.push({ at, levain: x, board: y });
  };
  walk(a, b, '');
  return { worst, unlike };
};

try {
  for (const [name, theme, mode] of COMBOS) {
    const key = `${name}-${mode}`;
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('pageerror', e => errors.push(`${key}: ${e.message}`));
    await page.goto(`${base}?only=column&theme=${theme}&mode=${mode}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await pause(900);
    const levain = await measure(page, 'levain'), board = await measure(page, 'board');
    numbers[key] = { ...diff(levain, board), levain, board };
    await page.locator('[data-compare="levain"][data-demo="columns"]').screenshot({ path: `${out}/${key}-levain.png`, animations: 'disabled' });
    await page.locator('[data-compare="board"][data-demo="columns"]').screenshot({ path: `${out}/${key}-board.png`, animations: 'disabled' });

    // scroll: the column fills its 22rem box; its body scrolls to the end and the header doesn't move
    const sc = page.locator('[data-demo="column-scroll"]');
    await sc.scrollIntoViewIfNeeded();
    const before = await sc.evaluate(el => ({ box: el.getBoundingClientRect().height, col: el.firstElementChild.getBoundingClientRect().height, head: el.querySelector('header').getBoundingClientRect().y, body: (b => ({ client: b.clientHeight, scroll: b.scrollHeight }))(el.querySelector('[data-column-body]')) }));
    await sc.locator('[data-column-body]').evaluate(b => { b.scrollTop = b.scrollHeight; });
    await pause(300);
    const after = await sc.evaluate(el => ({ head: el.querySelector('header').getBoundingClientRect().y, top: el.querySelector('[data-column-body]').scrollTop }));
    numbers[key].scroll = {
      before, after,
      fills: Math.abs(before.col - before.box) < 0.5,
      overflows: before.body.scroll > before.body.client,
      scrolled: after.top > 0,
      headStays: Math.abs(after.head - before.head) < 0.5,
    };
    await sc.screenshot({ path: `${out}/${key}-scroll.png`, animations: 'disabled' });
    await page.close();
    const s = numbers[key].scroll;
    console.log(`${key}: worst ${numbers[key].worst}px, ${numbers[key].unlike.length} unlike; scroll fills ${s.fills} overflows ${s.overflows} scrolled ${s.scrolled} headStays ${s.headStays}`);
  }

  // one image for the designer: levain above the board's copy, per combo
  {
    const img = f => `data:image/png;base64,${fs.readFileSync(`${out}/${f}`).toString('base64')}`;
    const cell = (key, title) => `<div class="col"><h2>${title}</h2><h3>levain's Column</h3><img src="${img(`${key}-levain.png`)}"><h3>The board's copy</h3><img src="${img(`${key}-board.png`)}"><h3>scroll, body at its end</h3><img class="s" src="${img(`${key}-scroll.png`)}"></div>`;
    const page = await browser.newPage({ viewport: { width: 2400, height: 800 } });
    await page.setContent(`<style>body{margin:0;padding:24px;background:#888;font:16px system-ui,sans-serif;color:#111}.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}.col{background:#fff;padding:16px;border-radius:8px}
      h2{margin:0 0 8px}h3{margin:16px 0 6px;font-size:14px;font-weight:500;color:#444}img{width:100%}img.s{width:40%}</style>
      <div class="grid">${cell('sage-light', 'Sage · light')}${cell('sage-dark', 'Sage · dark')}${cell('cobalt-light', 'Cobalt Mono · light')}${cell('cobalt-dark', 'Cobalt Mono · dark')}</div>`);
    await page.evaluate(() => Promise.all([...document.images].map(i => i.decode())));
    await page.screenshot({ path: `${out}/composite.png`, fullPage: true });
    await page.close();
  }
} finally {
  await browser.close();
  fs.writeFileSync(`${out}/numbers.json`, JSON.stringify({ errors, numbers }, null, 2));
  console.log(`errors ${errors.length}`);
}
