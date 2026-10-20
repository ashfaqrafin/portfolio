import type { Metadata } from "next";
import { Caveat, DM_Serif_Display, Newsreader, Space_Mono } from "next/font/google";
import RoughDefs from "./components/site/RoughDefs";
import "./globals.css";

const display = DM_Serif_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const hand = Caveat({
  variable: "--font-hand",
  subsets: ["latin"],
});

const mono = Space_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

// long-form reading face for the blog
const read = Newsreader({
  variable: "--font-read",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Ashfaq \u2014 Portfolio",
  description:
    "A creative who can't pick a lane: tailor, fashion enthusiast, Linux tech guy \u2014 and, eventually, all of them at once.",
};

export default function RootLayout({ children, modal }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${hand.variable} ${mono.variable} ${read.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <RoughDefs />
        {children}
        {modal}
      </body>
    </html>
  );
}
