/* The page's sound, off until a visitor turns it on (browsers allow sound
   only after a click or a key, and nobody should be startled by a march).

   Two recordings, streamed rather than decoded into memory: the march
   (Warszawianka) once the crowd is a crowd, the anthem (the Internationale)
   from the moment the flag flies. Everything else is made here, from
   oscillators and noise: a drum line that keeps the marchers' step (snare,
   bass drum, toms), their feet, the crowd's shouts and cheers (a dozen
   detuned voices through the mouth's resonances), whistles, a siren, the
   shields, fire and wind, and the hits: cloth tearing, thread pulled
   through, the flag cracking open, the slam. It all runs through one room's
   echo, so it sounds like a street and not like a speaker.

   Beds (wind, fire, the crowd's roar, the music) have a level the story
   sets every frame; they glide to it. Rhythms are scheduled a little ahead
   on the audio clock, from the moments the story gives for each footfall. */

const MUSIC = { march: "/worldview/audio/march.m4a", anthem: "/worldview/audio/anthem.m4a" };

export type Bed = "wind" | "city" | "fire" | "crowd" | "siren" | "march" | "anthem";
const BED_GAIN: Record<Bed, number> = { wind: 0.45, city: 0.5, fire: 0.75, crowd: 0.8, siren: 0.13, march: 1, anthem: 1 };

export type Score = {
  beds: Partial<Record<Bed, number>>;
  heartbeat: number;
  /** the drum line, 0 (silent) to 1, and the crowd's feet and shouts, kept to `step` */
  drums: number;
  crowd: number;
  /** a footfall every `dur` seconds, one of them at `at` (the page's clock, seconds) */
  step: { dur: number; at: number };
  /** a slow, heavy drum, far off */
  toll: number;
  /** boots walking toward us */
  boots: number;
  /** morning birds */
  birds: number;
};

export type Hit =
  | "tear" | "stitch" | "impact" | "slam" | "snap" | "shield" | "thud" | "whoosh" | "grab"
  | "flagUp" | "hey" | "cheer" | "roll" | "boom" | "cymbal" | "tom" | "whistle" | "begin";

