#!/usr/bin/env node
// T11: ColumnStrip on a phone (Playwright's iPhone 14 at 390x844, touch) in WebKit and Chromium, light and dark, and
// the demo at 1440. Run on the PC through demo/e2e/stack.sh:
//   ringmaster heavy t11 --kind capture --on pc --out <dir> sh demo/e2e/stack.sh <dir> strip-capture.mjs
// Writes <engine>-<mode>-<step>.png, checks.json (PASS/FAIL per check, with the numbers behind each) and recordings
// of a held card paging (video-<engine>/, light only; STRIP_REDUCE=1 adds a Reduce Motion run).
// The hold: Chromium gets real touches (CDP Input.dispatchTouchEvent), as the board's own checks do. WebKit has no
// CDP, so its touches are TouchEvents built in the page and dispatched where a finger would be; if this WebKit build
// has no Touch constructor, it falls back to a mouse drag (the same SortableGroup callbacks), and checks.json says so.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const req = createRequire(path.join(process.env.PW_DIR, 'node_modules/'));
const pw = req('playwright-core');
const [base, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const engines = (process.env.STRIP_ENGINES ?? 'webkit,chromium').split(',');
const modes = (process.env.STRIP_MODES ?? 'light,dark').split(',');
const pause = ms => new Promise(r => setTimeout(r, ms));
const W = 390;
const DWELL = 500, REPEAT = 600, SLIDE = 620;

const exe = [process.env.CHROMIUM, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/google-chrome'].find(p => p && fs.existsSync(p));
const launch = async engine => {
  if (engine === 'chromium') {
    if (!exe) throw new Error('no Chromium found (set CHROMIUM)');
    return pw.chromium.launch({ executablePath: exe, headless: true });
  }
  try { return await pw.webkit.launch({ headless: true }); } catch {
    execFileSync(process.execPath, [path.join(process.env.PW_DIR, 'node_modules/playwright-core/cli.js'), 'install', 'webkit'], { stdio: 'inherit' });
    return pw.webkit.launch({ headless: true });
  }
};
const iphone = { ...(({ defaultBrowserType, ...d }) => d)(pw.devices['iPhone 14']), viewport: { width: W, height: 844 } };

const checks = [], errors = [];
const check = (name, ok, data) => { checks.push({ name, ok: !!ok, data }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${data === undefined ? '' : ' ' + JSON.stringify(data)}`); };

// the strip's state: its scroll, the rail's transform, the cue, the current pill, each column's x
const state = page => page.evaluate(() => {
  const strip = document.querySelector('[data-strip]'), rail = document.querySelector('[data-rail]');
  return {
    scrollLeft: Math.round(strip.scrollLeft),
    scrollTop: Math.round(strip.scrollTop), height: Math.round(strip.getBoundingClientRect().height), pageY: Math.round(scrollY),
    snap: strip.style.scrollSnapType,
    railX: Math.round(new DOMMatrix(getComputedStyle(rail).transform).m41),
    cue: document.querySelector('[data-page-cue]')?.dataset.pageCue ?? null,
    cueOpacity: (c => c ? Number(getComputedStyle(c).opacity) : null)(document.querySelector('[data-page-cue]')),
    current: document.querySelector('[data-pill][aria-current="true"]')?.dataset.pill ?? null,
    cols: Object.fromEntries([...document.querySelectorAll('[data-column]')].map(c => [c.dataset.column, Math.round(c.getBoundingClientRect().x)])),
    lists: Object.fromEntries([...document.querySelectorAll('[data-column]')].map(c => [c.dataset.column, [...c.querySelectorAll('[role="listitem"], [data-status-card], h3, p')].map(e => e.textContent.match(/T\d+/)?.[0]).filter((v, i, a) => v && a.indexOf(v) === i)])),
  };
});

// a finger: real touches in Chromium; in WebKit, TouchEvents built in the page (else a mouse)
async function finger(page, ctx, engine) {
  if (engine === 'chromium') {
    const cdp = await ctx.newCDPSession(page);
    const send = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    return { kind: 'cdp-touch', down: (x, y) => send('touchStart', x, y), move: (x, y) => send('touchMove', x, y), up: () => send('touchEnd', 0, 0) };
  }
  const can = await page.evaluate(() => { try { new Touch({ identifier: 1, target: document.body, clientX: 0, clientY: 0 }); return typeof TouchEvent === 'function'; } catch { return false; } });
  if (can) {
    await page.evaluate(() => {
      let target = null, last = { x: 0, y: 0 };
      const fire = (type, x, y) => {
        const t = new Touch({ identifier: 7, target, clientX: x, clientY: y, pageX: x + scrollX, pageY: y + scrollY });
        const touches = type === 'touchend' ? [] : [t];
        target.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, composed: true, touches, targetTouches: touches, changedTouches: [t] }));
      };
      window.__finger = {
        down(x, y) { target = document.elementFromPoint(x, y); last = { x, y }; fire('touchstart', x, y); },
        move(x, y) { last = { x, y }; fire('touchmove', x, y); },
        up() { fire('touchend', last.x, last.y); },
      };
    });
    return {
      kind: 'synthetic-touch',
      down: (x, y) => page.evaluate(([x, y]) => window.__finger.down(x, y), [x, y]),
      move: (x, y) => page.evaluate(([x, y]) => window.__finger.move(x, y), [x, y]),
      up: () => page.evaluate(() => window.__finger.up()),
    };
  }
  return { kind: 'mouse', down: async (x, y) => { await page.mouse.move(x, y); await page.mouse.down(); }, move: (x, y) => page.mouse.move(x, y), up: () => page.mouse.up() };
}

// a swipe left across the strip: a real touch scroll in Chromium; elsewhere a smooth scroll stands in (checks the
// pills follow a scroll, not the gesture)
async function swipe(page, f, y) {
  if (f.kind === 'cdp-touch') {
    await f.down(300, y);
    for (let i = 1; i <= 10; i++) { await f.move(300 - i * 25, y + 2); await pause(16); }
    await f.up();
  } else await page.evaluate(w => document.querySelector('[data-strip]').scrollBy({ left: w, behavior: 'smooth' }), W);
  await pause(1000);
}

async function heldPaging(page, ctx, engine, tag, shots, reduce) {
  const slide = reduce ? 0 : SLIDE; // under Reduce Motion a page is instant, so the repeat comes sooner
  const f = await finger(page, ctx, engine);
  const s0 = await state(page);
  // hold T6 (Ideas) and carry it to the right edge
  const card = await page.locator('[data-column="ideas"] [role="listitem"]', { hasText: 'T6' }).first().boundingBox();
  const cx = card.x + card.width / 2, cy = card.y + card.height / 2;
  await f.down(cx, cy); await pause(320);
  for (let i = 1; i <= 10; i++) { await f.move(cx + (W - 8 - cx) * i / 10, cy); await pause(16); }
  await pause(250);
  const cue = await state(page);
  if (shots) await page.screenshot({ path: `${out}/${tag}-cue.png` });
  await pause(DWELL - 250 + slide + 120);
  const first = await state(page);
  if (shots) await page.screenshot({ path: `${out}/${tag}-paged-queued.png` });
  await pause(REPEAT + slide + 150);
  const second = await state(page);
  await pause(REPEAT * 2 + slide);
  const bound = await state(page);
  if (shots) await page.screenshot({ path: `${out}/${tag}-paged-progress.png` });
  // into the In progress list, and drop
  const list = await page.locator('[data-column="progress"] [role="list"]').first().boundingBox().catch(() => null);
  const ty = list ? Math.max(list.y, 0) + 30 : cy;
  for (let i = 1; i <= 10; i++) { await f.move(W - 8 + (W / 2 - (W - 8)) * i / 10, cy + (ty - cy) * i / 10); await pause(16); }
  await pause(200);
  const off = await state(page);
  await f.up(); await pause(1200);
  const dropped = await state(page);
  if (shots) await page.screenshot({ path: `${out}/${tag}-dropped.png` });
  const d = { input: f.kind, s0, cue, first, second, bound, off, dropped };
  check(`${tag}: held at the right edge, the cue shows (input: ${f.kind})`, cue.cue === 'right' && cue.snap === 'none', { cue: cue.cue, snap: cue.snap });
  check(`${tag}: after the dwell it pages to Queued by a transform; the strip doesn't scroll`, first.current === 'queued' && first.railX === -W && first.scrollLeft === s0.scrollLeft && Math.abs(first.cols.queued) <= 1, { current: first.current, railX: first.railX, scrollLeft: first.scrollLeft, queuedX: first.cols.queued });
  check(`${tag}: staying, it pages again (In progress)`, second.current === 'progress' && second.railX === -2 * W && second.scrollLeft === s0.scrollLeft, { current: second.current, railX: second.railX, scrollLeft: second.scrollLeft });
  check(`${tag}: and no further than pageable allows (Review takes no drops)`, bound.current === 'progress' && bound.cue === null, { current: bound.current, cue: bound.cue });
  check(`${tag}: the strip never scrolls up and down while held`, [cue, first, second, bound, off].every(x => x.scrollTop === 0), [cue, first, second, bound, off].map(x => x.scrollTop));
  check(`${tag}: moving off the edge clears the cue`, off.cue === null, { cue: off.cue });
  check(`${tag}: on drop the transform becomes the same scroll position; snap is back`, dropped.railX === 0 && dropped.scrollLeft === 2 * W && dropped.snap === '' && Math.abs(dropped.cols.progress) <= 1 && dropped.current === 'progress', { railX: dropped.railX, scrollLeft: dropped.scrollLeft, snap: dropped.snap, progressX: dropped.cols.progress });
  check(`${tag}: the card landed in In progress`, dropped.lists.progress.includes('T6') && !dropped.lists.ideas.includes('T6'), dropped.lists);
  return d;
}

const numbers = {};
for (const engine of engines) {
  const browser = await launch(engine);
  try {
    for (const mode of modes) {
      const tag = `${engine}-${mode}`;
      const video = mode === 'light';
      for (const reduce of [false, ...(process.env.STRIP_REDUCE === '1' && video ? [true] : [])]) {
        const rtag = tag + (reduce ? '-reduce' : '');
        const ctx = await browser.newContext({ ...iphone, ...(reduce ? { reducedMotion: 'reduce' } : {}), ...(video ? { recordVideo: { dir: `${out}/video-${engine}${reduce ? '-reduce' : ''}`, size: { width: W, height: 844 } } } : {}) });
        const page = await ctx.newPage();
        page.on('pageerror', e => errors.push(`${rtag}: ${e.message}`));
        page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`${rtag} console: ${m.text()}`); });
        await page.goto(base + `?theme=7&mode=${mode}&only=strip`, { waitUntil: 'networkidle' });
        await page.waitForSelector('[data-strip]', { timeout: 8000 }).catch(async () => {
          await page.screenshot({ path: `${out}/${rtag}-no-strip.png` });
          console.log(errors.join('\n')); throw new Error('no strip on the page');
        });
        await pause(700);
        if (!reduce) await page.screenshot({ path: `${out}/${rtag}-rest.png` });
        const rest = await state(page);
        check(`${rtag}: at rest, Ideas is current and in view`, rest.current === 'ideas' && rest.cols.ideas === 0, { current: rest.current, cols: rest.cols });
        // a pill jumps (smooth, or at once under Reduce Motion)
        await page.locator('[data-pill="queued"]').tap();
        await pause(reduce ? 120 : 900);
        const jumped = await state(page);
        if (!reduce) await page.screenshot({ path: `${out}/${rtag}-pill-queued.png` });
        check(`${rtag}: the Queued pill jumps there${reduce ? ' at once' : ''}`, jumped.current === 'queued' && Math.abs(jumped.cols.queued) <= 1, { current: jumped.current, queuedX: jumped.cols.queued });
        await page.locator('[data-pill="ideas"]').tap(); await pause(reduce ? 120 : 900);
        // a swipe; the pills follow
        const f0 = await finger(page, ctx, engine);
        const stripBox = await page.locator('[data-strip]').boundingBox();
        await swipe(page, f0, stripBox.y + 40);
        const swiped = await state(page);
        check(`${rtag}: a swipe moves one column with snap and the pills follow (input: ${f0.kind === 'cdp-touch' ? 'touch' : 'scrollBy'})`, swiped.current === 'queued' && Math.abs(swiped.cols.queued) <= 1, { current: swiped.current, scrollLeft: swiped.scrollLeft });
        await page.locator('[data-pill="ideas"]').tap(); await pause(reduce ? 120 : 900);
        numbers[rtag] = { rest, jumped, swiped, held: await heldPaging(page, ctx, engine, rtag, !reduce, reduce) };
        await ctx.close();
      }
    }
  } finally { await browser.close(); }
}
// the demo page at 1440, the strip in its phone frame
{
  const browser = await launch('chromium');
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(base + '?theme=7&mode=light&only=strip', { waitUntil: 'networkidle' });
  await pause(700);
  await page.screenshot({ path: `${out}/chromium-light-1440.png` });
  await browser.close();
}
fs.writeFileSync(`${out}/checks.json`, JSON.stringify({ checks, errors, numbers }, null, 2));
const failed = checks.filter(c => !c.ok).length;
console.log(`${checks.length - failed}/${checks.length} passed; ${errors.length} page errors`);
for (const e of errors) console.log('page error: ' + e);
process.exit(failed || errors.length ? 1 : 0);
