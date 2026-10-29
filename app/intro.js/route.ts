import { actor } from "../components/intro/actor";
import { ACTOR_PARTS, ACTOR_SRC } from "../components/intro/actor-parts";
import { drape, type DrapeConfig } from "../components/intro/drape";

/* The intro's cloth (drape.ts) and the character who takes it away (actor.ts)
   as a script of their own, with everything they need baked in. The home page
   loads it async, so it starts as soon as the script and the pictures arrive
   instead of waiting for React. */

const FABRIC: DrapeConfig = {
  src: "/intro/fabric.webp",
  size: [1589, 990],
  bleed: 0.06,
  actor: { src: ACTOR_SRC, parts: ACTOR_PARTS as unknown as NonNullable<DrapeConfig["actor"]>["parts"] },
};

export function GET() {
  return new Response(`(${drape.toString()})(${JSON.stringify(FABRIC)}, ${actor.toString()});\n`, {
    headers: { "Content-Type": "text/javascript; charset=utf-8" },
  });
}
