import { Reveal } from "@/components/Reveal";
import { Section, SectionHeading } from "@/components/ui";
import { profile } from "@/content/profile";

const focusAreas = [
  {
    title: "Mechanical & Hardware",
    body: "CAD, FEA, machining, and sensor integration — real prototypes, not just renders.",
  },
  {
    title: "Robotics & AI/ML",
    body: "Reinforcement learning, computer vision, and embedded ML on physical systems.",
  },
  {
    title: "Quant & Research",
    body: "Backtesting infrastructure, validation methodology, and honest negative results.",
  },
  {
    title: "Product & Venture",
    body: "Customer discovery, human-centered design, and a venture-pitch finalist.",
  },
];

export function About() {
  return (
    <Section id="about">
      <SectionHeading index="01" kicker="About" title="A builder across disciplines" />

      <div className="grid gap-12 lg:grid-cols-12">
        <Reveal className="lg:col-span-7">
          <div className="space-y-5 text-lg leading-relaxed text-muted">
            {profile.about.map((para, i) => (
              <p key={i} className={i === 0 ? "text-ink" : undefined}>
                {para}
              </p>
            ))}
          </div>
        </Reveal>

        <Reveal className="lg:col-span-5" delay={120}>
          <div className="rounded-xl border border-line bg-surface/50 p-6 sm:p-7">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-faint">
              What I work on
            </p>
            <ul className="mt-5 divide-y divide-line/70">
              {focusAreas.map((area) => (
                <li key={area.title} className="py-4 first:pt-0 last:pb-0">
                  <p className="font-medium text-ink">{area.title}</p>
                  <p className="mt-1 text-sm text-muted">{area.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
