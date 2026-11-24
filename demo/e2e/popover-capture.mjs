#!/usr/bin/env node
// T39: levain's Popover beside the board's HeadPopover (a copy). Run on the PC through demo/e2e/popover.sh:
//   node popover-capture.mjs <base-url> <out>
// Chromium at 390x844 (iPhone 14, DPR 3) and 1280x800 (DPR 2), Sage (theme 0) and Cobalt Mono (theme 7), light and
// dark. For each: the board's panel open, levain's open, and levain's flipped above a trigger pinned to the bottom, each
// shot clipped to its head and panel. In the browser, per combo: the two panels' boxes, fill and shadow side by side,
// and levain's behaviour (aria-expanded/controls, focus in, Escape, a press outside, Tab out, focus back on the trigger).
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

const trig = who => (who === 'board' ? '[data-demo="popover-board"] .pool-button' : `[data-demo-trigger="${who}"]`);
const panelSel = who => (who === 'board' ? '[data-pool-menu]' : '[data-popover]');
const results = {}, problems = [], errors = [];
const check = (key, ok, what) => { if (!ok) problems.push(`${key}: ${what}`); return !!ok; };

for (const [name, theme, m] of COMBOS) {
  for (const [w, device] of Object.entries(WIDTHS)) {
    const key = `${name}-${m}-${w}`;
    const ctx = await browser.newContext(device);
    const page = await ctx.newPage();
    page.on('pageerror', e => { errors.push(`${key}: ${e.message}`); console.log(`pageerror ${key}: ${e.message}`); });
    await page.goto(`${base}?only=popover&theme=${theme}&mode=${m}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await pause(400);
    const r = (results[key] = { panels: {} });
    for (const who of ['board', 'levain', 'flip']) {
      await page.click(trig(who));
      await pause(1200);
      const info = await page.evaluate(([t, p]) => {
        const box = el => { const b = el.getBoundingClientRect(); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
        const tr = document.querySelector(t), pa = document.querySelector(p), cs = pa && getComputedStyle(pa);
        return { trigger: box(tr), panel: pa && box(pa), bg: cs?.backgroundColor, shadow: cs?.boxShadow, radius: cs?.borderRadius, placement: pa?.dataset.placement ?? null };
      }, [trig(who), panelSel(who)]);
      r.panels[who] = info;
      if (info.panel) {
        const pad = 24, x0 = Math.max(0, Math.min(info.trigger.x, info.panel.x) - pad - 120), y0 = Math.max(0, Math.min(info.trigger.y, info.panel.y) - pad);
        const x1 = Math.min(+w, Math.max(info.trigger.x + info.trigger.w, info.panel.x + info.panel.w) + pad), y1 = Math.max(info.trigger.y + info.trigger.h, info.panel.y + info.panel.h) + pad;
        await page.screenshot({ path: `${out}/${key}-${who}.png`, clip: { x: x0, y: y0, width: x1 - x0, height: Math.min(y1, device.viewport.height) - y0 } });
      } else check(key, false, `${who}: no panel after the click`);
      // close it: Escape (the board copy and levain alike), then wait for the collapse
      await page.keyboard.press('Escape');
      await pause(700);
    }
    const b = r.panels.board.panel, l = r.panels.levain.panel;
    if (b && l) {
      r.delta = { x: +(l.x - b.x).toFixed(1), y: +(l.y - b.y - (r.panels.levain.trigger.y - r.panels.board.trigger.y)).toFixed(1), w: +(l.w - b.w).toFixed(1), h: +(l.h - b.h).toFixed(1) };
      check(key, Math.abs(r.delta.x) <= 1 && Math.abs(r.delta.y) <= 1 && Math.abs(r.delta.w) <= 1 && Math.abs(r.delta.h) <= 1, `levain's panel isn't where the board's is ${JSON.stringify(r.delta)}`);
      check(key, r.panels.board.bg === r.panels.levain.bg, `fill differs (${r.panels.board.bg} vs ${r.panels.levain.bg})`);
    }
    check(key, r.panels.levain.placement === 'bottom', `levain placed ${r.panels.levain.placement}`);
    check(key, r.panels.flip.placement === 'top', `flip placed ${r.panels.flip.placement}`);
    const fp = r.panels.flip;
    if (fp.panel) check(key, fp.panel.y + fp.panel.h <= fp.trigger.y, 'flipped panel overlaps its trigger');

    // the behaviour, in the browser: levain's, and the board copy's beside it (the same checks; the board is the bar)
    r.behaviour = {};
    for (const who of ['levain', 'board']) {
      const t = trig(who), ps = who === 'board' ? '[data-pool-menu] [role="dialog"]' : '[data-popover] [role="dialog"]';
      const state = () => page.evaluate(([t, ps]) => {
        const tr = document.querySelector(t), p = document.querySelector(ps), a = document.activeElement;
        return { open: !!p, expanded: tr.getAttribute('aria-expanded'), controls: tr.getAttribute('aria-controls'), panelId: p?.id ?? null, focusInPanel: !!p?.contains(a), focusOnTrigger: a === tr,
          active: a ? `${a.tagName.toLowerCase()}${a.className && typeof a.className === 'string' ? '.' + a.className.split(' ')[0] : ''}${a.getAttribute('aria-label') ? '[' + a.getAttribute('aria-label') + ']' : ''}` : null };
      }, [t, ps]);
      const beh = (r.behaviour[who] = {});
      const strict = who === 'levain';
      await page.click(t); await pause(700);
      beh.opened = await state();
      if (strict) check(key, beh.opened.open && beh.opened.expanded === 'true' && beh.opened.controls === beh.opened.panelId && beh.opened.focusInPanel, `open: ${JSON.stringify(beh.opened)}`);
      await page.keyboard.press('Escape'); await pause(700);
      beh.escape = await state();
      if (strict) check(key, !beh.escape.open && beh.escape.expanded === 'false' && beh.escape.focusOnTrigger, `Escape: ${JSON.stringify(beh.escape)}`);
      await page.click(t); await pause(700);
      await page.mouse.click(5, (device.viewport.height / 2) | 0); await pause(700);
      beh.outside = await state();
      await page.click(t); await pause(700);
      beh.tabs = [];
      for (let i = 0; i < 6 && (await state()).expanded === 'true'; i++) { await page.keyboard.press('Tab'); await pause(150); beh.tabs.push((await state()).active); }
      await pause(600);
      beh.tabOut = await state();
      if (strict) {
        check(key, !beh.outside.open, `press outside left it open`);
        check(key, !beh.tabOut.open, `Tab out left it open`);
      }
    }
    const L = r.behaviour.levain, B = r.behaviour.board;
    // after a press outside or a Tab out, focus lands where the board's does
    check(key, L.outside.focusOnTrigger === B.outside.focusOnTrigger, `press outside: focus ${L.outside.active}, the board's ${B.outside.active}`);
    check(key, L.tabOut.focusOnTrigger === B.tabOut.focusOnTrigger, `Tab out: focus ${L.tabOut.active}, the board's ${B.tabOut.active}`);
    await ctx.close();
  }
}

