/** Only the current origin and HTTPS TWMS hosts may control this player. */
export function isAllowedMotionOrigin(origin, ownOrigin) {
 if (origin === 'null' || !origin) return false;
 if (origin === ownOrigin) return true;
 try {
  const url = new URL(origin);
  return url.origin === origin && url.protocol === 'https:' && !url.port &&
   (url.hostname === 'twms.ai' || url.hostname.endsWith('.twms.ai'));
 } catch { return false; }
}

export function bindMotionMessageBridge({ host = window, player }) {
 let parentOrigin = null;
 const notify = () => {
  if (host.parent !== host && parentOrigin) {
   host.parent.postMessage({ type: 'twms-motion-state', ...player.getState() }, parentOrigin);
  }
 };
 // Referrers are optional; a validated state handshake also establishes origin.
 try {
  const origin = new URL(host.document.referrer).origin;
  if (isAllowedMotionOrigin(origin, host.location.origin)) parentOrigin = origin;
 } catch { /* no referrer */ }
 host.addEventListener('message', event => {
  if (host.parent === host || event.source !== host.parent ||
      !isAllowedMotionOrigin(event.origin, host.location.origin) ||
      event.data?.type !== 'twms-motion-command') return;
  const { command, time, muted, paused } = event.data;
  if (!['state', 'togglePlay', 'toggleMute', 'seek', 'setMuted', 'setPaused'].includes(command)) return;
  if (command === 'seek' && (typeof time !== 'number' || !Number.isFinite(time))) return;
  if (command === 'setMuted' && typeof muted !== 'boolean') return;
  if (command === 'setPaused' && typeof paused !== 'boolean') return;
  parentOrigin = event.origin;
  let result;
  if (command === 'togglePlay') result = player.getState().paused ? player.play() : player.pause();
  if (command === 'toggleMute') result = player.setMuted(!player.getState().muted);
  if (command === 'setPaused') result = paused ? player.pause() : player.play();
  if (command === 'setMuted') result = player.setMuted(muted);
  if (command === 'seek') result = player.seek(time);
  notify();
  Promise.resolve(result).then(notify, notify);
 });
 return { notify };
}
