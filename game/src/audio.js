// Synthesised sound effects and a light music pulse, all from WebAudio
// oscillators and noise - no audio files, so the game stays fully offline.
export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let musicTimer = 0;
  let beat = 0;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch { ctx = null; }
  }

  function tone(freq, dur, type = 'square', vol = 0.16, slideTo = 0, delay = 0) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo > 0) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol = 0.2, delay = 0) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = vol;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0);
  }

  const sfx = {
    shoot() { tone(880 + Math.random() * 120, 0.07, 'square', 0.05, 320); },
    hit() { tone(220, 0.05, 'sawtooth', 0.06, 140); },
    boom(big = false) { noise(big ? 0.5 : 0.25, big ? 0.35 : 0.18); tone(big ? 120 : 160, big ? 0.45 : 0.22, 'sine', 0.25, 40); },
    hurt() { tone(300, 0.18, 'sawtooth', 0.2, 90); noise(0.12, 0.12); },
    dash() { noise(0.14, 0.08); tone(500, 0.14, 'sine', 0.06, 980); },
    pickup() { tone(660, 0.07, 'sine', 0.12); tone(990, 0.1, 'sine', 0.12, 0, 0.06); },
    repair() { tone(520, 0.09, 'sine', 0.12); tone(780, 0.12, 'sine', 0.12, 0, 0.08); },
    upgrade() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.12, 'triangle', 0.14, 0, i * 0.07)); },
    wave() { tone(392, 0.12, 'triangle', 0.14); tone(587, 0.16, 'triangle', 0.14, 0, 0.1); },
    boss() { tone(98, 0.5, 'sawtooth', 0.22, 65); tone(147, 0.5, 'sawtooth', 0.16, 98, 0.05); },
    over() { [440, 349, 262, 196].forEach((f, i) => tone(f, 0.28, 'triangle', 0.16, 0, i * 0.2)); },
    click() { tone(740, 0.05, 'sine', 0.1); },
  };

  // A quiet two-bar pulse: bass on the beat, a soft arp above it.
  function music(dt, playing) {
    if (!ctx || muted || !playing) return;
    musicTimer -= dt;
    if (musicTimer > 0) return;
    musicTimer = 0.24;
    const bass = [55, 55, 82.4, 55, 65.4, 55, 49, 73.4];
    const arp = [220, 277, 330, 277, 262, 330, 392, 330];
    const i = beat % 8;
    tone(bass[i], 0.22, 'triangle', 0.10);
    if (beat % 2 === 0) tone(arp[i], 0.18, 'sine', 0.045);
    beat++;
  }

  return {
    init,
    sfx,
    music,
    toggleMute() { muted = !muted; return muted; },
    get muted() { return muted; },
  };
}
