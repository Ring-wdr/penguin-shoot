/* 사운드: 음원 파일 없이 Web Audio로 합성 */
let actx = null, noiseBuf = null, slideSnd = null;
let muted = false;

/** 오디오 컨텍스트 준비(사용자 입력 시점에 호출). 음소거면 null */
export function ac() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (actx.state === 'suspended') actx.resume();
  if (!noiseBuf) { noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  return muted ? null : actx;
}

export function setMuted(v) { muted = v; if (muted) slideStop(); }
export const isMuted = () => muted;

function tone(type, f0, f1, dur, vol, delay = 0) {
  const a = ac(); if (!a) return; const t = a.currentTime + delay;
  const o = a.createOscillator(), g = a.createGain(); o.type = type;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur, vol, ftype, f0, f1, delay = 0) {
  const a = ac(); if (!a) return; const t = a.currentTime + delay;
  const s = a.createBufferSource(); s.buffer = noiseBuf; const f = a.createBiquadFilter(); f.type = ftype; f.Q.value = 1.2;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = a.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(a.destination); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}

export const sfx = {
  swing: () => noise(0.22, 0.35, 'bandpass', 500, 2600),
  hit: (perfect) => { tone('sine', 150, 45, 0.28, 0.9); noise(0.09, 0.6, 'highpass', 1500, 4000); if (perfect) { tone('triangle', 880, 880, 0.18, 0.18, 0.05); tone('triangle', 1320, 1320, 0.3, 0.16, 0.12); } },
  squeak: () => tone('square', 900, 1500, 0.14, 0.06),
  land: () => { noise(0.3, 0.5, 'lowpass', 900, 200); tone('sine', 90, 50, 0.2, 0.4); },
  boing: () => { tone('sine', 180, 720, 0.35, 0.35); tone('triangle', 360, 900, 0.3, 0.08); },
  seal: () => { tone('square', 320, 220, 0.12, 0.08); tone('square', 340, 230, 0.12, 0.08, 0.15); tone('sine', 200, 800, 0.3, 0.3, 0.05); },
  boom: () => { noise(0.9, 0.9, 'lowpass', 1600, 90); tone('sine', 110, 30, 0.6, 0.9); [0.25, 0.4, 0.55].forEach(d => noise(0.12, 0.35, 'highpass', 3000, 5000, d)); },
  pop: () => { noise(0.07, 0.7, 'highpass', 2000, 5000); tone('sine', 700, 1400, 0.25, 0.2, 0.03); },
  tweet: () => [0, 0.08, 0.17, 0.3].forEach(d => tone('sine', 2200 + Math.random() * 600, 3000, 0.07, 0.07, d)),
  fallIn: () => { tone('sine', 900, 90, 1.0, 0.25); noise(0.4, 0.3, 'lowpass', 600, 100, 0.8); },
  bonk: () => { tone('square', 160, 70, 0.18, 0.18); noise(0.2, 0.4, 'lowpass', 1200, 300); },
  flap: () => { noise(0.08, 0.3, 'bandpass', 900, 600); noise(0.08, 0.3, 'bandpass', 900, 600, 0.1); },
  whiff: () => noise(0.3, 0.3, 'bandpass', 1500, 400),
  splat: () => { noise(0.35, 0.55, 'lowpass', 700, 150); tone('square', 400, 180, 0.2, 0.05); },
  combo: (n) => tone('triangle', 660 * Math.pow(1.12, Math.min(n, 8)), 990 * Math.pow(1.12, Math.min(n, 8)), 0.18, 0.12, 0.05),
  record: () => [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.22, 0.2, i * 0.1)),
};

/* 미끄럼 루프 노이즈 */
export function slideStart() {
  const a = ac(); if (!a || slideSnd) return;
  const s = a.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
  const g = a.createGain(); g.gain.value = 0; s.connect(f).connect(g).connect(a.destination); s.start();
  slideSnd = { s, g, f };
}
export function slideSet(v) {
  if (slideSnd && actx) {
    slideSnd.g.gain.setTargetAtTime(muted ? 0 : Math.min(0.22, v / 120), actx.currentTime, 0.05);
    slideSnd.f.frequency.setTargetAtTime(400 + v * 25, actx.currentTime, 0.05);
  }
}
export function slideStop() {
  if (slideSnd) { try { slideSnd.g.gain.setTargetAtTime(0, actx.currentTime, 0.05); slideSnd.s.stop(actx.currentTime + 0.3); } catch (e) { /* 이미 멈춤 */ } slideSnd = null; }
}
