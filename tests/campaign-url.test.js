import test from 'node:test';
import assert from 'node:assert/strict';
import { withHomepageUtm } from '../src/utils/campaign-url.js';

for (const lang of ['ko', 'en', 'ja']) {
 for (const [href, placement] of [
  ['https://blog.twms.ai/', 'header'],
  ['https://blog.twms.ai/', 'footer'],
  ['https://autogram.twms.ai/', 'autogram_card'],
  ['https://tripplan.twms.ai/', 'tripplan_card'],
 ]) {
  test(`${placement} includes the ${lang} page language and shared campaign values`, () => {
   const url = new URL(withHomepageUtm(href, placement, lang));
   assert.equal(url.origin, new URL(href).origin);
   assert.equal(url.searchParams.get('utm_source'), 'twms');
   assert.equal(url.searchParams.get('utm_medium'), 'referral');
   assert.equal(url.searchParams.get('utm_campaign'), 'homepage');
   assert.equal(url.searchParams.get('utm_content'), `${placement}_${lang}`);
  });
 }
}

test('existing paths, non-UTM parameters and fragments are preserved', () => {
 const url = new URL(withHomepageUtm('https://tripplan.twms.ai/deals?category=flight#subscribe', 'tripplan_card', 'ko'));
 assert.equal(url.pathname, '/deals');
 assert.equal(url.searchParams.get('category'), 'flight');
 assert.equal(url.hash, '#subscribe');
});

test('UTM values are replaced rather than duplicated', () => {
 const once = withHomepageUtm('https://blog.twms.ai/?utm_content=old&utm_content=duplicate', 'header', 'ko');
 const twice = withHomepageUtm(once, 'footer', 'ja');
 assert.deepEqual(new URL(twice).searchParams.getAll('utm_content'), ['footer_ja']);
 assert.equal(new URL(twice).searchParams.getAll('utm_source').length, 1);
});
