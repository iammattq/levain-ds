#!/usr/bin/env node
// T37: the scrim behind BottomSheet and Drawer, before and after. Run on the PC through demo/e2e/scrim.sh:
//   node scrim-capture.mjs shoot <base-url> <out> <label>   (label: before | after)
//   node scrim-capture.mjs compare <out>
// shoot: Chromium at 390x844 (Playwright's iPhone 14, DPR 3), Sage (theme 0) and Cobalt Mono (theme 7), light and dark;
// for each panel (the T50 words in a BottomSheet, the Drawer) the page closed, then open on load. Writes
// <label>-<combo>-<panel>-<state>.png, and in <label>.json the scrim's computed colour, the panel's box and colour.
// compare: the page's mean lightness (Rec. 709 luma of sRGB, 0–255) beside the panel, closed and open, and inside the
// panel, from the PNGs; the light shots before and after compared pixel by pixel; composite.png, a row per combo and
// panel: closed, open before, open after. Writes compare.json; exits 1 if light changed or dark doesn't darken.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const req = createRequire(path.join(process.env.PW_DIR, 'node_modules/'));
const pw = req('playwright-core');
const [mode, ...args] = process.argv.slice(2);
const pause = ms => new Promise(r => setTimeout(r, ms));
// finite animations only, and never more than 3 s
const settled = async page => { await page.evaluate(() => Promise.race([Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming?.().endTime !== Infinity).map(a => a.finished.catch(() => {}))), new Promise(r => setTimeout(r, 3000))])); await pause(900); };

