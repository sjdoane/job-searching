"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { ArrowUpRight } from "@/components/icons";

const LINKS = [
  { href: "#about", id: "about", label: "About" },
  { href: "#work", id: "work", label: "Work" },
  { href: "#experience", id: "experience", label: "Experience" },
  { href: "#skills", id: "skills", label: "Skills" },
  { href: "#contact", id: "contact", label: "Contact" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = LINKS.map((l) => document.getElementById(l.id)).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled
          ? "border-b border-line/70 bg-bg/80 backdrop-blur-md"
          : "border-b border-transparent",
      )}
    >
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <a
          href="#top"
          className="font-mono text-sm font-medium tracking-tight text-ink transition-colors hover:text-accent"
        >
          Samuel Doane
          <span className="text-accent">.</span>
        </a>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm transition-colors",
                active === link.id
                  ? "text-ink"
                  : "text-muted hover:text-ink",
              )}
            >
              {link.label}
            </a>
          ))}
          <a
            href="/resume"
            className="group ml-2 inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink transition-colors hover:border-accent/40 hover:text-accent"
          >
            Résumé
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-md border border-line bg-surface text-ink md:hidden"
        >
          <div className="relative h-4 w-5">
            <span
              className={cn(
                "absolute left-0 h-0.5 w-5 bg-current transition-all",
                open ? "top-2 rotate-45" : "top-0.5",
              )}
            />
            <span
              className={cn(
                "absolute left-0 top-2 h-0.5 w-5 bg-current transition-opacity",
                open && "opacity-0",
              )}
            />
            <span
              className={cn(
                "absolute left-0 h-0.5 w-5 bg-current transition-all",
                open ? "top-2 -rotate-45" : "top-[14px]",
              )}
            />
          </div>
        </button>
      </nav>

      {/* Mobile menu */}
      {open ? (
        <div className="border-t border-line/70 bg-bg/95 backdrop-blur-md md:hidden">
          <div className="mx-auto flex w-full max-w-6xl flex-col px-6 py-3">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="border-b border-line/50 py-3 text-sm text-muted last:border-0 hover:text-ink"
              >
                {link.label}
              </a>
            ))}
            <a
              href="/resume"
              onClick={() => setOpen(false)}
              className="mt-3 inline-flex items-center gap-1.5 self-start rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink hover:text-accent"
            >
              Résumé
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
}
