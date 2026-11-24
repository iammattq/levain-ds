#!/usr/bin/env node
// T36: the Drawer. Run on the PC through demo/e2e/drawer.sh:
//   node drawer-capture.mjs <base-url> <out>
// Chromium at 390x844 (Playwright's iPhone 14: touch, DPR 3, the iPhone 14's insets faked in, 47 px top and 34 px
// bottom, the bands drawn faintly) and 1024x768 (desktop, no insets), in Sage (theme 0) and Cobalt Mono (theme 7), light
// and dark. For each: closed, a mid-slide series as it opens (Chrome's screencast, every painted frame, four picked
// evenly through the slide and labelled by ms after the tap; the panel's x logged each frame in the page), open, and
// open under Reduce Motion. (Playwright's fake clock left the demo blank, so the slide runs in real time.)
// Measures the panel (box, transform, surface, radius, padding, role
// and name) in each. Then the behaviour, in the browser at 390: focus in, Tab kept inside, Escape and focus back, the
// scrim closes, a short swipe springs back, a long swipe and a flick close, the page doesn't scroll under it; and under
// Reduce Motion it is in place on the first frame and gone on the next.
// Writes <width>-<combo>-<state>.png, numbers.json, behaviour.json and composite.png.
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
const desktop = { viewport: { width: 1024, height: 768 } };
const WIDTHS = [[390, iphone, { top: 47, bottom: 34, left: 0, right: 0 }], [1024, desktop, null]];
const fakeInsets = (page, insets) => page.evaluate(insets => {
  for (const s of document.querySelectorAll('style')) s.textContent = s.textContent.replace(/env\(safe-area-inset-(top|bottom|left|right)(,[^)]*)?\)/g, (_, k) => insets[k] + 'px');
  for (const [k, css] of [['top', 'top:0'], ['bottom', 'bottom:0']]) {
    const band = document.createElement('div');
    band.dataset.fakeInset = k;
    band.style.cssText = `position:fixed;left:0;right:0;${css};height:${insets[k]}px;background:rgba(255,0,80,.18);z-index:2147483647;pointer-events:none`;
    document.documentElement.appendChild(band);
  }
}, insets);

const COMBOS = [['sage', 0, 'light'], ['sage', 0, 'dark'], ['cobalt', 7, 'light'], ['cobalt', 7, 'dark']];
/** How many mid-slide frames to keep (sheetIn is 460 ms) */
const MID = 4;

const probe = page => page.evaluate(() => {
  const d = document.querySelector('[data-drawer]');
  if (!d) return { open: false, bodyOverflow: getComputedStyle(document.body).overflow };
  const o = d.getBoundingClientRect();
  const cs = getComputedStyle(d);
  const body = d.querySelector('[data-drawer-body]');
  const b = getComputedStyle(body);
  const scrim = document.querySelector('[data-sheet-scrim]');
  const t = cs.transform;
  return {
    open: true,
    viewport: { w: innerWidth, h: innerHeight },
    panel: { x: o.x, y: o.y, w: o.width, h: o.height, tx: t === 'none' ? 0 : new DOMMatrix(t).m41, radius: [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].join(' '), bg: cs.backgroundColor, shadow: cs.boxShadow, opacity: +cs.opacity },
    a11y: { role: d.getAttribute('role'), modal: d.getAttribute('aria-modal'), name: d.getAttribute('aria-label') },
    body: { pad: ['Top', 'Right', 'Bottom', 'Left'].map(k => b['padding' + k]).join(' '), gap: b.rowGap, overflowY: b.overflowY },
    scrim: scrim && { bg: getComputedStyle(scrim).backgroundColor, opacity: +getComputedStyle(scrim).opacity },
    bodyOverflow: getComputedStyle(document.body).overflow,
    focusInside: d.contains(document.activeElement),
  };
});

