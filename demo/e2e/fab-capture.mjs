#!/usr/bin/env node
// T70: FabMenu. Run on the PC through demo/e2e/fab.sh:
//   node fab-capture.mjs <base-url> <out>
// Chromium at 390x844 (Playwright's iPhone 14, the insets faked in) and 1280x800, in Sage (theme 0) and Cobalt Mono
// (theme 7), light and dark, on ?only=fab. For each: closed, mid-open (the morph held at 80 ms, paused, as t259's
// capture holds it), open on the list, on a level (Write to me, a draft typed), mid-close (held at 100 ms), closed again
// (the close settled: data-closing gone, the contents hidden but mounted, the draft still there), and open under Reduce
// Motion (no morph: full size two frames after the press). Then the fill frame by frame, opening (0-460 ms) and closing
// (0-260 ms): every frame's background is the button's cream or the panel's surface, never a blend.
// Every press is a real pointer press (page.mouse), so no focus ring shows on the first row: a ring reads as a selected
// row. One frame opens it by keyboard instead (1280, Sage light: open-keyboard), to show the ring where it belongs.
// Then the live site's menu (mattquinn.ca, .os-menu) at the same widths, closed / mid-open 80 / open / mid-close 100.
// Writes <width>-<combo>-<state>.png, fill-{open,close}-<width>-<combo>.png, site-*.png, numbers.json and composite.png.
// (compare-<width>.png, levain beside the site's and t259's, is joined on the laptop from these and t259's own frames.)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const req = createRequire(path.join(process.env.PW_DIR, 'node_modules/'));
const pw = req('playwright-core');
const [base, out] = process.argv.slice(2);
const site = process.env.SITE_URL ?? 'https://mattquinn.ca/';
fs.mkdirSync(out, { recursive: true });
const pause = ms => new Promise(r => setTimeout(r, ms));
const settled = async page => { await page.evaluate(() => Promise.race([Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming?.().endTime !== Infinity).map(a => a.finished.catch(() => {}))), new Promise(r => setTimeout(r, 3000))])); await pause(500); };

const exe = [process.env.CHROMIUM, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/google-chrome'].find(p => p && fs.existsSync(p));
if (!exe) throw new Error('no Chromium found (set CHROMIUM)');
const browser = await pw.chromium.launch({ executablePath: exe, headless: true });
const iphone = { ...(({ defaultBrowserType, ...d }) => d)(pw.devices['iPhone 14']), viewport: { width: 390, height: 844 } };
const desktop = { viewport: { width: 1280, height: 800 } };
const WIDTHS = [[390, iphone, { top: 47, bottom: 34, left: 0, right: 0 }], [1280, desktop, null]];
const fakeInsets = (page, insets) => page.evaluate(insets => {
  for (const s of document.querySelectorAll('style')) s.textContent = s.textContent.replace(/env\(safe-area-inset-(top|bottom|left|right)(,[^)]*)?\)/g, (_, k) => insets[k] + 'px');
}, insets);
const COMBOS = [['sage', 0, 'light'], ['sage', 0, 'dark'], ['cobalt', 7, 'light'], ['cobalt', 7, 'dark']];
const PANEL = '[data-fab-menu]', TRIGGER = '[data-fab-trigger]';
const CREAM = [245, 233, 207];

/** Holds the transitions inside `scope` at `ms` (paused), two frames after whatever started them (t259's capture). */
const hold = (p, scope, ms) => p.evaluate(async ([scope, ms]) => {
  const frame = () => new Promise(r => requestAnimationFrame(() => r()));
  await frame(); await frame();
  const root = document.querySelector(scope);
  for (const a of document.getAnimations()) if (a.effect?.target && root?.contains(a.effect.target)) { a.pause(); a.currentTime = ms; }
}, [scope, ms]);
/** A real pointer press in the middle of `sel` (page.mouse: pointer events, then the click), as a person's. */
const press = async (p, sel) => {
  const b = await p.evaluate(sel => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
  await p.mouse.click(b.x, b.y);
};
const release = p => p.evaluate(() => { for (const a of document.getAnimations()) if (a.playState === 'paused') a.play(); });
const rgb = s => (s.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
const far = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));

