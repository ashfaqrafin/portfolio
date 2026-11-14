import { BEAT, END, MUSIC, SLAMS, beat, pumps } from "./kit";
import { hash } from "./draw";

/* The film's sound, off until asked for. The music is two recordings and
   nothing else: Warszawianka for the revolt, the Internationale for the
   rise, each started silently a moment early so that it is already running,
   in step with the film's clock, when it is let through. In the factory
   there is no music at all: only the machine. Everything else (the clock,
   the belt, the press, cloth and paper tearing, the crowd, thread, coins) is
   made here from oscillators and noise, and runs through one room's echo. */

const SRC = { march: "/worldview/audio/march.m4a", anthem: "/worldview/audio/anthem.m4a" };
type Track = keyof typeof SRC;

export type Hit =
  | "tick" | "draw" | "thud" | "clank" | "hiss" | "coin" | "stamp" | "press" | "strain" | "grind" | "rip" | "breath"
  | "slam" | "word" | "stand" | "snap" | "flap" | "cheer" | "hey" | "slide" | "lock" | "roll" | "tear" | "stitch"
  | "sun" | "crack" | "whoosh" | "pop" | "paste" | "scratch" | "plate" | "glint" | "clang";

/** the one-off sounds, by the film's clock: [when, which, how much / which] */
export const CUES: [number, Hit, number?][] = [];
{
  const c = (at: number, hit: Hit, arg?: number) => CUES.push([at, hit, arg]);
  // the clock; the factory; the hat's glint
  for (let k = 0; k <= 5; k++) c(k || 0.02, "tick", k);
  c(7.4, "stamp"); c(9.2, "whoosh"); c(12, "draw"); c(16.25, "glint"); c(16.6, "stamp");
  // the press; one of them falls
  for (const s of SLAMS) c(s, "press");
  c(24.5, "thud", 0.3);
  // he stops: the machine grinds down to nothing. The eye; the fist; the strip; the knot; NO.
  c(28.05, "grind"); c(30, "flap"); c(30.2, "glint"); c(30.21, "thud", 0.5); c(31.3, "strain"); c(32.62, "rip"); c(33.2, "whoosh"); c(33.78, "flap"); c(34, "slam");
  // a cut on every beat; then the frame doubling; then all of them
  for (let k = 0; k < 8; k++) c(beat(k), k === 1 || k === 7 ? "word" : "stand", k);
  for (let k = 0; k < 4; k++) c(39.4 + k * 2 * BEAT, "word");
  c(42.8, "roll", 0.85); c(43.65, "slam"); c(43.7, "cheer", 0.8); c(46.2, "whoosh"); c(47.6, "cheer", 0.8);
  c(49.6, "snap", 1); c(49.72, "snap", 0.8); c(49.84, "snap", 0.7); c(51.3, "whoosh"); c(51.35, "cheer", 0.9);
  for (let k = 0; k < 5; k++) c(51.55 + k * 0.22, "flap");
  // the wall
  c(54.1, "thud", 0.6); c(55.1, "glint"); c(55.6, "clang"); c(55.9, "clang"); c(56.2, "clang"); c(56.8, "hey", 0.5); c(57.2, "roll", 0.8); c(57.25, "cheer", 1); c(58, "tear");
  // up again
  c(66.82, "thud", 0.4); c(67.7, "whoosh"); c(68.8, "sun"); c(68.9, "flap"); c(71.5, "crack"); c(71.95, "crack"); c(71.97, "whoosh"); c(73.2, "crack"); c(73.55, "thud", 0.7);
  for (let k = 0; k < 50; k++) c(73.7 + k * 0.045 + hash(k) * 0.05, "coin", 0.5 + hash(k + 2) * 0.5);
  c(75.75, "glint");
  // the table
  c(76, "whoosh");
  for (let k = 0; k < 13; k++) c(78.4 + k * 0.2, "pop", k);
  for (let k = 0; k < 8; k++) c(82.6 + k * 0.9 + hash(k + 40) * 0.4, "plate", hash(k + 50));
  for (let k = 0; k < 13; k++) if (k !== 3 && k !== 5) c(82.6 + k / 7, "paste", k);
  for (let k = 0; k < 8; k++) if (k !== 1) c(84.9 + k / 7, "paste", k + 3);
  c(87.2, "scratch");
  CUES.sort((a, b) => a[0] - b[0]);
}