const numbers = {}, errors = [], shots = {};
const page0 = async (ctxOpts, insets, query, key) => {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  page.on('pageerror', e => { errors.push(`${key}: ${e.message}`); console.log(`pageerror ${key}: ${e.message}`); });
  page.on('console', m => { if (m.type() === 'error') console.log(`console ${key}: ${m.text().slice(0, 600)}`); });
  await page.goto(`${base}${query}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  if (insets) await fakeInsets(page, insets);
  return { ctx, page };
};
const shoot = async (page, name) => {
  await page.screenshot({ path: `${out}/${name}.png` });
  numbers[name] = await probe(page);
};

for (const [width, opts, insets] of WIDTHS) {
  for (const [name, theme, mode] of COMBOS) {
    const key = `${width}-${name}-${mode}`;
    shots[key] = [];
    const { ctx, page } = await page0(opts, insets, `?only=drawer&theme=${theme}&mode=${mode}`, key);
    await settled(page);
    await shoot(page, `${key}-closed`); shots[key].push(['closed', `${key}-closed`]);
    // every painted frame while it slides in, and the panel's x each animation frame
    const cdp = await ctx.newCDPSession(page);
    const frames = [];
    cdp.on('Page.screencastFrame', f => { frames.push({ t: f.metadata.timestamp * 1000, data: f.data }); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
    await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
    await pause(300);
    const t0 = await page.evaluate(() => {
      window.__xs = [];
      const t0 = Date.now();
      const log = () => { const d = document.querySelector('[data-drawer]'); if (d) { const t = getComputedStyle(d).transform; window.__xs.push([Date.now() - t0, t === 'none' ? 0 : new DOMMatrix(t).m41]); } if (Date.now() - t0 < 900) requestAnimationFrame(log); };
      document.querySelector('[data-demo="drawer-open"]').click();
      requestAnimationFrame(log);
      return t0;
    });
    await pause(1000);
    await cdp.send('Page.stopScreencast');
    const xs = await page.evaluate(() => window.__xs);
    numbers[`${key}-slide`] = xs;
    // the frames painted mid-slide: after the tap, up to the last logged x under -1 px
    const moving = xs.filter(([, x]) => x < -1);
    const end = moving.length ? moving[moving.length - 1][0] : 0;
    const mid = frames.filter(f => f.t - t0 > 0 && f.t - t0 <= end + 8);
    const pick = mid.length <= MID ? mid : Array.from({ length: MID }, (_, i) => mid[Math.round((i * (mid.length - 1)) / (MID - 1))]);
    for (const f of pick) {
      const ms = Math.round(f.t - t0);
      fs.writeFileSync(`${out}/${key}-mid${ms}.png`, Buffer.from(f.data, 'base64'));
      shots[key].push([`+${ms} ms`, `${key}-mid${ms}`]);
    }
    numbers[`${key}-midFrames`] = { painted: frames.length, mid: mid.length, kept: pick.map(f => Math.round(f.t - t0)) };
    await settled(page);
    await shoot(page, `${key}-open`); shots[key].push(['open', `${key}-open`]);
    await ctx.close();
    // Reduce Motion: open on load
    const r = await page0({ ...opts, reducedMotion: 'reduce' }, insets, `?only=drawer&open=menu&theme=${theme}&mode=${mode}`, `${key} reduce`);
    await r.page.waitForSelector('[data-drawer]');
    await settled(r.page);
    await shoot(r.page, `${key}-reduce`); shots[key].push(['Reduce Motion', `${key}-reduce`]);
    await r.ctx.close();
  }
}

// behaviour, in the browser, at 390 (Sage light)
const behaviour = {};
const isOpen = page => page.locator('[data-drawer]').count().then(n => n > 0);
{
  const ctx = await browser.newContext(iphone);
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`behaviour: ${e.message}`));
  // a tall page, so there is something to lock
  await page.goto(`${base}?theme=0&mode=light`, { waitUntil: 'networkidle' });
  const trigger = page.locator('[data-demo="drawer-open"]');
  await trigger.scrollIntoViewIfNeeded();
  const openIt = async () => { await trigger.click(); await page.waitForSelector('[data-drawer]'); await settled(page); };
  const swipe = async (dx, steps, stepMs) => {
    const p = await page.locator('[data-demo="drawer-version"]').boundingBox();
    const x = p.x + p.width / 2 + 60, y = p.y + p.height / 2;
    await page.mouse.move(x, y); await page.mouse.down();
    for (let i = 1; i <= steps; i++) { await page.mouse.move(x + (dx * i) / steps, y); await pause(stepMs); }
    await page.mouse.up();
    await pause(1200);
  };
  await openIt();
  behaviour.focusMovesIn = await page.evaluate(() => document.activeElement?.hasAttribute('data-drawer'));
  behaviour.name = await page.locator('[data-drawer]').getAttribute('aria-label');
  const count = await page.evaluate(() => document.querySelector('[data-drawer]').querySelectorAll('button, a, input').length);
  let inside = true;
  for (let i = 0; i < count + 3; i++) { await page.keyboard.press('Tab'); inside &&= await page.evaluate(() => !!document.querySelector('[data-drawer]')?.contains(document.activeElement)); }
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Shift+Tab'); inside &&= await page.evaluate(() => !!document.querySelector('[data-drawer]')?.contains(document.activeElement)); }
  behaviour.tabStaysInside = inside;
  const y0 = await page.evaluate(() => scrollY);
  await page.mouse.move(370, 400); await page.mouse.wheel(0, 600); await pause(400);
  behaviour.pageLocked = (await page.evaluate(() => [scrollY, getComputedStyle(document.body).overflow])).join() === `${y0},hidden`;
  await page.keyboard.press('Escape'); await pause(1000);
  behaviour.escapeCloses = !(await isOpen(page));
  behaviour.focusReturns = await page.evaluate(() => document.activeElement?.getAttribute('data-demo') === 'drawer-open');
  behaviour.unlockedAfter = await page.evaluate(() => getComputedStyle(document.body).overflow !== 'hidden');
  await openIt();
  await page.mouse.click(370, 400); await pause(1000);
  behaviour.scrimCloses = !(await isOpen(page));
  await openIt();
  await swipe(-50, 10, 40);
  behaviour.shortSwipeSpringsBack = (await isOpen(page)) && (await page.evaluate(() => { const t = getComputedStyle(document.querySelector('[data-drawer]')).transform; return t === 'none' || new DOMMatrix(t).m41 === 0; }));
  await swipe(-160, 16, 30);
  behaviour.longSwipeCloses = !(await isOpen(page));
  await openIt();
  await swipe(-50, 3, 12);
  behaviour.flickCloses = !(await isOpen(page));
  await ctx.close();
}
{
  // Reduce Motion: in place on the first frame, gone at once on Escape
  const ctx = await browser.newContext({ ...iphone, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${base}?only=drawer&theme=0&mode=light`, { waitUntil: 'networkidle' });
  await page.locator('[data-demo="drawer-open"]').click();
  const frames = [];
  for (let i = 0; i < 6; i++) {
    frames.push(await page.evaluate(() => { const d = document.querySelector('[data-drawer]'); if (!d) return null; const t = getComputedStyle(d).transform; return { tx: t === 'none' ? 0 : new DOMMatrix(t).m41, opacity: +getComputedStyle(d).opacity }; }));
    await pause(30);
  }
  await page.keyboard.press('Escape');
  await pause(80);
  const goneFast = !(await isOpen(page));
  const seen = frames.filter(Boolean);
  behaviour.reduceMotion = { frames: seen, noSlide: seen.length > 0 && seen.every(f => f.tx === 0 && f.opacity === 1), goneWithin80ms: goneFast };
  await ctx.close();
}
const behaves = Object.entries(behaviour).every(([k, v]) => k === 'name' ? v === 'Menu' : k === 'reduceMotion' ? v.noSlide && v.goneWithin80ms : v === true);
fs.writeFileSync(`${out}/behaviour.json`, JSON.stringify({ behaves, behaviour }, null, 2));
console.log(`behaviour ${behaves ? 'OK' : 'FAILED'}: ${JSON.stringify(behaviour)}`);

