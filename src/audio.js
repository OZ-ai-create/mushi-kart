const THEMES = {
  garden: {
    titlePad: [196, 246.94, 293.66],
    titlePadGain: 0.025,
    titlePadType: "sine",
    titleBpm: 88,
    titleLead: [392, 440, 493.88, 587.33, 523.25, 440],
    titleLeadType: "triangle",
    titleLeadGain: 0.05,
    racePad: [146.83, 220, 293.66],
    racePadGain: 0.02,
    racePadType: "sine",
    raceBpm: 126,
    raceBass: [146.83, 146.83, 110, 130.81, 164.81, 146.83, 110, 123.47],
    raceLead: [293.66, 329.63, 369.99, 440, 493.88, 440, 369.99, 329.63],
    raceBassType: "square",
    raceLeadType: "triangle",
    raceBassGain: 0.035,
    raceLeadGain: 0.045,
    hat: true,
  },
  sea: {
    titlePad: [164.81, 220, 329.63, 493.88],
    titlePadGain: 0.016,
    titlePadType: "sine",
    titleBpm: 72,
    titleLead: [329.63, 392, 440, 523.25, 493.88, 392],
    titleLeadType: "sine",
    titleLeadGain: 0.042,
    racePad: [110, 164.81, 246.94],
    racePadGain: 0.014,
    racePadType: "sine",
    raceBpm: 108,
    raceBass: [110, 123.47, 130.81, 146.83, 130.81, 123.47, 110, 98],
    raceLead: [329.63, 392, 440, 523.25, 587.33, 523.25, 440, 392],
    raceBassType: "triangle",
    raceLeadType: "sine",
    raceBassGain: 0.04,
    raceLeadGain: 0.05,
    hat: false,
    wave: true,
  },
  volcano: {
    titlePad: [87.31, 110, 146.83],
    titlePadGain: 0.03,
    titlePadType: "triangle",
    titleBpm: 80,
    titleLead: [220, 233.08, 261.63, 196, 174.61, 220],
    titleLeadType: "sawtooth",
    titleLeadGain: 0.026,
    racePad: [73.42, 110, 146.83],
    racePadGain: 0.022,
    racePadType: "triangle",
    raceBpm: 140,
    raceBass: [82.41, 82.41, 73.42, 98, 110, 82.41, 73.42, 65.41],
    raceLead: [220, 246.94, 261.63, 329.63, 293.66, 246.94, 220, 196],
    raceBassType: "square",
    raceLeadType: "sawtooth",
    raceBassGain: 0.042,
    raceLeadGain: 0.03,
    hat: true,
    heavy: true,
  },
};

function themeOf(id) {
  return THEMES[id] || THEMES.garden;
}

