#!/usr/bin/env node
// T5: the demo's ImageCompare section (?only=compare) at 390 and 1280 px, in Sage (theme 0) and Cobalt Mono (theme 7),
// light and dark, at 2x. Run on the PC through demo/e2e/compare.sh:
//   node compare-capture.mjs <base-url> <out>
// Writes <theme>-<mode>-<width>.png (the section), numbers.json (each figure's and image's box, the image's natural
// size, link href/target, and the computed border, radius and background), broken-390.png and broken-1280.png (Target
// answering 404), and look.png (Sage light and Cobalt Mono dark at both widths). Checks, and exits 1 if one fails:
// at 1280 the two side by side, same top, equal width; at 390 stacked, full width; every image at its own aspect ratio
// (rendered w/h = natural w/h); each link opens in a new tab; the broken one shows "Target: <path>" and no image.
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
const WIDTHS = [390, 1280];
const errors = [], fails = [], numbers = {};

const probe = page => page.evaluate(() => {
  const root = document.querySelector('[data-demo="image-compare"]');
  const o = root.getBoundingClientRect();
  const box = el => { const r = el.getBoundingClientRect(); return { x: +(r.x - o.x).toFixed(1), y: +(r.y - o.y).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
  return {
    width: +o.width.toFixed(1),
    figures: [...root.querySelectorAll('figure')].map(f => {
      const img = f.querySelector('img'), a = f.querySelector('a'), cap = f.querySelector('figcaption'), s = img && getComputedStyle(img);
      return {
        figure: box(f), caption: cap?.textContent, fallback: img ? null : f.textContent,
        img: img && { ...box(img), natural: [img.naturalWidth, img.naturalHeight], alt: img.alt, bg: s.backgroundColor, border: `${s.borderTopWidth} ${s.borderTopStyle} ${s.borderTopColor}`, radius: s.borderTopLeftRadius },
        link: a && { href: a.getAttribute('href'), target: a.target, rel: a.rel },
      };
    }),
  };
});

const open = async (width, query, broken) => {
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
  page.on('pageerror', e => errors.push(`${width} ${query}: ${e.message}`));
  if (broken) await page.route('**/image-compare/target.png', r => r.fulfill({ status: 404, body: '' }));
  await page.goto(`${base}?only=compare&${query}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => Promise.all([document.fonts.ready, ...[...document.images].map(i => i.decode().catch(() => {}))]));
  await new Promise(r => setTimeout(r, 400));
  return page;
};

for (const [name, theme, mode] of COMBOS) for (const width of WIDTHS) {
  const key = `${name}-${mode}-${width}`;
  const page = await open(width, `theme=${theme}&mode=${mode}`);
  await page.locator('section').first().screenshot({ path: `${out}/${key}.png` });
  const n = numbers[key] = await probe(page);
  await page.close();
  const [a, b] = n.figures;
  const fail = m => fails.push(`${key}: ${m}`);
  if (n.figures.length !== 2 || !a.img || !b.img) { fail('expected two images'); continue; }
  if (width >= 768) {
    if (a.figure.y !== b.figure.y) fail(`not top-aligned (${a.figure.y} vs ${b.figure.y})`);
    if (Math.abs(a.figure.w - b.figure.w) > 0.5) fail(`unequal widths ${a.figure.w} ${b.figure.w}`);
    if (!(b.figure.x > a.figure.x + a.figure.w)) fail('not side by side');
  } else {
    if (!(b.figure.y >= a.figure.y + a.figure.h)) fail('not stacked');
    if (a.figure.w !== n.width || b.figure.w !== n.width) fail('stacked but not full width');
  }
  for (const f of n.figures) {
    const ratio = f.img.natural[0] / f.img.natural[1], shown = f.img.w / f.img.h;
    if (Math.abs(ratio - shown) > 0.01) fail(`${f.img.alt} aspect ${shown.toFixed(3)} vs natural ${ratio.toFixed(3)}`);
    if (f.link?.target !== '_blank') fail(`${f.img.alt} link target ${f.link?.target}`);
    if (f.caption !== f.img.alt) fail(`caption ${f.caption} vs alt ${f.img.alt}`);
  }
}

for (const width of WIDTHS) {
  const page = await open(width, 'theme=0&mode=light', true);
  await page.locator('section').first().screenshot({ path: `${out}/broken-${width}.png` });
  const n = numbers[`broken-${width}`] = await probe(page);
  await page.close();
  const t = n.figures[1];
  if (t?.img || t?.fallback !== 'Target: image-compare/target.png') fails.push(`broken-${width}: fallback ${JSON.stringify(t)}`);
}

fs.writeFileSync(`${out}/numbers.json`, JSON.stringify({ numbers, errors, fails }, null, 2));
const img = f => `data:image/png;base64,${fs.readFileSync(`${out}/${f}`).toString('base64')}`;
const sheet = await browser.newPage({ viewport: { width: 1600, height: 400 } });
const cell = k => `<figure><figcaption>${k}</figcaption><img src="${img(`${k}.png`)}" style="width:${k.endsWith('390') ? 390 : 1280}px"></figure>`;
await sheet.setContent(`<style>body{margin:0;padding:16px;background:#ddd;font:14px system-ui}.row{display:flex;gap:16px;align-items:flex-start;margin-bottom:16px}figure{margin:0}figcaption{height:24px}img{display:block}</style>
  ${['sage-light', 'cobalt-dark'].map(c => `<div class="row">${cell(`${c}-390`)}${cell(`${c}-1280`)}</div>`).join('')}
  <div class="row">${cell('broken-390')}${cell('broken-1280')}</div>`);
await sheet.screenshot({ path: `${out}/look.png`, fullPage: true });
await browser.close();
console.log(`${Object.keys(numbers).length} shots; errors ${errors.length}; fails ${fails.length}${fails.length ? '\n' + fails.join('\n') : ''}`);
if (errors.length || fails.length) process.exitCode = 1;