fs.writeFileSync(`${out}/results.json`, JSON.stringify({ ok: !problems.length && !errors.length, problems, errors, results }, null, 2));
console.log(problems.length || errors.length ? `FAILED:\n${[...problems, ...errors].join('\n')}` : 'all checks OK');
for (const [k, r] of Object.entries(results)) console.log(`${k}: delta ${JSON.stringify(r.delta)}; radius board ${r.panels.board.radius} levain ${r.panels.levain.radius}; flip ${r.panels.flip.placement}`);

// composite.png: a row per theme and mode: board then levain then the flip, at 390 and at 1280
const url = f => (fs.existsSync(`${out}/${f}.png`) ? `data:image/png;base64,${fs.readFileSync(`${out}/${f}.png`).toString('base64')}` : '');
const sheet = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const rows = COMBOS.map(([name, , m]) => {
  const fig = (label, f, wpx) => `<figure><figcaption>${label}</figcaption><img style="width:${wpx}px" src="${url(f)}"></figure>`;
  const k = w => `${name}-${m}-${w}`;
  return `<div class="row"><b>${name === 'cobalt' ? 'Cobalt Mono' : 'Sage'} ${m}</b>${fig('390 · board', `${k(390)}-board`, 170)}${fig('390 · levain', `${k(390)}-levain`, 170)}${fig('390 · levain flipped', `${k(390)}-flip`, 170)}${fig('1280 · board', `${k(1280)}-board`, 220)}${fig('1280 · levain', `${k(1280)}-levain`, 220)}</div>`;
}).join('');
await sheet.setContent(`<style>body{margin:0;padding:16px;background:#bbb;font:13px system-ui}.row{display:flex;gap:12px;align-items:flex-start;margin-bottom:16px}.row b{width:90px;flex:none}figure{margin:0}figcaption{height:20px}img{display:block}</style><p>T39: levain Popover beside the board's HeadPopover (a copy), same trigger and panel. Expected difference: the corner, levain's --radius-lg 8px against the board's 10px (PM, 2026-11-24).</p>${rows}`);
await sheet.screenshot({ path: `${out}/composite.png`, fullPage: true });
await browser.close();
if (problems.length || errors.length) process.exitCode = 1;
