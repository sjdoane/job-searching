import { Reveal } from "@/components/Reveal";
import { Section, SectionHeading, Chip } from "@/components/ui";
import { education } from "@/content/profile";

export function Education() {
  return (
    <Section id="education">
      <SectionHeading index="05" kicker="Education" title="Education & honors" />

      <Reveal>
        <div className="rounded-2xl border border-line bg-surface/40 p-6 sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="text-xl font-semibold text-ink">{education.school}</h3>
            <span className="font-mono text-xs text-faint">
              {education.dates} · {education.location}
            </span>
          </div>

          <div className="mt-7 grid gap-8 lg:grid-cols-2">
            <div>
              <ul className="space-y-4">
                {education.degrees.map((d) => (
                  <li key={d.degree}>
                    <p className="font-medium text-ink">{d.degree}</p>
                    <p className="mt-0.5 font-mono text-sm text-accent">{d.detail}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-2">
                {education.honors.map((h) => (
                  <Chip key={h} accent>
                    {h}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-faint">
                Selected coursework
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {education.coursework.map((c) => (
                  <Chip key={c}>{c}</Chip>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
