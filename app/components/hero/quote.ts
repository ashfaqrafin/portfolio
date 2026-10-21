import { STAGES } from "./config";
import { clamp, mulberry32, smoothstep, win } from "./utils";

interface Ch {
  el: HTMLElement;
  delay: number;
  dx: number;
  dy: number;
  rot: number;
}

/**
 * The thought note. Plain DOM (crisp, selectable text); only its *state* is
 * driven by (k, u). It types in while the new figure is built and unravels
 * letter by letter as the old figure is torn down.
 */
export class QuoteController {
  private readonly frame: HTMLElement;
  private readonly live: HTMLElement | null;
  private readonly blocks: HTMLElement[] = [];
  private readonly chars: Ch[][] = [];
  private readonly prompts: (HTMLElement | null)[] = [];
  private cur = -1;
  private key = "";
  private caretEl: HTMLElement | null = null;

  constructor(root: HTMLElement) {
    this.frame = root.querySelector<HTMLElement>("[data-hero=qbox]")!;
    this.live = root.querySelector<HTMLElement>("[data-hero=live]");
    const rng = mulberry32(7);
    root.querySelectorAll<HTMLElement>("[data-qstage]").forEach((block) => {
      const idx = Number(block.dataset.qstage);
      this.blocks[idx] = block;
      this.prompts[idx] = block.querySelector<HTMLElement>(".prompt");
      this.chars[idx] = Array.from(block.querySelectorAll<HTMLElement>(".c")).map((el) => ({
        el,
        delay: rng() * 0.5,
        dx: (rng() * 2 - 1) * 65,
        dy: -20 + rng() * 90,
        rot: (rng() * 2 - 1) * 85,
      }));
    });
  }

  /** Returns the frame visibility (0..1) so the thought thread can fade with it. */
  update(k: number, u: number): number {
    const show = u >= 0.45 ? (k + 1) % STAGES.length : k;
    let unravel = 0;
    let retract = 0;
    let typed = 1;
    if (u < 0.45) {
      unravel = win(u, 0.02, 0.34);
      retract = smoothstep(0.3, 0.44, u);
    } else {
      retract = 1 - smoothstep(0.46, 0.58, u);
      typed = win(u, 0.56, 0.9);
    }

    const chars = this.chars[show] ?? [];
    const count = Math.floor(chars.length * typed + 1e-6);
    const key = `${show}|${unravel.toFixed(3)}|${retract.toFixed(3)}|${count}`;
    if (key === this.key) return 1 - retract;
    this.key = key;

    if (show !== this.cur) {
      this.cur = show;
      this.frame.dataset.skin = String(show);
      this.blocks.forEach((b, i) => {
        b.dataset.active = i === show ? "true" : "false";
      });
      if (this.live) this.live.textContent = STAGES[show].quote.map((s) => s.text).join("");
      this.clearCaret();
    }

    this.frame.style.clipPath =
      retract > 0.0005 ? `inset(-120px ${(retract * 100).toFixed(2)}% -120px -120px)` : "";

    const prompt = this.prompts[show];
    if (prompt) {
      prompt.style.opacity =
        u < 0.45 ? String(1 - clamp(unravel * 1.8)) : String(count > 0 || typed > 0 ? 1 : 0);
    }

    const resting = unravel === 0 && count === chars.length;
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      const st = c.el.style;
      if (unravel > 0) {
        const p = clamp((unravel - c.delay) / 0.5);
        if (p > 0) {
          const e = p * p;
          st.opacity = String(1 - p);
          st.transform = `translate(${(c.dx * e).toFixed(1)}px, ${(c.dy * e).toFixed(
            1,
          )}px) rotate(${(c.rot * e).toFixed(1)}deg)`;
        } else {
          st.opacity = "";
          st.transform = "";
        }
      } else {
        st.transform = "";
        st.opacity = i < count ? "" : "0";
      }
    }

    // caret rides on the last visible character while typing, and rests
    // blinking at the end of the terminal quote
    this.clearCaret();
    if (resting) {
      if (show === 2 && chars.length) this.setCaret(chars[chars.length - 1].el);
    } else if (unravel === 0 && count > 0 && count < chars.length) {
      this.setCaret(chars[count - 1].el);
    }
    return 1 - retract;
  }

  private setCaret(el: HTMLElement) {
    el.classList.add("caret");
    this.caretEl = el;
  }

  private clearCaret() {
    this.caretEl?.classList.remove("caret");
    this.caretEl = null;
  }
}
