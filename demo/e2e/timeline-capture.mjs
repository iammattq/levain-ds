#!/usr/bin/env node
// T9: the career Timeline before (main's Timeline.tsx) and after (rebuilt on TimelineList), and the new release
// history. Run on the PC through demo/e2e/timeline.sh, which serves "before" then "after" and calls this once for each:
//   node timeline-capture.mjs <base-url> <out> before|after [compare]
// Chromium, 1280x900, ?only=timeline, in Sage (theme 0) and Cobalt Mono (theme 7), light and dark. For each: a shot of
// the career block (animations disabled, so the current dot's pulse is still) and every measured box and colour in it:
// the heading, each company, title and period (by text), each dot and line. "after" also shoots the release history and
// the whole section. With `compare`: compare.json (every measured value, before against after, and the career shots'
// differing pixels) and look.png (before | after | release history, per theme and mode).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const req = createRequire(path.join(process.env.PW_DIR, 'node_modules/'));
const pw = req('playwright-core');
const [base, out, phase, compare] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const pause = ms => new Promise(r => setTimeout(r, ms));

const exe = [process.env.CHROMIUM, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/google-chrome'].find(p => p && fs.existsSync(p));
if (!exe) throw new Error('no Chromium found (set CHROMIUM)');
const browser = await pw.chromium.launch({ executablePath: exe, headless: true });

const COMBOS = [['sage', 0, 'light'], ['sage', 0, 'dark'], ['cobalt', 7, 'light'], ['cobalt', 7, 'dark']];

// boxes relative to the career block, so the page around it can't move them; found by class, as main's has no data-*
const probe = page => page.evaluate(() => {
  const root = document.querySelector('[data-demo="timeline-career"]');
  const o = root.getBoundingClientRect();
  const box = el => { const r = el.getBoundingClientRect(); return { x: r.x - o.x, y: r.y - o.y, w: r.width, h: r.height }; };
  const cs = el => getComputedStyle(el);
  const text = el => ({ text: el.textContent, ...box(el), color: cs(el).color, font: `${cs(el).fontWeight} ${cs(el).fontSize}/${cs(el).lineHeight} ${cs(el).fontFamily}` });
  const leaves = [...root.querySelectorAll('h1,h2,h3,h4,h5,h6,span')].filter(el => el.children.length === 0 && el.textContent.trim());
  return {
    block: { w: o.width, h: o.height },
    texts: leaves.map(text),
    dots: [...root.querySelectorAll('.rounded-full.border-2')].map(d => ({ ...box(d), bg: cs(d).backgroundColor, border: `${cs(d).borderTopWidth} ${cs(d).borderTopColor}`, animation: cs(d).animationName })),
    lines: [...root.querySelectorAll('.w-0\\.5.flex-1')].map(l => ({ ...box(l), bg: cs(l).backgroundColor })),
  };
});

const result = { phase, combos: {} };
const errors = [];
for (const [name, theme, mode] of COMBOS) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', e => errors.push(`${name}-${mode}: ${e.message}`));
  await page.goto(`${base}?only=timeline&theme=${theme}&mode=${mode}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await pause(800);
  const key = `${name}-${mode}`;
  await page.locator('[data-demo="timeline-career"]').screenshot({ path: `${out}/${phase}-${key}-career.png`, animations: 'disabled' });
  if (phase === 'after') {
    await page.locator('[data-demo="timeline-releases"]').screenshot({ path: `${out}/after-${key}-releases.png`, animations: 'disabled' });
    await page.locator('section').first().screenshot({ path: `${out}/after-${key}-section.png`, animations: 'disabled' });
  }
  result.combos[key] = await probe(page);
  await page.close();
}
result.errors = errors;
fs.writeFileSync(`${out}/${phase}.json`, JSON.stringify(result, null, 2));
console.log(`${phase}: ${Object.entries(result.combos).map(([k, c]) => `${k} ${c.texts.length} texts, ${c.dots.length} dots, ${c.lines.length} lines, ${c.block.w}x${c.block.h}`).join('; ')}; errors ${errors.length}`);

if (compare) {
  const before = JSON.parse(fs.readFileSync(`${out}/before.json`, 'utf8'));
  const diffs = [];
  const walk = (a, b, at) => {
    if (a && typeof a === 'object') { for (const k of Object.keys(a)) walk(a[k], b?.[k], `${at}.${k}`); return; }
    if (a !== b) diffs.push({ at, before: a, after: b });
  };
  walk(before.combos, result.combos, '');
  for (const k of Object.keys(result.combos)) {
    const [b, a] = [before.combos[k], result.combos[k]];
    if (b.dots.length !== a.dots.length || b.lines.length !== a.lines.length || b.texts.length !== a.texts.length) diffs.push({ at: k, note: 'element counts differ' });
  }
  // the career shots, pixel against pixel
  const page = await browser.newPage();
  const img = f => `data:image/png;base64,${fs.readFileSync(`${out}/${f}`).toString('base64')}`;
  const pixels = {};
  for (const k of Object.keys(result.combos)) {
    pixels[k] = await page.evaluate(async ([a, b]) => {
      const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      if (ia.width !== ib.width || ia.height !== ib.height) return { sizeBefore: [ia.width, ia.height], sizeAfter: [ib.width, ib.height], differing: -1 };
      const data = i => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const x = c.getContext('2d'); x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height).data; };
      const da = data(ia), db = data(ib);
      let n = 0;
      for (let p = 0; p < da.length; p += 4) if (da[p] !== db[p] || da[p + 1] !== db[p + 1] || da[p + 2] !== db[p + 2] || da[p + 3] !== db[p + 3]) n++;
      return { size: [ia.width, ia.height], differing: n };
    }, [img(`before-${k}-career.png`), img(`after-${k}-career.png`)]);
  }
  await page.close();
  const samePixels = Object.values(pixels).every(p => p.differing === 0);
  fs.writeFileSync(`${out}/compare.json`, JSON.stringify({ same: diffs.length === 0 && samePixels, diffs, pixels }, null, 2));
  console.log(diffs.length || !samePixels ? `DIFFERENT: ${JSON.stringify({ diffs, pixels })}` : `SAME: every measured value and every career pixel matches ${JSON.stringify(pixels)}`);
  const sheet = await browser.newPage({ viewport: { width: 1400, height: 400 } });
  const rows = Object.keys(result.combos).map(k => `<div class="row"><b>${k}</b><figure><figcaption>before (main)</figcaption><img src="${img(`before-${k}-career.png`)}"></figure><figure><figcaption>after (T9)</figcaption><img src="${img(`after-${k}-career.png`)}"></figure><figure><figcaption>release history (new)</figcaption><img src="${img(`after-${k}-releases.png`)}"></figure></div>`).join('');
  await sheet.setContent(`<style>body{margin:0;padding:16px;background:#ddd;font:14px system-ui}.row{display:flex;gap:16px;align-items:flex-start;margin-bottom:16px}.row b{width:100px}figure{margin:0}figcaption{height:24px}img{display:block}</style>${rows}`);
  await sheet.screenshot({ path: `${out}/look.png`, fullPage: true });
  if (diffs.length || !samePixels) process.exitCode = 1;
}
await browser.close();
if (errors.length) process.exitCode = 1;
