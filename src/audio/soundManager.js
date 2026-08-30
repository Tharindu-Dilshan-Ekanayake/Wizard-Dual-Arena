/**
 * Synthesized sound effects via the raw Web Audio API -- there are no audio
 * asset files in this project, so every effect here is generated on the
 * fly (noise bursts + oscillators shaped with gain/filter envelopes)
 * instead of loaded from a file. Lazily creates a single shared
 * AudioContext on first use, since browsers block audio until a user
 * gesture -- the game's own "click to lock the pointer" already provides
 * one, so the context resumes cleanly the first time any sound plays.
 */

let ctx = null;
let noiseBuffer = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** ~1s of white noise, reused (not reallocated) for every noise-based effect. */
function getNoiseBuffer(audioCtx) {
  if (noiseBuffer) return noiseBuffer;
  const length = audioCtx.sampleRate * 1;
  noiseBuffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return noiseBuffer;
}

function noiseBurst(audioCtx, { duration, filterType = 'bandpass', freqStart, freqEnd, gain = 0.5, Q = 1 }) {
  const src = audioCtx.createBufferSource();
  src.buffer = getNoiseBuffer(audioCtx);

  const filter = audioCtx.createBiquadFilter();
  filter.type = filterType;
  filter.Q.value = Q;
  filter.frequency.setValueAtTime(freqStart, audioCtx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), audioCtx.currentTime + duration);

  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0, audioCtx.currentTime);
  g.gain.linearRampToValueAtTime(gain, audioCtx.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

  src.connect(filter).connect(g).connect(audioCtx.destination);
  src.start();
  src.stop(audioCtx.currentTime + duration + 0.05);
}

function tone(audioCtx, { freqStart, freqEnd = freqStart, duration, type = 'sine', gain = 0.3, startAt = 0 }) {
  const osc = audioCtx.createOscillator();
  osc.type = type;
  const t0 = audioCtx.currentTime + startAt;
  osc.frequency.setValueAtTime(freqStart, t0);
  if (freqEnd !== freqStart) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + duration);

  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

  osc.connect(g).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

/** Spell cast: a quick descending whoosh. */
export function playCast() {
  const audioCtx = getCtx();
  noiseBurst(audioCtx, { duration: 0.22, filterType: 'bandpass', freqStart: 2200, freqEnd: 500, gain: 0.35, Q: 0.9 });
  tone(audioCtx, { freqStart: 700, freqEnd: 220, duration: 0.18, type: 'sawtooth', gain: 0.12 });
}

/** Spell impact: a punchy low thump plus a burst of crack noise. */
export function playImpact() {
  const audioCtx = getCtx();
  tone(audioCtx, { freqStart: 160, freqEnd: 45, duration: 0.16, type: 'sine', gain: 0.5 });
  noiseBurst(audioCtx, { duration: 0.12, filterType: 'bandpass', freqStart: 3000, freqEnd: 900, gain: 0.3, Q: 0.7 });
}

/** Guard raised: a bright, chord-like shimmer. */
export function playGuardUp() {
  const audioCtx = getCtx();
  [660, 880, 990].forEach((f, i) => tone(audioCtx, { freqStart: f, duration: 0.5, type: 'triangle', gain: 0.14, startAt: i * 0.02 }));
}

/** Shield deflects an attack: a sharp metallic clang instead of an impact thud. */
export function playBlock() {
  const audioCtx = getCtx();
  noiseBurst(audioCtx, { duration: 0.18, filterType: 'highpass', freqStart: 1200, freqEnd: 2600, gain: 0.3, Q: 4 });
  tone(audioCtx, { freqStart: 1200, freqEnd: 900, duration: 0.15, type: 'square', gain: 0.08 });
}

/** Round won: a short rising major-ish arpeggio. */
export function playVictory() {
  const audioCtx = getCtx();
  [523, 659, 784, 1046].forEach((f, i) => tone(audioCtx, { freqStart: f, duration: 0.35, type: 'triangle', gain: 0.18, startAt: i * 0.12 }));
}

/** Round lost: a slower descending minor-ish phrase. */
export function playDefeat() {
  const audioCtx = getCtx();
  [440, 392, 349, 293].forEach((f, i) => tone(audioCtx, { freqStart: f, duration: 0.45, type: 'sawtooth', gain: 0.14, startAt: i * 0.16 }));
}
