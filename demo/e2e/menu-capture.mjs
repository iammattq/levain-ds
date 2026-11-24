#!/usr/bin/env node
// T41: levain's Menu beside the board's project switcher (a copy). Run on the PC through demo/e2e/menu.sh:
//   node menu-capture.mjs <base-url> <out>
// Chromium at 390x844 (iPhone 14, DPR 3) and 1280x800 (DPR 2), Sage (theme 0) and Cobalt Mono (theme 7), light and
// dark. For each, board then levain: opened from the keyboard (ArrowDown on the button) and moved one row down, so the
// chosen row's check and the keyboard focus show (<key>-<who>-keys.png), then a row hovered (<key>-<who>-hover.png).
// In the browser, per combo: the two menus' boxes, fill, first row's box and text, and the keys run on both (focus at
// open, ArrowDown/ArrowUp wrapping, Home/End, Enter picks, Space picks, Escape, Tab, a press outside), levain's focus
// path checked against the board's. Writes the shots, results.json and composite.png; exits 1 on a failed check or a
// page error.
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

const SEL = {
  board: { trigger: '[data-demo="menu-board"] .switcher-button', panel: '[data-demo="menu-board"] [data-switcher-menu]', rows: '[data-demo="menu-board"] [role="option"]' },
  levain: { trigger: '[data-demo-trigger="levain"]', panel: '[data-demo="menu-levain"] [data-popover]', rows: '[data-demo="menu-levain"] [role="menuitemradio"]' },
};
const results = {}, problems = [], errors = [];
const check = (key, ok, what) => { if (!ok) problems.push(`${key}: ${what}`); return !!ok; };

// what the page says now, for one side: open, the focused row's name, focus on the button, the button's text
const state = (page, who) => page.evaluate(s => {
  const tr = document.querySelector(s.trigger), a = document.activeElement, rows = [...document.querySelectorAll(s.rows)];
  const row = rows.find(r => r === a);
  return { open: tr.getAttribute('aria-expanded') === 'true', row: row ? (row.querySelector('.name, .truncate')?.textContent ?? '?') : null, onTrigger: a === tr, current: tr.querySelector('.truncate')?.textContent };
}, SEL[who]);

