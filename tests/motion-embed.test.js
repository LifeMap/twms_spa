import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedMotionOrigin, bindMotionMessageBridge } from '../public/motion/embed-bridge.js';
import { bindMotionControls } from '../public/motion/motion-controls.js';

const own = 'https://www.twms.ai';
test('only HTTPS TWMS domains or the exact current origin are allowed', () => {
 for (const origin of ['https://twms.ai', own, 'https://blog.twms.ai', 'https://deep.dev.twms.ai']) assert.equal(isAllowedMotionOrigin(origin, own), true, origin);
 for (const origin of ['null', '', 'https://eviltwms.ai', 'https://twms.ai.evil.test', 'http://blog.twms.ai', 'https://blog.twms.ai:444', 'https://user@twms.ai', 'https://twms.ai/path']) assert.equal(isAllowedMotionOrigin(origin, own), false, origin);
 assert.equal(isAllowedMotionOrigin('http://localhost:4321', 'http://localhost:4321'), true);
});

function dispatch(host, source, origin, data) {
 const event = new Event('message'); Object.assign(event, { source, origin, data }); host.dispatchEvent(event);
}
function bridgeHarness() {
 const host = new EventTarget(), messages = [], state = { paused: false, muted: true };
 host.parent = { postMessage: (data, origin) => messages.push({ data, origin }) };
 host.location = { origin: own }; host.document = { referrer: '' };
 const player = { getState: () => ({ ...state }), play: () => { state.paused = false; }, pause: () => { state.paused = true; }, setMuted: value => { state.muted = value; }, seek: value => { state.currentTime = value; } };
 const bridge = bindMotionMessageBridge({ host, player });
 const send = (command, extra = {}, origin = 'https://blog.twms.ai', source = host.parent) => dispatch(host, source, origin, { type: 'twms-motion-command', command, ...extra });
 return { host, messages, state, bridge, send };
}
test('no-referrer handshake routes state to the verified parent, never wildcard', () => {
 const h = bridgeHarness(); h.bridge.notify(); assert.equal(h.messages.length, 0);
 h.send('state'); assert.equal(h.messages.at(-1).origin, 'https://blog.twms.ai');
 h.send('togglePlay'); assert.equal(h.state.paused, true);
 h.send('toggleMute'); assert.equal(h.state.muted, false);
 h.send('setPaused', { paused: false }); assert.equal(h.state.paused, false);
 h.send('setMuted', { muted: true }); assert.equal(h.state.muted, true);
 h.send('seek', { time: 17 }); assert.equal(h.state.currentTime, 17);
});
test('bridge rejects spoofed origins/windows and invalid commands or values', () => {
 const h = bridgeHarness();
 h.send('togglePlay', {}, 'https://twms.ai.evil.test'); h.send('toggleMute', {}, own, {});
 h.send('seek', { time: NaN }); h.send('seek', { time: '17' });
 h.send('setMuted', { muted: 'false' }); h.send('setPaused', { paused: 1 }); h.send('unknown');
 assert.deepEqual(h.state, { paused: false, muted: true }); assert.equal(h.messages.length, 0);
});
test('referrer discovery only sends state to allowed parents', () => {
 for (const [referrer, count] of [['https://blog.twms.ai/page', 1], ['https://evil.test/', 0]]) {
  const host = new EventTarget(), messages = [];
  host.parent = { postMessage: (...args) => messages.push(args) }; host.location = { origin: own }; host.document = { referrer };
  bindMotionMessageBridge({ host, player: { getState: () => ({}) } }).notify(); assert.equal(messages.length, count);
 }
});

class Element extends EventTarget {
 constructor(dataset = {}) { super(); this.dataset = dataset; this.attributes = {}; this.style = {}; this.icon = {}; }
 setAttribute(key, value) { this.attributes[key] = value; }
 querySelector() { return this.icon; }
 click() { if (!this.disabled) this.dispatchEvent(new Event('click')); }
}
test('cross-origin controller handshakes, handles rapid toggles, and trusts only its frame', () => {
 const host = new EventTarget(); host.location = { origin: 'https://blog.twms.ai' };
 const film = new Element(); film.src = `${own}/motion/twms-momentum.html?embedded=1`;
 const messages = []; film.contentWindow = { postMessage: (data, origin) => messages.push({ data, origin }) };
 Object.defineProperty(film.contentWindow, 'twmsMotion', { get() { throw new Error('cross origin'); } });
 const sound = new Element({ on: 'on', off: 'off' }), play = new Element({ playLabel: 'play', pauseLabel: 'pause' }), status = new Element();
 bindMotionControls({ film, sound, play, status, progress: null, host });
 assert.equal(messages[0].data.command, 'state'); assert.equal(messages[0].origin, own); assert.equal(play.disabled, true);
 const state = { type: 'twms-motion-state', paused: false, muted: true, audioPending: false, audioError: '', currentTime: 1, duration: 19.5 };
 dispatch(host, {}, own, state); assert.equal(play.disabled, true);
 dispatch(host, film.contentWindow, 'https://evil.test', state); assert.equal(play.disabled, true);
 dispatch(host, film.contentWindow, own, state); assert.equal(play.disabled, false);
 play.click(); play.click(); sound.click();
 assert.deepEqual(messages.slice(1).map(m => m.data.command), ['togglePlay', 'togglePlay', 'toggleMute']);
 // Do not optimistically display a state the player has not acknowledged.
 assert.equal(sound.attributes['aria-pressed'], 'false');
 dispatch(host, film.contentWindow, own, { ...state, muted: false, paused: true });
 assert.equal(sound.attributes['aria-pressed'], 'true'); assert.equal(play.icon.textContent, '▶');
 film.dispatchEvent(new Event('load')); assert.equal(play.disabled, true); assert.equal(messages.at(-1).data.command, 'state');
});
