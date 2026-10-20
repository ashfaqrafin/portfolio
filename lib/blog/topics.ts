import type { Topic } from "./types";

/** Lane order on the board, top to bottom. Unified sits between the two sides it bridges. */
export const TOPICS = ["tailoring", "fashion", "unified", "linux"] as const satisfies readonly Topic[];

export const TOPIC_LABEL: Record<Topic, string> = {
  tailoring: "Tailoring",
  fashion: "Fashion",
  unified: "Unified",
  linux: "Linux",
};

/** The note style each topic's pin wears (borrowed from the hero's thought notes). */
export const TOPIC_SKIN: Record<Topic, string> = {
  tailoring: "pattern paper",
  fashion: "hang-tag",
  unified: "stitched code card",
  linux: "terminal",
};

/** Hand-written lane captions. */
export const TOPIC_ANNOT: Record<Topic, string> = {
  tailoring: "the needle",
  fashion: "the silhouette",
  unified: "both at once",
  linux: "the terminal",
};

export function isTopic(v: unknown): v is Topic {
  return typeof v === "string" && (TOPICS as readonly string[]).includes(v);
}
