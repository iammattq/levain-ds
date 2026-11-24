#!/usr/bin/env node
// T40: the demo's ImageCompare slider (?only=slider) at 390 and 1280 px, Sage (theme 0) and Cobalt Mono (theme 7), light
// and dark, at 2x. Run on the PC through demo/e2e/slider.sh:
//   node slider-capture.mjs <base-url> <out> [<pair-dir>]
// With <pair-dir>, each theme and mode shows <pair-dir>/before-<theme>-<mode>.png and after-<theme>-<mode>.png.
// Writes <theme>-<mode>-<width>-<pos>.png (the section, handle at 25, 50, 75 % set with Home and the arrow keys),
// strip.png (the frame as a mouse drags the handle across, Sage dark at 390), composite.png (a row per theme and mode:
// 390 at 25, 50, 75 and 1280 at 50) and numbers.json. Checks, and exits 1 if one fails: the handle's value, its x and
// the after image's clip match the position; the frame has the before image's aspect ratio; a label is faded exactly
// while the handle is over it; a mouse drag and a sideways touch swipe move the handle and never scroll the page
// sideways; a vertical touch swipe scrolls the page and leaves the handle where it was.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const { chromium } = createRequire(path.join(process.env.PW_DIR, 'node_modules/'))('playwright-core');
const [base, out, pair] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const exe = [process.env.CHROMIUM, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/google-chrome'].find(p => p && fs.existsSync(p));
if (!exe) throw new Error('no Chromium found (set CHROMIUM)');
const browser = await chromium.launch({ executablePath: exe, headless: true });
const COMBOS = [['sage', 0, 'light'], ['sage', 0, 'dark'], ['cobalt', 7, 'light'], ['cobalt', 7, 'dark']];
const WIDTHS = [390, 1280];
const POSITIONS = [25, 50, 75];
const errors = [], fails = [], numbers = { pair: pair || '(the demo pair)' };
const pause = ms => new Promise(r => setTimeout(r, ms));

const query = (theme, mode, name) => `theme=${theme}&mode=${mode}${pair ? `&before=${pair}/before-${name}-${mode}.png&after=${pair}/after-${name}-${mode}.png` : ''}`;

const open = async (width, q, opts = {}) => {
  const ctx = await browser.newContext({ viewport: { width, height: opts.height ?? 900 }, deviceScaleFactor: 2, hasTouch: !!opts.touch, isMobile: !!opts.touch });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`${width} ${q}: ${e.message}`));
  await page.goto(`${base}?only=slider&${q}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => Promise.all([document.fonts.ready, ...[...document.images].map(i => i.decode().catch(() => {}))]));
  await pause(300);
  return page;
};

const probe = page => page.evaluate(() => {
  const f = document.querySelector('[data-image-compare-slider]');
  if (!f) return { missing: true, text: document.querySelector('[data-demo="image-compare-slider"]')?.textContent };
  const fr = f.getBoundingClientRect();
  const h = f.querySelector('[role="slider"]');
  const [before, after] = f.querySelectorAll('img');
  const label = side => { const el = f.querySelector(`[data-image-compare-label="${side}"]`), r = el.getBoundingClientRect(); return { x: +(r.x - fr.x).toFixed(1), w: +r.width.toFixed(1), text: el.textContent, opacity: +getComputedStyle(el).opacity }; };
  return {
    frame: { w: +fr.width.toFixed(1), h: +fr.height.toFixed(1) },
    value: +h.getAttribute('aria-valuenow'), valuetext: h.getAttribute('aria-valuetext'), name: h.getAttribute('aria-label'),
    handleX: +(h.getBoundingClientRect().x - fr.x).toFixed(1),
    clip: getComputedStyle(after).clipPath,
    before: { natural: [before.naturalWidth, before.naturalHeight] },
    after: { natural: [after.naturalWidth, after.naturalHeight], fit: getComputedStyle(after).objectFit, position: getComputedStyle(after).objectPosition },
    labels: { left: label('left'), right: label('right') },
    scrollX, scrollY, overflowX: document.documentElement.scrollWidth - innerWidth,
  };
});

const setPos = async (page, pos) => {
  await page.locator('[role="slider"]').focus();
  await page.keyboard.press('Home');
  for (let i = 0; i < pos / 5; i++) await page.keyboard.press('ArrowRight');
  await page.evaluate(() => document.activeElement.blur());
  await pause(250); // the labels' fade
};

const check = (key, n, pos) => {
  const fail = m => fails.push(`${key}: ${m}`);
  if (n.missing) return fail(`no slider (fallback: ${n.text})`);
  if (n.value !== pos) fail(`value ${n.value}, want ${pos}`);
  if (Math.abs(n.handleX - (n.frame.w * pos) / 100) > 1) fail(`handle at ${n.handleX}px of ${n.frame.w}`);
  if (n.clip !== `inset(0px 0px 0px ${pos}%)`) fail(`clip ${n.clip}`);
  const [nw, nh] = n.before.natural;
  // the frame's border (1 px each side) sits around the image
  if (Math.abs((n.frame.w - 2) / (n.frame.h - 2) - nw / nh) > 0.01) fail(`frame aspect ${(n.frame.w / n.frame.h).toFixed(3)} vs before ${(nw / nh).toFixed(3)}`);
  const x = n.handleX, L = n.labels.left, R = n.labels.right;
  const lCovered = x < L.x + L.w + 8, rCovered = x > R.x - 8;
  if ((L.opacity === 0) !== lCovered) fail(`left label opacity ${L.opacity}, handle ${x}, label ${L.x}+${L.w}`);
  if ((R.opacity === 0) !== rCovered) fail(`right label opacity ${R.opacity}, handle ${x}, label at ${R.x}`);
  if (n.overflowX > 0) fail(`page wider than the viewport by ${n.overflowX}px`);
};

for (const [name, theme, mode] of COMBOS) for (const width of WIDTHS) {
  const page = await open(width, query(theme, mode, name));
  for (const pos of POSITIONS) {
    const key = `${name}-${mode}-${width}-${pos}`;
    await setPos(page, pos);
    await page.locator('section').first().screenshot({ path: `${out}/${key}.png` });
    check(key, (numbers[key] = await probe(page)), pos);
  }
  // the labels near the ends: before's faded at 0 and 10 %, after's at 100 %
  for (const pos of [0, 10, 100]) {
    const key = `${name}-${mode}-${width}-${pos}`;
    await setPos(page, pos);
    check(key, (numbers[key] = await probe(page)), pos);
  }
  await page.context().close();
}

// mouse: press mid-frame, drag across; a frame per step for the strip
{
  const page = await open(390, query(0, 'dark', 'sage'));
  const frame = page.locator('[data-image-compare-slider]');
  await frame.scrollIntoViewIfNeeded();
  const fb = await frame.boundingBox();
  const y = fb.y + Math.min(fb.height / 2, 300);
  await page.mouse.move(fb.x + fb.width / 2, y);
  await page.mouse.down();
  const strip = [];
  for (const p of [40, 30, 20, 10, 25, 50, 75, 90, 60]) {
    await page.mouse.move(fb.x + (fb.width * p) / 100, y, { steps: 6 });
    await pause(200);
    const v = +(await page.locator('[role="slider"]').getAttribute('aria-valuenow'));
    await frame.screenshot({ path: `${out}/strip-${strip.length}.png` });
    strip.push({ p, v });
  }
  await page.mouse.up();
  numbers.mouse = strip;
  for (const s of strip) if (Math.abs(s.v - s.p) > 1) fails.push(`mouse drag to ${s.p}%: value ${s.v}`);
  await page.context().close();
}

// touch: a sideways swipe moves the handle without scrolling sideways; a vertical swipe scrolls and leaves it
const swipe = async (page, from, to) => {
  const cdp = await page.context().newCDPSession(page);
  const pt = ([x, y]) => [{ x, y, id: 1, radiusX: 4, radiusY: 4, force: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(from) });
  for (let i = 1; i <= 12; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt([from[0] + ((to[0] - from[0]) * i) / 12, from[1] + ((to[1] - from[1]) * i) / 12]) });
    await pause(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await pause(500);
};
{
  const page = await open(390, query(0, 'dark', 'sage'), { touch: true, height: 700 });
  const frame = page.locator('[data-image-compare-slider]');
  await frame.scrollIntoViewIfNeeded();
  let fb = await frame.boundingBox();
  const a = await probe(page);
  const y0 = fb.y + Math.min(fb.height / 2, 250);
  await swipe(page, [fb.x + fb.width / 2, y0], [fb.x + fb.width * 0.2, y0 + 4]);
  const b = await probe(page);
  fb = await frame.boundingBox();
  const y1 = Math.max(fb.y, 0) + 400;
  await swipe(page, [fb.x + fb.width / 2, y1], [fb.x + fb.width / 2 + 4, y1 - 300]);
  const c = await probe(page);
  numbers.touch = {
    start: { value: a.value, scrollX: a.scrollX, scrollY: a.scrollY },
    sideways: { value: b.value, scrollX: b.scrollX, scrollY: b.scrollY, overflowX: b.overflowX },
    vertical: { value: c.value, scrollX: c.scrollX, scrollY: c.scrollY },
  };
  if (!(b.value >= 15 && b.value <= 25)) fails.push(`touch sideways swipe to 20%: value ${b.value}`);
  if (b.scrollX !== 0 || b.overflowX > 0) fails.push(`touch sideways swipe scrolled sideways (${b.scrollX}, overflow ${b.overflowX})`);
  if (!(c.scrollY > b.scrollY + 50)) fails.push(`touch vertical swipe didn't scroll (${b.scrollY} -> ${c.scrollY})`);
  if (Math.abs(c.value - b.value) > 2) fails.push(`touch vertical swipe moved the handle ${b.value} -> ${c.value}`);
  await page.context().close();
}

