#!/usr/bin/env node
// T27: the pieces that named colours or classes no theme defines, before and after. Run on the PC through
// demo/e2e/colours.sh, which serves "before" then "after" and calls this once for each:
//   node colours-capture.mjs <base-url> <out> before|after [compare]
// Chromium, 1440x1000, ?only=colours, Sage (theme 0) and Cobalt Mono (theme 7), light and dark. Per combo: a shot of each
// piece (data-piece) in the state that shows the fix (a row selected and a filter chip with its button hovered, the
// surface card hovered, the calendar's month panel 100 ms into its way in), and the computed colours, backgrounds and
// animations of the parts that changed (<phase>/numbers.json). With `compare`: compare.json (each measured value, before
// against after) and composite.png (each piece a row; per combo, before then after).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const { chromium } = createRequire(path.join(process.env.PW_DIR, 'node_modules/'))('playwright-core');
const [base, out, phase, compare] = process.argv.slice(2);
const dir = `${out}/${phase}`;
fs.mkdirSync(dir, { recursive: true });
const exe = [process.env.CHROMIUM, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/google-chrome'].find(p => p && fs.existsSync(p));
if (!exe) throw new Error('no Chromium found (set CHROMIUM)');
const pause = ms => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ executablePath: exe, headless: true });
const COMBOS = [['sage', 0, 'light'], ['sage', 0, 'dark'], ['cobalt', 7, 'light'], ['cobalt', 7, 'dark']];
const PIECES = ['checkbox-radio', 'status-card', 'slider', 'data-table', 'calendar', 'image-uploader', 'media-card', 'surface-card', 'content-navigation', 'admin-error', 'animated-name'];
const errors = [], numbers = {};

/** The computed values that the fix changes, per piece; null where a part isn't there. */
const probe = page => page.evaluate(() => {
  const q = (piece, sel) => document.querySelector(`[data-piece="${piece}"] ${sel}`);
  const cs = (el, ...props) => el ? Object.fromEntries(props.map(p => [p, getComputedStyle(el)[p]])) : null;
  return {
    checkboxUnchecked: cs(q('checkbox-radio', '#c-a ~ div'), 'borderTopColor', 'backgroundColor'),
    checkboxChecked: cs(q('checkbox-radio', '#c-b ~ div'), 'borderTopColor', 'backgroundColor'),
    radioUnselected: cs(q('checkbox-radio', '#r-a ~ div'), 'borderTopColor', 'backgroundColor'),
    statusKind: cs(q('status-card', 'span.uppercase'), 'color'),
    statusMarker: cs(q('status-card', 'li:last-child'), 'color'),
    statusBar: cs(q('status-card', 'span.w-\\[3px\\]'), 'backgroundColor'),
    sliderTrack: cs(q('slider', 'input[type=range]'), 'backgroundColor', 'backgroundImage'),
    tableSelectedRow: cs(q('data-table', 'tbody tr'), 'backgroundColor'),
    tableChip: cs(q('data-table', 'span.rounded-full, div.rounded-full.inline-flex'), 'backgroundColor', 'color'),
    tableChipButton: cs(q('data-table', '.inline-flex.rounded-full button'), 'backgroundColor'),
    uploaderLabel: cs(q('image-uploader', 'label'), 'color'),
    uploaderDropzone: cs(q('image-uploader', '.border-dashed'), 'borderTopColor'),
    uploaderIcon: cs(q('image-uploader', '.border-dashed svg'), 'color'),
    mediaIcon: cs(q('media-card', 'svg'), 'color'),
    surfaceCardHover: cs(q('surface-card', '[style*="box-shadow"], [style*="boxShadow"]') ?? q('surface-card', 'p')?.parentElement, 'boxShadow'),
    contentNavRule: cs(q('content-navigation', '.border-t'), 'borderTopColor'),
    adminError: cs(q('admin-error', 'p.type-body'), 'color'),
    gradientKeyframes: [...document.styleSheets].some(s => { try { return [...s.cssRules].some(r => r.type === CSSRule.KEYFRAMES_RULE && r.name === 'gradientMove'); } catch { return false; } }),
    animatedName: cs(q('animated-name', '.animated-name'), 'animationName', 'backgroundPosition'),
  };
});

const shot = (page, key, piece, animations = 'disabled') =>
  page.locator(`[data-piece="${piece}"]`).screenshot({ path: `${dir}/${key}-${piece}.png`, animations });

