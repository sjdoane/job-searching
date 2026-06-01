import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { featuredProjects, getProject } from "@/content/projects";
import { Chip, Stat } from "@/components/ui";
import { Reveal } from "@/components/Reveal";
import { Footer } from "@/components/Footer";
import { ArrowRight, ArrowUpRight, GitHubIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

export const dynamicParams = false;

export function generateStaticParams() {
  return featuredProjects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};
  return {
    title: project.name,
    description: project.summary,
    openGraph: {
      title: `${project.name} · Samuel Doane`,
      description: project.summary,
      type: "article",
    },
  };
}

const metricColsClass: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
};

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project || !project.featured) notFound();

  const metrics = project.metrics ?? [];
  const repo = project.links.find((l) => l.label === "GitHub");

  return (
    <div className="min-h-screen">
      {/* Slim header */}
      <header className="sticky top-0 z-50 border-b border-line/70 bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-6">
          <Link
            href="/#work"
            className="group inline-flex items-center gap-2 font-mono text-sm text-muted transition-colors hover:text-ink"
          >
            <ArrowRight className="h-4 w-4 rotate-180 transition-transform group-hover:-translate-x-0.5" />
            Back to work
          </Link>
          <Link
            href="/"
            className="font-mono text-sm font-medium text-ink transition-colors hover:text-accent"
          >
            Samuel Doane<span className="text-accent">.</span>
          </Link>
        </div>
      </header>

      <article className="mx-auto w-full max-w-4xl px-6 pb-24 pt-12 sm:pt-16">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-faint">
            {project.year} · {project.role}
            {project.org ? ` · ${project.org}` : ""}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            {project.name}
          </h1>
          <p className="mt-3 text-lg text-muted">{project.tagline}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            {project.pillars.map((p) => (
              <Chip key={p} accent>
                {p}
              </Chip>
            ))}
            {project.tech.map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </div>

          {repo ? (
            <a
              href={repo.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-7 inline-flex items-center gap-2 rounded-md border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent/40 hover:text-accent"
            >
              <GitHubIcon className="h-4 w-4" />
              View on GitHub
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          ) : null}
        </Reveal>

        {metrics.length > 0 ? (
          <Reveal delay={80}>
            <div
              className={cn(
                "mt-10 grid grid-cols-1 gap-6 rounded-2xl border border-line bg-surface/40 p-6 sm:p-8",
                metricColsClass[Math.min(metrics.length, 3)],
              )}
            >
              {metrics.map((m) => (
                <Stat key={m.label} value={m.value} label={m.label} />
              ))}
            </div>
          </Reveal>
        ) : null}

        {project.status ? (
          <Reveal delay={120}>
            <div className="mt-6 rounded-lg border border-accent/20 bg-accent/[0.06] p-4">
              <p className="text-sm leading-relaxed text-muted">
                <span className="mr-2 font-mono text-xs uppercase tracking-wide text-accent">
                  Status
                </span>
                {project.status}
              </p>
            </div>
          </Reveal>
        ) : null}

        <Reveal delay={120}>
          <p className="mt-10 text-pretty text-xl leading-relaxed text-ink">
            {project.summary}
          </p>
        </Reveal>

        {project.problem ? (
          <Block title="The problem">
            <p className="text-pretty leading-relaxed text-muted">{project.problem}</p>
          </Block>
        ) : null}

        {project.contributions && project.contributions.length > 0 ? (
          <Block title="What I did">
            <ul className="space-y-3.5">
              {project.contributions.map((item) => (
                <li key={item} className="flex gap-3 text-pretty leading-relaxed text-muted">
                  <span aria-hidden="true" className="mt-2.5 h-px w-3.5 shrink-0 bg-accent/60" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Block>
        ) : null}

        {project.highlights && project.highlights.length > 0 ? (
          <Block title="Notable details">
            <ul className="space-y-3.5">
              {project.highlights.map((item) => (
                <li key={item} className="flex gap-3 text-pretty leading-relaxed text-muted">
                  <span aria-hidden="true" className="mt-2.5 h-px w-3.5 shrink-0 bg-accent/60" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Block>
        ) : null}

        <Reveal>
          <div className="mt-16 flex items-center justify-between border-t border-line pt-8">
            <Link
              href="/#work"
              className="group inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
            >
              <ArrowRight className="h-4 w-4 rotate-180 transition-transform group-hover:-translate-x-0.5" />
              All work
            </Link>
            <Link
              href="/#contact"
              className="group inline-flex items-center gap-2 text-sm font-medium text-accent"
            >
              Get in touch
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </Reveal>
      </article>

      <Footer />
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Reveal>
      <section className="mt-12">
        <h2 className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-faint">
          <span className="h-px w-6 bg-accent" />
          {title}
        </h2>
        <div className="mt-5">{children}</div>
      </section>
    </Reveal>
  );
}
