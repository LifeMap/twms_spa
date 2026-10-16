// Call resume synchronously in the click handler's stack, then await completion.
// Some mobile browsers leave resume() pending indefinitely when activation fails.
export async function resumeAudioContext(context, timeoutMs = 2500) {
 let timer;
 try {
  const resumed = context.resume();
  await Promise.race([
   resumed,
   new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('audio_timeout')), timeoutMs); }),
  ]);
  if (context.state !== 'running') throw new Error('audio_not_running');
 } finally { clearTimeout(timer); }
}