// the slide really slides: x logged from below 0 rising to 0, never back
const slides = {};
for (const key of Object.keys(shots)) {
  const xs = numbers[`${key}-slide`].map(([, x]) => x);
  slides[key] = { first: Math.round(xs[0]), last: Math.round(xs[xs.length - 1]), frames: xs.length, rising: xs.every((x, i) => i === 0 || x >= xs[i - 1] - 0.5), midShots: numbers[`${key}-midFrames`].kept.length };
}
const slides_ok = Object.values(slides).every(s => s.first < -100 && s.last === 0 && s.rising && s.midShots >= 2);
console.log(`slide ${slides_ok ? 'OK' : 'ODD'}: ${JSON.stringify(slides)}`);

// composite.png: a row per width and combo
const sheet = await browser.newPage({ viewport: { width: 1800, height: 600 } });
const img = f => `data:image/png;base64,${fs.readFileSync(`${out}/${f}.png`).toString('base64')}`;
const rows = Object.entries(shots).map(([key, list]) => `<div class="row"><b>${key.replace(/-/g, ' ')}</b>${list.map(([label, f]) => `<figure><figcaption>${label}</figcaption><img class="${key.startsWith('390') ? 'p' : 'd'}" src="${img(f)}"></figure>`).join('')}</div>`).join('');
await sheet.setContent(`<style>body{margin:0;padding:16px;background:#ccc;font:13px system-ui}.row{display:flex;gap:10px;align-items:flex-start;margin-bottom:14px}.row b{width:90px;flex:none}figure{margin:0}figcaption{height:20px}img{display:block}img.p{width:170px}img.d{width:300px}</style>${rows}`);
await sheet.screenshot({ path: `${out}/composite.png`, fullPage: true });
await browser.close();
fs.writeFileSync(`${out}/numbers.json`, JSON.stringify({ numbers, slides, errors }, null, 2));
if (errors.length) console.log(`errors: ${JSON.stringify(errors)}`);
if (!behaves || !slides_ok || errors.length) process.exitCode = 1;
