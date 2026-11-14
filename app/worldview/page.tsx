import type { Metadata } from "next";
import { Anton } from "next/font/google";
import Film from "../components/film/Film";

// the film's poster face: its title, and the words slammed onto the paper
const poster = Anton({
  variable: "--font-poster",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "All of us — Ashfaq",
  description:
    "All of us: my world view as a film of ninety seconds, drawn in code. A factory, a refusal, a revolt, and one long table. Not a ladder. A table.",
};

export default function WorldViewPage() {
  return <Film className={poster.variable} />;
}
