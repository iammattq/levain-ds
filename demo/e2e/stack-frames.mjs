#!/usr/bin/env node
// T22: the dialog stack's morphs, frame by frame. Opens the demo's stack from its card, sends the front away (Next) and
// closes the last one (Escape), recording a video (frames-<case>.webm) and probing every panel and surface each
// animation frame (frames-probes.json: where each is and how visible, and the front's content opacity; actions.json:
// when each open's words are fully in, from the click).
// strip-<case>.png: the video cut into frames (ffmpeg, 25 a second from each action's click, found by a sync square), a row per action, each
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

// probes every animation frame for `ms` after the action, in the page, so a screenshot's cost doesn't skip any.
// Times count from the action itself: a capture-phase click/keydown listener (installed per page) notes it, and
// flips the sync square in the video's corner in the same frame.
const act = async (page, label, fn, ms = 900) => {
  await page.evaluate(ms => {
    window.__probe = [];
    window.__at = undefined;
    const tick = () => {
      const now = performance.now();
      const t = window.__at === undefined ? -1 : Math.round(now - window.__at);
      // the front's words: the stack's front panel's content (not its surface layer), or the single dialog's body
      const body = document.querySelector('[data-stack-depth="0"] > div:not([data-stack-surface])') ?? document.querySelector('[role="dialog"]:not([data-stack-depth]) > div');
      window.__probe.push({ t, content: body ? +(+getComputedStyle(body).opacity).toFixed(2) : null, els: [...document.querySelectorAll('[data-stack-depth], [data-stack-surface], [role="dialog"]')].map(el => {
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
  const frames = (await page.evaluate(() => window.__probe)).filter(f => f.t >= 0);
  // the first frame the front's words are fully in, from the click
  const full = frames.find(f => f.content === 1 && f.t > 0);
  return { label, ms, contentIn: label === 'open' ? full?.t ?? null : undefined, frames };
};

// the strip: the video from each action's click, 25 frames a second, laid out in a page and screenshotted
async function strip(name, webm, rows) {
  const tmp = fs.mkdtempSync(path.join(out, '.frames-'));
  // the sync square's flips, one per action: the first 25 fps frame showing each is that action's 0 ms
  const corner = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', webm, '-vf', 'fps=25,crop=4:4:2:2,format=gray', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 26 });
  // (the first change can be the square appearing on the blank page before load: the actions' flips are the last ones)
  let flips = [];
  for (let f = 1; f * 16 < corner.length; f++) if ((corner[f * 16] > 128) !== (corner[(f - 1) * 16] > 128)) flips.push(f);
  if (flips.length < rows.length || flips.length > rows.length + 1) throw new Error(`${webm}: ${flips.length} sync flips for ${rows.length} actions`);
  flips = flips.slice(-rows.length);
  const html = rows.map(({ label, ms, contentIn }, i) => {
    const n = Math.ceil(ms / 40) + 1;
    execFileSync('ffmpeg', ['-loglevel', 'error', '-i', webm, '-vf', `fps=25,select=gte(n\\,${flips[i]}),scale=420:-1`, '-frames:v', String(n), '-vsync', 'vfr', `${tmp}/${i}-%02d.jpg`]);
    const imgs = fs.readdirSync(tmp).filter(f => f.startsWith(i + '-')).sort()
      .map((f, k) => `<figure><img src="data:image/jpeg;base64,${fs.readFileSync(`${tmp}/${f}`).toString('base64')}"><figcaption>${k * 40} ms</figcaption></figure>`);
    label += contentIn !== undefined ? ` (front's words fully in at ${contentIn ?? 'never'} ms, from the probes)` : '';
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
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${base}?bench=1&theme=${theme}&mode=${mode}&stackCard=${kind === 'card' ? 1 : 0}`, { waitUntil: 'networkidle' });
    // the sync square: black, flipped black/white by every click or key, in the same frame the app sees it; strip()
    // finds the flips in the video, one per action, so every strip's 0 ms is its click
    await page.evaluate(() => {
      const m = document.createElement('div');
      m.style.cssText = 'position:fixed;left:0;top:0;width:8px;height:8px;background:#000;z-index:99999;pointer-events:none';
      document.body.append(m);
      const flip = () => { window.__at = performance.now(); m.style.background = m.style.background === 'rgb(255, 255, 255)' ? '#000' : '#fff'; };
      document.addEventListener('click', flip, true);
      document.addEventListener('keydown', flip, true);
    });
    await pause(300);
    const rows = [];
    if (kind === 'single') {
      const one = page.locator('[data-list="todo"]').getByText('Drag and drop on the board').first();
      await one.scrollIntoViewIfNeeded(); await pause(900);
      rows.push(await act(page, 'open', () => one.click(), 1100));
      rows.push(await act(page, 'close (Escape)', () => page.keyboard.press('Escape')));
    } else {
      const card = page.locator('[data-demo="stack-card"]');
      await card.scrollIntoViewIfNeeded(); await pause(900);
      rows.push(await act(page, 'open', () => card.getByText('The strip, second pass').first().click(), 1100));
      rows.push(await act(page, 'front leaves (Next)', () => page.getByRole('button', { name: 'Next', exact: true }).click()));
      rows.push(await act(page, 'last close (Escape)', () => page.keyboard.press('Escape')));
    }
    await pause(300);
    const video = page.video();
    await ctx.close();
    fs.renameSync(await video.path(), `${out}/frames-${prefix}${name}.webm`);
    fs.rmSync(`${out}/video-${name}`, { recursive: true, force: true });
    probes[prefix + name] = rows.map(({ label, frames }) => ({ label, frames }));
    actions[prefix + name] = rows.map(({ label, contentIn }) => ({ label, contentIn }));
    await strip(prefix + name, `${out}/frames-${prefix}${name}.webm`, rows);
  }
} finally {
  await browser.close();
}
fs.writeFileSync(`${out}/frames-${prefix}probes.json`, JSON.stringify({ probes, errors }, null, 1));
fs.writeFileSync(`${out}/frames-${prefix}actions.json`, JSON.stringify(actions, null, 1));
console.log(JSON.stringify({ cases, errors }));
if (errors.length) process.exit(1);
