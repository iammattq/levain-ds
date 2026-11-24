#!/usr/bin/env node
// T11: ColumnStrip on a phone (Playwright's iPhone 14 at 390x844, touch) in WebKit and Chromium, light and dark, and
// the demo at 1440. Run on the PC through demo/e2e/stack.sh:
//   ringmaster heavy t11 --kind capture --on pc --out <dir> sh demo/e2e/stack.sh <dir> strip-capture.mjs
// Each run goes through the same states on levain's ColumnStrip and on the copy of the board's own strip beneath it
// (demo/src/compare/BoardColumnStrip.tsx). Writes <engine>-<mode>[-reduce]-<levain|board>-<step>.png, checks.json
// (PASS/FAIL per check with the numbers behind each; the board's copy is recorded the same way, as `board:` checks
// that don't fail the run) and recordings of a held card paging (video-<engine>-<strip>/, light only; STRIP_REDUCE=1
// adds a Reduce Motion run).
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
// the board's copy is measured, not gated: its results are a comparison
const check = (name, ok, data) => { const gate = !name.includes('-board:'); checks.push({ name, ok: !!ok, gate, data }); console.log(`${ok ? 'PASS' : gate ? 'FAIL' : 'DIFF'} ${name}${data === undefined ? '' : ' ' + JSON.stringify(data)}`); };
const KEY = { Ideas: 'ideas', Queued: 'queued', 'In progress': 'progress', Review: 'review' };

// a strip's state (levain's or the board's copy, by its [data-compare] wrapper): its scroll, the rail's transform, the
// cue, the current pill, each column's x and cards
const state = (page, which) => page.evaluate(([which, KEY]) => {
  const root = document.querySelector(`[data-compare="${which}"]`);
  const strip = root.querySelector('.snap-x'), rail = strip.firstElementChild;
  const cols = [...strip.querySelectorAll('section[aria-label]')];
  const key = name => KEY[name] ?? name;
  const pill = root.querySelector('nav button[aria-current="true"]');
  return {
    scrollLeft: Math.round(strip.scrollLeft),
    scrollTop: Math.round(strip.scrollTop), height: Math.round(strip.getBoundingClientRect().height), pageY: Math.round(scrollY),
    // the page's own sideways scroll: WebKit's autoscroll under a held mouse moves the document when the lifted card
    // hangs off the right edge (the demo page's, not the strip's); columns are measured against the strip
    pageX: Math.round(scrollX),
    snap: strip.style.scrollSnapType,
    railX: Math.round(new DOMMatrix(getComputedStyle(rail).transform).m41),
    cue: root.querySelector('[data-page-cue]')?.dataset.pageCue ?? null,
    cueOpacity: (c => c ? Number(getComputedStyle(c).opacity) : null)(root.querySelector('[data-page-cue]')),
    current: pill ? key(Object.keys(KEY).find(n => pill.textContent.trim().startsWith(n))) : null,
    cols: Object.fromEntries(cols.map(c => [key(c.getAttribute('aria-label')), Math.round(c.getBoundingClientRect().x - strip.getBoundingClientRect().x)])),
    lists: Object.fromEntries(cols.map(c => [key(c.getAttribute('aria-label')), [...c.querySelectorAll('[role="listitem"], h3, p')].map(e => e.textContent.match(/T\d+/)?.[0]).filter((v, i, a) => v && a.indexOf(v) === i)])),
  };
}, [which, KEY]);
const NAME = { ideas: 'Ideas', queued: 'Queued', progress: 'In progress', review: 'Review' };
const pill = (page, which, k) => page.locator(`[data-compare="${which}"] nav button`, { hasText: NAME[k] }).first();
const column = (page, which, k) => page.locator(`[data-compare="${which}"] section[aria-label="${NAME[k]}"]`);

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
async function swipe(page, f, y, which) {
  if (f.kind === 'cdp-touch') {
    await f.down(300, y);
    for (let i = 1; i <= 10; i++) { await f.move(300 - i * 25, y + 2); await pause(16); }
    await f.up();
  } else await page.evaluate(([w, which]) => document.querySelector(`[data-compare="${which}"] .snap-x`).scrollBy({ left: w, behavior: 'smooth' }), [W, which]);
  await pause(1000);
}

