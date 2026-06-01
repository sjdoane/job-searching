import { Reveal } from "@/components/Reveal";
import { Section } from "@/components/ui";
import { socials } from "@/content/profile";
import {
  ArrowUpRight,
  DownloadIcon,
  GitHubIcon,
  LinkedInIcon,
  MailIcon,
} from "@/components/icons";

export function Contact() {
  return (
    <Section id="contact">
      <Reveal>
        <div className="relative overflow-hidden rounded-2xl border border-line bg-surface/40 px-6 py-14 text-center sm:px-12 sm:py-20">
          <div className="pointer-events-none absolute inset-0 hero-glow" aria-hidden="true" />
          <div className="relative">
            <p className="flex items-center justify-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-faint">
              <span className="text-accent">06</span>
              <span className="h-px w-8 bg-line" />
              Contact
            </p>
            <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
              Let&apos;s build something.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-muted">
              I&apos;m always glad to talk through a hard problem, a role, or a
              collaboration. The fastest way to reach me is email.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <a
                href={`mailto:${socials.email}`}
                className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-3 text-sm font-semibold text-bg transition-colors hover:bg-accent-bright"
              >
                <MailIcon className="h-4 w-4" />
                {socials.email}
              </a>
              <a
                href="/resume"
                className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-5 py-3 text-sm font-medium text-ink transition-colors hover:border-accent/40 hover:text-accent"
              >
                <DownloadIcon className="h-4 w-4" />
                Résumé
              </a>
            </div>

            <div className="mt-8 flex items-center justify-center gap-2">
              <ContactSocial href={socials.github} label="GitHub">
                <GitHubIcon className="h-[18px] w-[18px]" />
              </ContactSocial>
              <ContactSocial href={socials.linkedin} label="LinkedIn">
                <LinkedInIcon className="h-[18px] w-[18px]" />
              </ContactSocial>
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

function ContactSocial({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="group inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-2 text-sm text-muted transition-colors hover:border-accent/40 hover:text-accent"
    >
      {children}
      <span>{label}</span>
      <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
    </a>
  );
}