const probe = p => p.evaluate(sel => {
  const el = document.querySelector(sel), r = el.getBoundingClientRect(), cs = getComputedStyle(el);
  const c = el.querySelector('[data-fab-content]'), cc = getComputedStyle(c);
  const draft = el.querySelector('[data-fab-level="write"] textarea');
  return {
    open: el.dataset.open, closing: el.hasAttribute('data-closing'), level: el.dataset.level,
    box: { w: Math.round(r.width), h: Math.round(r.height), right: Math.round(el.offsetParent ? el.offsetParent.getBoundingClientRect().right - r.right : innerWidth - r.right), bottom: Math.round(el.offsetParent ? el.offsetParent.getBoundingClientRect().bottom - r.bottom : innerHeight - r.bottom) },
    radius: cs.borderTopLeftRadius, bg: cs.backgroundColor, contents: { opacity: +cc.opacity, visibility: cc.visibility },
    focus: document.activeElement?.closest('[data-fab-menu]') ? (document.activeElement.dataset.fabItem ?? document.activeElement.tagName.toLowerCase()) : document.activeElement?.tagName.toLowerCase(),
    ring: !!document.activeElement?.matches(':focus-visible') && document.activeElement !== document.body,
    edge: cs.boxShadow.match(/rgba?\([^)]*\) 0px 0px 0px 1px inset/)?.[0] ?? null,
    draft: draft?.value ?? null,
  };
}, PANEL);

