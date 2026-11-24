#!/usr/bin/env node
// T10: BottomSheet beside StatusCardDialog's phone sheet. Run on the PC through demo/e2e/bottomsheet.sh:
//   node bottomsheet-capture.mjs <base-url> <out>
// Chromium as Playwright's iPhone 14 (390x844, touch, DPR 3) with the iPhone 14's insets faked in (47 px top, 34 px
// bottom; the bands drawn faintly), in Sage (theme 0) and Cobalt Mono (theme 7), light and dark. For each: the T50
// words in StatusCardDialog (?only=sheet&open=single) and in a plain BottomSheet (?only=bottom-sheet&open=t50), at rest,
// scrolled a little (the hairline) and scrolled to the end, plus the filters sheet. Every measured box, colour and font
// of the sheet's chrome is compared, and the handle strip and the sheet's bottom (scrolled to the end, the same words in
// both) pixel against pixel. The head differs by design: StatusCardDialog's has the number, kind and markers above the
// title. Then the behaviour, in the browser: focus in, Tab kept inside, Escape and focus back, a short drag springs
// back, a long drag and a flick close, the scrim closes; and under Reduce Motion a fade, no rise.
// Writes <combo>-<which>.png, numbers.json, compare.json, behaviour.json and look.png (side by side, per combo).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const req = createRequire(path.join(process.env.PW_DIR, 'node_modules/'));
const pw = req('playwright-core');
const [base, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const pause = ms => new Promise(r => setTimeout(r, ms));
const settled = async page => { await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {})))); await pause(900); };

const exe = [process.env.CHROMIUM, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/google-chrome'].find(p => p && fs.existsSync(p));
if (!exe) throw new Error('no Chromium found (set CHROMIUM)');
const browser = await pw.chromium.launch({ executablePath: exe, headless: true });
const iphone = { ...(({ defaultBrowserType, ...d }) => d)(pw.devices['iPhone 14']), viewport: { width: 390, height: 844 } };
const INSETS = { top: 47, bottom: 34, left: 0, right: 0 };
const fakeInsets = page => page.evaluate(insets => {
  for (const s of document.querySelectorAll('style')) s.textContent = s.textContent.replace(/env\(safe-area-inset-(top|bottom|left|right)(,[^)]*)?\)/g, (_, k) => insets[k] + 'px');
  for (const [k, css] of [['top', 'top:0'], ['bottom', 'bottom:0']]) {
    const band = document.createElement('div');
    band.dataset.fakeInset = k;
    band.style.cssText = `position:fixed;left:0;right:0;${css};height:${insets[k]}px;background:rgba(255,0,80,.18);z-index:2147483647;pointer-events:none`;
    document.documentElement.appendChild(band);
  }
}, INSETS);

const COMBOS = [['sage', 0, 'light'], ['sage', 0, 'dark'], ['cobalt', 7, 'light'], ['cobalt', 7, 'dark']];
const CASES = { dialog: '?only=sheet&open=single', bottom: '?only=bottom-sheet&open=t50', filters: '?only=bottom-sheet&open=filters' };

