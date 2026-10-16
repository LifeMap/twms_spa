import test from 'node:test';
import assert from 'node:assert/strict';
import { bindMotionControls } from '../src/utils/motion-controls.js';
import { resumeAudioContext } from '../public/motion/audio-activation.js';

class Element extends EventTarget {
 constructor(dataset = {}) { super(); this.dataset = dataset; this.attributes = {}; this.style = {}; this.icon = {}; }
 setAttribute(key, value) { this.attributes[key] = value; }
 querySelector() { return this.icon; }
 click() { if (!this.disabled) this.dispatchEvent(new Event('click')); }
}

function harness(ready = true) {
 const state = { paused: false, muted: true, audioPending: false, audioError: '', currentTime: 3, duration: 19.5 };
 const player = {
  getState: () => ({ ...state }),
  setMuted: value => { state.muted = value; },
  pause: () => { state.paused = true; }, play: () => { state.paused = false; },
 };
 const film = new Element(), sound = new Element({ on: 'sound on', off: 'sound off' });
 const play = new Element({ playLabel: 'play', pauseLabel: 'pause' });
 const status = new Element({ unavailable: 'load failed', audioError: 'retry audio' }), progress = new Element();
 const host = new EventTarget(); host.location = { origin: 'https://www.twms.ai' };
 film.contentWindow = { twmsMotion: ready ? player : null };
 const update = (data = { type: 'twms-motion-state' }, origin = host.location.origin) => {
  const event = new Event('message'); Object.assign(event, { data, origin, source: film.contentWindow }); host.dispatchEvent(event);
 };
 bindMotionControls({ film, sound, play, status, progress, host });
 return { state, player, film, sound, play, status, progress, update };
}

test('sound control invokes the player in the original click stack', () => {
 const h = harness(); let inGesture = false, invoked = false;
 h.player.setMuted = value => { assert.equal(inGesture, true); h.state.muted = value; invoked = true; };
 inGesture = true; h.sound.click(); inGesture = false;
 assert.equal(invoked, true); assert.equal(h.sound.attributes['aria-pressed'], 'true');
});

test('rapid play/pause clicks use live state instead of delayed messages', () => {
 const h = harness();
 h.play.click(); assert.equal(h.state.paused, true); assert.equal(h.play.icon.textContent, '▶');
 h.play.click(); assert.equal(h.state.paused, false); assert.equal(h.play.icon.textContent, 'Ⅱ');
 h.update({ type: 'twms-motion-state', paused: true });
 assert.equal(h.play.attributes['aria-label'], 'pause');
});

test('controls wait for iframe readiness and become enabled after handshake', () => {
 const h = harness(false);
 assert.equal(h.sound.disabled, true); assert.equal(h.play.disabled, true);
 h.film.contentWindow.twmsMotion = h.player; h.update();
 assert.equal(h.sound.disabled, false); assert.equal(h.play.disabled, false);
});

test('pending audio does not block pause and failures restore a retryable mute button', async () => {
 const h = harness(); let complete;
 h.player.setMuted = () => { h.state.audioPending = true; return new Promise(resolve => { complete = resolve; }); };
 h.sound.click(); assert.equal(h.sound.disabled, true); assert.equal(h.play.disabled, false);
 h.play.click(); assert.equal(h.state.paused, true);
 h.state.audioPending = false; h.state.audioError = 'audio_unavailable'; complete();
 await Promise.resolve(); await Promise.resolve();
 assert.equal(h.sound.disabled, false); assert.equal(h.sound.attributes['aria-pressed'], 'false');
 assert.equal(h.status.hidden, false); assert.equal(h.status.textContent, 'retry audio');
});

test('untrusted messages are ignored and failed frame loads disable controls', () => {
 const h = harness(); h.state.audioPending = true;
 h.update({ type: 'twms-motion-state' }, 'https://evil.example'); assert.equal(h.sound.disabled, false);
 h.film.contentWindow.twmsMotion = null; h.film.dispatchEvent(new Event('load'));
 assert.equal(h.play.disabled, true); assert.equal(h.status.textContent, 'load failed');
});

test('audio resume starts synchronously before the promise is awaited', async () => {
 let inGesture = true;
 const context = { state: 'suspended', resume() { assert.equal(inGesture, true); this.state = 'running'; return Promise.resolve(); } };
 const resumed = resumeAudioContext(context); inGesture = false;
 await resumed;
});

test('audio resume rejection, suspended state and a hung resume all fail closed', async () => {
 await assert.rejects(resumeAudioContext({ state: 'suspended', resume: () => Promise.reject(new Error('blocked')) }), /blocked/);
 await assert.rejects(resumeAudioContext({ state: 'suspended', resume: () => Promise.resolve() }), /audio_not_running/);
 await assert.rejects(resumeAudioContext({ state: 'suspended', resume: () => new Promise(() => {}) }, 10), /audio_timeout/);
});
