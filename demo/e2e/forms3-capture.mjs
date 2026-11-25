#!/usr/bin/env node
// T54: part 3 of the demo's form inputs (?only=forms, [data-demo="forms-3"]: DualSlider, DateInput, Calendar,
// ColorInput, GradientInput) at 390 and 1280 px, Sage (theme 0) and Cobalt Mono (theme 7), light and dark, at 2x. A copy
// of T35's forms-capture.mjs with this part's selector and checks. Run on the PC through demo/e2e/forms3.sh:
//   node forms3-capture.mjs <base-url> <out> before|after
// Writes <phase>-<theme>-<mode>-<width>.png and <phase>.json; the "after" pass diffs each pair (diff-*.png, results.json),
// builds composite.png and checks the convention in the browser. Exits 1 if a pair differs or a check fails.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const { chromium } = createRequire(path.join(process.env.PW_DIR, 'node_modules/'))('playwright-core');
const [base, out, phase] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const exe = [process.env.CHROMIUM, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/google-chrome'].find(p => p && fs.existsSync(p));
if (!exe) throw new Error('no Chromium found (set CHROMIUM)');
const browser = await chromium.launch({ executablePath: exe, headless: true });
const COMBOS = [['sage', 0, 'light'], ['sage', 0, 'dark'], ['cobalt', 7, 'light'], ['cobalt', 7, 'dark']];
const WIDTHS = [390, 1280];
const errors = [], problems = [], probes = {};
const pause = ms => new Promise(r => setTimeout(r, ms));

const open = async (width, theme, mode) => {
  const ctx = await browser.newContext({ viewport: { width, height: 1400 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`${phase} ${width} ${theme} ${mode}: ${e.message}`));
  await page.goto(`${base}?only=forms&theme=${theme}&mode=${mode}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-demo="forms-3"]');
  await page.evaluate(() => document.fonts.ready);
  await pause(400);
  return page;
};

for (const [name, theme, mode] of COMBOS) {
  for (const width of WIDTHS) {
    const page = await open(width, theme, mode);
    const key = `${name}-${mode}-${width}`;
    const sec = page.locator('[data-demo="forms-3"]');
    probes[key] = await sec.evaluate(el => {
      const r = el.getBoundingClientRect();
      return {
        box: [Math.round(r.width), Math.round(r.height)],
        controls: [...el.querySelectorAll('input, button, [role]')].map(c => ({ tag: c.tagName, type: c.type ?? null, id: c.id || null, role: c.getAttribute('role'), name: c.getAttribute('aria-label') ?? (c.labels?.[0]?.textContent ?? null), tabIndex: c.tabIndex, disabled: c.disabled ?? null })),
      };
    });
    await sec.screenshot({ path: `${out}/${phase}-${key}.png` });
    await page.context().close();
  }
}
fs.writeFileSync(`${out}/${phase}.json`, JSON.stringify({ errors, probes }, null, 2));

if (phase === 'after') {
  // the convention, in a real browser
  const page = await open(1280, 0, 'light');
  const check = (what, ok, got) => { if (!ok) problems.push(`${what}: ${JSON.stringify(got)}`); };
  check('DualSlider: a group named Price', (await page.getByRole('group', { name: 'Price' }).count()) === 1, null);
  check('DualSlider: both ranges named', (await page.getByRole('slider', { name: 'Min' }).count()) === 1 && (await page.getByRole('slider', { name: 'Max' }).count()) === 1, null);
  const date = page.getByRole('textbox', { name: 'Published' });
  await date.fill('');
  await date.pressSequentially('20260415');
  check('DateInput: typing is masked', (await date.inputValue()) === '2026-04-15', await date.inputValue());
  await page.getByRole('button', { name: 'Choose Published date' }).click();
  const picked = page.getByRole('dialog').getByRole('button', { name: '2026-04-20' });
  await picked.click();
  check('DateInput: a calendar pick reaches the field', (await date.inputValue()) === '2026-04-20', await date.inputValue());
  const grid = page.locator('[data-demo="forms-3"]').getByRole('grid');
  const sel = grid.getByRole('button', { name: '2026-03-14' });
  check('Calendar: one Tab stop in the days', (await grid.locator('button[tabindex="0"]').count()) === 1, await grid.locator('button[tabindex="0"]').count());
  await sel.focus();
  await page.keyboard.press('ArrowDown');
  check('Calendar: ArrowDown moves a week', await grid.getByRole('button', { name: '2026-03-21' }).evaluate(b => b === document.activeElement), null);
  await page.keyboard.press('PageDown');
  check('Calendar: PageDown goes to next month', await grid.getByRole('button', { name: '2026-04-21' }).evaluate(b => b === document.activeElement), null);
  const ring = await grid.getByRole('button', { name: '2026-04-21' }).evaluate(b => getComputedStyle(b).boxShadow);
  check('Calendar: the focused day shows a ring', ring && ring !== 'none', ring);
  check('ColorInput: the field is named by its label', (await page.getByRole('textbox', { name: 'Accent' }).count()) === 1, null);
  check('ColorInput: an invalid value shows its error at once', (await page.getByRole('textbox', { name: 'Border' }).getAttribute('aria-invalid')) === 'true', null);
  await page.context().close();

  // before vs after, pixel by pixel, in a page
  const url = f => (fs.existsSync(`${out}/${f}.png`) ? `data:image/png;base64,${fs.readFileSync(`${out}/${f}.png`).toString('base64')}` : '');
  const cmp = await browser.newPage();
  const diffs = {};
  for (const [name, , mode] of COMBOS) for (const width of WIDTHS) {
    const key = `${name}-${mode}-${width}`;
    const r = await cmp.evaluate(async ([a, b]) => {
      const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      if (ia.width !== ib.width || ia.height !== ib.height) return { size: [[ia.width, ia.height], [ib.width, ib.height]], differing: -1 };
      const c = Object.assign(document.createElement('canvas'), { width: ia.width, height: ia.height }), x = c.getContext('2d');
      x.drawImage(ia, 0, 0); const da = x.getImageData(0, 0, c.width, c.height).data;
      x.drawImage(ib, 0, 0); const db = x.getImageData(0, 0, c.width, c.height);
      let n = 0;
      for (let i = 0; i < da.length; i += 4) {
        const d = Math.abs(da[i] - db.data[i]) + Math.abs(da[i + 1] - db.data[i + 1]) + Math.abs(da[i + 2] - db.data[i + 2]);
        if (d > 0) { n++; db.data[i] = 255; db.data[i + 1] = 0; db.data[i + 2] = 255; db.data[i + 3] = 255; } else db.data[i + 3] = 40;
      }
      x.putImageData(db, 0, 0);
      return { size: [c.width, c.height], differing: n, png: n ? c.toDataURL('image/png') : null };
    }, [url(`before-${key}`), url(`after-${key}`)]);
    if (r.png) fs.writeFileSync(`${out}/diff-${key}.png`, Buffer.from(r.png.split(',')[1], 'base64'));
    diffs[key] = { size: r.size, differing: r.differing };
    if (r.differing !== 0) problems.push(`${key}: ${r.differing === -1 ? `size ${JSON.stringify(r.size)}` : `${r.differing} pixels differ`}`);
  }
  await cmp.close();
  fs.writeFileSync(`${out}/results.json`, JSON.stringify({ ok: !problems.length && !errors.length, problems, errors, diffs }, null, 2));

  // composite.png: a row per theme and mode: before, after, diff at 390, then at 1280
  const sheet = await browser.newPage({ viewport: { width: 2000, height: 900 } });
  const fig = (label, f, wpx) => `<figure><figcaption>${label}</figcaption>${url(f) ? `<img style="width:${wpx}px" src="${url(f)}">` : '<div class="same">identical</div>'}</figure>`;
  const rows = COMBOS.map(([name, , mode]) => {
    const k = w => `${name}-${mode}-${w}`;
    return `<div class="row"><b>${name === 'cobalt' ? 'Cobalt Mono' : 'Sage'} ${mode}</b>${fig('390 · before', `before-${k(390)}`, 200)}${fig('390 · after', `after-${k(390)}`, 200)}${fig('390 · diff', `diff-${k(390)}`, 200)}${fig('1280 · before', `before-${k(1280)}`, 380)}${fig('1280 · after', `after-${k(1280)}`, 380)}${fig('1280 · diff', `diff-${k(1280)}`, 380)}</div>`;
  }).join('');
  const summary = Object.entries(diffs).map(([k, d]) => `${k}: ${d.differing === 0 ? 'identical' : d.differing + ' px differ'}`).join(' · ');
  await sheet.setContent(`<style>body{margin:0;padding:16px;background:#bbb;font:13px system-ui}.row{display:flex;gap:12px;align-items:flex-start;margin-bottom:16px}.row b{width:90px;flex:none}figure{margin:0}figcaption{height:20px}img{display:block}.same{width:120px;padding:8px;background:#dfd}</style><p>T54: DualSlider, DateInput, Calendar, ColorInput and GradientInput at rest, before (ba01576) and after the form-input convention. Diff: magenta where a pixel differs; "identical" when none does. ${summary}. Checks: ${problems.length ? problems.join('; ') : 'all OK'}.</p>${rows}`);
  await sheet.screenshot({ path: `${out}/composite.png`, fullPage: true });
  console.log(problems.length || errors.length ? `FAILED:\n${[...problems, ...errors].join('\n')}` : 'all checks OK; before and after identical');
  if (problems.length || errors.length) process.exitCode = 1;
}
await browser.close();
