import type { FlagId } from "./story";

/* The flags, drawn flat into a picture each (3:2, the hoist on the left) for
   the cloth to wear. The proportions follow each flag's own rules as closely
   as a 3:2 sheet allows. A faint weave and a darker hem go over every one, so
   they read as cloth rather than as a diagram. */

export const FLAG_W = 720;
export const FLAG_H = 480;

const RED = "#c8102e";

export function paintFlag(id: FlagId): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = FLAG_W;
  c.height = FLAG_H;
  const g = c.getContext("2d")!;
  const W = FLAG_W, H = FLAG_H;
  switch (id) {
    case "red":
      g.fillStyle = RED;
      g.fillRect(0, 0, W, H);
      break;
    case "bangladesh":
      g.fillStyle = "#006a4e";
      g.fillRect(0, 0, W, H);
      g.fillStyle = "#f42a41";
      g.beginPath();
      // the disc: a fifth of the length across, its centre a little to the hoist
      g.arc(W * 0.45, H / 2, W * 0.2, 0, Math.PI * 2);
      g.fill();
      break;
    case "palestine":
      ["#141414", "#f4f1ea", "#007a3d"].forEach((col, k) => {
        g.fillStyle = col;
        g.fillRect(0, (k * H) / 3, W, H / 3 + 1);
      });
      g.fillStyle = "#ce1126";
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(W / 3, H / 2);
      g.lineTo(0, H);
      g.closePath();
      g.fill();
      break;
    case "cuba": {
      for (let k = 0; k < 5; k++) {
        g.fillStyle = k % 2 ? "#f4f1ea" : "#002a8f";
        g.fillRect(0, (k * H) / 5, W, H / 5 + 1);
      }
      g.fillStyle = "#cf142b";
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(H * 0.866, H / 2);
      g.lineTo(0, H);
      g.closePath();
      g.fill();
      star(g, H * 0.31, H / 2, H * 0.12, "#f4f1ea");
      break;
    }
    case "congo": {
      g.fillStyle = "#007fff";
      g.fillRect(0, 0, W, H);
      // the diagonal, from the bottom of the hoist up: red edged with yellow
      bandLine(g, W, H, H * 0.36, "#f7d618");
      bandLine(g, W, H, H * 0.24, "#ce1021");
      star(g, H * 0.22, H * 0.2, H * 0.13, "#f7d618");
      break;
    }
    case "soviet":
      g.fillStyle = "#cc0000";
      g.fillRect(0, 0, W, H);
      sovietEmblem(g, H);
      break;
  }
  // cloth: a faint weave, and a darker hem along the edges
  g.globalAlpha = 0.06;
  g.fillStyle = "#000";
  for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1.5);
  g.globalAlpha = 0.045;
  for (let x = 0; x < W; x += 5) g.fillRect(x, 0, 1.5, H);
  g.globalAlpha = 1;
  g.strokeStyle = "rgba(0,0,0,0.22)";
  g.lineWidth = H / 40;
  g.strokeRect(0, 0, W, H);
  return c;
}

// a thick band across the flag from the bottom of the hoist to the top of the fly
function bandLine(g: CanvasRenderingContext2D, W: number, H: number, width: number, col: string) {
  g.strokeStyle = col;
  g.lineWidth = width;
  g.lineCap = "butt";
  g.beginPath();
  g.moveTo(-W * 0.05, H * 1.05);
  g.lineTo(W * 1.05, -H * 0.05);
  g.stroke();
}

function star(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, col: string, outline = false) {
  g.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const rr = k % 2 ? r * 0.382 : r;
    g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  g.closePath();
  if (outline) {
    g.strokeStyle = col;
    g.lineWidth = r * 0.16;
    g.stroke();
  } else {
    g.fillStyle = col;
    g.fill();
  }
}

/* the hammer and sickle with the star's outline above, in the canton */
function sovietEmblem(g: CanvasRenderingContext2D, H: number) {
  const gold = "#ffd700";
  const s = H / 240;
  g.save();
  g.translate(H * 0.3, H * 0.33);
  g.scale(s, s);
  star(g, 0, -62, 14, gold, true);
  // the sickle: a crescent opening to the upper right, its handle down left
  g.fillStyle = gold;
  g.beginPath();
  g.arc(4, 4, 34, -0.35 * Math.PI, 0.95 * Math.PI, false);
  g.arc(10, -3, 26, 0.9 * Math.PI, -0.32 * Math.PI, true);
  g.closePath();
  g.fill();
  g.save();
  g.translate(-27, 30);
  g.rotate(-Math.PI / 4);
  g.fillRect(-3.5, 0, 7, 20);
  g.restore();
  // the hammer: a handle from lower right to upper left, a head across its top
  g.save();
  g.rotate(-Math.PI / 4);
  g.fillRect(-4, -26, 8, 66);
  g.fillRect(-17, -34, 34, 12);
  g.restore();
  g.restore();
}
