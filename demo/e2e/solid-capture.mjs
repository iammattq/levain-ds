#!/usr/bin/env node
// T63: the image viewer's backdrop, before and after (solid). Run on the PC through demo/e2e/solid.sh:
//   node solid-capture.mjs shoot <base-url> <out> <label>   (label: before | after)
//   node solid-capture.mjs compare <out>
// shoot: the demo's ImageViewer section (?only=viewer) at 390 x 844 (touch, 3x) and 1280 x 800 (2x), Sage (theme 0) and
// Cobalt Mono (theme 7), light and dark; T61's frames, zoomed by the + key at both widths:
//   single-rest, single-zoom, pair-rest, pair-zoom, dialog-single-zoom (the viewer over the open blur Modal),
//   dialog-pair-rest; and modal-dark (Modal scrim="dark" on its own, the page behind it).
// Writes <theme>-<mode>-<width>-<frame>-<label>.png and <label>.json: each frame's scrim (kind, computed background,
// backdrop-filter). compare: from the PNGs, in the browser, the margin (x 2-10 px the whole height, and y 2-14 px up to
// 64 px short of the right edge, where the ✕ sits: scrim only, outside the 16 px inset and a dialog card's padding) as
// its spread of luma (max - min, 0-255): 0 means nothing of the page shows there. Checks, exit 1 on a failure: after, every viewer frame's scrim is `solid`, fully opaque, no backdrop-filter, and
// its margin spread is 0; modal-dark is `dark` at 90 % before and after, and its pixels are unchanged. compare.json and
// composite.png: a row per combo and width, each frame before | after.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const { chromium } = createRequire(path.join(process.env.PW_DIR, 'node_modules/'))('playwright-core');
const [cmd, ...args] = process.argv.slice(2);
const exe = [process.env.CHROMIUM, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/google-chrome'].find(p => p && fs.existsSync(p));
if (!exe) throw new Error('no Chromium found (set CHROMIUM)');
const browser = await chromium.launch({ executablePath: exe, headless: true });
const COMBOS = [['sage', 0, 'light'], ['sage', 0, 'dark'], ['cobalt', 7, 'light'], ['cobalt', 7, 'dark']];
const SIZES = { 390: { width: 390, height: 844, scale: 3, touch: true }, 1280: { width: 1280, height: 800, scale: 2, touch: false } };
const FRAMES = ['single-rest', 'single-zoom', 'pair-rest', 'pair-zoom', 'dialog-single-zoom', 'dialog-pair-rest', 'modal-dark'];
const KEYS = COMBOS.flatMap(([n, , m]) => [390, 1280].map(s => `${n}-${m}-${s}`));
const wait = ms => new Promise(r => setTimeout(r, ms));

/** The top scrim and whether a viewer is open. */
const probe = page => page.evaluate(() => {
  const all = document.querySelectorAll('[data-modal-scrim]'), scrim = all[all.length - 1];
  const cs = scrim && getComputedStyle(scrim);
  const v = document.querySelectorAll('[data-image-viewer]');
  return {
    viewer: v.length > 0,
    zoom: v.length ? +v[v.length - 1].dataset.zoom : null,
    scrim: scrim && { kind: scrim.dataset.modalScrim, bg: cs.backgroundColor, backdrop: cs.backdropFilter, opacity: cs.opacity },
    dialogs: [...document.querySelectorAll('[role="dialog"]')].map(d => d.getAttribute('aria-label') || d.querySelector('h1,h2,h3,h4')?.textContent || ''),
  };
});

async function shoot(base, out, label) {
  fs.mkdirSync(out, { recursive: true });
  const numbers = {}, errors = [], fails = [];
  for (const [name, theme, mode] of COMBOS) for (const size of [390, 1280]) {
    const key = `${name}-${mode}-${size}`;
    const s = SIZES[size];
    const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height }, deviceScaleFactor: s.scale, hasTouch: s.touch, isMobile: s.touch });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(`${key}: ${e.message}`));
    await page.goto(`${base}?only=viewer&theme=${theme}&mode=${mode}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => Promise.all([document.fonts.ready, ...[...document.images].map(i => i.decode().catch(() => {}))]));
    await wait(300);
    const shot = async frame => {
      await wait(500); // the fade and an eased zoom settle
      await page.screenshot({ path: `${out}/${key}-${frame}-${label}.png` });
      const n = (numbers[`${key}-${frame}`] = await probe(page));
      if (frame !== 'modal-dark' && !n.viewer) fails.push(`${key}-${frame}: viewer not open`);
      if (frame.includes('zoom') && !(n.zoom > 1)) fails.push(`${key}-${frame}: not zoomed (${n.zoom})`);
    };
    const thumb = (l, inDialog) => page.locator(`${inDialog ? '[role="dialog"] ' : ''}[data-viewer-thumb="${l}"]`).first();
    const zoom = async () => { await page.keyboard.press('+'); await page.keyboard.press('+'); };
    const close = async () => { await page.keyboard.press('Escape'); await wait(500); };

    await thumb('This build').click();
    await shot('single-rest');
    await zoom();
    await shot('single-zoom');
    await close();
    await thumb('Before and after').click();
    await shot('pair-rest');
    await zoom();
    await shot('pair-zoom');
    await close();
    await page.locator('[data-viewer-dialog-open]').click();
    await wait(500);
    await thumb('This build', true).click();
    await wait(300);
    await zoom();
    await shot('dialog-single-zoom');
    await close();
    await thumb('Before and after', true).click();
    await shot('dialog-pair-rest');
    await close();
    await close();
    await page.locator('[data-viewer-dark-open]').click();
    await shot('modal-dark');
    await ctx.close();
  }
  fs.writeFileSync(`${out}/${label}.json`, JSON.stringify({ numbers, errors, fails }, null, 2));
  console.log(`${label}: ${Object.keys(numbers).length} frames; errors ${errors.length}; fails ${fails.length}${fails.length ? '\n' + fails.join('\n') : ''}`);
  if (errors.length || fails.length) process.exitCode = 1;
}

async function compare(out) {
  const before = JSON.parse(fs.readFileSync(`${out}/before.json`)).numbers, after = JSON.parse(fs.readFileSync(`${out}/after.json`)).numbers;
  const page = await browser.newPage();
  const url = f => `data:image/png;base64,${fs.readFileSync(`${out}/${f}`).toString('base64')}`;
  /** The margin's luma spread, and (for modal-dark) how many pixels differ between before and after. */
  const measure = (a, b) => page.evaluate(async ([a, b]) => {
    const load = async src => { const i = new Image(); i.src = src; await i.decode(); const c = new OffscreenCanvas(i.width, i.height); const x = c.getContext('2d'); x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height); };
    const [A, B] = await Promise.all([load(a), load(b)]);
    const dpr = A.width > 2000 ? 2 : 3, W = A.width / dpr;
    // the left column (x 2-10) the whole height, and the top band (y 2-14) from the left to 64 px short of the ✕
    const inBand = (x, y) => (x >= 2 && x < 10) || (y >= 2 && y < 14 && x >= 2 && x < W - 64);
    const spread = d => { let lo = 255, hi = 0; for (let y = 0; y < d.height; y++) for (let x = 0; x < d.width; x++) { if (!inBand(x / dpr, y / dpr)) continue; const i = (y * d.width + x) * 4, l = 0.2126 * d.data[i] + 0.7152 * d.data[i + 1] + 0.0722 * d.data[i + 2]; lo = Math.min(lo, l); hi = Math.max(hi, l); } return +(hi - lo).toFixed(1); };
    let diff = 0; for (let i = 0; i < A.data.length; i += 4) if (A.data[i] !== B.data[i] || A.data[i + 1] !== B.data[i + 1] || A.data[i + 2] !== B.data[i + 2]) diff++;
    return { before: spread(A), after: spread(B), diffPx: diff };
  }, [url(a), url(b)]);
  const alpha = bg => { const m = bg?.match(/rgba?\(([^)]+)\)/); const p = m ? m[1].split(/[ ,/]+/).filter(Boolean) : []; return p.length > 3 ? +p[3] : 1; };
  const results = {}, fails = [];
  for (const key of KEYS) for (const frame of FRAMES) {
    const k = `${key}-${frame}`, b = before[k], a = after[k];
    const m = (results[k] = { ...(await measure(`${k}-before.png`, `${k}-after.png`)), scrim: { before: b.scrim, after: a.scrim } });
    if (frame === 'modal-dark') {
      for (const [l, n] of [['before', b], ['after', a]]) if (n.scrim?.kind !== 'dark' || Math.abs(alpha(n.scrim.bg) - 0.9) > 0.01) fails.push(`${k}: ${l} scrim ${JSON.stringify(n.scrim)}`);
      if (m.diffPx) fails.push(`${k}: ${m.diffPx} pixels changed`);
    } else {
      if (a.scrim?.kind !== 'solid' || alpha(a.scrim.bg) !== 1 || a.scrim.backdrop !== 'none') fails.push(`${k}: after scrim ${JSON.stringify(a.scrim)}`);
      if (m.after !== 0) fails.push(`${k}: the page shows in the margin after (spread ${m.after})`);
    }
  }
  fs.writeFileSync(`${out}/compare.json`, JSON.stringify({ results, fails }, null, 2));
  const sheet = await browser.newPage({ viewport: { width: 1800, height: 400 } });
  const cell = (k, w) => `<figure><figcaption>${k}</figcaption><div class="pair"><img src="${url(`${k}-before.png`)}" style="width:${w}px"><img src="${url(`${k}-after.png`)}" style="width:${w}px"></div></figure>`;
  const rows = KEYS.map(key => {
    const w = key.endsWith('-390') ? 120 : 400, per = key.endsWith('-390') ? 7 : 2;
    const out = [];
    for (let i = 0; i < FRAMES.length; i += per) out.push(`<div class="row">${FRAMES.slice(i, i + per).map(f => cell(`${key}-${f}`, w)).join('')}</div>`);
    return out.join('');
  });
  await sheet.setContent(`<style>body{margin:0;padding:16px;background:#ddd;font:13px system-ui}.row{display:flex;gap:16px;align-items:flex-start;margin-bottom:12px}figure{margin:0}figcaption{height:20px}.pair{display:flex;gap:4px}img{display:block}</style><p>Each frame: before (main) | after (T63)</p>${rows.join('')}`);
  await sheet.screenshot({ path: `${out}/composite.png`, fullPage: true });
  console.log(`compare: ${Object.keys(results).length} pairs; fails ${fails.length}${fails.length ? '\n' + fails.join('\n') : ''}`);
  if (fails.length) process.exitCode = 1;
}

if (cmd === 'shoot') await shoot(...args);
else if (cmd === 'compare') await compare(...args);
else throw new Error('usage: solid-capture.mjs shoot <base-url> <out> <label> | compare <out>');
await browser.close();
