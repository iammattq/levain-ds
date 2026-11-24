#!/usr/bin/env node
// T46: levain's EmptyState beside a copy of the Ringmaster board's empty Your work card. Run on the PC through
// demo/e2e/empty-state.sh:
//   node empty-state-capture.mjs <base-url> <out>
// Chromium at 390x844 (iPhone 14, DPR 3) and 1280x800 (DPR 2), Sage (theme 0) and Cobalt Mono (theme 7), light and
// dark. Per combo, in the browser: the box (from its side's top left), its outline on all four sides, corner, fill,
// shadow, and the text's colour, size, leading, weight, family and its own box, levain's against the board's; levain's
// ARIA (no role, no live region; the action example's icon hidden, its button in the Tab order). Stills per side
// (<key>-<who>.png), results.json and composite.png; exits 1 on a failed check or a page error.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const req = createRequire(path.join(process.env.PW_DIR, 'node_modules/'));
const pw = req('playwright-core');
const [base, out] = process.argv.slice(2);
const pause = ms => new Promise(r => setTimeout(r, ms));
const exe = [process.env.CHROMIUM, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/google-chrome'].find(p => p && fs.existsSync(p));
if (!exe) throw new Error('no Chromium found (set CHROMIUM)');
const browser = await pw.chromium.launch({ executablePath: exe, headless: true });
const iphone = { ...(({ defaultBrowserType, ...d }) => d)(pw.devices['iPhone 14']), viewport: { width: 390, height: 844 } };
const desktop = { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 };
const COMBOS = [['sage', 0, 'light'], ['sage', 0, 'dark'], ['cobalt', 7, 'light'], ['cobalt', 7, 'dark']];
const WIDTHS = { 390: iphone, 1280: desktop };
const WHO = ['board', 'levain', 'levain-action'];
fs.mkdirSync(out, { recursive: true });

const BOX = { board: '[data-demo-empty="board"] [data-empty-stack]', levain: '[data-demo-empty="levain"] [data-empty-state]' };
const results = {}, problems = [], errors = [];
const check = (key, ok, what) => { if (!ok) problems.push(`${key}: ${what}`); return !!ok; };

// the box and its text, measured from its side's top left
const measure = (page, who) => page.evaluate(sel => {
  const el = document.querySelector(sel), o = el.parentElement.getBoundingClientRect(), b = el.getBoundingClientRect(), cs = getComputedStyle(el);
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let t;
  while ((t = walker.nextNode()) && !t.textContent.trim());
  const range = document.createRange();
  range.selectNodeContents(t);
  const tr = range.getBoundingClientRect(), tcs = getComputedStyle(t.parentElement);
  const r = n => +n.toFixed(2);
  return {
    box: { x: r(b.x - o.x), y: r(b.y - o.y), w: r(b.width), h: r(b.height) },
    text: { x: r(tr.x - o.x), y: r(tr.y - o.y), w: r(tr.width), h: r(tr.height), content: t.textContent },
    border: ['Top', 'Right', 'Bottom', 'Left'].map(s => `${cs[`border${s}Width`]} ${cs[`border${s}Style`]} ${cs[`border${s}Color`]}`),
    radius: cs.borderRadius, bg: cs.backgroundColor, bgImage: cs.backgroundImage, shadow: cs.boxShadow,
    color: tcs.color, fontSize: tcs.fontSize, lineHeight: tcs.lineHeight, fontWeight: tcs.fontWeight, fontFamily: tcs.fontFamily,
    role: el.getAttribute('role'), live: el.getAttribute('aria-live'),
  };
}, BOX[who]);

for (const [name, theme, m] of COMBOS) {
  for (const [w, device] of Object.entries(WIDTHS)) {
    const key = `${name}-${m}-${w}`;
    const r = (results[key] = {});
    const ctx = await browser.newContext({ ...device });
    const page = await ctx.newPage();
    page.on('pageerror', e => { errors.push(`${key}: ${e.message}`); console.log(`pageerror ${key}: ${e.message}`); });
    await page.goto(`${base}?only=empty&theme=${theme}&mode=${m}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await pause(300);

    const B = (r.board = await measure(page, 'board')), L = (r.levain = await measure(page, 'levain'));
    let worst = 0;
    for (const part of ['box', 'text']) for (const k of ['x', 'y', 'w', 'h']) worst = Math.max(worst, Math.abs(L[part][k] - B[part][k]));
    r.worstDelta = +worst.toFixed(2);
    check(key, worst <= 0.5, `the box or text differs by ${worst} px from the board's`);
    for (const k of ['radius', 'bg', 'bgImage', 'shadow', 'color', 'fontSize', 'lineHeight', 'fontWeight', 'fontFamily'])
      check(key, L[k] === B[k], `${k} ${L[k]} vs the board's ${B[k]}`);
    check(key, JSON.stringify(L.border) === JSON.stringify(B.border), `outline ${L.border} vs the board's ${B.border}`);
    check(key, L.border.every(s => s.startsWith('1px dashed')), `levain's outline is not 1px dashed on every side: ${L.border}`);
    check(key, B.text.content === L.text.content, 'the message differs');
    check(key, !L.role && !L.live, `levain's box has role ${L.role} / aria-live ${L.live}`);

    // the action example: icon hidden, the button reachable by Tab, icon over message over action
    r.action = await page.evaluate(() => {
      const el = document.querySelector('[data-demo-empty="levain-action"] [data-empty-state]');
      const icon = el.querySelector('[data-empty-state-icon]'), btn = el.querySelector('[data-empty-state-action] button');
      const tops = [icon, el.querySelector('[data-empty-state-message]'), el.querySelector('[data-empty-state-action]')].map(n => n.getBoundingClientRect().top);
      return { iconHidden: icon.getAttribute('aria-hidden'), button: btn?.textContent, tabbable: btn ? btn.tabIndex >= 0 && !btn.disabled : false, stacked: tops[0] < tops[1] && tops[1] < tops[2], h: +el.getBoundingClientRect().height.toFixed(2) };
    });
    check(key, r.action.iconHidden === 'true', 'the icon is not aria-hidden');
    check(key, r.action.button === 'New task' && r.action.tabbable, 'the action button is missing or not tabbable');
    check(key, r.action.stacked, 'icon, message and action are not stacked top to bottom');

    for (const who of WHO) await page.locator(`[data-demo="empty-${who}"]`).screenshot({ path: `${out}/${key}-${who}.png` });
    await ctx.close();
  }
}

fs.writeFileSync(`${out}/results.json`, JSON.stringify({ ok: !problems.length && !errors.length, problems, errors, results }, null, 2));
console.log(problems.length || errors.length ? `FAILED:\n${[...problems, ...errors].join('\n')}` : 'all checks OK');
for (const [k, r] of Object.entries(results)) {
  if (!r.levain || !r.action) { console.log(`${k}: incomplete`); continue; }
  const L = r.levain;
  console.log(`${k}: within ${r.worstDelta} px; box ${L.box.w}x${L.box.h}; ${L.border[0]}; r ${L.radius}; bg ${L.bg}; shadow ${L.shadow}; text ${L.color} ${L.fontSize}/${L.lineHeight} ${L.fontWeight} ${L.fontFamily}; action example ${r.action.h} px tall`);
}

// composite.png: a row per theme and mode: board, levain and levain with an action, at 390 then at 1280
const url = f => (fs.existsSync(`${out}/${f}.png`) ? `data:image/png;base64,${fs.readFileSync(`${out}/${f}.png`).toString('base64')}` : '');
const sheet = await browser.newPage({ viewport: { width: 1900, height: 900 } });
const rows = COMBOS.map(([name, , m]) => {
  const fig = (label, f, wpx) => `<figure><figcaption>${label}</figcaption><img style="width:${wpx}px" src="${url(f)}"></figure>`;
  const k = w => `${name}-${m}-${w}`;
  const col = w => `<div class="col">${WHO.map(who => fig(`${w} · ${who}`, `${k(w)}-${who}`, w === 390 ? 240 : 560)).join('')}</div>`;
  return `<div class="row"><b>${name === 'cobalt' ? 'Cobalt Mono' : 'Sage'} ${m}</b>${col(390)}${col(1280)}</div>`;
}).join('');
await sheet.setContent(`<style>body{margin:0;padding:16px;background:#bbb;font:13px system-ui}.row{display:flex;gap:16px;align-items:flex-start;margin-bottom:20px}.row b{width:90px;flex:none}.col{display:flex;flex-direction:column;gap:8px}figure{margin:0}figcaption{height:18px}img{display:block}</style><p>T46: levain EmptyState beside the board's empty Your work card (a copy), the full width of the row, one compact card tall (9.1875rem). Expected: board and levain identical (results.json: box, text box, outline, corner, fill, shadow, type). Third: levain with an icon and an action, which the board doesn't have.</p>${rows}`);
await sheet.screenshot({ path: `${out}/composite.png`, fullPage: true });
await browser.close();
if (problems.length || errors.length) process.exitCode = 1;
