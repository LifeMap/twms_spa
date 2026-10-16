/**
 * Same-origin control bridge. Audio calls must stay in the button click stack;
 * postMessage would move them to a new task and can lose mobile user activation.
 * @param {{film: HTMLIFrameElement, sound: HTMLButtonElement, play: HTMLButtonElement,
 * progress: HTMLElement|null, status: HTMLElement|null, host?: Window}} elements
 */
export function bindMotionControls({ film, sound, play, progress, status, host = window }) {
 const getPlayer = () => {
  try { return film.contentWindow?.twmsMotion; } catch { return null; }
 };
 let pending = false;
 const unavailable = () => {
  sound.disabled = true; play.disabled = true;
  if (status) { status.textContent = status.dataset.unavailable || ''; status.hidden = false; }
 };
 const sync = () => {
  const player = getPlayer();
  if (!player) { sound.disabled = true; play.disabled = true; return; }
  const state = player.getState();
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
  invoke(player => player.setMuted(!player.getState().muted));
 });
 play.addEventListener('click', () => invoke(player => player.getState().paused ? player.play() : player.pause()));
 film.addEventListener('load', () => getPlayer() ? sync() : unavailable());
 film.addEventListener('error', unavailable);
 host.addEventListener('message', event => {
  if (event.origin !== host.location.origin || event.source !== film.contentWindow || event.data?.type !== 'twms-motion-state') return;
  // Re-read live state instead of applying a potentially stale queued message.
  sync();
 });
 sync();
}
