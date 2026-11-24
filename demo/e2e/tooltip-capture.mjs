#!/usr/bin/env node
// T42: levain's Tooltip beside the board's two (a copy, demo/src/tooltipBoard.tsx). Run on the PC through
// demo/e2e/tooltip.sh:   node tooltip-capture.mjs <base-url> <out>
// Chromium at 390x844 (iPhone 14, DPR 3, touch) and 1280x800 (DPR 2, mouse), Sage (theme 0) and Cobalt Mono (theme 7),
// light and dark. For each: the board's stage tooltip open, levain's open, and levain's flipped above a strip pinned to
// the window's foot (opened by a hover at 1280, a tap at 390); at 1280 also Restart PM's pair. Each shot is clipped to
// its trigger and tooltip. In the browser, per combo: the two tooltips' offsets from their triggers, size, fill, shadow,
// text colour and size side by side; and the behaviour, levain's beside the board copy's: at 1280 the hover delay,
// aria-describedby, keyboard focus, Escape, blur, Enter toggling the strip's, a press closing Restart's, focus never
// moving; at 390 a tap toggling the strip's, a tap elsewhere closing it, and a tap on Restart showing nothing.
// Writes <combo>-<width>-<which>.png, results.json and composite.png; exits 1 on a failed check or a page error.
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
fs.mkdirSync(out, { recursive: true });

// the triggers and their tooltips
const TRIG = {
  board: '[data-demo="tooltip-board"] .strip',
  levain: '[data-demo-strip="levain"]',
  flip: '[data-demo-strip="flip"]',
  'restart-board': '[data-demo-restart="board"]',
  'restart-levain': '[data-demo-restart="levain"]',
};
const TIP = {
  board: '.stage-tip[data-stage]',
  levain: '[data-demo-tip="levain"]',
  flip: '[data-demo-tip="flip"]',
  'restart-board': '[data-restart-tip]',
  'restart-levain': '[data-demo-tip="restart"]',
};
const results = {}, problems = [], errors = [];
const check = (key, ok, what) => { if (!ok) problems.push(`${key}: ${what}`); return !!ok; };