// the sheet's chrome, relative to the sheet
const probe = page => page.evaluate(() => {
  const s = document.querySelector('[data-sheet]');
  const o = s.getBoundingClientRect();
  const cs = el => getComputedStyle(el);
  const box = el => { const r = el.getBoundingClientRect(); return { x: r.x - o.x, y: r.y - o.y, w: r.width, h: r.height, right: o.right - r.right, bottom: o.bottom - r.bottom }; };
  const pad = el => ['Top', 'Right', 'Bottom', 'Left'].map(k => cs(el)['padding' + k]).join(' ');
  const scrim = document.querySelector('[data-sheet-scrim]');
  const grab = s.querySelector('[data-sheet-grab]');
  const head = s.querySelector('[data-sheet-head]');
  const body = s.querySelector('[data-sheet-body]');
  const bar = s.querySelector('[data-sheet-handle] span');
  const title = head.querySelector('p.type-body-sm');
  const close = head.querySelector('button[aria-label="Close"]');
  return {
    viewport: { w: innerWidth, h: innerHeight },
    sheet: { x: o.x, y: o.y, w: o.width, h: o.height, bottom: innerHeight - o.bottom, radius: cs(s).borderTopLeftRadius, radiusBottom: cs(s).borderBottomLeftRadius, bg: cs(s).backgroundColor, shadow: cs(s).boxShadow, role: s.getAttribute('role'), modal: s.getAttribute('aria-modal'), name: s.getAttribute('aria-label') },
    scrim: { bg: cs(scrim).backgroundColor, opacity: cs(scrim).opacity, ...(r => ({ w: r.width, h: r.height }))(scrim.getBoundingClientRect()) },
    bar: { ...box(bar), bg: cs(bar).backgroundColor, radius: cs(bar).borderTopLeftRadius },
    grab: { pad: pad(grab), touchAction: cs(grab).touchAction },
    head: { ...box(head), pad: pad(head), border: `${cs(head).borderBottomWidth} ${cs(head).borderBottomColor}`, scrolled: head.hasAttribute('data-scrolled') },
    title: { ...box(title), text: title.textContent, color: cs(title).color, font: `${cs(title).fontWeight} ${cs(title).fontSize}/${cs(title).lineHeight} ${cs(title).fontFamily}` },
    close: { ...box(close), color: cs(close).color },
    body: { ...box(body), pad: pad(body), gap: cs(body).rowGap, overflowY: cs(body).overflowY, scrollTop: body.scrollTop, scrollHeight: body.scrollHeight, clientHeight: body.clientHeight },
    focusInSheet: s === document.activeElement || s.contains(document.activeElement),
  };
});
// the head's height and what sits below it move by design: StatusCardDialog's head has two more lines
const BY_DESIGN = /^\.(head\.(h|bottom)|title\.(y|bottom|h)|body\.(y|h|scrollHeight|clientHeight|scrollTop)|sheet\.name|title\.text)$/;