const exe = [process.env.CHROMIUM, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/google-chrome'].find(p => p && fs.existsSync(p));
if (!exe) throw new Error('no Chromium found (set CHROMIUM)');
const browser = await pw.chromium.launch({ executablePath: exe, headless: true });
const iphone = { ...(({ defaultBrowserType, ...d }) => d)(pw.devices['iPhone 14']), viewport: { width: 390, height: 844 } };

const COMBOS = [['sage', 0, 'light'], ['sage', 0, 'dark'], ['cobalt', 7, 'light'], ['cobalt', 7, 'dark']];
const PANELS = { sheet: { query: '?only=bottom-sheet', open: '&open=t50', sel: '[data-sheet]' }, drawer: { query: '?only=drawer', open: '&open=menu', sel: '[data-drawer]' } };

if (mode === 'shoot') {
  const [base, out, label] = args;
  fs.mkdirSync(out, { recursive: true });
  const numbers = {}, errors = [];
  for (const [name, theme, m] of COMBOS) {
    for (const [panel, p] of Object.entries(PANELS)) {
      for (const state of ['closed', 'open']) {
        const key = `${name}-${m}-${panel}-${state}`;
        const ctx = await browser.newContext(iphone);
        const page = await ctx.newPage();
        page.on('pageerror', e => { errors.push(`${key}: ${e.message}`); console.log(`pageerror ${key}: ${e.message}`); });
        await page.goto(`${base}${p.query}${state === 'open' ? p.open : ''}&theme=${theme}&mode=${m}`, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        if (state === 'open') await page.waitForSelector(p.sel);
        await settled(page);
        await page.screenshot({ path: `${out}/${label}-${key}.png` });
        numbers[key] = await page.evaluate(sel => {
          const d = document.querySelector(sel), s = document.querySelector('[data-sheet-scrim]');
          const r = d?.getBoundingClientRect();
          return {
            dark: document.documentElement.classList.contains('dark') || document.body.classList.contains('dark'),
            canvas: getComputedStyle(document.body).backgroundColor,
            scrim: s && { bg: getComputedStyle(s).backgroundColor, opacity: +getComputedStyle(s).opacity, className: s.className },
            panel: d && { x: r.x, y: r.y, w: r.width, h: r.height, bg: getComputedStyle(d).backgroundColor, shadow: getComputedStyle(d).boxShadow },
          };
        }, p.sel);
        await ctx.close();
      }
    }
  }
  fs.writeFileSync(`${out}/${label}.json`, JSON.stringify({ numbers, errors }, null, 2));
  await browser.close();
  if (errors.length) process.exitCode = 1;
} else if (mode === 'compare') {
  const [out] = args;
  const nums = l => JSON.parse(fs.readFileSync(`${out}/${l}.json`, 'utf8')).numbers;
  const before = nums('before'), after = nums('after');
  const page = await browser.newPage();
  const url = f => `data:image/png;base64,${fs.readFileSync(`${out}/${f}.png`).toString('base64')}`;
  // mean luma of a CSS-px box of a DPR-3 shot, and how many pixels differ between two shots
  const stats = (a, b, box) => page.evaluate(async ([a, b, box]) => {
    const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
    const pixels = async src => { const i = await load(src); const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.drawImage(i, 0, 0); return { w: i.width, h: i.height, d: g.getImageData(0, 0, i.width, i.height).data }; };
    const A = await pixels(a);
    const luma = box => { const k = A.w / 390; let sum = 0, n = 0; for (let y = Math.round(box.y * k); y < Math.round((box.y + box.h) * k); y++) for (let x = Math.round(box.x * k); x < Math.round((box.x + box.w) * k); x++) { const i = (y * A.w + x) * 4; sum += 0.2126 * A.d[i] + 0.7152 * A.d[i + 1] + 0.0722 * A.d[i + 2]; n++; } return n ? sum / n : null; };
    if (!b) return { luma: luma(box) };
    const B = await pixels(b);
    let diff = 0; for (let i = 0; i < A.d.length; i += 4) if (A.d[i] !== B.d[i] || A.d[i + 1] !== B.d[i + 1] || A.d[i + 2] !== B.d[i + 2]) diff++;
    return { diff, size: [A.w, A.h, B.w, B.h] };
  }, [a, b, box]);
  const result = {}, problems = [];
  for (const [name, , m] of COMBOS) {
    for (const panel of Object.keys(PANELS)) {
      const key = `${name}-${m}-${panel}`;
      const box = after[`${key}-open`].panel;
      // the page beside the panel: above the sheet, right of the drawer (8 px clear of its edge and shadow)
      const beside = panel === 'sheet' ? { x: 0, y: 0, w: 390, h: Math.max(8, box.y - 8) } : { x: box.x + box.w + 8, y: 0, w: 390 - (box.x + box.w + 8), h: 844 };
      const inside = { x: box.x + 16, y: box.y + 40, w: Math.min(box.w - 32, 120), h: 24 };
      const r = { beside, closed: {}, open: {}, panel: {} };
      for (const l of ['before', 'after']) {
        r.closed[l] = (await stats(url(`${l}-${key}-closed`), null, beside)).luma;
        r.open[l] = (await stats(url(`${l}-${key}-open`), null, beside)).luma;
        r.panel[l] = (await stats(url(`${l}-${key}-open`), null, inside)).luma;
      }
      r.scrim = { before: before[`${key}-open`].scrim?.bg, after: after[`${key}-open`].scrim?.bg };
      // how far the panel stands off the page beside it (luma difference)
      r.standOff = { before: r.panel.before - r.open.before, after: r.panel.after - r.open.after };
      if (m === 'light') {
        r.pixelsChanged = {};
        for (const s of ['closed', 'open']) r.pixelsChanged[s] = (await stats(url(`before-${key}-${s}`), url(`after-${key}-${s}`))).diff;
        if (r.pixelsChanged.closed || r.pixelsChanged.open) problems.push(`${key}: light changed ${JSON.stringify(r.pixelsChanged)}`);
      } else {
        if (!(r.open.after < r.closed.after)) problems.push(`${key}: dark doesn't darken (${r.closed.after} → ${r.open.after})`);
        if (!(Math.abs(r.standOff.after) > Math.abs(r.standOff.before))) problems.push(`${key}: the panel stands off less than before`);
      }
      result[key] = r;
    }
  }
  fs.writeFileSync(`${out}/compare.json`, JSON.stringify({ ok: !problems.length, problems, result }, null, 2));
  console.log(`compare ${problems.length ? 'FAILED: ' + problems.join('; ') : 'OK'}`);
  for (const [k, r] of Object.entries(result)) console.log(`${k}: beside closed ${r.closed.after.toFixed(1)}, open before ${r.open.before.toFixed(1)} after ${r.open.after.toFixed(1)}; panel ${r.panel.after.toFixed(1)}${r.pixelsChanged ? `; light pixels changed ${JSON.stringify(r.pixelsChanged)}` : ''}`);

  // composite.png: a row per combo and panel
  const sheet = await browser.newPage({ viewport: { width: 900, height: 600 } });
  const rows = Object.keys(result).map(key => {
    const r = result[key];
    const fig = (label, f) => `<figure><figcaption>${label}</figcaption><img src="${url(f)}"></figure>`;
    return `<div class="row"><b>${key.replace(/-/g, ' ')}</b>${fig('closed', `after-${key}-closed`)}${fig(`open, before (main) · beside ${r.open.before.toFixed(0)}`, `before-${key}-open`)}${fig(`open, after · beside ${r.open.after.toFixed(0)}`, `after-${key}-open`)}<p>page beside the panel, mean luma: closed ${r.closed.after.toFixed(0)}</p></div>`;
  }).join('');
  await sheet.setContent(`<style>body{margin:0;padding:16px;background:#ccc;font:13px system-ui}.row{display:flex;gap:12px;align-items:flex-start;margin-bottom:16px}.row b{width:110px;flex:none}.row p{width:120px;margin:20px 0 0}figure{margin:0}figcaption{height:20px}img{display:block;width:200px}</style>${rows}`);
  await sheet.screenshot({ path: `${out}/composite.png`, fullPage: true });
  await browser.close();
  if (problems.length) process.exitCode = 1;
} else {
  throw new Error('usage: scrim-capture.mjs shoot <base> <out> <label> | compare <out>');
}