for (const [name, theme, m] of COMBOS) {
  for (const [w, device] of Object.entries(WIDTHS)) {
    const key = `${name}-${m}-${w}`;
    const touch = +w === 390;
    const ctx = await browser.newContext(device);
    const page = await ctx.newPage();
    page.on('pageerror', e => { errors.push(`${key}: ${e.message}`); console.log(`pageerror ${key}: ${e.message}`); });
    await page.goto(`${base}?only=tooltip&theme=${theme}&mode=${m}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await pause(400);
    const info = who => page.evaluate(([t, p]) => {
      const box = el => { const b = el.getBoundingClientRect(); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
      const tr = document.querySelector(t), tip = document.querySelector(p), cs = tip && getComputedStyle(tip), a = document.activeElement;
      return {
        trigger: box(tr), tip: tip && box(tip), id: tip?.id ?? null, describedby: tr.getAttribute('aria-describedby'), role: tip?.getAttribute('role') ?? null,
        bg: cs?.backgroundColor, shadow: cs?.boxShadow, radius: cs?.borderRadius, color: cs?.color, font: cs && `${cs.fontSize}/${cs.lineHeight}`, padding: cs?.padding,
        opacity: cs?.opacity, placement: tip?.dataset.placement ?? tip?.dataset.side ?? null, focusInTip: !!tip?.contains(a), focusOnTrigger: a === tr,
      };
    }, [TRIG[who], TIP[who]]);
    const shot = async (who, i) => {
      const pad = 24, x0 = Math.max(0, Math.min(i.trigger.x, i.tip.x) - pad), y0 = Math.max(0, Math.min(i.trigger.y, i.tip.y) - pad);
      const x1 = Math.min(+w, Math.max(i.trigger.x + i.trigger.w, i.tip.x + i.tip.w) + pad), y1 = Math.min(device.viewport.height, Math.max(i.trigger.y + i.trigger.h, i.tip.y + i.tip.h) + pad);
      await page.screenshot({ path: `${out}/${key}-${who}.png`, clip: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } });
    };
    // open by a tap (390) or a hover (1280), then close: a tap elsewhere, or the mouse away
    const open = async who => { if (touch) await page.tap(TRIG[who]); else await page.hover(TRIG[who]); await pause(700); };
    const away = async () => { if (touch) await page.touchscreen.tap(5, 5); else await page.mouse.move(5, 5); await pause(500); };

    // a trigger to 80 px from the window's top, clear of the strip pinned to the foot (the flip's own stays put)
    const toTop = who => (who === 'flip' ? null : page.evaluate(t => { window.scrollBy(0, document.querySelector(t).getBoundingClientRect().top - 80); }, TRIG[who]).then(() => pause(150)));
    const r = (results[key] = { tips: {} });
    const pairs = touch ? ['board', 'levain', 'flip'] : ['board', 'levain', 'flip', 'restart-board', 'restart-levain'];
    for (const who of pairs) {
      await toTop(who);
      await open(who);
      const i = (r.tips[who] = await info(who));
      if (check(key, i.tip, `${who}: no tooltip after the ${touch ? 'tap' : 'hover'}`)) await shot(who, i);
      await away();
      check(key, !(await info(who)).tip, `${who}: still open after ${touch ? 'a tap elsewhere' : 'the mouse left'}`);
    }
    // levain's against the board's: the same offset from the trigger, size, fill, shadow, text
    const compare = (b, l) => {
      const B = r.tips[b], L = r.tips[l];
      if (!B?.tip || !L?.tip) return;
      const d = { x: +(L.tip.x - L.trigger.x - (B.tip.x - B.trigger.x)).toFixed(1), y: +(L.tip.y - L.trigger.y - (B.tip.y - B.trigger.y)).toFixed(1), w: +(L.tip.w - B.tip.w).toFixed(1), h: +(L.tip.h - B.tip.h).toFixed(1) };
      (r.delta ??= {})[l] = d;
      check(key, Object.values(d).every(v => Math.abs(v) <= 1), `${l}: not where the board's is ${JSON.stringify(d)}`);
      // Tailwind's shadow utility leads with empty ring layers (transparent, 0 px): the same shadow, so left out
      const bare = v => v?.replaceAll('rgba(0, 0, 0, 0) 0px 0px 0px 0px, ', '');
      for (const k of ['bg', 'shadow', 'color', 'font', 'padding']) check(key, bare(B[k]) === bare(L[k]), `${l}: ${k} differs (${B[k]} vs ${L[k]})`);
      check(key, L.role === 'tooltip' && L.describedby?.split(' ').includes(L.id), `${l}: role ${L.role}, describedby ${L.describedby}, id ${L.id}`);
      check(key, !L.focusInTip, `${l}: focus went into the tooltip`);
    };
    compare('board', 'levain');
    if (!touch) compare('restart-board', 'restart-levain');
    const fp = r.tips.flip;
    if (fp?.tip) {
      check(key, fp.placement === 'top', `flip placed ${fp.placement}`);
      check(key, fp.tip.y + fp.tip.h <= fp.trigger.y, 'flipped tooltip overlaps its trigger');
    }
    check(key, r.tips.levain?.placement === 'bottom', `levain placed ${r.tips.levain?.placement}`);

    // the behaviour, levain's beside the board copy's (the same steps; the board is the bar)
    const shown = who => page.evaluate(p => !!document.querySelector(p), TIP[who]);
    const state = who => info(who).then(i => ({ open: !!i.tip, describedby: !!i.id && !!i.describedby?.split(' ').includes(i.id), focusOnTrigger: i.focusOnTrigger, focusInTip: i.focusInTip }));
    // Tab from the top of the page until the trigger has focus (keyboard focus, so :focus-visible)
    const tabTo = async who => {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.mouse.click(5, 5);
      for (let i = 0; i < 60; i++) {
        await page.keyboard.press('Tab');
        if (await page.evaluate(t => document.activeElement === document.querySelector(t), TRIG[who])) return true;
      }
      return false;
    };
    r.behaviour = {};
    const strips = touch ? ['levain', 'board'] : ['levain', 'board', 'restart-levain', 'restart-board'];
    for (const who of strips) {
      const beh = (r.behaviour[who] = {});
      await toTop(who);
      if (touch) {
        await page.tap(TRIG[who]); await pause(500);
        beh.tap = await state(who);
        await page.tap(TRIG[who]); await pause(500);
        beh.tapAgain = await state(who);
        await page.tap(TRIG[who]); await pause(300);
        await page.touchscreen.tap(5, 5); await pause(500);
        beh.tapElsewhere = await state(who);
      } else {
        await page.mouse.move(5, 5); await pause(300);
        await page.hover(TRIG[who]); await pause(150);
        beh.hover150 = await shown(who);
        await pause(400);
        beh.hover550 = await state(who);
        await page.mouse.move(5, 5); await pause(400);
        beh.leave = await state(who);
        beh.tabbed = await tabTo(who);
        await pause(60);
        beh.focus = await state(who);
        await page.keyboard.press('Escape'); await pause(400);
        beh.escape = await state(who);
        if (who === 'levain' || who === 'board') {
          await page.keyboard.press('Enter'); await pause(400);
          beh.enter = await state(who);
          await page.keyboard.press('Enter'); await pause(400);
          beh.enterAgain = await state(who);
        }
        await page.keyboard.press('Tab'); await pause(400);
        beh.blur = await state(who);
        if (who.startsWith('restart')) {
          await toTop(who);
          await page.hover(TRIG[who]); await pause(600);
          await page.mouse.down(); await pause(300);
          beh.press = await state(who);
          await page.mouse.up(); await page.mouse.move(5, 5); await pause(300);
        }
      }
    }
    // a tap on Restart PM shows nothing (a control with its own action), the board's and levain's alike
    if (touch) {
      for (const who of ['restart-levain', 'restart-board']) {
        await toTop(who);
        await page.tap(TRIG[who]); await pause(700);
        (r.behaviour[who] = {}).tap = await state(who);
        await page.touchscreen.tap(5, 5); await pause(300);
      }
    }
    const L = r.behaviour.levain, B = r.behaviour.board;
    if (touch) {
      check(key, L.tap.open && L.tap.describedby && !L.tapAgain.open && !L.tapElsewhere.open, `strip by touch: ${JSON.stringify(L)}`);
      check(key, !r.behaviour['restart-levain'].tap.open, 'a tap on Restart showed its tooltip');
    } else {
      check(key, !L.hover150 && L.hover550.open && L.hover550.describedby && !L.leave.open, `hover: ${JSON.stringify({ h150: L.hover150, h550: L.hover550, leave: L.leave })}`);
      check(key, L.focus.open && L.focus.focusOnTrigger && !L.escape.open && L.escape.focusOnTrigger && !L.blur.open, `keyboard: ${JSON.stringify({ focus: L.focus, escape: L.escape, blur: L.blur })}`);
      check(key, L.enter.open && !L.enterAgain.open, `Enter toggles: ${JSON.stringify({ enter: L.enter, again: L.enterAgain })}`);
      const R = r.behaviour['restart-levain'];
      check(key, R.hover550.open && R.focus.open && !R.escape.open && !R.blur.open && !R.press.open, `Restart: ${JSON.stringify(R)}`);
    }
    // each step leaves levain's open or shut as the board's
    for (const who of touch ? ['levain'] : ['levain', 'restart-levain']) {
      const l = r.behaviour[who], b = r.behaviour[who === 'levain' ? 'board' : 'restart-board'];
      for (const k of Object.keys(l)) {
        const lo = typeof l[k] === 'object' ? l[k].open : l[k], bo = typeof b[k] === 'object' ? b[k].open : b[k];
        if (k !== 'tabbed') check(key, lo === bo, `${who} ${k}: levain ${lo ? 'open' : 'shut'}, the board's ${bo ? 'open' : 'shut'}`);
      }
    }
    if (touch) check(key, r.behaviour['restart-levain'].tap.open === r.behaviour['restart-board'].tap.open, 'Restart tap differs from the board');
    await ctx.close();
  }
}