for (const [name, theme, m] of COMBOS) {
  for (const [w, device] of Object.entries(WIDTHS)) {
    const key = `${name}-${m}-${w}`;
    const ctx = await browser.newContext(device);
    const page = await ctx.newPage();
    page.on('pageerror', e => { errors.push(`${key}: ${e.message}`); console.log(`pageerror ${key}: ${e.message}`); });
    await page.goto(`${base}?only=menu&theme=${theme}&mode=${m}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await pause(400);
    const r = (results[key] = { menus: {}, keys: {} });

    for (const who of ['board', 'levain']) {
      const s = SEL[who];
      // the bar mid-window, so the menu has room under it (the board's never flips; levain's would)
      await page.$eval(s.trigger, el => el.scrollIntoView({ block: 'center' }));
      await pause(200);
      await page.focus(s.trigger);
      await page.keyboard.press('ArrowDown');
      await pause(900);
      await page.keyboard.press('ArrowDown');
      await pause(300);
      const info = await page.evaluate(s => {
        const box = el => { const b = el.getBoundingClientRect(); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
        const tr = document.querySelector(s.trigger), pa = document.querySelector(s.panel), rows = [...document.querySelectorAll(s.rows)];
        const row = rows[0], cs = pa && getComputedStyle(pa), rs = row && getComputedStyle(row);
        const label = row?.querySelector('.name, .truncate'), ls = label && getComputedStyle(label);
        const focused = rows.find(x => x === document.activeElement), sel = rows.find(x => x.getAttribute('aria-selected') === 'true' || x.getAttribute('aria-checked') === 'true');
        return {
          trigger: box(tr), panel: pa && box(pa), rows: rows.length, row: row && box(row), label: label && box(label),
          bg: cs?.backgroundColor, radius: cs?.borderRadius,
          text: rs && { size: rs.fontSize, lineHeight: rs.lineHeight, color: rs.color }, labelText: ls && { size: ls.fontSize, weight: ls.fontWeight },
          selected: sel && { color: getComputedStyle(sel).color, weight: getComputedStyle(sel.querySelector('.name, .truncate')).fontWeight },
          focusBg: focused && getComputedStyle(focused).backgroundColor,
        };
      }, s);
      r.menus[who] = info;
      const shot = async which => {
        if (!info.panel) return check(key, false, `${who}: no menu after ArrowDown`);
        const pad = 16, x0 = Math.max(0, Math.min(info.trigger.x, info.panel.x) - pad - 60), y0 = Math.max(0, info.trigger.y - pad);
        const x1 = Math.min(+w, Math.max(info.trigger.x + info.trigger.w, info.panel.x + info.panel.w) + pad), y1 = Math.min(device.viewport.height, info.panel.y + info.panel.h + pad);
        await page.screenshot({ path: `${out}/${key}-${who}-${which}.png`, clip: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } });
      };
      await shot('keys');
      // a row hovered (the fourth), the keyboard focus still on the second
      const rows = await page.$$(s.rows);
      if (rows[3]) { await rows[3].hover(); await pause(300); r.menus[who].hoverBg = await rows[3].evaluate(el => getComputedStyle(el).backgroundColor); }
      await shot('hover');
      await page.mouse.move(1, 1);
      await page.keyboard.press('Escape');
      await pause(800);
    }

    const B = r.menus.board, L = r.menus.levain;
    if (B.panel && L.panel) {
      const rel = (x, t) => ({ x: x.x - t.x, y: x.y - t.y });
      const bp = rel(B.panel, B.trigger), lp = rel(L.panel, L.trigger), bl = rel(B.label, B.trigger), ll = rel(L.label, L.trigger);
      r.delta = { x: +(lp.x - bp.x).toFixed(1), y: +(lp.y - bp.y).toFixed(1), w: +(L.panel.w - B.panel.w).toFixed(1), h: +(L.panel.h - B.panel.h).toFixed(1),
        rowH: +(L.row.h - B.row.h).toFixed(1), labelX: +(ll.x - bl.x).toFixed(1), labelY: +(ll.y - bl.y).toFixed(1) };
      // w is reported, not checked: levain's rows are type-label (14px), the board's 13px (PM, T41: keep type-label)
      // at 390 the long name doesn't fit beside the button: the board caps its menu's width at the room to the window's
      // right edge and truncates the name; Popover keeps the menu whole and slides it left inside the 8px margin. So
      // there x is reported and levain's menu is checked to sit inside the window instead.
      const narrow = L.panel.x + L.panel.w > +w - 8 - 1 || r.delta.x < -1;
      if (narrow) {
        r.narrow = { boardTruncates: B.panel.x + B.panel.w <= +w, levainInside: L.panel.x >= 7 && L.panel.x + L.panel.w <= +w - 7 };
        check(key, r.narrow.levainInside, `levain's menu leaves the window ${JSON.stringify(L.panel)}`);
      }
      for (const k of narrow ? ['y', 'h', 'rowH', 'labelY'] : ['x', 'y', 'h', 'rowH', 'labelX', 'labelY']) check(key, Math.abs(r.delta[k]) <= 1, `${k} differs by ${r.delta[k]} px from the board's`);
      check(key, B.bg === L.bg, `fill differs (${B.bg} vs ${L.bg})`);
      check(key, B.rows === L.rows, `rows ${B.rows} vs ${L.rows}`);
      check(key, L.text?.size === '14px', `levain row text ${JSON.stringify(L.text)} (expected type-label, 14px; the board's ${JSON.stringify(B.text)})`);
      check(key, B.selected?.weight === L.selected?.weight && B.selected?.color === L.selected?.color, `chosen row ${JSON.stringify(B.selected)} vs ${JSON.stringify(L.selected)}`);
    }

    // the keys, on both: each step's focused row and state, levain's against the board's
    for (const who of ['board', 'levain']) {
      const s = SEL[who], seq = (r.keys[who] = []);
      await page.$eval(s.trigger, el => el.scrollIntoView({ block: 'center' }));
      const step = async (label, act, wait = 250) => { await act(); await pause(wait); seq.push({ step: label, ...(await state(page, who)) }); };
      await step('open (ArrowDown on the button)', async () => { await page.focus(s.trigger); await page.keyboard.press('ArrowDown'); }, 900);
      for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'End', 'ArrowDown', 'ArrowUp', 'Home']) await step(k, () => page.keyboard.press(k));
      await step('ArrowDown, Enter (picks portfolio)', async () => { await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); }, 900);
      await step('open, Home, Space (picks levain)', async () => { await page.keyboard.press('ArrowDown'); await pause(900); await page.keyboard.press('Home'); await page.keyboard.press('Space'); }, 900);
      await step('open, Escape', async () => { await page.keyboard.press('ArrowDown'); await pause(900); await page.keyboard.press('Escape'); }, 900);
      await step('open, ArrowDown, Tab', async () => { await page.keyboard.press('ArrowDown'); await pause(900); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Tab'); }, 900);
      await step('click, press outside', async () => { await page.click(s.trigger); await pause(900); await page.mouse.click(5, (device.viewport.height * 0.9) | 0); }, 900);
    }
    const keyOf = x => JSON.stringify({ open: x.open, row: x.row, onTrigger: x.onTrigger, current: x.current });
    r.keys.board.forEach((b, i) => {
      const l = r.keys.levain[i];
      // after a press outside the board leaves focus on the button only when it was a keyboard close; compare open and row only there
      const same = b.step.startsWith('click') ? b.open === l.open : keyOf(b) === keyOf(l);
      check(key, same, `${b.step}: levain ${keyOf(l)}, the board ${keyOf(b)}`);
    });
    const lk = r.keys.levain;
    check(key, lk[0].open && lk[0].row === 'levain', `open: focus on ${lk[0].row}`);
    check(key, lk[1].row === 'notes', `ArrowUp from the first didn't wrap (${lk[1].row})`);
    await ctx.close();
  }
}

