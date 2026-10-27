/* The education section's three questions, one per orbiting ball, and the
   answers their windows open with. Edit freely: a blank line in an answer is
   not special; each string in `answer` is its own paragraph. */

export type Subject = {
  id: "cs" | "econ" | "pol";
  field: string;
  kind: "Major" | "Minor";
  question: string;
  /** what the label says on a narrow screen */
  short: string;
  /** the file name in the window's title bar */
  file: string;
  answer: string[];
};

export const SUBJECTS: Subject[] = [
  {
    id: "cs",
    field: "Computer Science",
    kind: "Major",
    question: "Why computer science?",
    short: "Why CS?",
    file: "why-computer-science.md",
    answer: [
      "Because it's the one place where an idea can turn into something that works by the end of the day. I came to it through Linux: breaking my own setup, reading the docs, and putting it back together better than before.",
      "What keeps me here is building systems that don't need anyone's permission to run: a Git that syncs peer to peer, a newsroom where a claim has to be staked before it counts. Code is how I find out whether an idea about people actually holds up.",
    ],
  },
  {
    id: "econ",
    field: "Economics",
    kind: "Major",
    question: "Why economics?",
    short: "Why econ?",
    file: "why-economics.md",
    answer: [
      "Because every system I build turns out to be a set of incentives. Economics is the habit of asking what people will actually do, not what we hope they'll do.",
      "It's why nextGENjournalism ranks journalists by the reputation they put on the line, and why I'm never surprised when a perfectly fair rule still piles up unequal results.",
    ],
  },
  {
    id: "pol",
    field: "Political Science",
    kind: "Minor",
    question: "Why political science?",
    short: "Why poli sci?",
    file: "why-political-science.md",
    answer: [
      "Because the hardest part of any system isn't the code. It's who gets to decide.",
      "Political science is how I think about power, rules and legitimacy: why a group accepts an outcome, and what happens when it doesn't. Quorum, the decision-making tool I'm building, starts from exactly that question.",
    ],
  },
];
