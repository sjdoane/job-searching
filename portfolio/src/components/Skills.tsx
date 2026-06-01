import { Reveal } from "@/components/Reveal";
import { Section, SectionHeading, Chip } from "@/components/ui";
import { skillGroups } from "@/content/profile";

export function Skills() {
  return (
    <Section id="skills">
      <SectionHeading index="04" kicker="Capabilities" title="Skills & tools" />

      <div className="grid gap-5 sm:grid-cols-2">
        {skillGroups.map((group, i) => (
          <Reveal key={group.title} delay={(i % 2) * 60}>
            <div className="h-full rounded-xl border border-line bg-surface/40 p-6">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-medium text-ink">{group.title}</h3>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {group.skills.map((skill) => (
                  <Chip key={skill}>{skill}</Chip>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
