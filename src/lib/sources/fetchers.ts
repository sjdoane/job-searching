import "server-only";

import type { BoardSource, Provider } from "./boards";

export interface JobPosting {
  company: string;
  title: string;
  location: string | null;
  url: string;
  provider: Provider;
  track: BoardSource["track"];
}

const TIMEOUT_MS = 9000;

async function getJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json", "User-Agent": "JobSearchCommandCenter/1.0" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

async function fetchGreenhouse(source: BoardSource): Promise<JobPosting[]> {
  const data = (await getJson(
    `https://boards-api.greenhouse.io/v1/boards/${source.token}/jobs`,
  )) as { jobs?: Array<Record<string, unknown>> };
  return (data.jobs ?? []).map((j) => ({
    company: source.name,
    title: str(j.title) ?? "Untitled",
    location: str((j.location as { name?: unknown })?.name),
    url: str(j.absolute_url) ?? "",
    provider: "greenhouse" as const,
    track: source.track,
  }));
}

async function fetchLever(source: BoardSource): Promise<JobPosting[]> {
  const data = (await getJson(
    `https://api.lever.co/v0/postings/${source.token}?mode=json`,
  )) as Array<Record<string, unknown>>;
  return (Array.isArray(data) ? data : []).map((j) => {
    const categories = (j.categories ?? {}) as Record<string, unknown>;
    return {
      company: source.name,
      title: str(j.text) ?? "Untitled",
      location: str(categories.location),
      url: str(j.hostedUrl) ?? "",
      provider: "lever" as const,
      track: source.track,
    };
  });
}

async function fetchAshby(source: BoardSource): Promise<JobPosting[]> {
  const data = (await getJson(
    `https://api.ashbyhq.com/posting-api/job-board/${source.token}?includeCompensation=true`,
  )) as { jobs?: Array<Record<string, unknown>> };
  return (data.jobs ?? []).map((j) => ({
    company: source.name,
    title: str(j.title) ?? "Untitled",
    location: str(j.locationName) ?? str(j.location),
    url: str(j.jobUrl) ?? str(j.applyUrl) ?? "",
    provider: "ashby" as const,
    track: source.track,
  }));
}

const FETCHERS: Record<Provider, (s: BoardSource) => Promise<JobPosting[]>> = {
  greenhouse: fetchGreenhouse,
  lever: fetchLever,
  ashby: fetchAshby,
};

export interface BoardResult {
  source: BoardSource;
  ok: boolean;
  postings: JobPosting[];
  error?: string;
}

/** Fetch one board, never throwing — failures are reported in the result. */
export async function fetchBoard(source: BoardSource): Promise<BoardResult> {
  try {
    const postings = (await FETCHERS[source.provider](source)).filter(
      (p) => p.url,
    );
    return { source, ok: true, postings };
  } catch (err) {
    return {
      source,
      ok: false,
      postings: [],
      error: err instanceof Error ? err.message : "fetch failed",
    };
  }
}

/** Fetch many boards in parallel. */
export async function fetchBoards(
  sources: BoardSource[],
): Promise<BoardResult[]> {
  return Promise.all(sources.map(fetchBoard));
}
