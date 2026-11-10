import type { Metadata } from "next";
import { Baloo_Da_2 } from "next/font/google";
import WorldView from "../components/worldview/WorldView";

// the climax's Bangla: the sound the flag makes coming back, and what he says
const bangla = Baloo_Da_2({
  variable: "--font-bangla",
  subsets: ["bengali"],
  weight: "800",
});

export const metadata: Metadata = {
  title: "World view — Ashfaq",
  description:
    "The flag nobody could break: my world view in seven chapters, from a red rag on a railing to a long table with room for everyone.",
};

export default function WorldViewPage() {
  return <WorldView className={bangla.variable} />;
}
