import test from 'node:test';
import assert from 'node:assert/strict';
import { createContactHandler } from '../server/contact.js';

const env = { TURNSTILE_SECRET_KEY: 'test-secret-not-a-cloudflare-dummy-key', SES_FROM_EMAIL: 'info@twms.ai', AWS_REGION: 'ap-northeast-2' };
const input = { name: 'Visitor', email: 'visitor@example.com', subject: 'Tripplan', message: 'I would like to learn more.', consent: true, token: 'verified-token', website: '' };
let sequence = 0;
function request(body = input, headers = {}) {
 return new Request('https://www.twms.ai/api/contact', { method: 'POST', headers: { origin: 'https://www.twms.ai', 'content-type': 'application/json', 'x-real-ip': `test-${++sequence}`, ...headers }, body: JSON.stringify(body) });
}
function fixture(verification = { success: true, hostname: 'www.twms.ai', action: 'contact' }) {
 const sent = []; const verified = [];
 const handler = createContactHandler({ env, fetchImpl: async (...args) => { verified.push(args); return Response.json(verification); }, sendMail: async data => { sent.push(data); return { MessageId: 'accepted-by-ses' }; } });
 return { handler, sent, verified };
}
test('verified inquiry goes only to the configured recipient with the visitor as reply-to', async () => {
 const { handler, sent, verified } = fixture();
 assert.equal((await handler(request({ ...input, recipient: 'attacker@example.com' }))).status, 200);
 assert.deepEqual(sent[0].Destination.ToAddresses, ['info@twms.ai']);
 assert.deepEqual(sent[0].ReplyToAddresses, ['visitor@example.com']);
 assert.equal(sent[0].FromEmailAddress, 'info@twms.ai');
 assert.equal(verified[0][1].body.get('response'), 'verified-token');
});
for (const verification of [{ success: false }, { success: true, hostname: 'evil.example', action: 'contact' }, { success: true, hostname: 'www.twms.ai', action: 'login' }]) {
 test(`Turnstile rejects ${JSON.stringify(verification)} before sending`, async () => {
  const { handler, sent } = fixture(verification);
  assert.equal((await handler(request())).status, 400); assert.equal(sent.length, 0);
 });
}
for (const change of [{ email: 'bad\r\nemail' }, { subject: 'Subject\nInjected' }, { message: 'tiny' }, { consent: false }, { token: '' }, { website: 'spam.example' }, { name: 'x'.repeat(101) }]) {
 test(`invalid input ${Object.keys(change)[0]} cannot trigger verification or delivery`, async () => {
  const { handler, sent, verified } = fixture();
  assert.equal((await handler(request({ ...input, ...change }))).status, 400);
  assert.equal(sent.length, 0); assert.equal(verified.length, 0);
 });
}
test('cross-origin requests are rejected', async () => {
 const { handler, sent } = fixture();
 assert.equal((await handler(request(input, { origin: 'https://evil.example' }))).status, 403); assert.equal(sent.length, 0);
});
test('the retired twms.in site cannot submit to the new domain by default', async () => {
 const { handler, sent } = fixture();
 assert.equal((await handler(request(input, { origin: 'https://www.twms.in' }))).status, 403);
 assert.equal(sent.length, 0);
});
test('oversized requests are rejected before parsing', async () => {
 const { handler, sent } = fixture();
 assert.equal((await handler(request({ ...input, message: 'x'.repeat(25000) }))).status, 413); assert.equal(sent.length, 0);
});
test('missing configuration and official test secret fail closed', async () => {
 for (const settings of [{}, { ...env, TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA' }]) {
  const handler = createContactHandler({ env: settings });
  assert.equal((await handler(request())).status, 503);
 }
});
test('SES failure returns an error instead of claiming success', async () => {
 const handler = createContactHandler({ env, fetchImpl: async () => Response.json({ success: true, hostname: 'www.twms.ai', action: 'contact' }), sendMail: async () => { throw new Error('SES rejected'); } });
 assert.equal((await handler(request())).status, 502);
});
test('only POST is accepted', async () => {
 assert.equal((await fixture().handler(new Request('https://www.twms.ai/api/contact'))).status, 405);
});
test('repeated requests from an IP are throttled', async () => {
 const { handler, sent } = fixture();
 for (let index = 0; index < 5; index++) assert.equal((await handler(request(input, { 'x-real-ip': 'repeat-test' }))).status, 200);
 assert.equal((await handler(request(input, { 'x-real-ip': 'repeat-test' }))).status, 429); assert.equal(sent.length, 5);
});
