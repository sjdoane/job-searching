import { Reveal } from "@/components/Reveal";
import { Section, SectionHeading } from "@/components/ui";
import { FeaturedProjectCard, CompactProjectCard } from "@/components/ProjectCard";
import { featuredProjects, moreProjects } from "@/content/projects";

export function Work() {
  return (
    <Section id="work">
      <SectionHeading
        index="02"
        kicker="Selected Work"
        title="Projects"
        description="From an adjustable pediatric prosthetic to a jumping robot to a research-grade backtester — work spanning hardware, AI, and quantitative systems."
      />

      <div className="space-y-5">
        {featuredProjects.map((project, i) => (
          <Reveal key={project.slug} delay={i * 40}>
            <FeaturedProjectCard project={project} index={i + 1} />
          </Reveal>
        ))}
      </div>

      <div className="mt-16">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-faint">
          More work
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {moreProjects.map((project, i) => (
            <Reveal key={project.slug} delay={(i % 3) * 40}>
              <CompactProjectCard project={project} />
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}
