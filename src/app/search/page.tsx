import { addPostingToTrackerAction } from "@/app/actions";
import { Badge, Card, PageHeader } from "@/components/ui";
import { CURATED_BOARDS, GITHUB_LISTS, type Provider } from "@/lib/sources/boards";
import { fetchBoards, type JobPosting } from "@/lib/sources/fetchers";
import { listTargets } from "@/lib/tracker";
import { TRACK_COLORS, TRACK_OPTIONS, labelFor } from "@/lib/labels";

export const dynamic = "force-dynamic";

const RESULT_CAP = 120;

const QUICK_QUERIES = [
  "new grad",
  "university grad",
  "product manager",
  "associate product",
  "quant",
  "2026",
];

function matches(posting: JobPosting, q: string): boolean {
  if (!q) return true;
  const haystack = `${posting.title} ${posting.location ?? ""}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    tracks?: string;
    bprovider?: string;
    btoken?: string;
    bname?: string;
    run?: string;
  }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const selectedTracks = (sp.tracks ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const hasRun = sp.run === "1" || Boolean(q) || Boolean(sp.btoken);

  // Build the board list: curated (optionally filtered by track) + one ad-hoc.
  let boards = CURATED_BOARDS;
  if (selectedTracks.length > 0) {
    boards = boards.filter((b) => selectedTracks.includes(b.track));
  }
  if (sp.btoken && sp.bprovider) {
    boards = [
      {
        name: sp.bname?.trim() || sp.btoken,
        provider: sp.bprovider as Provider,
        token: sp.btoken.trim(),
        track: "other",
      },
      ...boards,
    ];
  }

  const results = hasRun ? await fetchBoards(boards) : [];
  const okResults = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  const allPostings = okResults
    .flatMap((r) => r.postings)
    .filter((p) => matches(p, q));

  const trackedUrls = new Set(
    listTargets()
      .map((t) => t.url)
      .filter(Boolean) as string[],
  );

  const shown = allPostings.slice(0, RESULT_CAP);

  return (
    <div>
      <PageHeader
        title="Search"
        subtitle="Live roles from public company job boards (Greenhouse / Lever / Ashby). Legal sources only — no LinkedIn/Handshake scraping."
      />

      <Card className="mb-6">
        <form method="get" className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              name="q"
              defaultValue={q}
              placeholder="Keyword filter, e.g. 'new grad product' or 'quant 2026'"
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <input type="hidden" name="run" value="1" />
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Search
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Tracks:</span>
            {TRACK_OPTIONS.map((o) => {
              const checked = selectedTracks.includes(o.value);
              return (
                <label
                  key={o.value}
                  className="inline-flex cursor-pointer items-center gap-1.5 text-sm"
                >
                  <input
                    type="checkbox"
                    name="tracks"
                    value={o.value}
                    defaultChecked={checked}
                    className="rounded border-slate-300"
                  />
                  {o.label}
                </label>
              );
            })}
            <span className="ml-2 text-xs text-slate-400">
              (none = all boards)
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {QUICK_QUERIES.map((qq) => (
              <a
                key={qq}
                href={`/search?run=1&q=${encodeURIComponent(qq)}`}
                className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100"
              >
                {qq}
              </a>
            ))}
          </div>
        </form>

        <details className="mt-4 border-t border-slate-100 pt-3">
          <summary className="cursor-pointer text-xs font-medium text-slate-500">
            Add a company board by token (Greenhouse / Lever / Ashby)
          </summary>
          <form method="get" className="mt-3 flex flex-wrap items-end gap-2">
            <label className="text-xs text-slate-600">
              <span className="mb-1 block">Provider</span>
              <select
                name="bprovider"
                defaultValue={sp.bprovider ?? "greenhouse"}
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              >
                <option value="greenhouse">Greenhouse</option>
                <option value="lever">Lever</option>
                <option value="ashby">Ashby</option>
              </select>
            </label>
            <label className="text-xs text-slate-600">
              <span className="mb-1 block">Board token / slug</span>
              <input
                name="btoken"
                defaultValue={sp.btoken ?? ""}
                placeholder="e.g. stripe"
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs text-slate-600">
              <span className="mb-1 block">Display name</span>
              <input
                name="bname"
                defaultValue={sp.bname ?? ""}
                placeholder="Stripe"
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <input type="hidden" name="q" value={q} />
            <button
              type="submit"
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Fetch board
            </button>
          </form>
          <p className="mt-2 text-xs text-slate-400">
            The token is the company slug in the board URL, e.g.
            boards-api.greenhouse.io/v1/boards/<b>stripe</b>/jobs.
          </p>
        </details>
      </Card>

      {hasRun ? (
        <>
          <div className="mb-3 flex items-center gap-3 text-sm text-slate-500">
            <span>
              {allPostings.length} result{allPostings.length === 1 ? "" : "s"}
              {allPostings.length > RESULT_CAP
                ? ` (showing first ${RESULT_CAP})`
                : ""}{" "}
              from {okResults.length} board
              {okResults.length === 1 ? "" : "s"}
            </span>
            {failed.length > 0 ? (
              <span className="text-amber-600">
                {failed.length} board{failed.length === 1 ? "" : "s"} unreachable
                ({failed.map((f) => f.source.name).join(", ")})
              </span>
            ) : null}
          </div>

          {shown.length === 0 ? (
            <Card>
              <p className="text-sm text-slate-600">
                No matching roles. Try a broader keyword, fewer track filters, or
                add a specific company board above.
              </p>
            </Card>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <ul className="divide-y divide-slate-100">
                {shown.map((p, i) => {
                  const tracked = trackedUrls.has(p.url);
                  return (
                    <li
                      key={`${p.url}-${i}`}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-slate-900 hover:text-indigo-600 hover:underline"
                        >
                          {p.title}
                        </a>
                        <div className="text-xs text-slate-500">
                          {p.company}
                          {p.location ? ` · ${p.location}` : ""} · {p.provider}
                        </div>
                      </div>
                      <Badge className={TRACK_COLORS[p.track] ?? TRACK_COLORS.other}>
                        {labelFor(TRACK_OPTIONS, p.track)}
                      </Badge>
                      {tracked ? (
                        <span className="w-28 text-right text-xs font-medium text-emerald-600">
                          ✓ In tracker
                        </span>
                      ) : (
                        <form action={addPostingToTrackerAction}>
                          <input type="hidden" name="company" value={p.company} />
                          <input type="hidden" name="role" value={p.title} />
                          <input type="hidden" name="track" value={p.track} />
                          <input
                            type="hidden"
                            name="location"
                            value={p.location ?? ""}
                          />
                          <input type="hidden" name="source" value={p.provider} />
                          <input type="hidden" name="url" value={p.url} />
                          <button
                            type="submit"
                            className="w-28 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            + Add
                          </button>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      ) : (
        <Card>
          <p className="text-sm text-slate-600">
            Enter a keyword and hit Search to pull live roles from curated
            company boards. The highest-value targets for your tracks (MBB, elite
            quant) use private portals and won&apos;t appear here — add those to
            the Tracker by hand and watch their open dates.
          </p>
        </Card>
      )}

      <div className="mt-8">
        <h2 className="mb-2 font-semibold">Curated GitHub new-grad lists</h2>
        <Card className="space-y-2">
          {GITHUB_LISTS.map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="block text-sm text-indigo-600 hover:underline"
            >
              {l.name}
            </a>
          ))}
          <p className="text-xs text-slate-400">
            These community lists aggregate new-grad postings. Open, scan, and
            add anything relevant to your Tracker.
          </p>
        </Card>
      </div>
    </div>
  );
}
