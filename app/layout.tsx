import type { Metadata } from "next";
import { Suspense } from "react";
import { Caveat, DM_Serif_Display, Newsreader, Space_Mono } from "next/font/google";
import CutTrail from "./components/site/CutTrail";
import OwnerBar from "./components/site/OwnerBar";
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

/* Decides, before the first paint, whether the home page opens with the
   intro (app/components/intro): only when the home page is where the visit
   starts, once per browser session, never for a deep link (/#projects) or with
   reduced motion. While it plays, a click, key, scroll or touch is noted
   (data-intro-skip, with where a click landed, "x,y"), even before the
   page's scripts have loaded, so it still skips: the cloth is drawn off by the
   corner nearest the click, or the page lifts away, and when that lift ends
   the intro is over.
   Without JavaScript the attribute is never set, so the intro never shows. */
const INTRO_GATE = `try{var d=document.documentElement,s=sessionStorage;d.dataset.intro=location.pathname==="/"&&!location.hash&&!s.getItem("intro-seen")&&!matchMedia("(prefers-reduced-motion: reduce)").matches?"play":"seen";s.setItem("intro-seen","1");if(d.dataset.intro==="play"){var k=function(e){var c=e&&e.clientX!=null?Math.round(e.clientX)+","+Math.round(e.clientY):"";if(!d.dataset.introSkip)d.dataset.introSkip=c};["pointerdown","keydown","wheel","touchstart"].forEach(function(e){addEventListener(e,k,{once:true,passive:true})});addEventListener("animationend",function(e){if(e.animationName==="intro-out")d.dataset.intro="seen"})}}catch(e){}`;

export default function RootLayout({ children, modal }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${hand.variable} ${mono.variable} ${read.variable} h-full antialiased`}
      // INTRO_GATE sets data-intro before React hydrates
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_GATE }} />
      </head>
      <body className="min-h-full flex flex-col">
        <RoughDefs />
        {children}
        {modal}
        {/* reads the URL in the browser only: kept out of the static shell */}
        <Suspense fallback={null}>
          <OwnerBar />
        </Suspense>
        <CutTrail />
      </body>
    </html>
  );
}
