import { Reveal } from "@/components/Reveal";
import { Section, SectionHeading, Chip } from "@/components/ui";
import { experience } from "@/content/experience";

export function Experience() {
  return (
    <Section id="experience">
      <SectionHeading
        index="03"
        kicker="Experience"
        title="Internships"
        description="A deliberately cross-disciplinary path: product development, venture, and consulting."
      />

      <div className="border-t border-line/70">
        {experience.map((item, i) => (
          <Reveal key={item.company} delay={i * 40}>
            <div className="grid gap-4 border-b border-line/70 py-8 lg:grid-cols-12 lg:gap-8">
              <div className="lg:col-span-4">
                <p className="font-mono text-xs uppercase tracking-wide text-faint">
                  {item.dates}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-ink">{item.company}</h3>
                <p className="mt-0.5 text-sm font-medium text-accent">{item.role}</p>
                <p className="mt-1 font-mono text-xs text-faint">{item.location}</p>
              </div>

              <div className="lg:col-span-8">
                <p className="text-sm text-muted">{item.blurb}</p>
                <ul className="mt-4 space-y-2.5">
                  {item.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3 text-sm leading-relaxed text-muted">
                      <span aria-hidden="true" className="mt-2 h-px w-3 shrink-0 bg-accent/60" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <Chip key={tag}>{tag}</Chip>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