async function heldPaging(page, ctx, engine, which, tag, shots, reduce) {
  const slide = reduce ? 0 : SLIDE; // under Reduce Motion a page is instant, so the repeat comes sooner
  const f = await finger(page, ctx, engine);
  const s0 = await state(page, which);
  // hold T6 (Ideas) and carry it to the right edge
  const card = await column(page, which, 'ideas').locator('[role="listitem"]', { hasText: 'T6' }).first().boundingBox();
  const cx = card.x + card.width / 2, cy = card.y + card.height / 2;
  await f.down(cx, cy); await pause(320);
  for (let i = 1; i <= 10; i++) { await f.move(cx + (W - 8 - cx) * i / 10, cy); await pause(16); }
  await pause(250);
  const cue = await state(page, which);
  if (shots) await page.screenshot({ path: `${out}/${tag}-cue.png` });
  await pause(DWELL - 250 + slide + 120);
  const first = await state(page, which);
  if (shots) await page.screenshot({ path: `${out}/${tag}-paged-queued.png` });
  await pause(REPEAT + slide + 150);
  const second = await state(page, which);
  await pause(REPEAT * 2 + slide);
  const bound = await state(page, which);
  if (shots) await page.screenshot({ path: `${out}/${tag}-paged-progress.png` });
  // into the In progress list, and drop
  const list = await column(page, which, 'progress').locator('[role="list"]').first().boundingBox().catch(() => null);
  const ty = list ? Math.max(list.y, 0) + 30 : cy;
  for (let i = 1; i <= 10; i++) { await f.move(W - 8 + (W / 2 - (W - 8)) * i / 10, cy + (ty - cy) * i / 10); await pause(16); }
  await pause(200);
  const off = await state(page, which);
  await f.up(); await pause(1200);
  const dropped = await state(page, which);
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
      for (const reduce of [false, ...(process.env.STRIP_REDUCE === '1' && video ? [true] : [])]) for (const which of ['levain', 'board']) {
        const rtag = tag + (reduce ? '-reduce' : '') + '-' + which;
        const ctx = await browser.newContext({ ...iphone, ...(reduce ? { reducedMotion: 'reduce' } : {}), ...(video ? { recordVideo: { dir: `${out}/video-${engine}-${which}${reduce ? '-reduce' : ''}`, size: { width: W, height: 844 } } } : {}) });
        const page = await ctx.newPage();
        page.on('pageerror', e => errors.push(`${rtag}: ${e.message}`));
        page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`${rtag} console: ${m.text()}`); });
        await page.goto(base + `?theme=7&mode=${mode}&only=strip&strip=${which}`, { waitUntil: 'networkidle' });
        await page.waitForSelector(`[data-compare="${which}"] .snap-x`, { timeout: 8000 }).catch(async () => {
          await page.screenshot({ path: `${out}/${rtag}-no-strip.png` });
          console.log(errors.join('\n')); throw new Error('no strip on the page');
        });
        await pause(700);
        const settle = reduce ? 120 : 900;
        if (!reduce) await page.screenshot({ path: `${out}/${rtag}-rest.png` });
        const rest = await state(page, which);
        check(`${rtag}: at rest, Ideas is current and in view`, rest.current === 'ideas' && rest.cols.ideas === 0, { current: rest.current, cols: rest.cols });
        // a pill jumps (smooth, or at once under Reduce Motion)
        await pill(page, which, 'queued').tap();
        await pause(settle);
        const jumped = await state(page, which);
        if (!reduce) await page.screenshot({ path: `${out}/${rtag}-pill-queued.png` });
        check(`${rtag}: the Queued pill jumps there${reduce ? ' at once' : ''}`, jumped.current === 'queued' && Math.abs(jumped.cols.queued) <= 1, { current: jumped.current, queuedX: jumped.cols.queued });
        await pill(page, which, 'ideas').tap(); await pause(settle);
        // a swipe; the pills follow
        const f0 = await finger(page, ctx, engine);
        const stripBox = await page.locator(`[data-compare="${which}"] .snap-x`).boundingBox();
        await swipe(page, f0, stripBox.y + 40, which);
        const swiped = await state(page, which);
        check(`${rtag}: a swipe moves one column with snap and the pills follow (input: ${f0.kind === 'cdp-touch' ? 'touch' : 'scrollBy'})`, swiped.current === 'queued' && Math.abs(swiped.cols.queued) <= 1, { current: swiped.current, scrollLeft: swiped.scrollLeft });
        await pill(page, which, 'ideas').tap(); await pause(settle);
        numbers[rtag] = { rest, jumped, swiped, held: await heldPaging(page, ctx, engine, which, rtag, !reduce, reduce) };
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
// the composite for the designer: levain beside the board's copy, paged and dropped, light and dark (each engine's own)
for (const engine of engines) {
  const shot = f => fs.existsSync(`${out}/${f}.png`) ? `data:image/png;base64,${fs.readFileSync(`${out}/${f}.png`).toString('base64')}` : '';
  const cell = (mode, which, step) => `<figure><img src="${shot(`${engine}-${mode}-${which}-${step}`)}"><figcaption>${which === 'levain' ? "levain's ColumnStrip" : "the board's strip"}, ${step === 'paged-queued' ? 'paged to Queued (held)' : 'dropped in In progress'}, ${mode}</figcaption></figure>`;
  const rows = modes.flatMap(mode => ['paged-queued', 'dropped'].map(step => `<div class="row">${cell(mode, 'levain', step)}${cell(mode, 'board', step)}</div>`)).join('');
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:24px;background:#888;font:600 22px system-ui;color:#fff}h1{font-size:26px;margin:0 0 16px}
    .row{display:flex;gap:24px;margin-bottom:24px}figure{margin:0}img{width:390px;display:block;border-radius:8px}figcaption{width:390px;padding-top:6px;font-size:15px}</style>
    <h1>T11 ${engine}: levain (left) and the board's own strip (right)</h1>${rows}`;
  const browser = await launch('chromium');
  const page = await browser.newPage({ viewport: { width: 2 * 390 + 3 * 24, height: 400 }, deviceScaleFactor: 1 });
  await page.setContent(html);
  await page.evaluate(() => Promise.all([...document.images].map(i => i.decode().catch(() => {}))));
  await page.screenshot({ path: `${out}/composite-${engine}.png`, fullPage: true });
  await browser.close();
}
fs.writeFileSync(`${out}/checks.json`, JSON.stringify({ checks, errors, numbers }, null, 2));
const gated = checks.filter(c => c.gate), failed = gated.filter(c => !c.ok).length;
const diffs = checks.filter(c => !c.gate && !c.ok);
console.log(`levain: ${gated.length - failed}/${gated.length} passed; board's copy: ${diffs.length} of ${checks.length - gated.length} checks differ; ${errors.length} page errors`);
for (const c of diffs) console.log('board differs: ' + c.name);
for (const e of errors) console.log('page error: ' + e);
process.exit(failed || errors.length ? 1 : 0);
