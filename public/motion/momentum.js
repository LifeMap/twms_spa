(() => {
 'use strict';
 const bpm = 160, tempoRatio = bpm / 150, beat = 60 / bpm;
 // Four intro beats, then eight beats per product and finale; one shared cut grid.
 const starts = [0, 4, 12, 20, 28, 36, 44, 52].map(value => value * beat);
 const duration = starts.at(-1), finalScene = starts.length - 2;
 const slogan = 'Tiny Wins. Make Success.';
 const names = [slogan, 'AUTOGRAM', 'TRIPPLAN', 'JARVIS', 'ORCH AI', 'TWMS STUDIO', slogan];
 // Original motion palette; service card backgrounds follow these colors.
 const palettes = [
  ['#071c12', '#ecffdf', '#d1ff43', '#b79af4'], ['#d1ff43', '#103623', '#244e33', '#b79af4'],
  ['#194df2', '#eff8e1', '#d1ff43', '#f890ce'],
  ['#0b281b', '#eff8e1', '#b79af4', '#d1ff43'], ['#f890ce', '#102b1b', '#294d38', '#d1ff43'],
  ['#ffe45f', '#102b1b', '#254d36', '#b79af4'], ['#071c12', '#eff8e1', '#d1ff43', '#b79af4'],
 ];
 const stage = document.querySelector('#stage'), scenes = [...document.querySelectorAll('.scene')];
 const canvas = document.querySelector('#graphics'), ctx = canvas.getContext('2d');
 const params = new URLSearchParams(location.search), embedded = params.get('embedded') === '1';
 document.body.classList.toggle('embedded', embedded);
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 let paused = reduced.matches, muted = true, position = reduced.matches ? starts[finalScene] + beat * 4 : 0, last = performance.now(), active = -1, notifyAt = 0;
 const musicLevel = .85;
 let audio, master, mix, echo, noiseBuffer, musicTimer, lastBeat = -1;
 const wave = document.querySelector('#waveform');
 for (let i = 0; i < 45; i++) wave.append(document.createElement('i'));
 const waveBars = [...wave.children], strip = document.querySelector('#beat-strip');
 for (let i = 0; i < 40; i++) strip.append(document.createElement('i'));
 const stripBars = [...strip.children];
 const ease = value => 1 - Math.pow(1 - Math.max(0, Math.min(1, value)), 4);
 const stars = Array.from({ length: 170 }, (_, i) => ({ angle: i * 2.39996, radius: 110 + (i * 71 % 670), size: 2 + i % 6, speed: .08 + (i % 7) * .025 }));
 const resize = () => { const scale = Math.min(innerWidth / 1600, innerHeight / 900); stage.style.transform = `scale(${scale})`; };
 addEventListener('resize', resize); resize();
 const localized = {
  en: [slogan, 'Turn comment keywords into automatic direct messages.', 'Flight deals and travel discoveries, delivered by newsletter.', 'A personal AI assistant connecting memory and tools.', 'Connect knowledge. Execute tasks. Verify and iterate.', 'From scripts to scenes, previs and AI filmmaking.'],
  ja: [slogan, 'コメントのキーワードから、自動DMへ。', '航空券の特価と旅の発見をニュースレターで。', '記憶とツールをつなぐ、自分のAIアシスタント。', '知識をつなぎ、タスクを実行し、結果を検証する。', 'シナリオからシーン、プリビズ、AI映像制作へ。'],
 };
 if (localized[params.get('lang')]) {
  document.documentElement.lang = params.get('lang');
  document.querySelector('.intro-note').textContent = slogan;
  document.querySelectorAll('.product p').forEach((el, i) => el.textContent = localized[params.get('lang')][i + 1]);
 }
 function paint(index, time, phase) {
  const palette = palettes[index];
  const pulse = Math.exp(-((time % beat) / beat) * 5), cut = Math.exp(-phase * 18);
  time *= tempoRatio;
  ctx.clearRect(0, 0, 1600, 900);
  // Graphic accents move continuously rather than using full-screen flashes.
  ctx.save(); ctx.translate(index === 0 || index === finalScene ? 800 : 1180, 430);
  ctx.strokeStyle = palette[1]; ctx.globalAlpha = .18; ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
   ctx.save(); ctx.rotate(time * .2 + i * .35); ctx.beginPath(); ctx.ellipse(0, 0, 270 + i * 35 + pulse * 35, 130 + i * 35, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  for (const star of stars) {
   const angle = star.angle + time * star.speed;
   const radius = star.radius + cut * 170 + pulse * 22;
   const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius * .62;
   ctx.fillStyle = ctx.strokeStyle = star.size % 2 ? palette[2] : palette[3]; ctx.globalAlpha = .35 + .45 * Math.sin(angle * 2) ** 2;
   ctx.fillRect(x, y, star.size * (1 + cut), star.size * (1 + cut));
   if (star.size > 5) { ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(angle) * (18 + cut * 70), y - Math.sin(angle) * (18 + cut * 70)); ctx.stroke(); }
  }
  // Neon arcs and cut bursts stay in the illustration area, behind the copy.
  for (let i = 0; i < 3; i++) {
   ctx.strokeStyle = palette[2 + i % 2]; ctx.globalAlpha = .5;
   ctx.lineWidth = 6 + pulse * 8; ctx.beginPath();
   const radius = 285 + i * 58 + pulse * 30;
   ctx.arc(0, 0, radius, time * (.4 + i * .12) + i * 2, time * (.4 + i * .12) + i * 2 + .9); ctx.stroke();
  }
  ctx.globalAlpha = cut * .65; ctx.lineWidth = 4;
  for (let i = 0; i < 24; i++) {
   const angle = i * Math.PI / 12 + time * .1, radius = 170 + (1 - cut) * 430;
   ctx.strokeStyle = palette[2 + i % 2]; ctx.beginPath(); ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
   ctx.lineTo(Math.cos(angle) * (radius + 95 * cut), Math.sin(angle) * (radius + 95 * cut)); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = palette[1]; ctx.globalAlpha = .09;
  for (let i = 0; i < 12; i++) { const x = (i * 170 + time * 35) % 1800 - 100; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - 220, 900); ctx.stroke(); }
  // Cut-edge accents slide in for each new scene, never obscuring the headline.
  ctx.globalAlpha = .85; ctx.fillStyle = palette[3];
  const entry = Math.max(0, 1 - phase * 8);
  if (entry > 0) { ctx.save(); ctx.translate(1480 + (1 - entry) * 250, 0); ctx.rotate(.18); ctx.fillRect(0, -100, 240, 1200); ctx.restore(); }
  // A low ribbon gives each downbeat a sweep without a full-frame strobe.
  ctx.globalAlpha = .2 + pulse * .15; ctx.fillStyle = palette[2];
  ctx.save(); ctx.translate((time * 720) % 2300 - 350, 810); ctx.rotate(-.12); ctx.fillRect(0, 0, 320, 25 + pulse * 20); ctx.restore();
  ctx.globalAlpha = 1;
 }
 function render() {
  const index = starts.findIndex((start, i) => i <= finalScene && position >= start && position < starts[i + 1]);
  const safeIndex = index < 0 ? finalScene : index;
  const local = position - starts[safeIndex], span = starts[safeIndex + 1] - starts[safeIndex], phase = local / span;
  if (active !== safeIndex) {
   scenes.forEach((el, i) => { el.classList.toggle('active', i === safeIndex); el.setAttribute('aria-hidden', String(i !== safeIndex)); });
   active = safeIndex;
   const [bg, fg, accent] = palettes[safeIndex]; stage.style.setProperty('--bg', bg); stage.style.setProperty('--fg', fg); stage.style.setProperty('--accent', accent);
   document.querySelector('#scene-label').textContent = names[safeIndex];
  }
  stage.style.setProperty('--phase', String(phase)); stage.style.setProperty('--enter', String(ease(local * tempoRatio / .32)));
  const pulse = Math.exp(-((position % beat) / beat) * 5);
  stage.style.setProperty('--pulse', String(pulse));
  stage.style.setProperty('--swing', String(Math.sin(local * tempoRatio * 2.2)));
  stage.style.setProperty('--impact', String(Math.exp(-local * tempoRatio * 7)));
  waveBars.forEach((el, i) => el.style.height = `${12 + 62 * Math.abs(Math.sin(position * tempoRatio * 5 + i * .54)) * (.3 + pulse * .7)}px`);
  stripBars.forEach((el, i) => el.style.height = `${3 + 12 * Math.abs(Math.sin(i * .65 + position * tempoRatio * 4))}px`);
  document.querySelector('#timecode').textContent = `00:${String(Math.floor(position)).padStart(2, '0')} / 00:${duration}`;
  document.querySelector('#scrub').value = String(position);
  document.querySelector('#play').textContent = paused ? '▶' : 'Ⅱ'; document.querySelector('#play').setAttribute('aria-label', paused ? '재생' : '일시 정지');
  document.querySelector('#sound').textContent = muted ? '소리 켜기 ♪' : '소리 끄기 ♫'; document.querySelector('#sound').setAttribute('aria-pressed', String(!muted));
  paint(safeIndex, position, phase);
 }
 function notify() { if (parent !== window) parent.postMessage({ type: 'twms-motion-state', paused, muted, currentTime: position, duration }, location.origin); }
 function tone(frequency, start, length, volume, type = 'sine', end = frequency, cutoff = 0, wet = false) {
  const oscillator = audio.createOscillator(), gain = audio.createGain(); oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start); oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, end), start + length);
  gain.gain.setValueAtTime(.0001, start); gain.gain.exponentialRampToValueAtTime(volume, start + .006); gain.gain.exponentialRampToValueAtTime(.0001, start + length);
  if (cutoff) { const filter = audio.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.setValueAtTime(cutoff, start); filter.frequency.exponentialRampToValueAtTime(350, start + length); oscillator.connect(filter); filter.connect(gain); }
  else oscillator.connect(gain);
  gain.connect(mix); if (wet) gain.connect(echo); oscillator.start(start); oscillator.stop(start + length + .02);
 }
 function noise(start, length, volume, frequency, type = 'highpass') {
  const source = audio.createBufferSource(), filter = audio.createBiquadFilter(), gain = audio.createGain();
  source.buffer = noiseBuffer; filter.type = type; filter.frequency.value = frequency;
  gain.gain.setValueAtTime(.0001, start); gain.gain.exponentialRampToValueAtTime(volume, start + .004); gain.gain.exponentialRampToValueAtTime(.0001, start + length);
  source.connect(filter); filter.connect(gain); gain.connect(mix); source.start(start); source.stop(start + length + .01);
 }
 function playBeat(index) {
  const start = audio.currentTime + .012, step = index % 4, chord = Math.floor(index / 8) % 4;
  const bass = [65.41, 55, 43.65, 49][chord], melody = [1, 1.5, 2, 1.25, 1.5, 2.5, 2, 1.5];
  // Four-on-the-floor kick, layered clap, offbeat hats and a rounded sub bass.
  tone(160, start, .24, .65, 'sine', 38); noise(start, .025, .09, 3400);
  if (step === 1 || step === 3) {
   tone(190, start, .12, .14, 'triangle', 95);
   [0, .014, .029].forEach(offset => noise(start + offset, .14, .13, 1300, 'bandpass'));
  }
  noise(start, .045, .055, 7500); noise(start + beat / 2, .105, .085, 6500);
  tone(bass / 2, start + .04, .3, .21); tone(bass, start + .04, .24, .11, 'sawtooth', bass, 850);
  tone(bass, start + beat * .65, .11, .085, 'triangle');
  // Bright detuned chord stabs and a stereo dotted-eighth-note lead echo.
  if (step === 0 || step === 2) [1, 1.25, 1.5].forEach(ratio => {
   tone(bass * 4 * ratio, start + .045, .32, .048, 'sawtooth', bass * 4 * ratio, 3600, true);
   tone(bass * 4 * ratio * 1.004, start + .045, .3, .035, 'sawtooth', bass * 4 * ratio * 1.004, 3000, true);
  });
  [0, beat / 2].forEach((offset, i) => tone(bass * 8 * melody[(index * 2 + i) % 8], start + .075 + offset, .16, .065, 'triangle', bass * 8 * melody[(index * 2 + i) % 8], 0, true));
  const isCut = starts.slice(0, -1).some(time => Math.round(time / beat) === index);
  if (isCut) { noise(start, .75, .23, 2800); tone(100, start, .55, .28, 'sine', 28); tone(900, start, .4, .04, 'sawtooth', 120, 2400, true); }
  // Include the loop seam so the last riser lands on the opening impact.
  if (starts.slice(1).some(time => Math.round(time / beat) - 1 === index)) {
   noise(start, .38, .14, 4200); tone(220, start, .38, .04, 'sawtooth', 1760, 4500, true);
  }
 }
 async function soundOn() {
  try {
   audio ??= new AudioContext();
   if (!master) {
    master = audio.createGain(); master.gain.value = 0; mix = audio.createGain();
    const compressor = audio.createDynamicsCompressor(); compressor.threshold.value = -15; compressor.knee.value = 12; compressor.ratio.value = 5; compressor.attack.value = .003; compressor.release.value = .16;
    mix.connect(compressor); compressor.connect(master); master.connect(audio.destination);
    echo = audio.createDelay(1); echo.delayTime.value = beat * .75;
    const feedback = audio.createGain(), wet = audio.createGain(), pan = audio.createStereoPanner(); feedback.gain.value = .27; wet.gain.value = .2; pan.pan.value = .45;
    echo.connect(feedback); feedback.connect(echo); echo.connect(wet); wet.connect(pan); pan.connect(mix);
    noiseBuffer = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
    const samples = noiseBuffer.getChannelData(0); let seed = 1701;
    for (let i = 0; i < samples.length; i++) { seed = (seed * 16807) % 2147483647; samples[i] = seed / 1073741824 - 1; }
   }
   await audio.resume();
   if (audio.state !== 'running') return;
   muted = false; master.gain.setTargetAtTime(paused ? 0 : musicLevel, audio.currentTime, .08);
   if (!musicTimer) musicTimer = setInterval(() => { if (muted || paused || document.hidden) return; const index = Math.floor(position / beat); if (lastBeat !== index) { lastBeat = index; playBeat(index); } }, 20);
  } catch { muted = true; }
  render(); notify();
 }
 function setPaused(value) { paused = value; last = performance.now(); lastBeat = -1; if (audio && master) master.gain.setTargetAtTime(paused || muted ? 0 : musicLevel, audio.currentTime, .025); render(); notify(); }
 function setMuted(value) { if (!value) return soundOn(); muted = true; if (master) master.gain.setTargetAtTime(0, audio.currentTime, .025); render(); notify(); }
 function seek(value) { position = Math.max(0, Math.min(duration - .001, Number(value) || 0)); last = performance.now(); lastBeat = -1; render(); notify(); }
 document.querySelector('#play').onclick = () => setPaused(!paused);
 document.querySelector('#sound').onclick = () => setMuted(!muted);
 document.querySelector('#restart').onclick = () => { seek(0); setPaused(false); };
 document.querySelector('#scrub').oninput = event => seek(event.target.value);
 addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== parent || event.data?.type !== 'twms-motion-command') return;
  if (event.data.command === 'togglePlay') setPaused(!paused);
  if (event.data.command === 'toggleMute') setMuted(!muted);
  if (event.data.command === 'seek') seek(event.data.time);
  if (event.data.command === 'state') notify();
 });
 reduced.addEventListener('change', () => { if (reduced.matches) setPaused(true); });
 document.addEventListener('visibilitychange', () => { last = performance.now(); if (master) master.gain.setTargetAtTime(document.hidden || muted || paused ? 0 : musicLevel, audio.currentTime, .03); });
 window.twmsMotion = { seek, pause: () => setPaused(true), play: () => setPaused(false), getState: () => ({ paused, muted, currentTime: position, duration, scene: names[active] }) };
 function tick(now) { const delta = Math.min((now - last) / 1000, .1); last = now; if (!paused && !document.hidden) { position = (position + delta) % duration; render(); } if (now - notifyAt > 200) { notify(); notifyAt = now; } requestAnimationFrame(tick); }
 render(); notify(); requestAnimationFrame(tick);
})();