function clamp01(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

const MIX_KEY = "mushi-kart-mix";

export class AudioBus {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfx = null;
    this.musicGain = null;
    this.engine = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.musicOn = true;
    this.musicVol = 1;
    this.engineVol = 1;
    this.mode = "off";
    this.courseId = "garden";
    this._theme = THEMES.garden;
    this._musicTimer = 0;
    this._musicNodes = [];
    this._nextNote = 0;
    this._step = 0;
    this._engineRatio = 0;
    this._engineOn = false;
    this._enginePreview = 0;
    this._loadMix();
  }

  unlock(courseId) {
    if (courseId) this.courseId = courseId;
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.24;
    this.master.connect(this.ctx.destination);
    this.sfx = this.ctx.createGain();
    this.sfx.gain.value = 1;
    this.sfx.connect(this.master);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this._musicLevel();
    this.musicGain.connect(this.master);
    this._startEngine();
    this._chirp();
    this.playTitle(this.courseId);
  }

  setMusic(on) {
    this.setMusicVol(on ? (this.musicVol > 0.01 ? this.musicVol : 1) : 0);
  }

  setMusicVol(v) {
    this.musicVol = clamp01(v);
    this.musicOn = this.musicVol > 0.01;
    this._saveMix();
    if (this.musicGain) {
      this.musicGain.gain.setTargetAtTime(this._musicLevel(), this._now(), 0.05);
    }
  }

  setEngineVol(v, preview = false) {
    this.engineVol = clamp01(v);
    this._saveMix();
    if (preview && this.mode !== "race") {
      this.setEngine(0.55, true);
      window.clearTimeout(this._enginePreview);
      this._enginePreview = window.setTimeout(() => {
        if (this.mode !== "race") this.setEngine(0, false);
      }, 380);
      return;
    }
    this._applyEngine();
  }

  _musicLevel() {
    return 0.2 * this.musicVol;
  }

  _loadMix() {
    try {
      const raw = JSON.parse(localStorage.getItem(MIX_KEY) || "null");
      if (raw && typeof raw === "object") {
        if (raw.music != null) this.musicVol = clamp01(raw.music);
        if (raw.engine != null) this.engineVol = clamp01(raw.engine);
      }
    } catch {
      /* ignore */
    }
    this.musicOn = this.musicVol > 0.01;
  }

  _saveMix() {
    localStorage.setItem(MIX_KEY, JSON.stringify({ music: this.musicVol, engine: this.engineVol }));
  }

  playTitle(courseId) {
    const id = courseId || this.courseId || "garden";
    if (!this.ctx) {
      this.courseId = id;
      return;
    }
    if (this.mode === "title" && this.courseId === id) return;
    this.courseId = id;
    this._theme = themeOf(id);
    this._stopMusic();
    this.mode = "title";
    this._startPad(this._theme.titlePad, this._theme.titlePadGain, this._theme.titlePadType);
    this._armLoop(this._theme.titleBpm, this._titleStep);
  }

  playRace(courseId) {
    const id = courseId || this.courseId || "garden";
    if (!this.ctx) {
      this.courseId = id;
      return;
    }
    this.courseId = id;
    this._theme = themeOf(id);
    this._stopMusic();
    this.mode = "race";
    this._startPad(this._theme.racePad, this._theme.racePadGain, this._theme.racePadType);
    this._nextNote = this._now() + 0.05;
    this._step = 0;
    this._armLoop(this._theme.raceBpm, this._raceStep);
  }

  _now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  _osc(type, freq, dur, gain = 0.2, slide = 0) {
    if (!this.ctx) return;
    const t = this._now();
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(this.sfx);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  _note(when, freq, dur, type, gain) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g);
    g.connect(this.musicGain);
    o.start(when);
    o.stop(when + dur + 0.02);
    this._musicNodes.push(o);
  }

  _noise(when, dur, gain) {
    const n = this.ctx.createBufferSource();
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    n.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 1800;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    n.connect(f);
    f.connect(g);
    g.connect(this.musicGain);
    n.start(when);
    n.stop(when + dur + 0.02);
    this._musicNodes.push(n);
  }

  _startPad(freqs, gain, type = "sine") {
    for (const freq of freqs) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = gain;
      o.connect(g);
      g.connect(this.musicGain);
      o.start();
      this._musicNodes.push(o);
    }
  }

  _armLoop(bpm, stepFn) {
    const stepDur = 60 / bpm / 2;
    const tick = () => {
      if (!this.ctx || (this.mode !== "title" && this.mode !== "race")) return;
      while (this._nextNote < this.ctx.currentTime + 0.18) {
        stepFn.call(this, this._nextNote, this._step);
        this._nextNote += stepDur;
        this._step += 1;
      }
      this._musicTimer = window.setTimeout(tick, 40);
    };
    this._nextNote = this._now() + 0.06;
    this._step = 0;
    tick();
  }

  _titleStep(when, step) {
    const th = this._theme || THEMES.garden;
    const bells = th.titleLead;
    if (step % 4 === 0) this._note(when, bells[(Math.floor(step / 4)) % bells.length], 0.55, th.titleLeadType, th.titleLeadGain);
    if (th.wave && step % 16 === 0) this._wave(when);
    if (th.heavy && step % 8 === 0) this._drum(when);
  }

  _raceStep(when, step) {
    const th = this._theme || THEMES.garden;
    const i = step % 8;
    this._note(when, th.raceBass[i], 0.28, th.raceBassType, th.raceBassGain);
    if (step % 2 === 1) this._note(when, th.raceLead[i], 0.18, th.raceLeadType, th.raceLeadGain);
    if (th.hat && step % 2 === 0) this._noise(when, 0.04, th.heavy ? 0.04 : 0.03);
    if (th.wave && step % 8 === 0) this._wave(when);
    if (th.heavy && step % 4 === 0) this._drum(when);
  }

  _wave(when) {
    const dur = 0.95;
    const n = this.ctx.createBufferSource();
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    n.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 420;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(0.032, when + 0.18);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    n.connect(f);
    f.connect(g);
    g.connect(this.musicGain);
    n.start(when);
    n.stop(when + dur + 0.02);
    this._musicNodes.push(n);
  }

  _drum(when) {
    this._note(when, 55, 0.22, "sine", 0.07);
    this._noise(when, 0.06, 0.025);
  }

  _stopMusic() {
    window.clearTimeout(this._musicTimer);
    for (const n of this._musicNodes) {
      try {
        n.stop();
      } catch {
        /* already stopped */
      }
    }
    this._musicNodes = [];
    this.mode = "off";
  }

  _startEngine() {
    const o = this.ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = 48;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 320;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    o.connect(f);
    f.connect(g);
    g.connect(this.sfx);
    o.start();
    this.engine = o;
    this.engineFilter = f;
    this.engineGain = g;
  }

  setEngine(speedRatio, on) {
    this._engineRatio = speedRatio;
    this._engineOn = on;
    this._applyEngine();
  }

  _applyEngine() {
    if (!this.engine) return;
    const t = this._now();
    const r = Math.max(0, Math.min(1.4, this._engineRatio));
    this.engine.frequency.setTargetAtTime(42 + r * 70, t, 0.08);
    this.engineFilter.frequency.setTargetAtTime(240 + r * 520, t, 0.08);
    const base = this._engineOn ? 0.04 + r * 0.07 : 0;
    this.engineGain.gain.setTargetAtTime(base * this.engineVol, t, 0.12);
  }

  countdown(n) {
    if (n <= 0) this._osc("square", 660, 0.28, 0.16, 80);
    else this._osc("square", 420, 0.12, 0.12);
  }

  collect() {
    this._osc("sine", 988, 0.1, 0.07);
    this._osc("triangle", 1318, 0.14, 0.06);
    this._osc("sine", 1760, 0.18, 0.04);
  }

  boost() {
    this._osc("sawtooth", 130, 0.2, 0.055, 320);
    this._osc("triangle", 380, 0.16, 0.045, 180);
    this._osc("sine", 88, 0.24, 0.06, 50);
  }

  hit() {
    this._osc("square", 68, 0.2, 0.15, -28);
    this._osc("sawtooth", 160, 0.12, 0.09, -70);
  }

  use() {
    this._osc("triangle", 520, 0.1, 0.1, 200);
  }

  special() {
    this._osc("sawtooth", 140, 0.28, 0.12, 90);
    this._osc("square", 320, 0.16, 0.1, 260);
  }

  finish() {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this._osc("triangle", f, 0.22, 0.12), i * 110);
    });
  }

  _chirp() {
    const t = this._now();
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(1800, t);
    o.frequency.exponentialRampToValueAtTime(2400, t + 0.08);
    g.gain.setValueAtTime(0.03, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(g);
    g.connect(this.sfx);
    o.start(t);
    o.stop(t + 0.16);
  }
}
