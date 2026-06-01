"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Wraps content in a scroll-reveal. The CSS (.reveal / .is-visible in
 * globals.css) handles the transition and disables it under reduced motion.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  /** Stagger, in ms. */
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const vh = window.innerHeight || 0;
    // Reveal immediately if the viewport can't be measured (degenerate 0-height
    // context) or the element is already in/above the viewport — e.g. the hero.
    // Content must never stay hidden waiting on an observer that can't fire.
    if (!vh || el.getBoundingClientRect().top < vh * 0.9) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("reveal", visible && "is-visible", className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
