#!/usr/bin/env node
// T47: levain's Skeleton beside a copy of the portfolio photo explorer's loading skeleton. Run on the PC through
// demo/e2e/skeleton.sh:
//   node skeleton-capture.mjs <base-url> <out>
// Chromium at 390x844 (iPhone 14, DPR 3) and 1280x800 (DPR 2), Sage (theme 0) and Cobalt Mono (theme 7), light and
// dark. Per combo, in the browser: every shape's box (from its side's top left), fill and corner, levain's against the
// explorer's; each side's first line sampled for 2.4 s (the pulse's low and high), with motion and under Reduce
// Motion; levain's ARIA (shapes aria-hidden, one status line). The stills (<key>-<who>.png) are taken at rest: Reduce
// Motion stops levain's pulse, and the explorer's (which ignores Reduce Motion) is stopped by a style, so both show at
// full opacity. Writes the shots, results.json and composite.png; exits 1 on a failed check or a page error.
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

const SIDE = { explorer: '[data-demo-shapes="explorer"]', levain: '[data-demo-shapes="levain"]' };
const SHAPES = { explorer: `${SIDE.explorer} .animate-pulse`, levain: `${SIDE.levain} [data-skeleton]` };
const results = {}, problems = [], errors = [];
const check = (key, ok, what) => { if (!ok) problems.push(`${key}: ${what}`); return !!ok; };

const shapes = (page, who) => page.evaluate(([side, sel]) => {
  const o = document.querySelector(side).getBoundingClientRect();
  return [...document.querySelectorAll(sel)].map(el => {
    const b = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return { x: +(b.x - o.x).toFixed(2), y: +(b.y - o.y).toFixed(2), w: +b.width.toFixed(2), h: +b.height.toFixed(2), bg: cs.backgroundColor, radius: cs.borderRadius };
  });
}, [SIDE[who], SHAPES[who]]);

// the first shape's opacity every 100 ms for 2.4 s: low, high and the samples
const pulse = (page, who) => page.evaluate(async sel => {
  const el = document.querySelector(sel), s = [];
  for (let i = 0; i < 25; i++) { s.push(+(+getComputedStyle(el).opacity).toFixed(3)); await new Promise(r => setTimeout(r, 100)); }
  return { low: Math.min(...s), high: Math.max(...s), samples: s };
}, SHAPES[who]);

async function open(device, key, theme, m, reduce) {
  const ctx = await browser.newContext({ ...device, reducedMotion: reduce ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  page.on('pageerror', e => { errors.push(`${key}: ${e.message}`); console.log(`pageerror ${key}: ${e.message}`); });
  await page.goto(`${base}?only=skeleton&theme=${theme}&mode=${m}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await pause(500);
  return { ctx, page };
}

for (const [name, theme, m] of COMBOS) {
  for (const [w, device] of Object.entries(WIDTHS)) {
    const key = `${name}-${m}-${w}`;
    const r = (results[key] = {});

    // with motion: the shapes and the pulse
    {
      const { ctx, page } = await open(device, key, theme, m, false);
      const E = await shapes(page, 'explorer'), L = await shapes(page, 'levain');
      r.count = { explorer: E.length, levain: L.length };
      check(key, E.length === 28 && L.length === 28, `shapes: explorer ${E.length}, levain ${L.length} (4 lines + 24 squares each)`);
      let worst = 0;
      E.forEach((e, i) => {
        const l = L[i];
        if (!l) return;
        for (const k of ['x', 'y', 'w', 'h']) worst = Math.max(worst, Math.abs(l[k] - e[k]));
        check(key, l.bg === e.bg, `shape ${i} fill ${l.bg} vs the explorer's ${e.bg}`);
        check(key, l.radius === e.radius, `shape ${i} corner ${l.radius} vs the explorer's ${e.radius}`);
      });
      r.worstBoxDelta = +worst.toFixed(2);
      check(key, worst <= 0.5, `a shape's box differs by ${worst} px from the explorer's`);
      r.line = { explorer: E[0], levain: L[0] };
      r.square = { explorer: E[1], levain: L[1] };
      r.pulse = { explorer: await pulse(page, 'explorer'), levain: await pulse(page, 'levain') };
      for (const who of ['explorer', 'levain']) {
        const p = r.pulse[who];
        check(key, p.low <= 0.56 && p.high >= 0.97, `${who} pulse ${p.low}–${p.high} (expected ~0.5–1)`);
      }
      // levain's ARIA: every shape hidden, one status line naming what loads, visually hidden
      r.aria = await page.evaluate(([side, sel]) => {
        const st = [...document.querySelectorAll(`${side} [role="status"]`)], b = st[0]?.getBoundingClientRect();
        return { hidden: [...document.querySelectorAll(sel)].every(el => el.getAttribute('aria-hidden') === 'true'), status: st.map(s => s.textContent), statusSize: b && [b.width, b.height] };
      }, [SIDE.levain, SHAPES.levain]);
      check(key, r.aria.hidden, 'a levain shape is not aria-hidden');
      check(key, r.aria.status.length === 1 && r.aria.status[0] === 'Loading photos', `status lines ${JSON.stringify(r.aria.status)}`);
      check(key, r.aria.statusSize && r.aria.statusSize[0] <= 1 && r.aria.statusSize[1] <= 1, `the status line shows (${r.aria.statusSize})`);
      await ctx.close();
    }

    // Reduce Motion: levain's still at full opacity; the explorer's (no motion-safe) pulses on. Then the stills.
    {
      const { ctx, page } = await open(device, key, theme, m, true);
      r.reduce = { explorer: await pulse(page, 'explorer'), levain: await pulse(page, 'levain') };
      check(key, r.reduce.levain.low === 1 && r.reduce.levain.high === 1, `levain pulses under Reduce Motion (${r.reduce.levain.low}–${r.reduce.levain.high})`);
      await page.addStyleTag({ content: `${SIDE.explorer} .animate-pulse { animation: none !important; }` });
      await pause(100);
      for (const who of ['explorer', 'levain']) await page.locator(`[data-demo="skeleton-${who}"]`).screenshot({ path: `${out}/${key}-${who}.png` });
      await ctx.close();
    }
  }
}