type Bed = "hum" | "crowd" | "ring" | "murmur" | Track;
const lin = (t: number, pts: [number, number][]) => {
  if (t <= pts[0][0]) return pts[0][1];
  for (let k = 1; k < pts.length; k++) if (t <= pts[k][0]) return pts[k - 1][1] + ((pts[k][1] - pts[k - 1][1]) * (t - pts[k - 1][0])) / (pts[k][0] - pts[k - 1][0]);
  return pts[pts.length - 1][1];
};
/** how loud each continuous sound is at `t` */
function levels(t: number, ended: boolean): Record<Bed, number> {
  return {
    // the machine: louder as it is driven harder; dead the moment it jams
    hum: t < 28.3 ? lin(t, [[5, 0], [5.4, 0.5], [18, 0.55], [26, 1]]) : 0,
    crowd: t < 58 ? lin(t, [[36.4, 0], [40, 0.35], [46, 0.8], [56.5, 0.85], [57.8, 1]]) : lin(t, [[68.8, 0], [69.4, 0.9], [74, 0.6], [80, 0.12]]),
    // after the tear: nothing, and a high note in the ears
    ring: t >= 58 ? lin(t, [[58, 0], [58.3, 1], [63, 0.5], [67.5, 0]]) : 0,
    murmur: lin(t, [[77, 0], [81, 1]]),
    march: t >= MUSIC.march.from && t < MUSIC.march.to ? 1 : 0,
    anthem: t >= MUSIC.anthem.from ? (ended ? 0.5 : lin(t, [[MUSIC.anthem.from, 0.5], [70.5, 1]])) : 0,
  };
}
const BED_GAIN: Record<Bed, number> = { hum: 0.32, crowd: 0.5, ring: 0.012, murmur: 0.16, march: 1, anthem: 1 };