fs.writeFileSync(`${out}/results.json`, JSON.stringify({ ok: !problems.length && !errors.length, problems, errors, results }, null, 2));
console.log(problems.length || errors.length ? `FAILED:\n${[...problems, ...errors].join('\n')}` : 'all checks OK');
for (const [k, r] of Object.entries(results)) console.log(`${k}: delta ${JSON.stringify(r.delta)}; radius board ${r.menus.board.radius} levain ${r.menus.levain.radius}; focus ${r.menus.board.focusBg} / ${r.menus.levain.focusBg}; hover ${r.menus.board.hoverBg} / ${r.menus.levain.hoverBg}`);

// composite.png: a row per theme and mode: board then levain, keyboard then hover, at 390 and at 1280
const url = f => (fs.existsSync(`${out}/${f}.png`) ? `data:image/png;base64,${fs.readFileSync(`${out}/${f}.png`).toString('base64')}` : '');
const sheet = await browser.newPage({ viewport: { width: 1800, height: 900 } });
const rows = COMBOS.map(([name, , m]) => {
  const fig = (label, f, wpx) => `<figure><figcaption>${label}</figcaption><img style="width:${wpx}px" src="${url(f)}"></figure>`;
  const k = w => `${name}-${m}-${w}`;
  return `<div class="row"><b>${name === 'cobalt' ? 'Cobalt Mono' : 'Sage'} ${m}</b>${fig('390 · board', `${k(390)}-board-keys`, 190)}${fig('390 · levain', `${k(390)}-levain-keys`, 190)}${fig('1280 · board', `${k(1280)}-board-keys`, 230)}${fig('1280 · levain', `${k(1280)}-levain-keys`, 230)}${fig('1280 · board hover', `${k(1280)}-board-hover`, 230)}${fig('1280 · levain hover', `${k(1280)}-levain-hover`, 230)}</div>`;
}).join('');
await sheet.setContent(`<style>body{margin:0;padding:16px;background:#bbb;font:13px system-ui}.row{display:flex;gap:12px;align-items:flex-start;margin-bottom:16px}.row b{width:90px;flex:none}figure{margin:0}figcaption{height:20px}img{display:block}</style><p>T41: levain Menu beside the board's project switcher (a copy), same button and rows; opened with ArrowDown, then ArrowDown once (keyboard focus on the second row; the chosen one checked); hover on the fourth. Expected differences: the corner (levain --radius-lg 8px, the board 10px), the row text (levain type-label 14px, the board 13px: 1px larger, so long names run a little wider; same 36px rows), at 390 the long name (the board truncates it at the window's edge; levain's menu slides left to keep it whole, 8px inside the window) and the hover / focus overlays (levain --color-state-hover / -active against the board's 4-5% / 8-9%).</p>${rows}`);
await sheet.screenshot({ path: `${out}/composite.png`, fullPage: true });
await browser.close();
if (problems.length || errors.length) process.exitCode = 1;
