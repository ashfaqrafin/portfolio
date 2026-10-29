import { drape, type DrapeConfig } from "../components/intro/drape";

/* The intro's cloth (drape.ts) as a script of its own, with everything it
   needs baked in. The home page loads it async, so the cloth is live as soon
   as the script and the photo arrive instead of waiting for React. */

const FABRIC: DrapeConfig = {
  src: "/intro/fabric.webp",
  size: [1589, 990],
  bleed: 0.06,
};

export function GET() {
  return new Response(`(${drape.toString()})(${JSON.stringify(FABRIC)});\n`, {
    headers: { "Content-Type": "text/javascript; charset=utf-8" },
  });
}
