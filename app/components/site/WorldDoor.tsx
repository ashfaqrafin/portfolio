import "./site.css";

/* The home page's last thing: a door to the world view. On a site drawn in
   one burgundy ink, the rag on this stick is the only bright red, as the
   strip torn off the belt is the first colour in the film's grey factory.
   It stirs in the wind (still, with reduced motion), and the whole card is
   the link. */
export default function WorldDoor() {
  return (
    <aside className="door" aria-labelledby="door-title">
      {/* a plain link: a page load, so the two pages cross-fade (globals.css) */}
      <a className="door-link" href="/worldview">
        <svg className="door-rag" viewBox="0 0 150 170" aria-hidden="true" focusable="false">
          <path d="M30 166 L52 6" fill="none" stroke="var(--ink)" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M34 140 l8 -2 M38 110 l8 -2 M42 80 l8 -2" fill="none" stroke="var(--ink)" strokeWidth="1.4" strokeLinecap="round" />
          <g className="door-cloth">
            <path d="M52 8 C74 -2 92 20 128 8 C124 28 126 44 120 62 C92 74 74 54 46 64 Z" fill="var(--flag)" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
            <path d="M70 12 C68 30 66 44 62 58 M98 14 C96 32 96 48 92 64" fill="none" stroke="var(--ink)" strokeWidth="1.1" strokeLinecap="round" opacity="0.45" />
          </g>
        </svg>
        <span className="door-hand">one more page, and it isn&rsquo;t a lane</span>
        <span id="door-title" className="door-title">
          All of us
        </span>
        <span className="door-tag">My world view, a film in ninety seconds</span>
      </a>
    </aside>
  );
}
