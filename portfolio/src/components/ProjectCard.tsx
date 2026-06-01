import Link from "next/link";
import type { Project } from "@/content/types";
import { Chip, Stat } from "@/components/ui";
import { ArrowRight, ArrowUpRight } from "@/components/icons";
import { cn } from "@/lib/cn";

const metricColsClass: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
};

/** Wide, case-study-style card for featured projects → links to the detail page. */
export function FeaturedProjectCard({
  project,
  index,
}: {
  project: Project;
  index: number;
}) {
  const metrics = project.metrics?.slice(0, 3) ?? [];
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group block rounded-2xl border border-line bg-surface/40 p-6 transition-all duration-300 hover:border-accent/40 hover:bg-surface sm:p-8"
    >
      <div className="grid items-start gap-7 lg:grid-cols-12 lg:gap-10">
        {/* Left: narrative */}
        <div className="lg:col-span-7">
          <div className="flex items-center justify-between gap-4 font-mono text-xs text-faint">
            <span>
              <span className="text-accent">{String(index).padStart(2, "0")}</span>
              <span className="mx-2 text-line">/</span>
              {project.year}
            </span>
            <ArrowUpRight className="h-4 w-4 text-faint opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent group-hover:opacity-100" />
          </div>

          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-ink transition-colors group-hover:text-accent sm:text-[1.6rem]">
            {project.name}
          </h3>
          <p className="mt-1.5 text-sm font-medium text-faint">{project.tagline}</p>
          <p className="mt-4 max-w-xl text-pretty leading-relaxed text-muted">
            {project.summary}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {project.pillars.map((p) => (
              <Chip key={p} accent>
                {p}
              </Chip>
            ))}
            {project.tech.slice(0, 4).map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </div>
        </div>

        {/* Right: metrics panel */}
        <div className="lg:col-span-5">
          {metrics.length > 0 ? (
            <div
              className={cn(
                "grid gap-5 rounded-xl border border-line/70 bg-bg/50 p-5 sm:p-6",
                metricColsClass[metrics.length],
              )}
            >
              {metrics.map((m) => (
                <Stat key={m.label} value={m.value} label={m.label} />
              ))}
            </div>
          ) : null}

          <p className="mt-4 px-1 font-mono text-xs text-faint">
            {project.role}
            {project.org ? ` · ${project.org}` : ""}
          </p>
        </div>
      </div>
    </Link>
  );
}

/** Compact card for the "more work" grid → links out to the repo when present. */
export function CompactProjectCard({ project }: { project: Project }) {
  const repo = project.links.find((l) => l.label === "GitHub");
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-medium text-ink transition-colors group-hover:text-accent">
          {project.name}
        </h4>
        {repo ? (
          <ArrowUpRight className="h-4 w-4 shrink-0 text-faint transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
        ) : null}
      </div>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-faint">
        {project.year} · {project.role}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted">{project.summary}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {project.pillars.map((p) => (
          <Chip key={p}>{p}</Chip>
        ))}
      </div>
    </>
  );

  const className =
    "group block h-full rounded-xl border border-line bg-surface/30 p-5 transition-all duration-300 hover:border-accent/40 hover:bg-surface";

  return repo ? (
    <a href={repo.href} target="_blank" rel="noopener noreferrer" className={className}>
      {inner}
    </a>
  ) : (
    <div className={className}>{inner}</div>
  );
}

/** Inline "read case study" affordance used on detail links. */
export function CaseStudyLink({ slug }: { slug: string }) {
  return (
    <Link
      href={`/projects/${slug}`}
      className="group inline-flex items-center gap-1.5 text-sm font-medium text-accent"
    >
      Read the case study
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