fs.writeFileSync(`${out}/numbers.json`, JSON.stringify({ numbers, errors, fails }, null, 2));
const img = f => `data:image/png;base64,${fs.readFileSync(`${out}/${f}`).toString('base64')}`;
const sheet = await browser.newPage({ viewport: { width: 2600, height: 400 } });
const cell = (k, w) => `<figure><figcaption>${k}</figcaption><img src="${img(`${k}.png`)}" style="width:${w}px"></figure>`;
await sheet.setContent(`<style>body{margin:0;padding:16px;background:#ddd;font:14px system-ui}.row{display:flex;gap:16px;align-items:flex-start;margin-bottom:16px}figure{margin:0}figcaption{height:24px}img{display:block}</style>
  ${COMBOS.map(([n, , m]) => `<div class="row">${POSITIONS.map(p => cell(`${n}-${m}-390-${p}`, 390)).join('')}${cell(`${n}-${m}-1280-50`, 1280)}</div>`).join('')}`);
await sheet.screenshot({ path: `${out}/composite.png`, fullPage: true });
await sheet.setContent(`<style>body{margin:0;padding:16px;background:#ddd;font:14px system-ui}.row{display:flex;gap:8px}figure{margin:0}figcaption{height:22px}img{display:block;width:180px}</style>
  <div class="row">${numbers.mouse.map((s, i) => `<figure><figcaption>${i + 1}: ${s.v}%</figcaption><img src="${img(`strip-${i}.png`)}"></figure>`).join('')}</div>`);
await sheet.screenshot({ path: `${out}/strip.png`, fullPage: true });
await browser.close();
console.log(`${Object.keys(numbers).length} entries; errors ${errors.length}; fails ${fails.length}${fails.length ? '\n' + fails.join('\n') : ''}`);
if (errors.length || fails.length) process.exitCode = 1;