export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private room: ConvolverNode | null = null;
  private beds = new Map<Bed, GainNode>();
  private els = new Map<"march" | "anthem", HTMLAudioElement>();
  private noise: AudioBuffer | null = null;
  private nextBeat = 0;
  private nextStep = -1;
  private nextToll = 0;
  private nextBoot = 0;
  private nextBird = 0;
  on = false;

  /** must run inside a click or key handler */
  enable() {
    if (!this.ctx) this.build();
    const ctx = this.ctx!;
    void ctx.resume();
    this.on = true;
    this.master!.gain.cancelScheduledValues(ctx.currentTime);
    this.master!.gain.setTargetAtTime(0.9, ctx.currentTime, 0.2);
  }

  disable() {
    if (!this.ctx) return;
    this.on = false;
    this.master!.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    for (const el of this.els.values()) el.pause();
  }

  private build() {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = (this.ctx = new Ctx());
    const master = (this.master = ctx.createGain());
    master.gain.value = 0;
    // a limiter, so stacked hits don't clip
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.knee.value = 8;
    comp.ratio.value = 9;
    comp.attack.value = 0.003;
    comp.release.value = 0.2;
    master.connect(comp).connect(ctx.destination);

    // two seconds of white noise, the raw stuff of wind, fire, drums and tearing
    const n = ctx.sampleRate * 2;
    const buf = (this.noise = ctx.createBuffer(1, n, ctx.sampleRate));
    const d = buf.getChannelData(0);
    for (let k = 0; k < n; k++) d[k] = Math.random() * 2 - 1;

    // the room: noise dying away over two and a half seconds, as an echo
    const len = Math.floor(ctx.sampleRate * 2.6);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = ir.getChannelData(ch);
      for (let k = 0; k < len; k++) data[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / len, 2.8) * Math.min(1, k / 300);
    }
    const room = (this.room = ctx.createConvolver());
    room.buffer = ir;
    const back = ctx.createGain();
    back.gain.value = 0.55;
    room.connect(back).connect(master);

    const loop = () => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.start(0, Math.random() * 1.9);
      return src;
    };
    const bed = (name: Bed, node: AudioNode, echo = 0) => {
      const g = ctx.createGain();
      g.gain.value = 0;
      node.connect(g).connect(master);
      if (echo) {
        const s = ctx.createGain();
        s.gain.value = echo;
        g.connect(s).connect(room);
      }
      this.beds.set(name, g);
    };
    const filter = (type: BiquadFilterType, hz: number, q = 1) => {
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = hz;
      f.Q.value = q;
      return f;
    };
    const lfo = (hz: number, depth: number, to: AudioParam) => {
      const o = ctx.createOscillator();
      o.frequency.value = hz;
      const g = ctx.createGain();
      g.gain.value = depth;
      o.connect(g).connect(to);
      o.start();
    };
    {
      // the wind rises and falls
      const f = filter("bandpass", 420, 0.6);
      lfo(0.13, 220, f.frequency);
      loop().connect(f);
      bed("wind", f);
    }
    {
      const f = filter("lowpass", 180);
      const f2 = filter("peaking", 95);
      f2.gain.value = 9;
      loop().connect(f).connect(f2);
      bed("city", f2);
    }
    {
      // a low roar, and crackle: noise with only its sharpest peaks let through
      const out = ctx.createGain();
      loop().connect(filter("lowpass", 900)).connect(out);
      const sh = ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let k = 0; k < 256; k++) {
        const x = k / 127.5 - 1;
        curve[k] = Math.abs(x) > 0.985 ? Math.sign(x) : x * 0.3;
      }
      sh.curve = curve;
      const crackle = ctx.createGain();
      crackle.gain.value = 0.5;
      loop().connect(sh).connect(crackle).connect(out);
      bed("fire", out);
    }
    {
      // a crowd: its roar (two bands of noise, swelling unevenly) and the rumble of its feet
      const out = ctx.createGain();
      const swell = ctx.createGain();
      swell.gain.value = 0.75;
      lfo(0.31, 0.2, swell.gain);
      lfo(0.83, 0.12, swell.gain);
      loop().connect(filter("bandpass", 820, 0.7)).connect(swell);
      const hi = ctx.createGain();
      hi.gain.value = 0.45;
      loop().connect(filter("bandpass", 1900, 0.9)).connect(hi).connect(swell);
      swell.connect(out);
      const feet = ctx.createGain();
      feet.gain.value = 1.5;
      lfo(2.5, 0.5, feet.gain);
      loop().connect(filter("lowpass", 150)).connect(feet).connect(out);
      bed("crowd", out, 0.25);
    }
    {
      // a siren, streets away: one note wailing up and down
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = 880;
      lfo(0.27, 330, o.frequency);
      o.start();
      const f = filter("lowpass", 2200);
      o.connect(f);
      bed("siren", f, 0.6);
    }
    for (const name of ["march", "anthem"] as const) {
      const el = new Audio(MUSIC[name]);
      el.loop = true;
      el.preload = "auto";
      el.crossOrigin = "anonymous";
      bed(name, ctx.createMediaElementSource(el));
      this.els.set(name, el);
    }
  }

  // ── what a sound goes out through: straight, and by way of the room ──
  private out(node: AudioNode, echo = 0) {
    node.connect(this.master!);
    if (echo > 0) {
      const s = this.ctx!.createGain();
      s.gain.value = echo;
      node.connect(s).connect(this.room!);
    }
  }

  /** a burst of noise through a filter that sweeps, loud then gone */
  private burst(o: { at?: number; dur: number; from: number; to: number; q?: number; level: number; type?: BiquadFilterType; attack?: number; echo?: number }) {
    const ctx = this.ctx!;
    const at = o.at ?? ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter();
    f.type = o.type ?? "bandpass";
    f.Q.value = o.q ?? 1.2;
    f.frequency.setValueAtTime(o.from, at);
    f.frequency.exponentialRampToValueAtTime(o.to, at + o.dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(o.level, at + (o.attack ?? 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, at + o.dur);
    src.connect(f).connect(g);
    this.out(g, o.echo ?? 0);
    src.start(at, Math.random() * 1.5);
    src.stop(at + o.dur + 0.05);
  }

  /** a struck skin: a note that falls as it dies */
  private drum(at: number, level: number, from: number, to: number, fall: number, ring: number, echo = 0) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(from, at);
    o.frequency.exponentialRampToValueAtTime(to, at + fall);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(level, at + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, at + ring);
    o.connect(g);
    this.out(g, echo);
    o.start(at);
    o.stop(at + ring + 0.05);
  }

  private kick(at: number, lv: number) {
    this.drum(at, lv, 150, 46, 0.11, 0.34, 0.12);
    this.burst({ at, dur: 0.02, from: 3000, to: 800, level: lv * 0.35, type: "highpass" });
  }

  private tom(at: number, lv: number, hz: number) {
    this.drum(at, lv, hz * 1.45, hz, 0.09, 0.46, 0.3);
    this.burst({ at, dur: 0.09, from: 900, to: 300, level: lv * 0.3, type: "lowpass" });
  }

  private snare(at: number, lv: number) {
    this.burst({ at, dur: 0.14, from: 3400, to: 2600, q: 0.6, level: lv, echo: 0.14 });
    this.drum(at, lv * 0.5, 210, 150, 0.04, 0.08);
  }

  private cymbal(at: number, lv: number, dur = 1.4) {
    this.burst({ at, dur, from: 7500, to: 5200, level: lv * 0.5, type: "highpass", q: 0.4, attack: 0.004, echo: 0.4 });
  }

  /** one foot (of many) on the road */
  private stomp(at: number, lv: number) {
    this.burst({ at, dur: 0.11, from: 240, to: 90, level: lv, type: "lowpass" });
    this.drum(at, lv * 0.6, 78, 52, 0.05, 0.1);
  }

  /** many voices at once through the mouth's resonances: a shout ("hey!") or, held longer, a cheer */
  private voices(at: number, lv: number, dur: number, o: { count: number; low: number; high: number; f1: [number, number]; f2: [number, number]; attack: number; breath: number; echo: number }) {
    const ctx = this.ctx!;
    const src = ctx.createGain();
    src.gain.value = 1 / Math.sqrt(o.count);
    for (let k = 0; k < o.count; k++) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      const hz = o.low + Math.random() * (o.high - o.low);
      const t0 = at + Math.random() * 0.03;
      osc.frequency.setValueAtTime(hz * (1.04 + Math.random() * 0.06), t0);
      osc.frequency.exponentialRampToValueAtTime(hz * (0.86 + Math.random() * 0.08), at + dur);
      osc.connect(src);
      osc.start(t0);
      osc.stop(at + dur + 0.1);
    }
    const breath = ctx.createBufferSource();
    breath.buffer = this.noise;
    const bg = ctx.createGain();
    bg.gain.value = o.breath * Math.sqrt(o.count);
    breath.connect(bg).connect(src);
    breath.start(at, Math.random() * 1.5);
    breath.stop(at + dur + 0.1);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(lv, at + o.attack);
    env.gain.setValueAtTime(lv, at + o.attack + (dur - o.attack) * 0.35);
    env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    for (const [[a, b], q, gain] of [[o.f1, 4.5, 1], [o.f2, 6, 0.8], [[2700, 2700], 8, 0.35]] as const) {
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.Q.value = q;
      f.frequency.setValueAtTime(a, at);
      f.frequency.linearRampToValueAtTime(b, at + dur * 0.7);
      const g = ctx.createGain();
      g.gain.value = gain;
      src.connect(f).connect(g).connect(env);
    }
    this.out(env, o.echo);
  }

  private hey(at: number, lv: number, dur = 0.28, pitch = 1) {
    this.voices(at, lv * 0.9, dur, { count: 9, low: 165 * pitch, high: 330 * pitch, f1: [700, 520], f2: [1450, 1950], attack: 0.02, breath: 0.12, echo: 0.3 });
  }

  private cheer(at: number, lv: number, dur = 1.8) {
    this.voices(at, lv * 0.7, dur, { count: 14, low: 190, high: 470, f1: [820, 760], f2: [1250, 1350], attack: 0.16, breath: 0.3, echo: 0.45 });
    this.burst({ at, dur, from: 1500, to: 1100, q: 0.5, level: lv * 0.28, attack: 0.25, echo: 0.3 });
  }

  private whistle(at: number, lv: number, dur = 0.3) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(lv * 0.5, at + 0.015);
    g.gain.setValueAtTime(lv * 0.5, at + dur - 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    // the pea in it: the note flutters
    const flutter = ctx.createOscillator();
    flutter.frequency.value = 36;
    const depth = ctx.createGain();
    depth.gain.value = lv * 0.3;
    flutter.connect(depth).connect(g.gain);
    flutter.start(at);
    flutter.stop(at + dur + 0.05);
    for (const hz of [2380, 2910]) {
      const o = ctx.createOscillator();
      o.frequency.value = hz;
      o.connect(g);
      o.start(at);
      o.stop(at + dur + 0.05);
    }
    this.out(g, 0.3);
  }

  private boom(at: number, lv: number) {
    this.drum(at, lv, 96, 30, 0.7, 1.4, 0.5);
    this.burst({ at, dur: 1.1, from: 1500, to: 70, level: lv * 0.9, type: "lowpass", echo: 0.5 });
  }

  /** a snare roll, swelling */
  private roll(at: number, dur: number, lv: number) {
    for (let tt = 0; tt < dur; tt += 0.037) this.snare(at + tt, lv * (0.12 + 0.6 * Math.pow(tt / dur, 1.6)));
  }

  /** one footfall of the march: the drum line's part, the feet, the crowd's answer */
  private footfall(n: number, at: number, dur: number, drums: number, crowd: number) {
    const b = ((n % 4) + 4) % 4, bar = Math.floor(n / 4);
    const six = dur / 4;
    if (drums > 0.01) {
      // a marching cadence over four steps, in sixteenths
      const SNARE = [1, 0, 0, 0, 0.55, 0, 0, 0, 0.7, 0, 0.5, 0.5, 1, 0, 0.6, 0];
      const GHOST = [0, 0, 0.25, 0, 0, 0, 0.25, 0.25, 0, 0, 0, 0, 0, 0, 0, 0.3];
      for (let q = 0; q < 4; q++) {
        const p = b * 4 + q;
        if (SNARE[p]) this.snare(at + q * six, SNARE[p] * (0.3 + 0.55 * drums));
        if (drums >= 0.35 && GHOST[p]) this.snare(at + q * six, GHOST[p] * (0.25 + 0.4 * drums));
      }
      if (b % 2 === 0 || drums >= 0.55) this.kick(at, 0.5 + 0.5 * drums);
      if (drums >= 0.4 && b === 3 && bar % 2 === 1) {
        this.tom(at + six, 0.6 * drums + 0.2, 116);
        this.tom(at + 2 * six, 0.7 * drums + 0.2, 96);
        this.tom(at + 3 * six, 0.8 * drums + 0.2, 76);
      }
    }
    if (crowd > 0.01) {
      // their feet: more of them, less together, as the crowd grows
      const feet = 1 + Math.round(crowd * 6);
      for (let f = 0; f < feet; f++) this.stomp(at + Math.random() * (0.015 + 0.05 * crowd), (0.22 + 0.4 * crowd) * (0.6 + 0.4 * Math.random()));
      if (crowd >= 0.28 && b === 3) this.hey(at, 0.45 + 0.55 * crowd);
      if (crowd >= 0.7 && b === 1) this.hey(at, 0.35 + 0.45 * crowd, 0.24, 1.08);
      if (crowd >= 0.5 && b === 1 && bar % 4 === 2) this.whistle(at + 2 * six, 0.4, 0.26);
    }
  }

  /** the beds' levels, and whatever keeps time, for this frame */
  mix(s: Score) {
    const ctx = this.ctx;
    if (!ctx || !this.on) return;
    const now = ctx.currentTime;
    const page = performance.now() / 1000;
    for (const [name, g] of this.beds) {
      const v = s.beds[name] ?? 0;
      const el = this.els.get(name as "march" | "anthem");
      // the music swells and falls slowly, and once begun it keeps playing (silently, between its parts): it never stops and starts
      g.gain.setTargetAtTime(v * BED_GAIN[name], now, el ? 1.1 : 0.35);
      if (el && v > 0.005 && el.paused) void el.play().catch(() => {});
    }
    // the march: every footfall the story says is coming in the next fifth of a second
    if (s.drums > 0.01 || s.crowd > 0.01) {
      const { dur, at } = s.step;
      const first = Math.ceil((page + 0.02 - at) / dur);
      if (this.nextStep < first || this.nextStep > first + 2) this.nextStep = first;
      while (at + this.nextStep * dur < page + 0.2) {
        this.footfall(this.nextStep, now + (at + this.nextStep * dur - page), dur, s.drums, s.crowd);
        this.nextStep++;
      }
    }
    // the heartbeat: lub-dub at 72 a minute
    if (s.heartbeat > 0.01) {
      if (this.nextBeat < now) this.nextBeat = now + 0.05;
      while (this.nextBeat < now + 0.2) {
        this.drum(this.nextBeat, 0.9 * s.heartbeat, 100, 60, 0.08, 0.32);
        this.drum(this.nextBeat + 0.24, 0.55 * s.heartbeat, 88, 54, 0.08, 0.3);
        this.nextBeat += 60 / 72;
      }
    }
    if (s.toll > 0.01) {
      if (this.nextToll < now) this.nextToll = now + 0.3;
      while (this.nextToll < now + 0.2) {
        this.drum(this.nextToll, 0.8 * s.toll, 70, 38, 0.3, 1.6, 0.7);
        this.burst({ at: this.nextToll, dur: 0.5, from: 300, to: 60, level: 0.3 * s.toll, type: "lowpass", echo: 0.6 });
        this.nextToll += 2.8;
      }
    }
    if (s.boots > 0.01) {
      if (this.nextBoot < now) this.nextBoot = now + 0.1;
      while (this.nextBoot < now + 0.2) {
        this.burst({ at: this.nextBoot, dur: 0.13, from: 700, to: 140, level: 0.7 * s.boots, type: "lowpass", echo: 0.5 });
        this.drum(this.nextBoot, 0.5 * s.boots, 90, 55, 0.05, 0.12, 0.4);
        this.nextBoot += 0.525;
      }
    }
    if (s.birds > 0.01) {
      if (this.nextBird < now) this.nextBird = now + 0.4 + Math.random();
      while (this.nextBird < now + 0.2) {
        const notes = 2 + Math.floor(Math.random() * 3), hz = 2600 + Math.random() * 1800;
        for (let k = 0; k < notes; k++) {
          const at = this.nextBird + k * 0.11;
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.frequency.setValueAtTime(hz * (0.9 + Math.random() * 0.2), at);
          o.frequency.exponentialRampToValueAtTime(hz * (1.1 + Math.random() * 0.3), at + 0.07);
          g.gain.setValueAtTime(0.0001, at);
          g.gain.exponentialRampToValueAtTime(0.09 * s.birds, at + 0.015);
          g.gain.exponentialRampToValueAtTime(0.0001, at + 0.09);
          o.connect(g);
          this.out(g, 0.5);
          o.start(at);
          o.stop(at + 0.12);
        }
        this.nextBird += 0.7 + Math.random() * 2.2;
      }
    }
  }

  /** from the start: each recording begins when the story first reaches it */
  restart(name: "march" | "anthem") {
    const el = this.els.get(name);
    if (el) el.currentTime = 0;
  }

  /** one-off sounds; `arg` is how much, how long or which, by the sound */
  play(name: Hit, arg?: number) {
    const ctx = this.ctx;
    if (!ctx || !this.on) return;
    const now = ctx.currentTime;
    switch (name) {
      case "tear":
        // a rip is many tiny ones in a row
        for (let k = 0; k < 14; k++) this.burst({ at: now + k * 0.018, dur: 0.05, from: 2800 + Math.random() * 2200, to: 1000, q: 0.9, level: 0.75 });
        this.burst({ dur: 0.34, from: 2400, to: 380, q: 0.6, level: 0.5, echo: 0.2 });
        this.snare(now, 0.3);
        break;
      case "stitch":
        // the thread, pulled through stitch after stitch, faster and higher
        for (let k = 0; k < 7; k++) this.burst({ at: now + k * (0.085 - k * 0.006), dur: 0.06, from: 4200 + k * 420, to: 2400 + k * 300, q: 3, level: 0.3 + k * 0.03, echo: 0.2 });
        this.roll(now + 0.35, 0.55, 0.5);
        break;
      case "impact":
        this.kick(now, 1);
        this.tom(now, 0.8, 70);
        this.burst({ dur: 0.4, from: 1400, to: 110, type: "lowpass", level: 0.7, echo: 0.3 });
        break;
      case "flagUp": {
        // a flag is back: drums a step higher for each one, a crash, and the crowd
        const k = arg ?? 1;
        this.kick(now, 1);
        this.tom(now, 1, 60 + 8 * k);
        this.tom(now + 0.1, 0.85, 80 + 11 * k);
        this.cymbal(now, 0.8, 1.7);
        this.hey(now + 0.03, 0.9, 0.32, 1 + 0.035 * k);
        this.cheer(now + 0.12, 0.45 + 0.09 * k, 1.5);
        break;
      }
      case "slam":
        this.boom(now, 1);
        this.kick(now, 1);
        this.cymbal(now, 1, 2.6);
        for (let k = 0; k < 3; k++) this.tom(now + 0.07 * k, 1, 110 - 22 * k);
        this.hey(now + 0.06, 1, 0.42);
        this.cheer(now + 0.25, 1, 2.8);
        break;
      case "snap":
        // cloth cracking open in the wind
        this.burst({ dur: 0.07, from: 5200, to: 1200, level: 0.95, type: "highpass", q: 0.5, echo: 0.3 });
        this.burst({ at: now + 0.04, dur: 0.6, from: 500, to: 1900, q: 0.6, level: 0.5, attack: 0.1, echo: 0.3 });
        this.cymbal(now + 0.03, 0.45, 1);
        break;
      case "shield":
        // batons on shields, twice
        for (const [dt, lv] of [[0, 0.9], [0.15, 0.7]] as const) {
          this.tom(now + dt, lv, 98);
          this.burst({ at: now + dt, dur: 0.2, from: 2600, to: 800, q: 3.5, level: lv * 0.65, echo: 0.4 });
        }
        break;
      case "thud":
        this.boom(now, arg ?? 0.55);
        break;
      case "whoosh":
        this.burst({ dur: 0.9, from: 300, to: 2400, q: 0.6, level: 0.55, attack: 0.3, echo: 0.2 });
        break;
      case "grab":
        this.kick(now, 0.8);
        this.snare(now, 0.4);
        break;
      case "hey":
        this.hey(now, arg ?? 0.8);
        break;
      case "cheer":
        this.cheer(now, arg ?? 0.7, 1.9);
        break;
      case "roll":
        this.roll(now, arg ?? 0.9, 1);
        break;
      case "boom":
        this.boom(now, arg ?? 1);
        this.cymbal(now, 0.7, 2);
        break;
      case "cymbal":
        this.cymbal(now, arg ?? 0.7, 1.6);
        break;
      case "tom":
        this.tom(now, 0.9, arg ?? 80);
        break;
      case "whistle":
        this.whistle(now, 0.55, arg ?? 0.32);
        break;
      case "begin":
        this.kick(now, 0.9);
        this.tom(now + 0.12, 0.8, 72);
        this.cymbal(now + 0.12, 0.5, 1.6);
        break;
    }
  }

  dispose() {
    for (const el of this.els.values()) {
      el.pause();
      el.src = "";
    }
    void this.ctx?.close();
    this.ctx = null;
  }
}