export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private hits: GainNode | null = null;
  private room: ConvolverNode | null = null;
  private noise: AudioBuffer | null = null;
  private beds = new Map<Bed, GainNode>();
  private els = new Map<Track, HTMLAudioElement>();
  private lastPump = -1;
  on = false;

  /** must run inside a click or key handler */
  enable() {
    if (!this.ctx) this.build();
    const ctx = this.ctx!;
    void ctx.resume();
    this.on = true;
    this.master!.gain.cancelScheduledValues(ctx.currentTime);
    this.master!.gain.setTargetAtTime(0.9, ctx.currentTime, 0.08);
  }

  disable() {
    if (!this.ctx) return;
    this.on = false;
    this.master!.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
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
    // everything that isn't a bed goes through here, so a jump in the film can hush what was ringing
    const hits = (this.hits = ctx.createGain());
    hits.connect(master);

    const n = ctx.sampleRate * 2;
    const buf = (this.noise = ctx.createBuffer(1, n, ctx.sampleRate));
    const d = buf.getChannelData(0);
    for (let k = 0; k < n; k++) d[k] = Math.random() * 2 - 1;

    // the room: noise dying away, as an echo (a factory hall, then a street)
    const len = Math.floor(ctx.sampleRate * 2.2);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = ir.getChannelData(ch);
      for (let k = 0; k < len; k++) data[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / len, 3) * Math.min(1, k / 300);
    }
    const room = (this.room = ctx.createConvolver());
    room.buffer = ir;
    const back = ctx.createGain();
    back.gain.value = 0.5;
    room.connect(back).connect(hits);

    const loop = () => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.start(0, Math.random() * 1.9);
      return src;
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
    const bed = (name: Bed, node: AudioNode) => {
      const g = ctx.createGain();
      g.gain.value = 0;
      node.connect(g).connect(master);
      this.beds.set(name, g);
    };
    {
      // the machine's hum: mains, its octave, and the rumble of the floor
      const out = ctx.createGain();
      for (const [hz, lv] of [[50, 0.5], [100, 0.28], [150, 0.1]] as const) {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = hz;
        const g = ctx.createGain();
        g.gain.value = lv;
        o.connect(g).connect(out);
        o.start();
      }
      const lp = filter("lowpass", 420);
      out.connect(lp);
      const rumble = ctx.createGain();
      rumble.gain.value = 0.9;
      loop().connect(filter("lowpass", 120)).connect(rumble).connect(lp);
      bed("hum", lp);
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
      feet.gain.value = 1.3;
      lfo(1 / BEAT, 0.5, feet.gain);
      loop().connect(filter("lowpass", 150)).connect(feet).connect(out);
      bed("crowd", out);
    }
    {
      // the note left in the ears after a blast
      const out = ctx.createGain();
      for (const hz of [3520, 3534, 6210]) {
        const o = ctx.createOscillator();
        o.frequency.value = hz;
        o.connect(out);
        o.start();
      }
      bed("ring", out);
    }
    {
      // people talking, low, around a table
      const out = ctx.createGain();
      const f1 = filter("bandpass", 420, 1.4), f2 = filter("bandpass", 1100, 2);
      lfo(0.23, 120, f1.frequency);
      lfo(0.37, 260, f2.frequency);
      const sw = ctx.createGain();
      sw.gain.value = 0.7;
      lfo(0.6, 0.25, sw.gain);
      lfo(1.7, 0.15, sw.gain);
      loop().connect(f1).connect(sw);
      loop().connect(f2).connect(sw);
      sw.connect(out);
      bed("murmur", out);
    }
    for (const name of ["march", "anthem"] as const) {
      const el = new Audio(SRC[name]);
      el.preload = "auto";
      el.crossOrigin = "anonymous";
      bed(name, ctx.createMediaElementSource(el));
      this.els.set(name, el);
    }
  }

  /** every frame: the beds' levels, the machine's rhythm, and the music kept to the film's clock.
      Returns how far the film's clock is from the music's (seconds; 0 if no music is sounding). */
  frame(t: number, playing: boolean, ended: boolean, jumped: boolean): number {
    const ctx = this.ctx;
    if (!ctx || !this.on) return 0;
    const now = ctx.currentTime;
    const lv = levels(t, ended);
    const live = playing || ended;
    for (const [name, g] of this.beds) {
      const v = live ? lv[name] * BED_GAIN[name] : 0;
      // the march comes in at once, and is cut dead; everything else glides
      const quick = name === "march" || !live || jumped || (t >= 58 && t < 58.4) || (name === "hum" && t >= 28.3 && t < 28.7);
      g.gain.setTargetAtTime(v, now, quick ? 0.012 : name === "anthem" ? 0.5 : 0.22);
    }
    if (jumped) {
      this.hits!.gain.cancelScheduledValues(now);
      this.hits!.gain.setValueAtTime(0, now);
      this.hits!.gain.setTargetAtTime(1, now + 0.12, 0.05);
      this.lastPump = -1;
    }
    // the machine: a clank on every pump and a hiss between; a coin up the pipe
    if (playing && t >= 5.1 && t < 28.3) {
      const p = Math.floor(pumps(t) * 2);
      if (this.lastPump < 0) this.lastPump = p;
      else if (p > this.lastPump) {
        this.lastPump = p;
        if (p % 2 === 0) {
          this.play("clank", t < 18 ? 0.6 : 0.8);
          this.play("coin", 0.35);
        } else this.play("hiss", t < 18 ? 0.5 : 0.7);
      }
    }
    // the recordings
    let err = 0;
    for (const name of ["march", "anthem"] as const) {
      const el = this.els.get(name)!;
      const m = MUSIC[name];
      const to = "to" in m ? m.to : Infinity;
      const want = m.offset + (t - m.from);
      const within = t >= m.from - 1.2 && t < to;
      if (ended && name === "anthem") {
        // the film is over: the anthem plays on, quieter, to its own end
        if (el.paused && !el.ended && t >= END) {
          if (el.currentTime < m.offset && el.readyState >= 1) el.currentTime = m.offset + (END - m.from);
          void el.play().catch(() => {});
        }
        continue;
      }
      if (!playing || !within) {
        if (!el.paused) el.pause();
        // have it ready to come in on time
        if (playing && t >= m.from - 6 && t < m.from - 1.2 && Math.abs(el.currentTime - (m.offset - 1.2)) > 0.05 && el.readyState >= 1) el.currentTime = m.offset - 1.2;
        continue;
      }
      if (el.readyState < 1) continue;
      const off = el.currentTime - want;
      const silent = t < m.from;
      if (el.paused) {
        el.currentTime = want;
        void el.play().catch(() => {});
      } else if (Math.abs(off) > (silent ? 0.06 : 0.45) && !el.seeking) el.currentTime = want + (silent ? 0.03 : 0);
      else if (!silent && !el.seeking) err = off;
    }
    return err;
  }

  // ── what a sound goes out through: straight, and by way of the room ──
  private out(node: AudioNode, echo = 0) {
    node.connect(this.hits!);
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

  /** a struck thing: a note that falls as it dies */
  private drum(at: number, level: number, from: number, to: number, fall: number, ring: number, echo = 0, type: OscillatorType = "sine") {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
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

  /** struck metal: a handful of notes that don't agree with each other */
  private metal(at: number, lv: number, hz: number, ring: number, echo = 0.3) {
    for (const [m, l] of [[1, 1], [2.76, 0.55], [5.4, 0.3], [8.93, 0.16]] as const) this.drum(at, lv * l * 0.5, hz * m * 1.01, hz * m, 0.05, ring / Math.sqrt(m), echo, "triangle");
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

  private boom(at: number, lv: number) {
    this.drum(at, lv, 96, 30, 0.7, 1.4, 0.5);
    this.burst({ at, dur: 1.1, from: 1500, to: 70, level: lv * 0.9, type: "lowpass", echo: 0.5 });
  }

  /** many voices at once through the mouth's resonances: a shout, or, held longer, a cheer */
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

  /** one-off sounds; `arg` is how much, or which, by the sound */
  play(name: Hit, arg?: number) {
    const ctx = this.ctx;
    if (!ctx || !this.on) return;
    const now = ctx.currentTime;
    const a = arg ?? 1;
    switch (name) {
      case "tick":
        // dry and close: the only thing in the room
        this.burst({ dur: 0.03, from: 5200, to: 2600, q: 5, level: 0.8 });
        this.drum(now, 0.5, a % 2 ? 1900 : 1500, 900, 0.02, 0.05);
        break;
      case "draw":
        // a pencil pulled across paper
        this.burst({ dur: 0.7, from: 2600, to: 4200, q: 1.6, level: 0.13, attack: 0.12 });
        break;
      case "thud":
        this.drum(now, a, 90, 38, 0.2, 0.5, 0.4);
        this.burst({ dur: 0.25, from: 600, to: 80, level: a * 0.6, type: "lowpass", echo: 0.3 });
        break;
      case "clank":
        this.metal(now, 0.5 * a, 190, 0.22, 0.35);
        this.burst({ dur: 0.05, from: 2400, to: 700, level: 0.4 * a, q: 2, echo: 0.3 });
        break;
      case "hiss":
        this.burst({ dur: 0.3, from: 6500, to: 2600, level: 0.22 * a, type: "highpass", q: 0.5, attack: 0.03, echo: 0.2 });
        break;
      case "coin":
        this.drum(now, 0.22 * a, 4300 + Math.random() * 900, 4200, 0.02, 0.2, 0.3);
        this.drum(now + 0.012, 0.14 * a, 6100 + Math.random() * 900, 6000, 0.02, 0.14, 0.3);
        break;
      case "stamp":
        this.drum(now, 0.7, 140, 60, 0.05, 0.14, 0.2);
        this.burst({ dur: 0.07, from: 1800, to: 500, level: 0.5, q: 1 });
        break;
      case "press":
        // a deep metal boom, and the floor under it
        this.boom(now, 1);
        this.metal(now, 0.9, 74, 1.5, 0.6);
        this.burst({ dur: 0.12, from: 3000, to: 400, level: 0.6, q: 0.7, echo: 0.4 });
        break;
      case "strain":
        // held up by someone: it groans
        this.drum(now, 0.5, 62, 55, 0.5, 0.7, 0.4, "sawtooth");
        this.burst({ dur: 0.6, from: 900, to: 500, q: 6, level: 0.3, attack: 0.1, echo: 0.3 });
        break;
      case "grind":
        // metal dragged on metal, slowing to a stop
        for (let k = 0; k < 16; k++) this.burst({ at: now + k * 0.055 + k * k * 0.0018, dur: 0.09, from: 2800 - k * 110, to: 1500 - k * 60, q: 9, level: 0.5, echo: 0.3 });
        this.drum(now, 0.5, 240, 70, 1, 1.05, 0.3, "sawtooth");
        break;
      case "rip":
        // a rip is many tiny ones in a row
        for (let k = 0; k < 14; k++) this.burst({ at: now + k * 0.018, dur: 0.05, from: 2800 + Math.random() * 2200, to: 1000, q: 0.9, level: 0.75 });
        this.burst({ dur: 0.34, from: 2400, to: 380, q: 0.6, level: 0.5, echo: 0.15 });
        break;
      case "breath":
        this.burst({ dur: 0.85, from: 500, to: 1500, q: 0.8, level: 0.2, attack: 0.6 });
        break;
      case "slam":
        // a word hits the page
        this.boom(now, 1);
        this.kick(now, 1);
        this.cymbal(now, 1, 2.4);
        for (let k = 0; k < 3; k++) this.tom(now + 0.07 * k, 1, 110 - 22 * k);
        this.hey(now + 0.05, 1, 0.42);
        break;
      case "word":
        this.kick(now, 0.9);
        this.tom(now, 0.9, 84);
        this.hey(now + 0.02, 0.7, 0.26);
        break;
      case "stand":
        // one more on their feet
        this.kick(now, 0.5);
        this.burst({ dur: 0.11, from: 240, to: 90, level: 0.5, type: "lowpass" });
        if (a % 2 === 0) this.hey(now, 0.3 + 0.05 * a, 0.2, 1 + 0.02 * a);
        break;
      case "snap":
        // a belt parting, and what it drove flying off
        this.metal(now, a, 330, 0.9, 0.5);
        this.burst({ dur: 0.08, from: 6000, to: 1500, level: 0.9 * a, type: "highpass", q: 0.5, echo: 0.4 });
        this.tom(now, a, 70);
        break;
      case "flap":
        // cloth cracking open
        this.burst({ dur: 0.07, from: 5200, to: 1200, level: 0.5, type: "highpass", q: 0.5, echo: 0.3 });
        this.burst({ at: now + 0.04, dur: 0.45, from: 500, to: 1700, q: 0.6, level: 0.25, attack: 0.1, echo: 0.3 });
        break;
      case "cheer":
        this.cheer(now, a, 1.9);
        break;
      case "hey":
        this.hey(now, a);
        break;
      case "slide":
        // the shields, pushed in across the floor
        this.burst({ dur: 1.4, from: 1200, to: 5200, q: 0.7, level: 0.4, attack: 0.9, echo: 0.3 });
        break;
      case "lock":
        for (const [dt, lv] of [[0, 1], [0.07, 0.8], [0.15, 0.7]] as const) {
          this.tom(now + dt, lv, 92);
          this.metal(now + dt, lv * 0.7, 420, 0.5, 0.5);
        }
        break;
      case "roll":
        // a snare roll, swelling into the hit
        for (let tt = 0; tt < a; tt += 0.037) this.snare(now + tt, 0.1 + 0.6 * Math.pow(tt / a, 1.6));
        break;
      case "tear":
        // the page itself: one long rip, and the blast under it
        for (let k = 0; k < 46; k++) this.burst({ at: now + k * 0.022, dur: 0.07, from: 2400 + Math.random() * 3200, to: 700, q: 0.8, level: 0.95 * (1 - k / 70), echo: 0.3 });
        this.burst({ dur: 1.5, from: 3200, to: 200, q: 0.5, level: 0.8, echo: 0.5 });
        this.boom(now, 1);
        this.kick(now, 1);
        break;
      case "stitch":
        // thread zipped through paper, a little higher each stitch
        this.burst({ dur: 0.1, from: 2600 + a * 120, to: 5200 + a * 140, q: 3.5, level: 0.36, attack: 0.02, echo: 0.15 });
        if (a % 4 === 3) this.drum(now + 0.09, 0.16, 520 + a * 12, 500 + a * 12, 0.02, 0.09);
        break;
      case "sun":
        this.boom(now, 1);
        this.kick(now, 1);
        this.cymbal(now, 1, 3);
        this.cheer(now + 0.15, 1, 3);
        break;
      case "crack":
        // glass giving way
        for (let k = 0; k < 9; k++) this.drum(now + k * 0.03 + Math.random() * 0.02, 0.3, 3000 + Math.random() * 4000, 2500, 0.03, 0.16, 0.4);
        this.burst({ dur: 0.5, from: 7000, to: 3000, level: 0.5, type: "highpass", q: 0.5, echo: 0.4 });
        break;
      case "whoosh":
        this.burst({ dur: 0.6, from: 300, to: 2400, q: 0.6, level: 0.4, attack: 0.25, echo: 0.2 });
        break;
      case "pop":
        // a loaf set down
        this.drum(now, 0.3, 300 + (a % 5) * 24, 180, 0.05, 0.1, 0.2);
        break;
      case "paste":
        this.burst({ dur: 0.045, from: 1500 + (a % 4) * 300, to: 600, q: 1.5, level: 0.35 });
        break;
      case "scratch":
        // a pen signing
        for (let k = 0; k < 7; k++) this.burst({ at: now + k * 0.16 + Math.random() * 0.04, dur: 0.13, from: 3000 + Math.random() * 1500, to: 4600, q: 2.2, level: 0.14, attack: 0.03 });
        break;
      case "glint":
        // light catching on something
        this.drum(now, 0.2, 5300, 5200, 0.02, 0.6, 0.6);
        this.drum(now + 0.015, 0.1, 7900, 7800, 0.02, 0.4, 0.6);
        break;
      case "clang":
        // a slab of the wall, landing
        this.tom(now, 1, 80);
        this.metal(now, 0.8, 300, 0.7, 0.5);
        this.burst({ dur: 0.3, from: 1800, to: 200, level: 0.7, type: "lowpass", echo: 0.4 });
        break;
      case "plate":
        this.drum(now, 0.1, 1900 + a * 1400, 1850 + a * 1400, 0.02, 0.35, 0.4);
        this.drum(now, 0.06, 4300 + a * 1900, 4250 + a * 1900, 0.02, 0.2, 0.4);
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