const numbers = {}, errors = [];
const strips = {};
for (const [name, theme, mode] of COMBOS) {
  const key = `${name}-${mode}`;
  for (const [which, query] of Object.entries(CASES)) {
    const ctx = await browser.newContext(iphone);
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(`${key} ${which}: ${e.message}`));
    await page.goto(`${base}${query}&theme=${theme}&mode=${mode}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await fakeInsets(page);
    await page.waitForSelector('[data-sheet]');
    await settled(page);
    await page.screenshot({ path: `${out}/${key}-${which}.png` });
    numbers[`${key}-${which}`] = await probe(page);
    // levain's Checkbox styles with older names (--color-surface-2, --color-border): what they resolve to, and the
    // unchecked box's own colours (T10 review: near-black in light themes)
    if (which === 'filters') numbers[`${key}-checkbox`] = await page.evaluate(() => {
      const v = n => getComputedStyle(document.body).getPropertyValue(n).trim() || '(unset)';
      const boxes = [...document.querySelectorAll('[data-sheet] input[type="checkbox"] + div')];
      const off = boxes.find(b => !b.previousElementSibling.checked);
      const on = boxes.find(b => b.previousElementSibling.checked);
      const cs = el => el && { bg: getComputedStyle(el).backgroundColor, border: getComputedStyle(el).borderTopColor };
      return { '--color-surface-2': v('--color-surface-2'), '--color-border': v('--color-border'), '--color-surface-elevated': v('--color-surface-elevated'), '--color-border-default': v('--color-border-default'), unchecked: cs(off), checked: cs(on), sheetBg: getComputedStyle(document.querySelector('[data-sheet]')).backgroundColor };
    });
    if (which !== 'filters') {
      const s = await page.locator('[data-sheet]').boundingBox();
      const bar = await page.locator('[data-sheet-handle]').boundingBox();
      // the handle strip: the sheet's top edge, its corners and the handle
      strips[`${key}-${which}-top`] = await page.screenshot({ clip: { x: 0, y: s.y, width: 390, height: bar.y + bar.height - s.y + 4 } });
      await page.evaluate(() => { const b = document.querySelector('[data-sheet-body]'); b.scrollTop = 120; b.dispatchEvent(new Event('scroll')); });
      await pause(300);
      await page.screenshot({ path: `${out}/${key}-${which}-scrolled.png` });
      numbers[`${key}-${which}-scrolled`] = await probe(page);
      await page.evaluate(() => { const b = document.querySelector('[data-sheet-body]'); b.scrollTop = b.scrollHeight; b.dispatchEvent(new Event('scroll')); });
      await pause(300);
      await page.screenshot({ path: `${out}/${key}-${which}-end.png` });
      numbers[`${key}-${which}-end`] = await probe(page);
      // the sheet's bottom, scrolled to the end: the same words in both, so the same pixels
      strips[`${key}-${which}-bottom`] = await page.screenshot({ clip: { x: 0, y: s.y + s.height - 220, width: 390, height: 220 } });
    }
    await ctx.close();
  }
}

// compare: every measured value, StatusCardDialog's sheet against BottomSheet's, and the strips pixel against pixel
const diffs = [], byDesign = [];
const walk = (a, b, at, into) => {
  if (a && typeof a === 'object') { for (const k of Object.keys(a)) walk(a[k], b?.[k], `${at}.${k}`, into); return; }
  if (a !== b) (BY_DESIGN.test(at) ? byDesign : diffs).push({ at: into + at, dialog: a, bottom: b });
};
for (const [name, , mode] of COMBOS) for (const suffix of ['', '-scrolled', '-end']) {
  const k = `${name}-${mode}`;
  walk(numbers[`${k}-dialog${suffix}`], numbers[`${k}-bottom${suffix}`], '', `${k}${suffix}`);
}
const cmp = await browser.newPage();
const pixels = {};
for (const k of Object.keys(strips).filter(k => k.includes('-dialog-'))) {
  const other = k.replace('-dialog-', '-bottom-');
  pixels[k.replace('-dialog', '')] = await cmp.evaluate(async ([a, b]) => {
    const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    if (ia.width !== ib.width || ia.height !== ib.height) return { sizes: [[ia.width, ia.height], [ib.width, ib.height]], differing: -1 };
    const data = i => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const x = c.getContext('2d'); x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height).data; };
    const da = data(ia), db = data(ib);
    let n = 0;
    for (let p = 0; p < da.length; p += 4) if (da[p] !== db[p] || da[p + 1] !== db[p + 1] || da[p + 2] !== db[p + 2] || da[p + 3] !== db[p + 3]) n++;
    return { size: [ia.width, ia.height], differing: n };
  }, [k, other].map(s => `data:image/png;base64,${strips[s].toString('base64')}`));
}
await cmp.close();
const same = diffs.length === 0 && Object.values(pixels).every(p => p.differing === 0);
fs.writeFileSync(`${out}/compare.json`, JSON.stringify({ same, diffs, pixels, byDesign }, null, 2));
console.log(same ? `SAME chrome: every measured value (but the head's height and what follows it) and every strip pixel ${JSON.stringify(pixels)}` : `DIFFERENT: ${JSON.stringify({ diffs, pixels })}`);

// behaviour, in the browser, on the filters sheet (Sage light)
const behaviour = {};
const sheetOpen = page => page.locator('[data-sheet]').count().then(n => n > 0);
{
  const ctx = await browser.newContext(iphone);
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`behaviour: ${e.message}`));
  await page.goto(`${base}?only=bottom-sheet&theme=0&mode=light`, { waitUntil: 'networkidle' });
  await fakeInsets(page);
  const trigger = page.locator('[data-demo="bottom-sheet-filters"]');
  const openIt = async () => { await trigger.click(); await page.waitForSelector('[data-sheet]'); await settled(page); };
  const handle = async (dy, steps, stepMs) => {
    const h = await page.locator('[data-sheet-handle]').boundingBox();
    const x = h.x + h.width / 2, y = h.y + h.height / 2;
    await page.mouse.move(x, y); await page.mouse.down();
    for (let i = 1; i <= steps; i++) { await page.mouse.move(x, y + (dy * i) / steps); await pause(stepMs); }
    await page.mouse.up();
    await pause(1200);
  };
  await openIt();
  behaviour.focusMovesIn = await page.evaluate(() => document.activeElement?.hasAttribute('data-sheet'));
  const count = await page.evaluate(() => document.querySelector('[data-sheet]').querySelectorAll('button, input').length);
  let inside = true;
  for (let i = 0; i < count + 3; i++) { await page.keyboard.press('Tab'); inside &&= await page.evaluate(() => !!document.querySelector('[data-sheet]')?.contains(document.activeElement)); }
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Shift+Tab'); inside &&= await page.evaluate(() => !!document.querySelector('[data-sheet]')?.contains(document.activeElement)); }
  behaviour.tabStaysInside = inside;
  behaviour.name = await page.locator('[data-sheet]').getAttribute('aria-label');
  await page.keyboard.press('Escape'); await pause(1000);
  behaviour.escapeCloses = !(await sheetOpen(page));
  behaviour.focusReturns = await page.evaluate(() => document.activeElement?.getAttribute('data-demo') === 'bottom-sheet-filters');
  await openIt();
  await handle(90, 12, 40);
  behaviour.shortDragSpringsBack = (await sheetOpen(page)) && (await page.evaluate(() => { const t = getComputedStyle(document.querySelector('[data-sheet]')).transform; return t === 'none' || new DOMMatrix(t).m42 === 0; }));
  await handle(320, 16, 30);
  behaviour.longDragCloses = !(await sheetOpen(page));
  await openIt();
  await handle(70, 4, 12);
  behaviour.flickCloses = !(await sheetOpen(page));
  await openIt();
  await page.mouse.click(195, 60); await pause(1000);
  behaviour.scrimCloses = !(await sheetOpen(page));
  // the filters fit at 844 px; the T50 words scroll
  await page.locator('[data-demo="bottom-sheet-t50"]').click(); await page.waitForSelector('[data-sheet]'); await settled(page);
  await page.evaluate(() => { const b = document.querySelector('[data-sheet-body]'); b.scrollTop = 60; b.dispatchEvent(new Event('scroll')); });
  await pause(200);
  behaviour.hairlineWhileScrolled = await page.evaluate(() => document.querySelector('[data-sheet-head]').hasAttribute('data-scrolled'));
  await ctx.close();
}
{
  // Reduce Motion: no rise, a fade
  const ctx = await browser.newContext({ ...iphone, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${base}?only=bottom-sheet&theme=0&mode=light`, { waitUntil: 'networkidle' });
  await page.locator('[data-demo="bottom-sheet-filters"]').click();
  const frames = [];
  for (let i = 0; i < 8; i++) {
    frames.push(await page.evaluate(() => { const s = document.querySelector('[data-sheet]'); if (!s) return null; const t = getComputedStyle(s).transform; return { ty: t === 'none' ? 0 : new DOMMatrix(t).m42, opacity: +getComputedStyle(s).opacity }; }));
    await pause(30);
  }
  const seen = frames.filter(Boolean);
  behaviour.reduceMotion = { frames: seen, noRise: seen.every(f => f.ty === 0), fades: seen.some(f => f.opacity < 1) && seen[seen.length - 1].opacity > seen[0].opacity };
  await ctx.close();
}
const behaves = Object.entries(behaviour).every(([k, v]) => k === 'name' ? v === 'Filters' : k === 'reduceMotion' ? v.noRise && v.fades : v === true);
fs.writeFileSync(`${out}/behaviour.json`, JSON.stringify({ behaves, behaviour }, null, 2));
console.log(`behaviour ${behaves ? 'OK' : 'FAILED'}: ${JSON.stringify(behaviour)}`);

// look.png: per combo, StatusCardDialog's sheet beside BottomSheet's (at rest, scrolled, at the end), and the filters
const sheet = await browser.newPage({ viewport: { width: 1700, height: 600 } });
const img = f => `data:image/png;base64,${fs.readFileSync(`${out}/${f}`).toString('base64')}`;
const cols = [['dialog', 'StatusCardDialog'], ['bottom', 'BottomSheet'], ['dialog-scrolled', 'StatusCardDialog, scrolled'], ['bottom-scrolled', 'BottomSheet, scrolled'], ['dialog-end', 'StatusCardDialog, end'], ['bottom-end', 'BottomSheet, end'], ['filters', 'BottomSheet: filters']];
const rows = COMBOS.map(([n, , m]) => `<div class="row"><b>${n} ${m}</b>${cols.map(([c, label]) => `<figure><figcaption>${label}</figcaption><img src="${img(`${n}-${m}-${c}.png`)}"></figure>`).join('')}</div>`).join('');
await sheet.setContent(`<style>body{margin:0;padding:16px;background:#ccc;font:13px system-ui}.row{display:flex;gap:12px;align-items:flex-start;margin-bottom:16px}.row b{width:80px}figure{margin:0}figcaption{height:22px}img{display:block;width:210px}</style>${rows}`);
await sheet.screenshot({ path: `${out}/look.png`, fullPage: true });
await browser.close();
fs.writeFileSync(`${out}/numbers.json`, JSON.stringify({ numbers, errors }, null, 2));
for (const [k, v] of Object.entries(numbers)) if (k.endsWith('-checkbox')) console.log(`${k}: ${JSON.stringify(v)}`);
if (errors.length) console.log(`errors: ${JSON.stringify(errors)}`);
if (!same || !behaves || errors.length) process.exitCode = 1;
