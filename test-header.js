import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';

// Header.jsx is JSX and imports a stylesheet, so strip both before loading it.
async function loadHeader() {
  const src = (await readFile(new URL('./src/components/Header.jsx', import.meta.url), 'utf8'))
    .replace(/^import '\.\/header\.css';\r?\n/m, '')
    .replace(/^import React from 'react';\r?\n/m, '');
  const { code } = await transform(src, { loader: 'jsx', format: 'cjs' });
  const mod = { exports: {} };
  new Function('React', 'exports', 'module', code)(React, mod.exports, mod);
  return mod.exports.default;
}

const noop = () => {};

test('keeps the existing controls and their ids', async () => {
  const Header = await loadHeader();
  const html = renderToStaticMarkup(React.createElement(Header, { isLight: false, onToggleTheme: noop, onOpenBackup: noop }));
  assert.match(html, /id="backup-toggle"/);
  assert.match(html, /id="theme-toggle"/);
  assert.match(html, /<h1>Task Manager<\/h1>/);
});

test('actions live in a labelled nav and every button has an accessible name', async () => {
  const Header = await loadHeader();
  const html = renderToStaticMarkup(React.createElement(Header, { isLight: false, onToggleTheme: noop, onOpenBackup: noop }));
  assert.match(html, /<nav[^>]*aria-label="App actions"/);
  const buttons = html.match(/<button[^>]*>/g);
  assert.equal(buttons.length, 2);
  for (const b of buttons) assert.match(b, /aria-label="[^"]+"/);
});

test('theme button label and pressed state follow the theme', async () => {
  const Header = await loadHeader();
  const dark = renderToStaticMarkup(React.createElement(Header, { isLight: false, onToggleTheme: noop, onOpenBackup: noop }));
  const light = renderToStaticMarkup(React.createElement(Header, { isLight: true, onToggleTheme: noop, onOpenBackup: noop }));
  assert.match(dark, /aria-label="Switch to light mode"[^>]*aria-pressed="false"/);
  assert.match(light, /aria-label="Switch to dark mode"[^>]*aria-pressed="true"/);
  assert.match(light, /Dark mode/);
});

test('icons are hidden from assistive tech', async () => {
  const Header = await loadHeader();
  const html = renderToStaticMarkup(React.createElement(Header, { isLight: false, onToggleTheme: noop, onOpenBackup: noop }));
  const icons = html.match(/<span class="header-btn-icon"[^>]*>/g);
  assert.equal(icons.length, 2);
  for (const i of icons) assert.match(i, /aria-hidden="true"/);
});
