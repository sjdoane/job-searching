/**
 * Starter prep curriculum per category — a realistic, opinionated default
 * checklist Sam can load with one click, then edit. Pure data (no DB, no
 * "server-only"), so both the seed action and the client UI can import it.
 *
 * Names reference well-known assessment formats (HackerRank, McKinsey Solve,
 * BCG Casey, Bain) only as labels — nothing here scrapes or automates them.
 */

export interface CurriculumItem {
  topic: string;
  resourceUrl?: string;
}

export const PREP_CURRICULUM: Record<string, CurriculumItem[]> = {
  quant: [
    { topic: "Probability & combinatorics" },
    { topic: "Expected value & conditional probability" },
    { topic: "Mental math & fast arithmetic" },
    { topic: "Statistics & distributions" },
    { topic: "Brain teasers & Fermi estimation" },
    { topic: "Market-making & trading games (EV under uncertainty)" },
    { topic: "Python: arrays, strings, hashing" },
    { topic: "Data structures & algorithms (HackerRank-style OA)" },
  ],
  mbb: [
    { topic: "Case structuring & issue trees" },
    { topic: "Market sizing & estimation" },
    { topic: "Profitability & cost analysis" },
    { topic: "Case math (growth, margins, breakeven)" },
    { topic: "Mental math under time pressure" },
    { topic: "Exhibit & chart interpretation" },
    { topic: "Brainstorming / creativity" },
    { topic: "Firm online tests (McKinsey Solve, BCG Casey, Bain)" },
  ],
  pm: [
    { topic: "Product sense & design questions" },
    { topic: "Metrics & defining success" },
    { topic: "Prioritization & tradeoffs (e.g. RICE)" },
    { topic: "Execution & root-cause analysis" },
    { topic: "Estimation / market sizing" },
    { topic: "Technical fundamentals (APIs, systems)" },
    { topic: "Strategy & competitive analysis" },
  ],
  behavioral: [
    { topic: "STAR: leadership" },
    { topic: "STAR: conflict / disagreement" },
    { topic: "STAR: failure / setback & what you learned" },
    { topic: "STAR: proudest accomplishment" },
    { topic: "STAR: ambiguity / taking initiative" },
    { topic: "Why this firm / why this role" },
    { topic: "Tell me about yourself (60-sec pitch)" },
    { topic: "Smart questions to ask the interviewer" },
  ],
};
