#!/usr/bin/env node
// T55: the convention for TagInput, EditableText and ChatInput in a real browser, on the demo's forms section. Run on
// the PC by demo/e2e/forms.sh after the capture (FORMS_CHECKS=demo/e2e/forms4-checks.mjs):
//   node forms4-checks.mjs <base-url> <out>
// Writes <out>/checks4.json and a screenshot of each interactive state (check4-*.png); exits 1 if a check fails.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const { chromium } = createRequire(path.join(process.env.PW_DIR, 'node_modules/'))('playwright-core');
const [base, out] = process.argv.slice(2);
const exe = [process.env.CHROMIUM, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/google-chrome'].find(p => p && fs.existsSync(p));
const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 1400 }, deviceScaleFactor: 2 })).newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(`${base}?only=forms&theme=0&mode=light`, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-demo="forms-part4"]');
const results = [];
const check = (what, ok, got) => results.push({ what, ok: !!ok, got });
const shot = name => page.locator('[data-demo="forms-part4"]').screenshot({ path: `${out}/check4-${name}.png` });

// TagInput: the suggestions by keyboard
const tags = page.getByRole('combobox', { name: 'Tags', exact: true });
await tags.click();
await tags.pressSequentially('re');
check('TagInput: typing opens a listbox of options', (await page.getByRole('listbox').count()) === 1, await page.getByRole('option').allTextContents());
await tags.press('ArrowDown');
const active = await tags.getAttribute('aria-activedescendant');
check('TagInput: ArrowDown sets aria-activedescendant', !!active, active);
await shot('taginput-active');
const firstOption = (await page.getByRole('option').first().textContent())?.trim();
await tags.press('Enter');
check(`TagInput: Enter adds the active option (${firstOption})`, (await tags.locator('xpath=..').getByRole('button', { name: `Remove ${firstOption} tag` }).count()) === 1, null);
await tags.pressSequentially('r');
await tags.press('Escape');
check('TagInput: Escape closes the suggestions', (await page.getByRole('listbox').count()) === 0 && (await tags.getAttribute('aria-expanded')) === 'false', null);
check('TagInput: the error field is invalid and described', (await page.getByRole('combobox', { name: /Topics/ }).getAttribute('aria-invalid')) === 'true', null);

// EditableText: Tab stop, F2/Enter, focus back
const title = page.locator('[data-demo="forms-part4"] [tabindex="0"]', { hasText: 'Spring journal' });
await title.focus();
const ring = await title.evaluate(el => getComputedStyle(el).boxShadow);
check('EditableText: the focused root shows a ring', ring && ring !== 'none', ring);
await shot('editabletext-focus');
await page.keyboard.press('F2');
const field = page.getByRole('textbox', { name: 'Edit text' });
check('EditableText: F2 opens the field, focused', await field.evaluate(el => el === document.activeElement), null);
await field.fill('Autumn journal');
await field.press('Enter');
check('EditableText: Enter saves', (await page.getByText('Autumn journal', { exact: true }).count()) >= 1, null);
check('EditableText: focus returns to the root', await page.evaluate(() => document.activeElement?.textContent?.includes('Autumn journal')), await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 120)));
await page.keyboard.press('Enter');
check('EditableText: Enter on the root opens the field again', (await field.count()) === 1, null);
await field.press('Escape');

// ChatInput: auto-resize, Enter submits, Shift+Enter a newline
const chat = page.getByRole('textbox', { name: 'Describe how to modify the image...' });
const h0 = await chat.evaluate(el => el.getBoundingClientRect().height);
await chat.click();
await chat.pressSequentially('one');
await chat.press('Shift+Enter');
await chat.pressSequentially('two');
await chat.press('Shift+Enter');
await chat.pressSequentially('three');
const h1 = await chat.evaluate(el => el.getBoundingClientRect().height);
check('ChatInput: Shift+Enter adds lines and the field grows', h1 > h0, [h0, h1]);
await shot('chatinput-grown');
await chat.press('Enter');
check('ChatInput: Enter submits (the demo clears it)', (await chat.inputValue()) === '', await chat.inputValue());

fs.writeFileSync(`${out}/checks4.json`, JSON.stringify({ ok: results.every(r => r.ok) && !errors.length, results, errors }, null, 2));
const failed = results.filter(r => !r.ok);
console.log(failed.length || errors.length ? `T55 checks FAILED:\n${[...failed.map(f => `${f.what}: ${JSON.stringify(f.got)}`), ...errors].join('\n')}` : `T55 checks: all ${results.length} OK`);
if (failed.length || errors.length) process.exitCode = 1;
await browser.close();