const numbers = {}, errors = [], shots = {}, checks = {};
const open = async (opts, insets, query, key) => {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errors.push(`${key}: ${e.message}`); console.log(`pageerror ${key}: ${e.message}`); });
  await page.goto(`${base}${query}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  if (insets) await fakeInsets(page, insets);
  return { ctx, page };
};
/** The stage's bottom-right corner, where the menu lives: up to 440 px wide, the stage's height. */
const corner = p => p.evaluate(() => { const r = document.querySelector('[data-demo="fab-stage"]').getBoundingClientRect(); const w = Math.min(r.width, 440); return { x: Math.round(r.right - w), y: Math.round(r.top), width: Math.round(w), height: Math.round(r.height) }; });

for (const [width, opts, insets] of WIDTHS) {
  for (const [name, theme, mode] of COMBOS) {
    const key = `${width}-${name}-${mode}`;
    shots[key] = [];
    const { ctx, page } = await open(opts, insets, `?only=fab&theme=${theme}&mode=${mode}`, key);
    await settled(page);
    const clip = await corner(page);
    const shoot = async (state, label = state) => { const f = `${key}-${state}`; await page.screenshot({ path: `${out}/${f}.png`, clip }); numbers[f] = await probe(page); shots[key].push([label, f]); };
    await shoot('closed');
    await press(page, TRIGGER); await hold(page, PANEL, 80); await shoot('mid-open', 'mid-open 80ms');
    await release(page); await settled(page); await shoot('open');
    await press(page, '[data-fab-item="write"]'); await settled(page);
    await page.keyboard.type('Half a thought');
    await shoot('level', 'on a level');
    await press(page, TRIGGER); await hold(page, PANEL, 100); await shoot('mid-close', 'mid-close 100ms');
    await release(page); await settled(page); await shoot('closed-again', 'closed again');
    // the fill, frame by frame (from the list: back out of the level first)
    await press(page, TRIGGER); await settled(page);
    await press(page, '[data-fab-level="write"] [data-fab-back]'); await settled(page);
    const openBox = (await probe(page)).box;
    const surface = rgb((await probe(page)).bg);
    await press(page, TRIGGER); await settled(page);
    const steps = async (times, file) => {
      const frames = [];
      const sclip = { x: clip.x + clip.width - openBox.w - 40, y: clip.y + clip.height - openBox.h - 40, width: openBox.w + 40, height: openBox.h + 40 };
      for (const t of times) {
        const f = await page.evaluate(([sel, t]) => {
          const el = document.querySelector(sel);
          for (const a of document.getAnimations()) if (a.effect?.target && el.contains(a.effect.target)) a.currentTime = t;
          return { t, bg: getComputedStyle(el).backgroundColor, w: Math.round(el.getBoundingClientRect().width), op: +getComputedStyle(el.querySelector('[data-fab-content]')).opacity };
        }, [PANEL, t]);
        f.png = (await page.screenshot({ clip: sclip })).toString('base64');
        frames.push(f);
      }
      const sp = await browser.newPage({ viewport: { width: 1600, height: 400 } });
      const cw = Math.round(sclip.width * 0.6), ch = Math.round(sclip.height * 0.6);
      await sp.setContent(`<body style="margin:0;background:#222;color:#eee;font:12px system-ui;display:flex;gap:8px;padding:8px;width:max-content">${frames.map(f =>
        `<figure style="margin:0"><figcaption style="height:34px">${f.t}ms · ${f.w}px<br>contents ${Math.round(f.op * 100)}%</figcaption><img src="data:image/png;base64,${f.png}" style="width:${cw}px;height:${ch}px;display:block"></figure>`).join('')}</body>`);
      await sp.screenshot({ path: `${out}/${file}.png`, fullPage: true });
      await sp.close();
      return frames.map(({ png, ...f }) => ({ ...f, is: far(rgb(f.bg), CREAM) <= 2 ? 'cream' : far(rgb(f.bg), surface) <= 2 ? 'surface' : 'BLEND' }));
    };
    await press(page, TRIGGER); await hold(page, PANEL, 0);
    const opening = await steps([0, 60, 120, 170, 190, 220, 260, 300, 380, 460], `fill-open-${key}`);
    await release(page); await settled(page);
    await press(page, TRIGGER); await hold(page, PANEL, 0);
    const closing = await steps([0, 40, 80, 120, 150, 170, 200, 230, 260], `fill-close-${key}`);
    await release(page); await settled(page);
    numbers[`${key}-fill`] = { surface, opening, closing };
    const after = await probe(page);
    checks[key] = {
      morphs: numbers[`${key}-mid-open`].box.w > 56 && numbers[`${key}-mid-open`].box.w < numbers[`${key}-open`].box.w + 40,
      closedIsCircle: numbers[`${key}-closed`].box.w === 56 && numbers[`${key}-closed`].box.h === 56 && numbers[`${key}-closed`].radius === '28px',
      openFocusIn: numbers[`${key}-open`].focus === 'work',
      noRingOnPointerOpen: !numbers[`${key}-open`].ring,
      edgeEveryState: ['closed', 'mid-open', 'open', 'level', 'mid-close'].every(s => numbers[`${key}-${s}`].edge),
      levelShown: numbers[`${key}-level`].level === 'write',
      closeSettled: !numbers[`${key}-closed-again`].closing && numbers[`${key}-closed-again`].contents.visibility === 'hidden' && !after.closing,
      draftSurvives: numbers[`${key}-closed-again`].draft === 'Half a thought',
      fillNeverBlends: [...opening, ...closing].every(f => f.is !== 'BLEND'),
      fillStepsAt180: opening.filter(f => f.t < 180).every(f => f.is === 'cream') && opening.filter(f => f.t > 180).every(f => f.is === 'surface'),
      fillStepsAt160: closing.filter(f => f.t < 160).every(f => f.is === 'surface') && closing.filter(f => f.t > 160).every(f => f.is === 'cream'),
    };
    if (key === '1280-sage-light') {
      // the one keyboard-opened frame: the ring on the first row, where focus went
      await page.focus(TRIGGER); await page.keyboard.press('Enter'); await settled(page);
      await shoot('open-keyboard', 'open by keyboard');
      checks[key].ringOnKeyboardOpen = numbers[`${key}-open-keyboard`].ring && numbers[`${key}-open-keyboard`].focus === 'work';
    }
    await ctx.close();
    // Reduce Motion: full size two frames after the press, no morph
    const r = await open({ ...opts, reducedMotion: 'reduce' }, insets, `?only=fab&theme=${theme}&mode=${mode}`, `${key} reduce`);
    await settled(r.page);
    await press(r.page, TRIGGER);
    const first = await r.page.evaluate(async sel => { await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return Math.round(document.querySelector(sel).getBoundingClientRect().width); }, PANEL);
    await settled(r.page);
    const f = `${key}-reduce`;
    await r.page.screenshot({ path: `${out}/${f}.png`, clip: await corner(r.page) });
    numbers[f] = { ...(await probe(r.page)), firstFrameWidth: first };
    shots[key].push(['Reduce Motion', f]);
    checks[key].reduceNoMorph = first === numbers[f].box.w;
    await r.ctx.close();
  }
}

// the site's menu, the same frames (light: the site's own theme)
const siteShots = {};
for (const [width, opts] of WIDTHS) {
  const ctx = await browser.newContext(opts);
  const p = await ctx.newPage();
  try {
    await p.goto(site, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await p.locator('.os-menu').waitFor({ timeout: 15000 });
    await pause(1200);
    if ((await p.locator('.os-menu').getAttribute('data-open')) === 'true') { await press(p, '.os-menu-trigger'); await pause(800); }
    const vw = opts.viewport.width, vh = opts.viewport.height, w = Math.min(vw, 440), h = Math.min(vh, 480);
    const clip = { x: vw - w, y: vh - h, width: w, height: h };
    const s = async state => { const f = `site-${width}-${state}`; await p.screenshot({ path: `${out}/${f}.png`, clip }); return f; };
    siteShots[width] = {};
    siteShots[width].closed = await s('closed');
    await press(p, '.os-menu-trigger'); await hold(p, '.os-menu', 80); siteShots[width]['mid-open'] = await s('mid-open');
    await release(p); await pause(900); siteShots[width].open = await s('open');
    await press(p, '.os-menu-trigger'); await hold(p, '.os-menu', 100); siteShots[width]['mid-close'] = await s('mid-close');
    await release(p); await pause(900);
  } catch (e) { console.log(`NOTE site ${width}: no menu (${e.message.split('\n')[0]})`); }
  await ctx.close();
}

const img = f => `data:image/png;base64,${fs.readFileSync(`${out}/${f}.png`).toString('base64')}`;
const sheet = await browser.newPage({ viewport: { width: 1800, height: 600 } });
const css = '<style>body{margin:0;padding:16px;background:#ccc;font:13px system-ui;width:max-content}.row{display:flex;gap:10px;align-items:flex-start;margin-bottom:14px}.row b{width:110px;flex:none}figure{margin:0}figcaption{height:20px}img{display:block;width:220px}</style>';
// composite.png: a row per width and combo
await sheet.setContent(css + Object.entries(shots).map(([key, list]) => `<div class="row"><b>${key.replace(/-/g, ' ')}</b>${list.map(([label, f]) => `<figure><figcaption>${label}</figcaption><img src="${img(f)}"></figure>`).join('')}</div>`).join(''));
await sheet.screenshot({ path: `${out}/composite.png`, fullPage: true });
await browser.close();

const ok = Object.values(checks).every(c => Object.values(c).every(Boolean));
fs.writeFileSync(`${out}/numbers.json`, JSON.stringify({ ok, checks, numbers, errors }, null, 2));
for (const [k, c] of Object.entries(checks)) console.log(`${k}: ${Object.entries(c).filter(([, v]) => !v).map(([n]) => n).join(', ') || 'OK'}`);
if (errors.length) console.log(`errors: ${JSON.stringify(errors)}`);
if (!ok || errors.length) process.exitCode = 1;
