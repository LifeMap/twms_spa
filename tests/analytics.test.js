import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const layout = readFileSync(new URL('../src/layouts/BaseLayout.astro', import.meta.url), 'utf8');
const source = layout.match(/<!-- Google Analytics -->[\s\S]*?<script is:inline>([\s\S]*?)<\/script>/)[1];

function run(url) {
 const window = {}, scripts = [];
 const context = vm.createContext({ window, location: new URL(url), document: {
  querySelector: () => scripts[0],
  createElement: () => ({ setAttribute() {} }),
  head: { append: script => scripts.push(script) },
 } });
 vm.runInContext(source, context);
 return { window, scripts, context };
}

test('GA markup is only included in production builds', () => {
 assert.match(layout, /\{import\.meta\.env\.PROD && <script is:inline>/);
 assert.doesNotMatch(layout, /<script[^>]+src="https:\/\/www\.googletagmanager\.com/);
});

for (const url of ['http://localhost:4321', 'http://127.0.0.1:4321', 'http://[::1]:4321', 'https://localhost', 'https://twms-spa.vercel.app', 'https://preview.twms.ai', 'https://www.twms.in', 'https://www.twms.ai.example.com', 'http://www.twms.ai']) {
 test(`GA does not load or queue events on ${url}`, () => {
  const { window, scripts } = run(url);
  assert.equal(scripts.length, 0);
  assert.equal(window.gtag, undefined);
  assert.equal(window.dataLayer, undefined);
 });
}

for (const url of ['https://www.twms.ai', 'https://twms.ai/en/']) {
 test(`GA loads once on ${url} using the existing measurement ID`, () => {
  const { window, scripts, context } = run(url);
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-LM605LPQZT');
  assert.equal(scripts[0].async, true);
  assert.equal(window.dataLayer[1][0], 'config');
  assert.equal(window.dataLayer[1][1], 'G-LM605LPQZT');
  vm.runInContext(source, context);
  assert.equal(scripts.length, 1);
  assert.equal(window.dataLayer.length, 2);
 });
}
