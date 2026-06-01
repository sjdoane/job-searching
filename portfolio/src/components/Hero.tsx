import { Reveal } from "@/components/Reveal";
import { profile, socials } from "@/content/profile";
import { ArrowRight, GitHubIcon, LinkedInIcon, MailIcon } from "@/components/icons";

const credentials = [
  { label: "USC", value: "MechE B.S. + M.S. AI/ML" },
  { label: "GPA", value: "3.93 / 4.0" },
  { label: "Venture", value: "$125K pitch finalist" },
  { label: "Internships", value: "Product · VC · Consulting" },
];

export function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-screen items-center overflow-hidden pb-20 pt-28 sm:pt-32"
    >
      <div className="pointer-events-none absolute inset-0 grid-bg" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 hero-glow" aria-hidden="true" />

      <div className="relative mx-auto w-full max-w-6xl px-6">
        <Reveal>
          <p className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.25em] text-faint sm:text-sm">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
            {profile.eyebrow}
          </p>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="mt-6 max-w-4xl text-balance text-4xl font-semibold leading-[1.06] tracking-tight sm:text-6xl lg:text-[4.25rem]">
            {profile.headlineLead}{" "}
            <span className="text-gradient">{profile.headlineAccent}</span>
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="mt-7 max-w-2xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
            {profile.intro}
          </p>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a
              href="#work"
              className="group inline-flex items-center gap-2 rounded-md bg-accent px-5 py-3 text-sm font-semibold text-bg transition-colors hover:bg-accent-bright"
            >
              View work
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 rounded-md border border-line bg-surface/60 px-5 py-3 text-sm font-medium text-ink transition-colors hover:border-accent/40 hover:text-accent"
            >
              Get in touch
            </a>

            <div className="ml-1 flex items-center gap-1">
              <SocialIcon href={socials.github} label="GitHub">
                <GitHubIcon className="h-[18px] w-[18px]" />
              </SocialIcon>
              <SocialIcon href={socials.linkedin} label="LinkedIn">
                <LinkedInIcon className="h-[18px] w-[18px]" />
              </SocialIcon>
              <SocialIcon href={`mailto:${socials.email}`} label="Email" external={false}>
                <MailIcon className="h-[18px] w-[18px]" />
              </SocialIcon>
            </div>
          </div>
        </Reveal>

        <Reveal delay={320}>
          <dl className="mt-14 flex flex-wrap gap-x-8 gap-y-4 border-t border-line/60 pt-7">
            {credentials.map((c) => (
              <div key={c.label} className="font-mono text-xs">
                <dt className="uppercase tracking-[0.18em] text-faint">{c.label}</dt>
                <dd className="mt-1 text-sm text-ink">{c.value}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}

function SocialIcon({
  href,
  label,
  children,
  external = true,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="flex h-10 w-10 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-accent"
    >
      {children}
    </a>
  );
}
