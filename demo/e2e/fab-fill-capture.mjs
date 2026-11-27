#!/usr/bin/env node
// T72: FabMenu open in the button's colour. Run on the PC through demo/e2e/fab-fill.sh:
//   node fab-fill-capture.mjs <before-url> <after-url> <out>
// Chromium at 390x844 (iPhone 14) and 1280x800, Sage (theme 0) and Cobalt Mono (theme 7), light and dark, on ?only=fab,
// the same steps on both builds. Frames: closed; open (a pointer press, no ring); list-ring (opened by keyboard: the
// ring on the first row); level-field (Write to me chosen by keyboard, a draft typed: the field focused, its ring);
// level-back (Shift+Tab: the back arrow's ring). Writes <width>-<combo>-<frame>-{before,after}.png, numbers.json (the
// colours each frame resolves to) and composite-<width>.png (each frame, before beside after).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const req = createRequire(path.join(process.env.PW_DIR, 'node_modules/'));
const pw = req('playwright-core');
const [beforeUrl, afterUrl, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const pause = ms => new Promise(r => setTimeout(r, ms));
const settled = async page => { await page.evaluate(() => Promise.race([Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming?.().endTime !== Infinity).map(a => a.finished.catch(() => {}))), new Promise(r => setTimeout(r, 3000))])); await pause(400); };

const exe = [process.env.CHROMIUM, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/google-chrome'].find(p => p && fs.existsSync(p));
if (!exe) throw new Error('no Chromium found (set CHROMIUM)');
const browser = await pw.chromium.launch({ executablePath: exe, headless: true });
const iphone = { ...(({ defaultBrowserType, ...d }) => d)(pw.devices['iPhone 14']), viewport: { width: 390, height: 844 } };
const WIDTHS = [[390, iphone], [1280, { viewport: { width: 1280, height: 800 } }]];
const COMBOS = [['sage', 0, 'light'], ['sage', 0, 'dark'], ['cobalt', 7, 'light'], ['cobalt', 7, 'dark']];
const FRAMES = ['closed', 'open', 'list-ring', 'level-field', 'level-back'];
const PANEL = '[data-fab-menu]', TRIGGER = '[data-fab-trigger]';
const FILL = { light: [220, 229, 246], dark: [245, 233, 207] };
const rgb = s => (s.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
const far = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));

