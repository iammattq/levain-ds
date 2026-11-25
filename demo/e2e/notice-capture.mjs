#!/usr/bin/env node
// T62: levain's Notice with the Ringmaster board's two bad-connection lines, in each tone, under a header row in a
// container. Run on the PC through demo/e2e/notice.sh:
//   node notice-capture.mjs <base-url> <out>
// Chromium at 402x874 (the board's phone width, DPR 3, touch) and 1280x800 (DPR 2), Sage (theme 0) and Cobalt Mono
// (theme 7), light and dark. Per combo and notice, in the browser: the role (offline a status, lost an alert), the text
// and background colours against the tone's tokens, their contrast (4.5:1), the border and shadow, the corner, the
// type, how many lines the message takes and whether the buttons sit beside it or under it; Dismiss hides the line.
// Stills per box (<key>-<box>.png), results.json and composite.png; exits 1 on a failed check or a page error.
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
const phone = { ...(({ defaultBrowserType, ...d }) => d)(pw.devices['iPhone 14']), viewport: { width: 402, height: 874 } };
const desktop = { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 };
const COMBOS = [['sage', 0, 'light'], ['sage', 0, 'dark'], ['cobalt', 7, 'light'], ['cobalt', 7, 'dark']];
const WIDTHS = { 402: phone, 1280: desktop };
const TONES = ['muted', 'info', 'caution', 'error'];
const BOXES = ['board', ...TONES, 'icon'];
const TOKENS = { muted: ['text-muted', 'surface-subtle'], info: ['info-fg', 'info-bg'], caution: ['caution-fg', 'caution-bg'], error: ['error-fg', 'error-bg'] };
fs.mkdirSync(out, { recursive: true });

const results = {}, problems = [], errors = [];
const check = (key, ok, what) => { if (!ok) problems.push(`${key}: ${what}`); return !!ok; };

