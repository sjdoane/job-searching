import { socials } from "@/content/profile";
import { GitHubIcon, LinkedInIcon, MailIcon } from "@/components/icons";

export function Footer() {
  return (
    <footer className="border-t border-line/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
        <p className="text-sm text-faint">© 2026 Samuel Doane</p>
        <p className="order-3 font-mono text-xs text-faint sm:order-2">
          Built with Next.js &amp; Tailwind CSS
        </p>
        <div className="order-2 flex items-center gap-1 sm:order-3">
          <a
            href={socials.github}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors hover:text-accent"
          >
            <GitHubIcon className="h-[18px] w-[18px]" />
          </a>
          <a
            href={socials.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors hover:text-accent"
          >
            <LinkedInIcon className="h-[18px] w-[18px]" />
          </a>
          <a
            href={`mailto:${socials.email}`}
            aria-label="Email"
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors hover:text-accent"
          >
            <MailIcon className="h-[18px] w-[18px]" />
          </a>
        </div>
      </div>
    </footer>
  );
}
