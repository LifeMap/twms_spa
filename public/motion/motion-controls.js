import { isAllowedMotionOrigin } from './embed-bridge.js';

/**
 * Prefer synchronous same-origin calls for mobile audio. Cross-origin TWMS
 * embeds use authenticated messages and the player's acknowledged state.
 * @param {{film: HTMLIFrameElement, sound: HTMLButtonElement, play: HTMLButtonElement,
 * progress: HTMLElement|null, status: HTMLElement|null, host?: Window}} elements
 */
export function bindMotionControls({ film, sound, play, progress, status, host = window }) {
 const getPlayer = () => {
  try { return film.contentWindow?.twmsMotion; } catch { return null; }
 };
 const frameOrigin = () => {
  try { return new URL(film.src, host.location.href || host.location.origin).origin; } catch { return null; }
 };
 const canMessage = () => isAllowedMotionOrigin(host.location.origin, frameOrigin()) &&
  isAllowedMotionOrigin(frameOrigin(), host.location.origin);
 let remoteState = null;
 const send = (command, values = {}) => {
  const origin = frameOrigin();
  if (canMessage()) film.contentWindow?.postMessage({ type: 'twms-motion-command', command, ...values }, origin);
 };
 let pending = false;
 const unavailable = () => {
  sound.disabled = true; play.disabled = true;
  if (status) { status.textContent = status.dataset.unavailable || ''; status.hidden = false; }
 };
 const sync = () => {
  const player = getPlayer();
  const state = player ? player.getState() : remoteState;
  if (!state) { sound.disabled = true; play.disabled = true; return; }
  pending = Boolean(state.audioPending);
  sound.disabled = pending; play.disabled = false;
  const label = state.muted ? sound.dataset.on : sound.dataset.off;
  sound.setAttribute('aria-label', label);
  sound.setAttribute('aria-pressed', String(!state.muted));
  sound.setAttribute('aria-busy', String(pending));
  sound.title = label;
  play.setAttribute('aria-label', state.paused ? play.dataset.playLabel : play.dataset.pauseLabel);
  play.setAttribute('aria-pressed', String(!state.paused));
  const icon = play.querySelector('[data-play-icon]');
  if (icon) icon.textContent = state.paused ? '▶' : 'Ⅱ';
  if (progress && state.duration > 0) progress.style.width = `${Math.max(0, Math.min(100, state.currentTime / state.duration * 100))}%`;
  if (status) { status.textContent = state.audioError ? status.dataset.audioError || '' : ''; status.hidden = !state.audioError; }
 };
 const invoke = action => {
  const player = getPlayer();
  if (!player) { unavailable(); return; }
  try {
   // Invoke BEFORE any Promise/await to retain the original trusted gesture.
   const result = action(player);
   sync();
   Promise.resolve(result).then(sync, () => {
    sync();
    if (status) { status.textContent = status.dataset.audioError || ''; status.hidden = false; }
   });
  } catch { unavailable(); }
 };
 sound.addEventListener('click', () => {
  if (pending) return;
  if (getPlayer()) invoke(player => player.setMuted(!player.getState().muted));
  else if (remoteState && canMessage()) send('toggleMute');
  else unavailable();
 });
 play.addEventListener('click', () => {
  if (getPlayer()) invoke(player => player.getState().paused ? player.play() : player.pause());
  else if (remoteState && canMessage()) send('togglePlay');
  else unavailable();
 });
 film.addEventListener('load', () => {
  remoteState = null;
  if (getPlayer()) sync();
  else if (canMessage()) { sync(); send('state'); }
  else unavailable();
 });
 film.addEventListener('error', unavailable);
 host.addEventListener('message', event => {
  if (event.source !== film.contentWindow || event.data?.type !== 'twms-motion-state' ||
      event.origin !== (frameOrigin() || host.location.origin) || !isAllowedMotionOrigin(event.origin, host.location.origin)) return;
  if (!getPlayer()) {
   if (!canMessage()) return;
   const state = event.data;
   if (typeof state.paused !== 'boolean' || typeof state.muted !== 'boolean' ||
       typeof state.audioPending !== 'boolean' || !Number.isFinite(state.currentTime) ||
       !Number.isFinite(state.duration) || state.duration <= 0) return;
   remoteState = state;
  }
  // Re-read live state instead of applying a potentially stale queued message.
  sync();
 });
 sync();
 if (!getPlayer()) send('state');
}