fs.writeFileSync(`${out}/results.json`, JSON.stringify({ ok: !problems.length && !errors.length, problems, errors, results }, null, 2));
console.log(problems.length || errors.length ? `FAILED:\n${[...problems, ...errors].join('\n')}` : 'all checks OK');
for (const [k, r] of Object.entries(results)) console.log(`${k}: delta ${JSON.stringify(r.delta)}; radius board ${r.tips.board?.radius} levain ${r.tips.levain?.radius}; flip ${r.tips.flip?.placement}`);

// composite.png: a row per theme and mode: the board's strip tooltip, levain's, levain's flipped, at 390 and at 1280,
// then Restart PM's pair at 1280
const url = f => (fs.existsSync(`${out}/${f}.png`) ? `data:image/png;base64,${fs.readFileSync(`${out}/${f}.png`).toString('base64')}` : '');
const sheet = await browser.newPage({ viewport: { width: 1800, height: 900 } });
const rows = COMBOS.map(([name, , m]) => {
  const fig = (label, f, wpx) => `<figure><figcaption>${label}</figcaption><img style="width:${wpx}px" src="${url(f)}"></figure>`;
  const k = w => `${name}-${m}-${w}`;
  return `<div class="row"><b>${name === 'cobalt' ? 'Cobalt Mono' : 'Sage'} ${m}</b>${fig('390 · board', `${k(390)}-board`, 150)}${fig('390 · levain', `${k(390)}-levain`, 150)}${fig('390 · levain flipped', `${k(390)}-flip`, 150)}${fig('1280 · board', `${k(1280)}-board`, 190)}${fig('1280 · levain', `${k(1280)}-levain`, 190)}${fig('1280 · flipped', `${k(1280)}-flip`, 190)}${fig('Restart · board', `${k(1280)}-restart-board`, 150)}${fig('Restart · levain', `${k(1280)}-restart-levain`, 150)}</div>`;
}).join('');
await sheet.setContent(`<style>body{margin:0;padding:16px;background:#bbb;font:13px system-ui}.row{display:flex;gap:12px;align-items:flex-start;margin-bottom:16px}.row b{width:90px;flex:none}figure{margin:0}figcaption{height:20px}img{display:block}</style><p>T42: levain Tooltip beside the board's stage-strip and Restart PM tooltips (copies), same triggers. Expected difference: the corner, levain's --radius-lg 8px against the board's 10px (as T39's Popover).</p>${rows}`);
await sheet.screenshot({ path: `${out}/composite.png`, fullPage: true });
await browser.close();
if (problems.length || errors.length) process.exitCode = 1;
