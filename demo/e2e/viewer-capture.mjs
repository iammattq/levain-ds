#!/usr/bin/env node
// T61: the demo's ImageViewer section (?only=viewer) at 390 x 844 (touch, 3x) and 1280 x 800 (mouse, 2x), in Sage
// (theme 0) and Cobalt Mono (theme 7), light and dark. Run on the PC through demo/e2e/viewer.sh:
//   node viewer-capture.mjs <base-url> <out>
// Shots per theme, mode and width (<theme>-<mode>-<width>-<state>.png, the whole screen):
//   single-rest, single-zoom, pair-rest, pair-zoom, dialog-single-zoom (over the open Modal), dialog-pair-rest.
// Zoom at 390 is a real two-finger pinch (single) and double tap (pair), CDP touch points through the pointer events;
// at 1280 the wheel (single) and the + key (pair). Checks (exit 1 on a failure), in numbers.json:
//   at rest the image is inside the 16 px inset and centred; the scrim has no backdrop-filter; zoomed, scale > 1, the
//   page itself unzoomed (visualViewport.scale 1) and an overflowing side's edges at or past the screen's; over the
//   dialog, Escape closes only the viewer and the dialog stays. At 1280 Sage light, the pair: a drag on the handle moves
//   the reveal and not the images, a drag on the zoomed image pans them and leaves the handle where it is on screen.
// look.png: the composite.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const { chromium } = createRequire(path.join(process.env.PW_DIR, 'node_modules/'))('playwright-core');
const [base, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const exe = [process.env.CHROMIUM, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/google-chrome'].find(p => p && fs.existsSync(p));
if (!exe) throw new Error('no Chromium found (set CHROMIUM)');
const browser = await chromium.launch({ executablePath: exe, headless: true });
const COMBOS = [['sage', 0, 'light'], ['sage', 0, 'dark'], ['cobalt', 7, 'light'], ['cobalt', 7, 'dark']];
const SIZES = { 390: { width: 390, height: 844, scale: 3, touch: true }, 1280: { width: 1280, height: 800, scale: 2, touch: false } };
const errors = [], fails = [], numbers = {};
const wait = ms => new Promise(r => setTimeout(r, ms));

/** The top viewer's state. */
const probe = page => page.evaluate(() => {
  const last = s => { const all = document.querySelectorAll(s); return all[all.length - 1]; };
  const surface = last('[data-image-viewer]'), content = last('[data-image-viewer-content]'), scrim = last('[data-modal-scrim]');
  const r = content?.getBoundingClientRect(), slider = surface?.querySelector('[role="slider"]');
  return {
    open: !!surface,
    scale: surface ? +surface.dataset.zoom : null,
    transform: content?.style.transform,
    rect: r && { l: +r.left.toFixed(1), t: +r.top.toFixed(1), r: +r.right.toFixed(1), b: +r.bottom.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) },
    W: innerWidth, H: innerHeight, vv: visualViewport.scale,
    scrim: scrim && { kind: scrim.dataset.modalScrim, backdrop: getComputedStyle(scrim).backdropFilter, bg: getComputedStyle(scrim).backgroundColor },
    handle: slider && { left: slider.style.left, value: +slider.getAttribute('aria-valuenow') },
    dialogs: [...document.querySelectorAll('[role="dialog"]')].map(d => d.getAttribute('aria-label') || d.querySelector('h1,h2,h3,h4')?.textContent || ''),
  };
});

const touchOf = async page => {
  const cdp = await page.context().newCDPSession(page);
  const send = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) });
  return {
    async pinch(cx, cy, from, to, steps = 8) {
      await send('touchStart', [[cx - from, cy], [cx + from, cy]]);
      for (let i = 1; i <= steps; i++) { const d = from + ((to - from) * i) / steps; await send('touchMove', [[cx - d, cy], [cx + d, cy]]); await wait(16); }
      await send('touchEnd', []);
    },
    async tap(x, y) { await send('touchStart', [[x, y]]); await send('touchEnd', []); },
  };
};