fs.writeFileSync(`${out}/results.json`, JSON.stringify({ ok: !problems.length && !errors.length, problems, errors, results }, null, 2));
console.log(problems.length || errors.length ? `FAILED:\n${[...problems, ...errors].join('\n')}` : 'all checks OK');
for (const [k, r] of Object.entries(results)) {
  if (!r.line?.levain || !r.reduce) { console.log(`${k}: incomplete`); continue; }
  console.log(`${k}: boxes within ${r.worstBoxDelta} px; line ${r.line.levain.w}x${r.line.levain.h} r ${r.line.levain.radius}; square ${r.square.levain.w} r ${r.square.levain.radius}; fill ${r.line.levain.bg}; pulse explorer ${r.pulse.explorer.low}–${r.pulse.explorer.high}, levain ${r.pulse.levain.low}–${r.pulse.levain.high}; reduce: explorer ${r.reduce.explorer.low}–${r.reduce.explorer.high}, levain ${r.reduce.levain.low}–${r.reduce.levain.high}`);
}

// composite.png: a row per theme and mode: explorer then levain at 390, then at 1280
const url = f => (fs.existsSync(`${out}/${f}.png`) ? `data:image/png;base64,${fs.readFileSync(`${out}/${f}.png`).toString('base64')}` : '');
const sheet = await browser.newPage({ viewport: { width: 1800, height: 900 } });
const rows = COMBOS.map(([name, , m]) => {
  const fig = (label, f, wpx) => `<figure><figcaption>${label}</figcaption><img style="width:${wpx}px" src="${url(f)}"></figure>`;
  const k = w => `${name}-${m}-${w}`;
  return `<div class="row"><b>${name === 'cobalt' ? 'Cobalt Mono' : 'Sage'} ${m}</b>${fig('390 · explorer', `${k(390)}-explorer`, 150)}${fig('390 · levain', `${k(390)}-levain`, 150)}${fig('1280 · explorer', `${k(1280)}-explorer`, 520)}${fig('1280 · levain', `${k(1280)}-levain`, 520)}</div>`;
}).join('');
await sheet.setContent(`<style>body{margin:0;padding:16px;background:#bbb;font:13px system-ui}.row{display:flex;gap:12px;align-items:flex-start;margin-bottom:16px}.row b{width:90px;flex:none}figure{margin:0}figcaption{height:20px}img{display:block}</style><p>T47: levain Skeleton beside the portfolio photo explorer's loading skeleton (a copy), in the explorer's layout (clusters: 4 groups of a title line over 6 squares), both at rest (full opacity). Expected: no difference. In motion both pulse 1 → 0.5 → 1 over 2 s (levain on ease.springOut, the explorer on Tailwind's cubic-bezier(0.4, 0, 0.6, 1)); under Reduce Motion levain's is still and the explorer's pulses on (results.json).</p>${rows}`);
await sheet.screenshot({ path: `${out}/composite.png`, fullPage: true });
await browser.close();
if (problems.length || errors.length) process.exitCode = 1;
