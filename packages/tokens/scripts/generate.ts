#!/usr/bin/env node
/**
 * Theme Generator Script V2
 *
 * Generates themes and typography using the V2 OKLCH-based system.
 * Output includes:
 * - Native V2 format (26-stop ramp, semantic tokens, actions, states)
 * - Typography presets (semantic style mappings)
 * - Kotlin output for Android/Compose consumption (Material 3 ColorScheme)
 *
 * Usage:
 *   pnpm generate-themes
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { baseThemesV2 } from '../src/data/baseThemesV2';
import { baseTypography } from '../src/data/baseTypography';
import { themeGeneratorV2 } from '../src/generator/generator';
import { typographyGeneratorV2 } from '../src/generator/typography/generator';
import { generateKotlinFile } from './generators/kotlin';
import { themesCSS } from '../src/core/themeCss';
import type { GeneratedThemeV2 } from '../src/generator/types';

// Get current file's directory when using ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * V2 Theme JSON structure
 * Uses numeric indices for compatibility with existing themeManager
 */
interface ThemeV2Entry {
  name: string;
  light: GeneratedThemeV2['light'];
  dark: GeneratedThemeV2['dark'];
}

interface ThemesV2JSON {
  [index: string]: ThemeV2Entry;
}

/**
 * Typography JSON structure
 */
interface TypographyEntry {
  name: string;
  vars: Record<string, string>;
}

interface TypographyV2JSON {
  [index: string]: TypographyEntry;
}

// Generate V2 themes
console.log('Generating V2 themes...');
console.log(`Processing ${baseThemesV2.length} theme(s)...`);

const themesV2: ThemesV2JSON = {};

baseThemesV2.forEach((themeDef, index) => {
  console.log(`  [${index}] ${themeDef.name}`);

  // Generate V2 theme
  const v2Theme = themeGeneratorV2.generate(themeDef);

  // Store with numeric index key
  themesV2[index.toString()] = {
    name: v2Theme.name,
    light: v2Theme.light,
    dark: v2Theme.dark,
  };
});

// Generate typography presets
console.log('');
console.log('Generating typography presets...');
console.log(`Processing ${baseTypography.length} preset(s)...`);

const typographyV2: TypographyV2JSON = {};

baseTypography.forEach((typoDef, index) => {
  console.log(`  [${index}] ${typoDef.name}`);

  // Generate typography preset
  const typoPreset = typographyGeneratorV2.generate(typoDef);

  // Store with numeric index key
  typographyV2[index.toString()] = {
    name: typoPreset.name,
    vars: typoPreset.vars,
  };
});

// Write files
const outputDir = path.join(__dirname, '..', 'generated');

// Create directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write themes file
const themesOutputFile = path.join(outputDir, 'themesV2.json');
fs.writeFileSync(themesOutputFile, JSON.stringify(themesV2, null, 2));

// Write the themes as plain CSS (T32): every base theme, light and dark, scoped by data-levain-theme
const cssOutputFile = path.join(outputDir, 'themes.css');
fs.writeFileSync(cssOutputFile, themesCSS(themesV2));

// Write typography file
const typographyOutputFile = path.join(outputDir, 'typographyV2.json');
fs.writeFileSync(typographyOutputFile, JSON.stringify(typographyV2, null, 2));

// Log statistics
const themeCount = Object.keys(themesV2).length;
const themesFileSize = fs.statSync(themesOutputFile).size;
const themesFileSizeKB = (themesFileSize / 1024).toFixed(1);

const typoCount = Object.keys(typographyV2).length;
const typoFileSize = fs.statSync(typographyOutputFile).size;
const typoFileSizeKB = (typoFileSize / 1024).toFixed(1);

console.log('');
console.log(`Generated ${themeCount} V2 theme(s)`);
console.log(`  Output: ${themesOutputFile} (${themesFileSizeKB} KB)`);
console.log(`  CSS: ${cssOutputFile} (${(fs.statSync(cssOutputFile).size / 1024).toFixed(1)} KB)`);
console.log('');
console.log(`Generated ${typoCount} typography preset(s)`);
console.log(`  Output: ${typographyOutputFile} (${typoFileSizeKB} KB)`);
console.log('');
console.log('Each theme includes:');
console.log('  - 26-stop unified surface ramp');
console.log('  - 21 semantic tokens');
console.log('  - 12 action colors (success/error/caution/info x base/fg/bg)');
console.log('  - 3 state overlays (hover/focus/active)');
console.log('');
console.log('Each typography preset includes:');
console.log('  - 12 semantic styles (body, label, heading, caption, code)');
console.log('  - CSS var mappings to primitives');

// Generate Kotlin output for Android
console.log('');
console.log('Generating Kotlin output for Android...');

const kotlinContent = generateKotlinFile(themesV2);
const kotlinOutputFile = path.join(outputDir, 'ThemesV2.kt');
fs.writeFileSync(kotlinOutputFile, kotlinContent);

const kotlinFileSize = fs.statSync(kotlinOutputFile).size;
const kotlinFileSizeKB = (kotlinFileSize / 1024).toFixed(1);

console.log(`Generated Kotlin file with ${themeCount} theme(s)`);
console.log(`  Output: ${kotlinOutputFile} (${kotlinFileSizeKB} KB)`);
console.log('');
console.log('Kotlin output includes:');
console.log('  - Material 3 ColorScheme for each theme (light + dark)');
console.log('  - Token mapping: surface-* -> surfaceContainer*, text-* -> onSurface*, etc.');
console.log('  - BuiltInThemes object with theme access helpers');
