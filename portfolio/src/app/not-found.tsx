import Link from "next/link";
import { ArrowRight } from "@/components/icons";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="pointer-events-none absolute inset-0 grid-bg" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 hero-glow" aria-hidden="true" />
      <div className="relative">
        <p className="font-mono text-sm uppercase tracking-[0.25em] text-accent">
          404
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink">
          Page not found
        </h1>
        <p className="mx-auto mt-3 max-w-md text-muted">
          That page doesn&apos;t exist — but there&apos;s plenty to see on the way back.
        </p>
        <Link
          href="/"
          className="group mt-8 inline-flex items-center gap-2 rounded-md bg-accent px-5 py-3 text-sm font-semibold text-bg transition-colors hover:bg-accent-bright"
        >
          Back home
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </main>
  );
}
