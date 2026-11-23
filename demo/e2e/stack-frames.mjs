#!/usr/bin/env node
// T22: the dialog stack's morphs, frame by frame. Opens the demo's stack from its card, sends the front away (Next) and
// closes the last one (Escape), recording a video (frames-<case>.webm) and probing every panel and surface each
// animation frame (frames-probes.json: where each is and how visible, to find a doubled or flashing one in numbers).
// strip-<case>.png: the video cut into frames (ffmpeg, 25 a second from each action's start), a row per action, each
// frame with its time since the action.
// Cases (FRAME_CASES, comma-separated): <card|nocard|single>-<light|dark>; card is the stack with its cardId, nocard
// without (?stackCard=0), single today's StatusCardDialog for reference. FRAME_THEME: 7 Cobalt Mono (default), 0 Sage.
// Run on the PC: sh demo/e2e/stack.sh <out> stack-frames.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const { chromium } = createRequire(path.join(process.env.PW_DIR, 'node_modules/'))('playwright-core');
const [base, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const exe = [process.env.CHROMIUM, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/google-chrome'].find(p => p && fs.existsSync(p));
if (!exe) throw new Error('no Chromium found (set CHROMIUM)');
const theme = process.env.FRAME_THEME ?? '7';
const prefix = theme === '0' ? 'sage-' : '';
const cases = (process.env.FRAME_CASES ?? 'card-light,card-dark,nocard-light,nocard-dark').split(',');
const pause = ms => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] });
const errors = [], probes = {}, actions = {};

// probes every animation frame for `ms` after the action, in the page, so a screenshot's cost doesn't skip any
const act = async (page, label, fn, ms = 900) => {
  const at = Date.now();
  await page.evaluate(ms => {
    window.__probe = [];
    const t0 = performance.now();
    const tick = () => {
      const t = Math.round(performance.now() - t0);
      window.__probe.push({ t, els: [...document.querySelectorAll('[data-stack-depth], [data-stack-surface], [role="dialog"]')].map(el => {
        const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
        return { el: el.hasAttribute('data-stack-surface') ? 'surface:' + el.getAttribute('data-stack-surface') : el.hasAttribute('data-stack-depth') ? 'panel' : 'dialog',
          depth: el.closest('[data-stack-depth]')?.getAttribute('data-stack-depth'), top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), w: Math.round(r.width), opacity: +(+cs.opacity).toFixed(2) };
      }) });
      if (t < ms) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, ms);
  await fn();
  await pause(ms + 200);
  return { label, at, frames: await page.evaluate(() => window.__probe) };
};

// the strip: FRAMES frames per action from the video, laid out in a page and screenshotted
const FRAMES = 16;
async function strip(name, webm, rows) {
  const tmp = fs.mkdtempSync(path.join(out, '.frames-'));
  // the sync mark: the first 25 fps frame whose corner is white; action times are counted from it
  const corner = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', webm, '-vf', 'fps=25,crop=4:4:2:2,format=gray', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 26 });
  let first = -1;
  for (let f = 1; f * 16 < corner.length; f++) if (corner[f * 16] > 200 && corner[(f - 1) * 16] < 60) { first = f; break; }
  if (first < 0) throw new Error('sync mark not found in ' + webm);
  const zero = first / 25;
  const html = rows.map(({ label, s }, i) => {
    execFileSync('ffmpeg', ['-loglevel', 'error', '-i', webm, '-ss', (zero + s).toFixed(3), '-frames:v', String(FRAMES), '-vf', 'fps=25,scale=420:-1', `${tmp}/${i}-%02d.jpg`]);
    const imgs = fs.readdirSync(tmp).filter(f => f.startsWith(i + '-')).sort()
      .map((f, k) => `<figure><img src="data:image/jpeg;base64,${fs.readFileSync(`${tmp}/${f}`).toString('base64')}"><figcaption>${k * 40} ms</figcaption></figure>`);
    return `<h2>${label}</h2><div class="row">${imgs.join('')}</div>`;
  }).join('');
  fs.rmSync(tmp, { recursive: true, force: true });
  const sheet = await browser.newPage({ viewport: { width: 1780, height: 300 } });
  await sheet.setContent(`<style>body{margin:0;padding:10px;font:13px system-ui;background:#fff;color:#222}h1{font-size:16px;margin:0}h2{font-size:14px;margin:12px 0 4px}
    .row{display:flex;flex-wrap:wrap;gap:4px}figure{margin:0}img{width:420px;display:block;border:1px solid #ccc}figcaption{font-size:11px;color:#555}</style>
    <h1>${name}${process.env.FRAME_NOTE ? ' (' + process.env.FRAME_NOTE + ')' : ''}</h1>${html}`);
  await sheet.screenshot({ path: `${out}/strip-${name}.png`, fullPage: true });
  await sheet.close();
}

try {
  for (const name of cases) {
    const [kind, mode] = name.split('-');
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 760 }, deviceScaleFactor: 1, recordVideo: { dir: `${out}/video-${name}`, size: { width: 1000, height: 760 } } });
    const page = await ctx.newPage();
    const start = Date.now();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${base}?theme=${theme}&mode=${mode}&stackCard=${kind === 'card' ? 1 : 0}`, { waitUntil: 'networkidle' });
    // a sync mark for the video, whose first frame comes some time after the page opens: a corner square that turns
    // from black to white at a known time (found in the video by strip())
    await page.evaluate(() => { const m = document.createElement('div'); m.id = 'sync'; m.style.cssText = 'position:fixed;left:0;top:0;width:8px;height:8px;background:#000;z-index:99999'; document.body.append(m); });
    await pause(400);
    const mark = Date.now();
    await page.evaluate(() => { document.getElementById('sync').style.background = '#fff'; });
    await pause(400);
    await page.evaluate(() => document.getElementById('sync').remove());
    const rows = [];
    if (kind === 'single') {
      const one = page.locator('[data-list="todo"]').getByText('Drag and drop on the board').first();
      await one.scrollIntoViewIfNeeded(); await pause(900);
      rows.push(await act(page, 'open', () => one.click()));
      rows.push(await act(page, 'close (Escape)', () => page.keyboard.press('Escape')));
    } else {
      const card = page.locator('[data-demo="stack-card"]');
      await card.scrollIntoViewIfNeeded(); await pause(900);
      rows.push(await act(page, 'open', () => card.getByText('The strip, second pass').first().click()));
      rows.push(await act(page, 'front leaves (Next)', () => page.getByRole('button', { name: 'Next', exact: true }).click()));
      rows.push(await act(page, 'last close (Escape)', () => page.keyboard.press('Escape')));
    }
    await pause(300);
    const video = page.video();
    await ctx.close();
    fs.renameSync(await video.path(), `${out}/frames-${prefix}${name}.webm`);
    fs.rmSync(`${out}/video-${name}`, { recursive: true, force: true });
    probes[prefix + name] = rows.map(({ label, frames }) => ({ label, frames }));
    actions[prefix + name] = rows.map(({ label, at }) => ({ label, s: (at - mark) / 1000 }));
    await strip(prefix + name, `${out}/frames-${prefix}${name}.webm`, actions[prefix + name]);
  }
} finally {
  await browser.close();
}
fs.writeFileSync(`${out}/frames-${prefix}probes.json`, JSON.stringify({ probes, errors }, null, 1));
fs.writeFileSync(`${out}/frames-${prefix}actions.json`, JSON.stringify(actions, null, 1));
console.log(JSON.stringify({ cases, errors }));
if (errors.length) process.exit(1);
