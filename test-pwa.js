import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { manifest } from './pwa-manifest.js';

const read = (file) => readFileSync(new URL(file, import.meta.url), 'utf8');

// Width and height of a PNG, read from its IHDR chunk.
function pngSize(file) {
  const bytes = readFileSync(new URL(`./public/${file}`, import.meta.url));
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${file} is not a PNG`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

test('manifest has what browsers need to offer installation', () => {
  assert.ok(manifest.name && manifest.short_name, 'name and short_name');
  assert.ok(manifest.short_name.length <= 12, 'short_name fits under an app icon');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  assert.match(manifest.theme_color, /^#[0-9a-f]{6}$/i);
  assert.match(manifest.background_color, /^#[0-9a-f]{6}$/i);
});

test('manifest icons exist and have the size they claim', () => {
  const anyPurpose = manifest.icons.filter((i) => i.purpose === 'any');
  const sizes = anyPurpose.map((i) => i.sizes);
  assert.ok(sizes.includes('192x192'), 'a 192x192 icon');
  assert.ok(sizes.includes('512x512'), 'a 512x512 icon');
  assert.ok(
    manifest.icons.some((i) => i.purpose === 'maskable' && i.sizes === '512x512'),
    'a 512x512 maskable icon'
  );
  for (const icon of manifest.icons) {
    assert.equal(icon.type, 'image/png');
    assert.ok(existsSync(new URL(`./public/${icon.src}`, import.meta.url)), `${icon.src} exists in public/`);
    const [w, h] = icon.sizes.split('x').map(Number);
    assert.deepEqual(pngSize(icon.src), { width: w, height: h }, `${icon.src} is ${icon.sizes}`);
  }
});

test('the page links its icons and theme colour', () => {
  const html = read('./index.html');
  assert.match(html, /<meta name="theme-color" content="#[0-9a-f]{6}"/i);
  assert.match(html, /<link rel="apple-touch-icon" href="\/apple-touch-icon\.png"/);
  assert.match(html, /<link rel="icon" href="\/favicon\.svg"/);
  assert.ok(existsSync(new URL('./public/apple-touch-icon.png', import.meta.url)));
  assert.ok(existsSync(new URL('./public/favicon.svg', import.meta.url)));
  assert.deepEqual(pngSize('apple-touch-icon.png'), { width: 180, height: 180 });
});

test('the service worker and manifest are never cached long, so updates reach installed copies', () => {
  const toml = read('./netlify.toml');
  for (const file of ['/sw.js', '/manifest.webmanifest']) {
    const block = toml.split('[[headers]]').find((b) => b.includes(`for = "${file}"`));
    assert.ok(block, `a header rule for ${file}`);
    assert.match(block, /Cache-Control = "no-cache"/);
  }
});

test('the vite config precaches the shell and waits for the user before updating', () => {
  const config = read('./vite.config.js');
  assert.match(config, /registerType: 'prompt'/);
  assert.match(config, /navigateFallback: 'index\.html'/);
  assert.match(config, /cleanupOutdatedCaches: true/);
});
