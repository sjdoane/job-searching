/**
 * Curated starter set of company job boards that expose PUBLIC, ToS-friendly
 * JSON APIs (Greenhouse / Lever / Ashby). These are the legal, reliable sources
 * the council approved — no LinkedIn/Handshake scraping.
 *
 * `token` is the company's board slug used in the provider's public API URL.
 * If a board ever moves providers or changes its slug, that one fetch fails
 * gracefully and the rest still return. Sam can also add ad-hoc boards from the
 * Search UI without touching this file.
 *
 * NOTE: a company's chosen ATS can change over time. Treat this list as a
 * starting point, not gospel — verify a board returns results and prune any
 * that don't.
 */

export type Provider = "greenhouse" | "lever" | "ashby";

export interface BoardSource {
  name: string;
  provider: Provider;
  token: string;
  track: "pm" | "quant" | "mbb" | "other";
}

export const CURATED_BOARDS: BoardSource[] = [
  // Prestige tech — strong PM / new-grad pipelines (Greenhouse)
  { name: "Stripe", provider: "greenhouse", token: "stripe", track: "pm" },
  { name: "Databricks", provider: "greenhouse", token: "databricks", track: "pm" },
  { name: "Airbnb", provider: "greenhouse", token: "airbnb", track: "pm" },
  { name: "Coinbase", provider: "greenhouse", token: "coinbase", track: "pm" },
  { name: "Dropbox", provider: "greenhouse", token: "dropbox", track: "pm" },
  { name: "Robinhood", provider: "greenhouse", token: "robinhood", track: "quant" },
  { name: "Pinterest", provider: "greenhouse", token: "pinterest", track: "pm" },
];

/** GitHub new-grad lists worth checking by hand (curated, not scraped). */
export const GITHUB_LISTS = [
  {
    name: "Simplify — New Grad Positions",
    url: "https://github.com/SimplifyJobs/New-Grad-Positions",
  },
  {
    name: "Ouckah — Off-Season Internships / New Grad",
    url: "https://github.com/Ouckah/Summer2026-Internships",
  },
  {
    name: "vanshb03 — New Grad 2026",
    url: "https://github.com/vanshb03/New-Grad-2026",
  },
];