const open = async (size, theme, mode) => {
  const s = SIZES[size];
  const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height }, deviceScaleFactor: s.scale, hasTouch: s.touch, isMobile: s.touch });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`${size} ${theme} ${mode}: ${e.message}`));
  await page.goto(`${base}?only=viewer&theme=${theme}&mode=${mode}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => Promise.all([document.fonts.ready, ...[...document.images].map(i => i.decode().catch(() => {}))]));
  await wait(300);
  return { ctx, page };
};

for (const [name, theme, mode] of COMBOS) for (const size of [390, 1280]) {
  const key = `${name}-${mode}-${size}`;
  const { ctx, page } = await open(size, theme, mode);
  const { width: W, height: H, touch } = SIZES[size];
  const t = touch ? await touchOf(page) : null;
  const fail = m => fails.push(`${key}: ${m}`);
  const shot = async (state, check) => {
    await wait(450); // Modal's fade and an eased zoom settle
    await page.screenshot({ path: `${out}/${key}-${state}.png` });
    const n = numbers[`${key}-${state}`] = await probe(page);
    if (!n.open) return fail(`${state}: viewer not open`);
    if (n.scrim?.kind !== 'dark' || n.scrim.backdrop !== 'none') fail(`${state}: scrim ${JSON.stringify(n.scrim)}`);
    if (n.vv !== 1) fail(`${state}: the page zoomed (visualViewport.scale ${n.vv})`);
    check?.(n);
  };
  const atRest = state => n => {
    const { rect: r } = n;
    if (n.scale !== 1) fail(`${state}: scale ${n.scale}`);
    if (r.l < 15.5 || r.t < 15.5 || r.r > W - 15.5 || r.b > H - 15.5) fail(`${state}: outside the inset ${JSON.stringify(r)}`);
    if (Math.abs((r.l + r.r) / 2 - W / 2) > 1 || Math.abs((r.t + r.b) / 2 - H / 2) > 1) fail(`${state}: not centred ${JSON.stringify(r)}`);
  };
  const zoomed = state => n => {
    const { rect: r } = n;
    if (!(n.scale > 1)) fail(`${state}: not zoomed (scale ${n.scale})`);
    if (r.w > W + 1 && (r.l > 0.5 || r.r < W - 0.5)) fail(`${state}: a gap at a side edge ${JSON.stringify(r)}`);
    if (r.h > H + 1 && (r.t > 0.5 || r.b < H - 0.5)) fail(`${state}: a gap at a top/bottom edge ${JSON.stringify(r)}`);
  };
  const thumb = (label, inDialog) => page.locator(`${inDialog ? '[role="dialog"] ' : ''}[data-viewer-thumb="${label}"]`).first();
  const close = async () => { await page.keyboard.press('Escape'); await wait(450); };

  // one image
  await thumb('This build').click();
  await shot('single-rest', atRest('single-rest'));
  if (touch) await t.pinch(W / 2, H / 2, 40, 110); // 80 px apart to 220: about 2.75x
  else { await page.mouse.move(W / 2 + 60, H / 2 - 40); for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, -200); await wait(30); } }
  await shot('single-zoom', zoomed('single-zoom'));
  await close();

  // the pair
  await thumb('Before and after').click();
  await shot('pair-rest', atRest('pair-rest'));
  if (touch) { const n = numbers[`${key}-pair-rest`]; const x = (n.rect.l + n.rect.r) / 2 - 50, y = n.rect.t + n.rect.h * 0.3; await t.tap(x, y); await wait(60); await t.tap(x, y); }
  else { await page.keyboard.press('+'); await page.keyboard.press('+'); }
  await shot('pair-zoom', zoomed('pair-zoom'));

  if (key === 'sage-light-1280') {
    // the handle drags from itself (and moves the reveal, not the images); a drag on the zoomed images pans them
    // and leaves the handle where it is on screen
    const before = await probe(page);
    const knob = await page.locator('[data-image-viewer] [role="slider"]').boundingBox();
    const kx = knob.x + knob.width / 2, ky = knob.y + knob.height / 2;
    await page.mouse.move(kx, ky); await page.mouse.down(); await page.mouse.move(kx + 120, ky, { steps: 6 }); await page.mouse.up();
    const handled = numbers[`${key}-pair-handle`] = await probe(page);
    if (handled.transform !== before.transform) fail(`handle drag moved the images: ${before.transform} -> ${handled.transform}`);
    if (!(handled.handle.value > before.handle.value)) fail(`handle drag: value ${before.handle.value} -> ${handled.handle.value}`);
    await page.mouse.move(W / 2 - 200, H / 2); await page.mouse.down(); await page.mouse.move(W / 2 - 80, H / 2 + 40, { steps: 6 }); await page.mouse.up();
    const panned = numbers[`${key}-pair-pan`] = await probe(page);
    if (panned.transform === handled.transform) fail('a drag on the zoomed images did not pan');
    if (panned.handle.left !== handled.handle.left) fail(`the pan moved the handle: ${handled.handle.left} -> ${panned.handle.left}`);
    if (!panned.open) fail('the pan closed the viewer');
    await page.screenshot({ path: `${out}/${key}-pair-panned.png` });
  }
  await close();

  // over the open dialog
  await page.locator('[data-viewer-dialog-open]').click();
  await wait(450);
  await thumb('This build', true).click();
  if (touch) await t.pinch(W / 2, H / 2, 40, 110);
  else { await page.mouse.move(W / 2, H / 2); for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, -200); await wait(30); } }
  await shot('dialog-single-zoom', zoomed('dialog-single-zoom'));
  await close();
  let n = numbers[`${key}-dialog-after-escape`] = await probe(page);
  if (n.open) fail('Escape over the dialog left the viewer open');
  if (!n.dialogs.includes('A card with images')) fail(`Escape over the dialog closed it too: ${JSON.stringify(n.dialogs)}`);
  await thumb('Before and after', true).click();
  await shot('dialog-pair-rest', atRest('dialog-pair-rest'));
  await close();
  n = await probe(page);
  if (!n.dialogs.includes('A card with images')) fail('the dialog went with the pair');
  await ctx.close();
}

fs.writeFileSync(`${out}/numbers.json`, JSON.stringify({ numbers, errors, fails }, null, 2));
const img = f => `data:image/png;base64,${fs.readFileSync(`${out}/${f}`).toString('base64')}`;
const sheet = await browser.newPage({ viewport: { width: 1800, height: 400 } });
const STATES = ['single-rest', 'single-zoom', 'pair-rest', 'pair-zoom', 'dialog-single-zoom', 'dialog-pair-rest'];
const cell = (k, w) => `<figure><figcaption>${k}</figcaption><img src="${img(`${k}.png`)}" style="width:${w}px"></figure>`;
const rows = [];
for (const c of ['sage-light', 'sage-dark', 'cobalt-light', 'cobalt-dark']) {
  rows.push(`<div class="row">${STATES.map(s => cell(`${c}-390-${s}`, 195)).join('')}</div>`);
  rows.push(`<div class="row">${STATES.slice(0, 3).map(s => cell(`${c}-1280-${s}`, 560)).join('')}</div><div class="row">${STATES.slice(3).map(s => cell(`${c}-1280-${s}`, 560)).join('')}</div>`);
}
await sheet.setContent(`<style>body{margin:0;padding:16px;background:#ddd;font:13px system-ui}.row{display:flex;gap:12px;align-items:flex-start;margin-bottom:12px}figure{margin:0}figcaption{height:20px}img{display:block}</style>${rows.join('')}`);
await sheet.screenshot({ path: `${out}/look.png`, fullPage: true });
await browser.close();
console.log(`${Object.keys(numbers).length} probes; errors ${errors.length}; fails ${fails.length}${fails.length ? '\n' + fails.join('\n') : ''}`);
if (errors.length || fails.length) process.exitCode = 1;