// one notice, measured in the browser; the tokens resolved through a probe element so they compare as rgb()
const measure = (page, id, fg, bg) => page.evaluate(([id, fg, bg]) => {
  const el = document.querySelector(`[data-demo-notice="${id}"]`);
  const probe = document.createElement('span');
  el.parentElement.appendChild(probe);
  const resolve = (prop, v) => { probe.style[prop] = `var(--color-${v})`; return getComputedStyle(probe)[prop]; };
  const want = { color: resolve('color', fg), bg: resolve('backgroundColor', bg) };
  probe.remove();
  const rgb = s => s.match(/[\d.]+/g).slice(0, 3).map(Number);
  const lum = c => { const [r, g, b] = rgb(c).map(v => v / 255).map(v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const [h, l] = [lum(a), lum(b)].sort((x, y) => y - x); return (h + 0.05) / (l + 0.05); };
  const cs = getComputedStyle(el), msg = el.querySelector('[data-notice-message]'), acts = el.querySelector('[data-notice-actions]');
  const range = document.createRange();
  range.selectNodeContents(msg);
  const lines = new Set([...range.getClientRects()].map(r => Math.round(r.top))).size;
  const m = msg.getBoundingClientRect(), a = acts?.getBoundingClientRect(), b = el.getBoundingClientRect();
  const r = n => +n.toFixed(2);
  return {
    role: el.getAttribute('role'), want, color: cs.color, bg: cs.backgroundColor,
    contrast: r(ratio(cs.color, cs.backgroundColor)),
    border: ['Top', 'Right', 'Bottom', 'Left'].map(s => `${cs[`border${s}Width`]} ${cs[`border${s}Style`]} ${cs[`border${s}Color`]}`),
    radius: cs.borderRadius, shadow: cs.boxShadow, fontSize: cs.fontSize, lineHeight: cs.lineHeight,
    lines, box: { w: r(b.width), h: r(b.height) },
    // beside: the buttons' row overlaps the message's; under: they start below it
    buttons: a ? (a.top >= m.bottom - 1 ? 'under' : 'beside') : null,
    buttonsAtEnd: a ? Math.abs(b.right - parseFloat(cs.paddingRight) - parseFloat(cs.borderRightWidth) - a.right) < 1 : null,
    overflow: el.scrollWidth > el.clientWidth + 1,
  };
}, [id, fg, bg]);

for (const [name, theme, m] of COMBOS) {
  for (const [w, device] of Object.entries(WIDTHS)) {
    const key = `${name}-${m}-${w}`;
    const r = (results[key] = {});
    const ctx = await browser.newContext({ ...device });
    const page = await ctx.newPage();
    page.on('pageerror', e => { errors.push(`${key}: ${e.message}`); console.log(`pageerror ${key}: ${e.message}`); });
    await page.goto(`${base}?only=notice&theme=${theme}&mode=${m}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await pause(300);

    for (const tone of TONES) {
      const [fg, bg] = TOKENS[tone];
      for (const which of ['offline', 'lost']) {
        const id = `${tone}-${which}`, k = `${key} ${id}`;
        const n = (r[id] = await measure(page, id, fg, bg));
        check(k, n.role === (which === 'offline' ? 'status' : 'alert'), `role ${n.role}`);
        check(k, n.color === n.want.color, `text ${n.color}, want ${fg} ${n.want.color}`);
        check(k, n.bg === n.want.bg, `background ${n.bg}, want ${bg} ${n.want.bg}`);
        check(k, n.contrast >= 4.5, `text contrast ${n.contrast}`);
        check(k, n.border.every(s => s.startsWith('1px solid')), `border ${n.border}`);
        check(k, n.shadow === 'none', `shadow ${n.shadow}`);
        check(k, !n.overflow, 'content overflows the box');
        if (which === 'offline') check(k, n.lines === 1, `the offline line takes ${n.lines} lines`);
        else {
          check(k, n.buttonsAtEnd, 'the buttons are not at the end of the box');
          if (w === '1280') check(k, n.lines === 1 && n.buttons === 'beside', `at 1280: ${n.lines} lines, buttons ${n.buttons}`);
          else check(k, n.lines <= 2, `at 402 the message takes ${n.lines} lines`);
        }
      }
    }
    r.icon = await page.evaluate(() => document.querySelector('[data-demo-notice="icon-offline"] [data-notice-icon]')?.getAttribute('aria-hidden'));
    check(key, r.icon === 'true', 'the icon is not aria-hidden');

    for (const box of BOXES) await page.locator(`[data-demo="notice-${box}"]`).screenshot({ path: `${out}/${key}-${box}.png` });

    // Dismiss hides the line (the demo's own state); done last, after the stills
    await page.locator('[data-demo-notice="error-lost"]').getByRole('button', { name: 'Dismiss' }).click();
    r.dismissed = (await page.locator('[data-demo-notice="error-lost"]').count()) === 0;
    check(key, r.dismissed, 'Dismiss did not hide the line');
    await ctx.close();
  }
}

fs.writeFileSync(`${out}/results.json`, JSON.stringify({ ok: !problems.length && !errors.length, problems, errors, results }, null, 2));
console.log(problems.length || errors.length ? `FAILED:\n${[...problems, ...errors].join('\n')}` : 'all checks OK');
for (const [k, r] of Object.entries(results)) {
  for (const tone of TONES) {
    const o = r[`${tone}-offline`], l = r[`${tone}-lost`];
    if (!o || !l) { console.log(`${k} ${tone}: incomplete`); continue; }
    console.log(`${k} ${tone}: ${o.color} on ${o.bg} ${o.contrast}:1; ${o.border[0]}; r ${o.radius}; ${o.fontSize}/${o.lineHeight}; offline ${o.box.h} px, lost ${l.lines} line(s) ${l.box.h} px, buttons ${l.buttons}`);
  }
}

// composite.png: a row per theme and mode: the board's line today, each tone and the icon, at 402 then at 1280
const url = f => (fs.existsSync(`${out}/${f}.png`) ? `data:image/png;base64,${fs.readFileSync(`${out}/${f}.png`).toString('base64')}` : '');
const sheet = await browser.newPage({ viewport: { width: 2000, height: 900 } });
const rows = COMBOS.map(([name, , m]) => {
  const fig = (label, f, wpx) => `<figure><figcaption>${label}</figcaption><img style="width:${wpx}px" src="${url(f)}"></figure>`;
  const k = w => `${name}-${m}-${w}`;
  const col = w => `<div class="col">${BOXES.map(b => fig(`${w} · ${b}`, `${k(w)}-${b}`, w === 402 ? 320 : 760)).join('')}</div>`;
  return `<div class="row"><b>${name === 'cobalt' ? 'Cobalt Mono' : 'Sage'} ${m}</b>${col(402)}${col(1280)}</div>`;
}).join('');
await sheet.setContent(`<style>body{margin:0;padding:16px;background:#bbb;font:13px system-ui}.row{display:flex;gap:16px;align-items:flex-start;margin-bottom:24px}.row b{width:90px;flex:none}.col{display:flex;flex-direction:column;gap:8px}figure{margin:0}figcaption{height:18px}img{display:block}</style><p>T62: levain Notice with the board's two lines ("Offline, reconnecting…": a status; "Your idea wasn't sent: the network dropped" with Retry and Dismiss: an alert), in each tone, under a header row in a column-surface container. First: the board's line today (a bare caption, a copy). Last: muted with an icon. Checks in results.json.</p>${rows}`);
await sheet.screenshot({ path: `${out}/composite.png`, fullPage: true });
await browser.close();
if (problems.length || errors.length) process.exitCode = 1;