try {
  for (const [name, theme, mode] of COMBOS) {
    const key = `${name}-${mode}`;
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('pageerror', e => { errors.push(`${key}: ${e.message}`); console.log(`pageerror ${key}: ${e.stack ?? e.message}`); });
    page.on('console', m => m.type() === 'error' && console.log(`console ${key}: ${m.text()}`));
    const step = async (what, fn) => { try { await fn(); } catch (e) { errors.push(`${key} ${what}: ${e.message.split('\n')[0]}`); console.log(`step failed ${key} ${what}: ${e.message.split('\n')[0]}`); } };
    await page.goto(`${base}?only=colours&theme=${theme}&mode=${mode}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await pause(900);
    if (key === 'sage-light') await page.screenshot({ path: `${dir}/page.png`, fullPage: true });

    // the table: T27's row selected, then the Doing filter (a chip), its remove button hovered
    const table = page.locator('[data-piece="data-table"]');
    await step('select row', () => table.locator('tbody input[type=checkbox]').nth(2).check({ force: true, timeout: 3000 }));
    await step('filter', async () => { await table.getByRole('button', { name: 'Filter' }).click({ timeout: 3000 }); await table.getByRole('button', { name: 'Doing' }).click({ timeout: 3000 }); });
    await page.mouse.click(5, 5);
    await step('hover chip', () => table.locator('.inline-flex.rounded-full button').hover({ timeout: 3000 }));
    await pause(300);
    const n = { still: await probe(page) };
    await step('shot data-table', () => shot(page, key, 'data-table'));

    for (const piece of ['checkbox-radio', 'status-card', 'slider', 'image-uploader', 'media-card', 'content-navigation', 'admin-error', 'animated-name']) await step(`shot ${piece}`, () => shot(page, key, piece));

    await step('hover surface', () => page.locator('[data-piece="surface-card"] p').hover({ timeout: 3000 }));
    await pause(300);
    n.hover = { surfaceCardHover: (await probe(page)).surfaceCardHover };
    await step('shot surface-card', () => shot(page, key, 'surface-card'));

    // the name's gradient drifts (after) or holds (before)
    const pos0 = (await probe(page)).animatedName;
    await pause(1500);
    n.animatedNameLater = { at0: pos0, at1500: (await probe(page)).animatedName };

    // the month panel, 100 ms into its way in, then settled
    await step('open month', () => page.locator('[data-piece="calendar"]').getByRole('button', { name: 'November' }).click({ timeout: 3000 }));
    await pause(100);
    n.calendarAt100 = await page.evaluate(() => { const el = document.querySelector('[data-piece="calendar"] .origin-bottom'); const s = el && getComputedStyle(el); return s && { animationName: s.animationName, transform: s.transform, opacity: s.opacity }; });
    await step('shot calendar', () => shot(page, key, 'calendar', 'allow'));
    await pause(500);
    n.calendarSettled = await page.evaluate(() => { const el = document.querySelector('[data-piece="calendar"] .origin-bottom'); const s = el && getComputedStyle(el); return s && { animationName: s.animationName, transform: s.transform, opacity: s.opacity }; });

    numbers[key] = n;
    await page.close();
    console.log(`${phase} ${key}: done`);
  }

  if (compare) {
    const before = JSON.parse(fs.readFileSync(`${out}/before/numbers.json`, 'utf8')).numbers;
    const changes = {};
    const walk = (a, b, at) => {
      if (b && typeof b === 'object') { for (const k of new Set([...Object.keys(a ?? {}), ...Object.keys(b)])) walk(a?.[k], b[k], `${at}.${k}`); return; }
      if (JSON.stringify(a) !== JSON.stringify(b)) changes[at] = { before: a ?? null, after: b ?? null };
    };
    for (const key of Object.keys(numbers)) walk(before[key], numbers[key], key);
    fs.writeFileSync(`${out}/compare.json`, JSON.stringify(changes, null, 2));

    const img = f => fs.existsSync(f) ? `<img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}">` : '<i>missing</i>';
    const keys = COMBOS.map(([n, , m]) => `${n}-${m}`);
    const head = `<tr><th></th>${keys.map(k => `<th colspan="2">${k.replace('sage', 'Sage').replace('cobalt', 'Cobalt Mono').replace('-', ' · ')}</th>`).join('')}</tr><tr><th></th>${keys.map(() => '<th>before</th><th>after</th>').join('')}</tr>`;
    const rows = PIECES.map(p => `<tr><th class="p">${p}</th>${keys.map(k => `<td>${img(`${out}/before/${k}-${p}.png`)}</td><td>${img(`${out}/after/${k}-${p}.png`)}</td>`).join('')}</tr>`).join('');
    const page = await browser.newPage({ viewport: { width: 3200, height: 800 } });
    await page.setContent(`<style>body{margin:0;padding:24px;background:#888;font:14px system-ui,sans-serif;color:#111}table{border-collapse:separate;border-spacing:8px;background:#fff;border-radius:8px}
      th{font-weight:600;text-align:center}th.p{text-align:right;vertical-align:top;white-space:nowrap}td{vertical-align:top}img{width:340px;display:block}</style><table>${head}${rows}</table>`);
    await page.evaluate(() => Promise.all([...document.images].map(i => i.decode())));
    await page.screenshot({ path: `${out}/composite.png`, fullPage: true });
    await page.close();
    console.log(`compare: ${Object.keys(changes).length} values changed`);
  }
} finally {
  await browser.close();
  fs.writeFileSync(`${dir}/numbers.json`, JSON.stringify({ errors, numbers }, null, 2));
  console.log(`errors ${errors.length}`);
}