const press = async (p, sel) => {
  const b = await p.evaluate(sel => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
  await p.mouse.click(b.x, b.y);
};
/** What the frame resolves to: the panel's fill, the contents' text, the focused element and its ring. */
const probe = p => p.evaluate(sel => {
  const el = document.querySelector(sel), cs = getComputedStyle(el), c = el.querySelector('[data-fab-content]');
  const a = document.activeElement, acs = a ? getComputedStyle(a) : null;
  const ta = el.querySelector('[data-fab-level="write"] textarea');
  return {
    open: el.dataset.open, level: el.dataset.level, bg: cs.backgroundColor, text: getComputedStyle(c).color,
    scheme: c.getAttribute('data-levain-scheme'),
    focus: a?.dataset?.fabItem ?? (a?.hasAttribute?.('data-fab-back') ? 'back' : a?.tagName.toLowerCase()),
    ring: a && a !== document.body && a.matches(':focus-visible') ? { outline: `${acs.outlineStyle} ${acs.outlineColor}`, shadow: acs.boxShadow } : null,
    field: ta ? { color: getComputedStyle(ta).color, border: getComputedStyle(ta).borderTopColor, bg: getComputedStyle(ta).backgroundColor } : null,
    back: getComputedStyle(el.querySelector('[data-fab-level="write"] [data-fab-back]')).color,
  };
}, PANEL);
const corner = p => p.evaluate(() => { const r = document.querySelector('[data-demo="fab-stage"]').getBoundingClientRect(); const w = Math.min(r.width, 440); return { x: Math.round(r.right - w), y: Math.round(r.top), width: Math.round(w), height: Math.round(r.height) }; });

const numbers = {}, errors = [], checks = {};
for (const [width, opts] of WIDTHS) {
  for (const [name, theme, mode] of COMBOS) {
    for (const [side, base] of [['before', beforeUrl], ['after', afterUrl]]) {
      const key = `${width}-${name}-${mode}`;
      const ctx = await browser.newContext(opts);
      const page = await ctx.newPage();
      page.on('pageerror', e => errors.push(`${key} ${side}: ${e.message}`));
      await page.goto(`${base}?only=fab&theme=${theme}&mode=${mode}`, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await settled(page);
      const clip = await corner(page);
      const shoot = async frame => { const f = `${key}-${frame}-${side}`; await page.screenshot({ path: `${out}/${f}.png`, clip }); numbers[f] = await probe(page); };
      await shoot('closed');
      await press(page, TRIGGER); await settled(page); await shoot('open');
      await press(page, TRIGGER); await settled(page);
      await page.focus(TRIGGER); await page.keyboard.press('Enter'); await settled(page); await shoot('list-ring');
      await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); // Work -> Journal -> Write to me
      await page.keyboard.press('Enter'); await settled(page);
      await page.keyboard.type('Half a thought'); await shoot('level-field');
      await page.keyboard.press('Shift+Tab'); await pause(100); await shoot('level-back');
      await ctx.close();
      if (side === 'after') {
        const n = f => numbers[`${key}-${f}-after`];
        checks[key] = {
          closedInFill: far(rgb(n('closed').bg), FILL[mode]) <= 2,
          openInFill: ['open', 'list-ring', 'level-field', 'level-back'].every(f => far(rgb(n(f).bg), FILL[mode]) <= 2),
          scoped: n('open').scheme === 'light',
          rowRing: n('list-ring').focus === 'work' && !!n('list-ring').ring,
          fieldFocused: n('level-field').focus === 'textarea',
          backRing: n('level-back').focus === 'back' && !!n('level-back').ring,
          beforeOpenIsSurface: far(rgb(numbers[`${key}-open-before`].bg), FILL[mode]) > 2,
        };
      }
    }
  }
}

const img = f => `data:image/png;base64,${fs.readFileSync(`${out}/${f}.png`).toString('base64')}`;
const sheet = await browser.newPage({ viewport: { width: 2400, height: 600 } });
const css = '<style>body{margin:0;padding:16px;background:#bbb;font:13px system-ui;width:max-content}.row{display:flex;gap:14px;align-items:flex-start;margin-bottom:16px}.row b{width:110px;flex:none}.pair{display:flex;gap:3px}figure{margin:0}figcaption{height:20px}img{display:block;width:200px}</style>';
for (const [width] of WIDTHS) {
  await sheet.setContent(css + COMBOS.map(([name, , mode]) => {
    const key = `${width}-${name}-${mode}`;
    return `<div class="row"><b>${key.replace(/-/g, ' ')}</b>${FRAMES.map(fr => `<div class="pair">${['before', 'after'].map(s => `<figure><figcaption>${fr} · ${s}</figcaption><img src="${img(`${key}-${fr}-${s}`)}"></figure>`).join('')}</div>`).join('')}</div>`;
  }).join(''));
  await sheet.screenshot({ path: `${out}/composite-${width}.png`, fullPage: true });
}
await browser.close();

const ok = Object.values(checks).every(c => Object.values(c).every(Boolean));
fs.writeFileSync(`${out}/numbers.json`, JSON.stringify({ ok, checks, numbers, errors }, null, 2));
for (const [k, c] of Object.entries(checks)) console.log(`${k}: ${Object.entries(c).filter(([, v]) => !v).map(([n]) => n).join(', ') || 'OK'}`);
if (errors.length) console.log(`errors: ${JSON.stringify(errors)}`);
if (!ok || errors.length) process.exitCode = 1;
