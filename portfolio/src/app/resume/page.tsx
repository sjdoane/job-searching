import type { Metadata } from "next";
import Link from "next/link";
import { profile, education, skillGroups, socials, siteUrl } from "@/content/profile";
import { experience } from "@/content/experience";
import { featuredProjects, moreProjects } from "@/content/projects";
import { PrintButton } from "@/components/PrintButton";
import { ArrowRight } from "@/components/icons";

export const metadata: Metadata = {
  title: "Résumé",
  description: "Résumé of Samuel Doane — engineer-builder across mechanical design, robotics, AI/ML, and quant.",
};

const displayUrl = siteUrl.replace(/^https?:\/\//, "");

export default function ResumePage() {
  return (
    <div className="min-h-screen print:bg-white">
      {/* Toolbar — screen only */}
      <div className="sticky top-0 z-10 border-b border-line/70 bg-bg/85 backdrop-blur-md print:hidden">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-6">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 font-mono text-sm text-muted transition-colors hover:text-ink"
          >
            <ArrowRight className="h-4 w-4 rotate-180 transition-transform group-hover:-translate-x-0.5" />
            Back to site
          </Link>
          <PrintButton className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-bg transition-colors hover:bg-accent-bright" />
        </div>
      </div>

      <div className="px-4 py-8 print:p-0">
        {/* The résumé sheet (light, print-clean) */}
        <article className="mx-auto max-w-3xl rounded-lg bg-white p-8 text-zinc-800 shadow-xl ring-1 ring-black/5 sm:p-10 print:max-w-none print:rounded-none print:p-0 print:shadow-none print:ring-0">
          {/* Header */}
          <header className="border-b-2 border-zinc-900 pb-4">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
              {profile.name}
            </h1>
            <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Mechanical Engineering · Robotics · AI / ML · Quant
            </p>
            <p className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-zinc-600">
              <a href={`mailto:${socials.email}`} className="hover:text-zinc-900">
                {socials.email}
              </a>
              <Sep />
              <a href={socials.linkedin} className="hover:text-zinc-900">
                linkedin.com/in/samdoane
              </a>
              <Sep />
              <a href={socials.github} className="hover:text-zinc-900">
                github.com/sjdoane
              </a>
              <Sep />
              <a href={siteUrl} className="hover:text-zinc-900">
                {displayUrl}
              </a>
            </p>
          </header>

          {/* Education */}
          <ResumeSection title="Education">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="font-semibold text-zinc-900">{education.school}</h3>
              <span className="shrink-0 text-xs text-zinc-500">{education.dates}</span>
            </div>
            <p className="mt-1 text-sm text-zinc-700">
              {education.degrees.map((d) => `${d.degree} (${d.detail})`).join(" · ")}
            </p>
            <p className="mt-1 text-sm text-zinc-700">{education.honors.join(" · ")}</p>
            <p className="mt-1 text-sm text-zinc-600">
              <span className="font-medium text-zinc-700">Coursework:</span>{" "}
              {education.coursework.join(", ")}
            </p>
          </ResumeSection>

          {/* Experience */}
          <ResumeSection title="Experience">
            <div className="space-y-4">
              {experience.map((item) => (
                <div key={item.company}>
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="font-semibold text-zinc-900">
                      {item.role}
                      <span className="font-normal text-zinc-600"> — {item.company}</span>
                    </h3>
                    <span className="shrink-0 text-xs text-zinc-500">{item.dates}</span>
                  </div>
                  <p className="text-xs italic text-zinc-500">{item.location}</p>
                  <ul className="mt-1.5 space-y-1">
                    {item.bullets.map((b) => (
                      <li key={b} className="flex gap-2 text-sm text-zinc-700">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-400" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </ResumeSection>

          {/* Projects */}
          <ResumeSection title="Selected Projects">
            <div className="space-y-3">
              {featuredProjects.map((p) => (
                <div key={p.slug}>
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="text-sm font-semibold text-zinc-900">
                      {p.name}
                      <span className="font-normal text-zinc-600"> — {p.tagline}</span>
                    </h3>
                    <span className="shrink-0 text-xs text-zinc-500">{p.year}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-zinc-700">{p.summary}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-zinc-600">
              <span className="font-medium text-zinc-700">Also:</span>{" "}
              {moreProjects.map((p) => p.name).join(" · ")}
            </p>
          </ResumeSection>

          {/* Skills */}
          <ResumeSection title="Technical Skills">
            <div className="space-y-1.5">
              {skillGroups.map((g) => (
                <p key={g.title} className="text-sm text-zinc-700">
                  <span className="font-medium text-zinc-900">{g.title}:</span>{" "}
                  {g.skills.join(", ")}
                </p>
              ))}
            </div>
          </ResumeSection>
        </article>
      </div>
    </div>
  );
}

function ResumeSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h2 className="mb-2.5 border-b border-zinc-300 pb-1 text-xs font-bold uppercase tracking-[0.18em] text-zinc-900">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Sep() {
  return <span className="text-zinc-300">·</span>;
}
