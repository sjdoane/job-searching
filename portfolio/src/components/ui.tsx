import type { Metric } from "@/content/types";
import { cn } from "@/lib/cn";

/** Standard section wrapper: hairline top rule + consistent rhythm + centered shell. */
export function Section({
  id,
  children,
  className,
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn("scroll-mt-24 border-t border-line/60 py-20 sm:py-28", className)}
    >
      <div className="mx-auto w-full max-w-6xl px-6">{children}</div>
    </section>
  );
}

/** Mono eyebrow (accent index + rule + kicker) above a large heading. */
export function SectionHeading({
  index,
  kicker,
  title,
  description,
}: {
  index: string;
  kicker: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-12 sm:mb-16">
      <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-faint">
        <span className="text-accent">{index}</span>
        <span className="h-px w-8 bg-line" />
        <span>{kicker}</span>
      </div>
      <h2 className="mt-4 text-3xl font-semibold text-ink sm:text-4xl">{title}</h2>
      {description ? (
        <p className="mt-3 max-w-2xl text-pretty text-muted">{description}</p>
      ) : null}
    </div>
  );
}

/** Small mono tag for tech / pillars. */
export function Chip({
  children,
  accent = false,
}: {
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[11px] leading-none",
        accent
          ? "border-accent/30 bg-accent/5 text-accent"
          : "border-line bg-surface text-muted",
      )}
    >
      {children}
    </span>
  );
}

/** A single highlighted metric (mono accent value + label). */
export function Stat({ value, label }: Metric) {
  return (
    <div>
      <div className="font-mono text-2xl font-medium tracking-tight text-accent sm:text-[1.7rem]">
        {value}
      </div>
      <div className="mt-1 text-sm text-muted">{label}</div>
    </div>
  );
}
