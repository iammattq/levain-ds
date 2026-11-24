#!/usr/bin/env node
// T12: the phone sheet's safe-area padding before and after it moved to shared.css's utilities. Run on the PC through
// demo/e2e/safe.sh, which serves "before" then "after" and calls this once for each:
//   node safe-capture.mjs <base-url> <out> before|after [compare]
// The phone is Playwright's iPhone 14 (390x844, touch, DPR 3), Chromium, Sage light, with viewport-fit=cover in the
// viewport meta. No headless engine has a notch, so (as T24's sheet-capture.mjs) every env(safe-area-inset-*) in the
// page's stylesheets is rewritten to an inset in px and the top and bottom bands are drawn faintly in pink.
// Two passes: the iPhone 14's portrait insets (47 top, 34 bottom) for the shots, and lopsided ones on all four sides
// (47, 16, 34, 12) so the side padding is measured too. Writes <phase>-rest.png, <phase>-end.png, <phase>.json; with
// `compare`, compare.json (every measured value, before against after) and look.png (before | after, rest and end).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const req = createRequire(path.join(process.env.PW_DIR, 'node_modules/'));
const pw = req('playwright-core');
const [base, out, phase, compare] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const pause = ms => new Promise(r => setTimeout(r, ms));
const settled = async page => { await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {})))); await pause(700); };

const exe = [process.env.CHROMIUM, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/google-chrome'].find(p => p && fs.existsSync(p));
if (!exe) throw new Error('no Chromium found (set CHROMIUM)');
const browser = await pw.chromium.launch({ executablePath: exe, headless: true });
const iphone = { ...(({ defaultBrowserType, ...d }) => d)(pw.devices['iPhone 14']), viewport: { width: 390, height: 844 } };

const PORTRAIT = { top: 47, right: 0, bottom: 34, left: 0 };
const LOPSIDED = { top: 47, right: 16, bottom: 34, left: 12 };

const fakeInsets = (page, insets) => page.evaluate(insets => {
  const meta = document.querySelector('meta[name="viewport"]');
  if (meta && !meta.content.includes('viewport-fit')) meta.content += ', viewport-fit=cover';
  for (const s of document.querySelectorAll('style')) s.textContent = s.textContent.replace(/env\(safe-area-inset-(top|bottom|left|right)(,[^)]*)?\)/g, (_, k) => insets[k] + 'px');
  for (const k of ['top', 'bottom']) {
    const band = document.createElement('div');
    band.style.cssText = `position:fixed;left:0;right:0;${k}:0;height:${insets[k]}px;background:rgba(255,0,80,.18);z-index:2147483647;pointer-events:none`;
    document.documentElement.appendChild(band);
  }
}, insets);

// the sheet's box and every padding the safe area feeds, as the browser computed them
const probe = page => page.evaluate(() => {
  const sheet = document.querySelector('[data-sheet][role="dialog"]');
  const grab = sheet.querySelector('[data-sheet-grab]');
  const body = sheet.querySelector('[data-sheet-body]');
  const cs = el => getComputedStyle(el);
  const r = sheet.getBoundingClientRect();
  return {
    viewportMeta: document.querySelector('meta[name="viewport"]')?.content,
    sheet: { top: r.top, height: r.height, maxHeight: cs(sheet).maxHeight },
    head: { paddingLeft: cs(grab).paddingLeft, paddingRight: cs(grab).paddingRight },
    body: { paddingTop: cs(body).paddingTop, paddingBottom: cs(body).paddingBottom, paddingLeft: cs(body).paddingLeft, paddingRight: cs(body).paddingRight },
    bodyClass: body.className,
    headClass: grab.className,
  };
});

const open = async (insets, shots) => {
  const ctx = await browser.newContext(iphone);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '?theme=0&mode=light&only=sheet', { waitUntil: 'networkidle' });
  await pause(600);
  await fakeInsets(page, insets);
  await page.getByText('T50: restart words that fit').first().click(); await pause(900); await settled(page);
  if (shots) await page.screenshot({ path: `${out}/${phase}-rest.png` });
  const rest = await probe(page);
  // to the end of the body: the last field against the home bar
  const end = await page.evaluate(() => {
    const body = document.querySelector('[data-sheet-body]');
    body.scrollTop = body.scrollHeight;
    const last = [...body.children].pop().getBoundingClientRect();
    return { lastBottom: last.bottom, gapToViewportBottom: innerHeight - last.bottom };
  });
  await pause(400);
  if (shots) await page.screenshot({ path: `${out}/${phase}-end.png` });
  await ctx.close();
  return { insets, rest, end, errors };
};

const result = { phase, portrait: await open(PORTRAIT, true), lopsided: await open(LOPSIDED, false) };
fs.writeFileSync(`${out}/${phase}.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));

if (compare) {
  const before = JSON.parse(fs.readFileSync(`${out}/before.json`, 'utf8'));
  const diffs = [];
  const walk = (a, b, at) => {
    if (a && typeof a === 'object') { for (const k of Object.keys(a)) walk(a[k], b?.[k], `${at}.${k}`); return; }
    if (/Class$|phase$/.test(at)) return; // the class names are meant to differ
    if (a !== b) diffs.push({ at, before: a, after: b });
  };
  walk(before, result, '');
  fs.writeFileSync(`${out}/compare.json`, JSON.stringify({ same: diffs.length === 0, diffs }, null, 2));
  console.log(diffs.length ? `DIFFERENT: ${JSON.stringify(diffs)}` : 'SAME: every measured value matches');
  // before | after, at rest and at the end of the scroll
  const page = await browser.newPage({ viewport: { width: 4 * 390 + 5 * 16, height: 844 + 72 } });
  const img = f => `data:image/png;base64,${fs.readFileSync(`${out}/${f}`).toString('base64')}`;
  const cell = (f, label) => `<figure><figcaption>${label}</figcaption><img src="${img(f)}"></figure>`;
  await page.setContent(`<style>body{margin:0;padding:16px;display:flex;gap:16px;background:#ddd;font:14px system-ui}figure{margin:0}figcaption{height:32px}img{width:390px;height:844px;display:block}</style>
    ${cell('before-rest.png', 'before (main): rest')}${cell('after-rest.png', 'after (T12): rest')}${cell('before-end.png', 'before: end of scroll')}${cell('after-end.png', 'after: end of scroll')}`);
  await page.screenshot({ path: `${out}/look.png` });
  if (diffs.length) process.exitCode = 1;
}
await browser.close();
if (result.portrait.errors.length || result.lopsided.errors.length) process.exitCode = 1;
