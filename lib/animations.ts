import { useState } from "react";
import type { Transition, Variants } from "motion/react";

/**
 * Entrance gate. Returns true only the first time `key` mounts this session.
 * Pages remount (and replay their opacity fade-in) on every client navigation,
 * so rapid back-and-forth swapping otherwise leaves the text perpetually
 * mid-fade — looking like it greys out. Gate the entrance with this and pass
 * `initial={play ? "hidden" : false}` so repeat visits render instantly.
 *
 * SSR-safe: the server (and therefore the first/hydration render on a fresh
 * page load) ALWAYS returns true, so the entrance state is deterministic and
 * matches the freshly-loaded client. The persistent server module Set is never
 * touched on the server — only client-side navigations consult/record it.
 * A full reload resets the client Set, so a fresh load animates again.
 */
const enteredKeys = new Set<string>();
export function useEntranceGate(key: string): boolean {
  const [first] = useState(() => {
    if (typeof window === "undefined") return true; // SSR / hydration: animate
    if (enteredKeys.has(key)) return false;
    enteredKeys.add(key);
    return true;
  });
  return first;
}

/**
 * Shared motion primitives. Curves are Emil Kowalski's strong ease variants;
 * springs follow Apple's duration+bounce model (easy to reason about). Use these
 * everywhere so motion feels consistent. All animate compositor props only
 * (transform / opacity) and are gated by prefers-reduced-motion at the CSS layer.
 */

// Easing curves
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;

// Spring presets
export const SPRING_SNAPPY: Transition = { type: "spring", duration: 0.32, bounce: 0.14 };
export const SPRING_SOFT: Transition = { type: "spring", duration: 0.5, bounce: 0.2 };

// Durations (ms-as-seconds for Motion)
export const DUR_FAST = 0.16;
export const DUR_BASE = 0.24;

// Reusable variants
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4, ease: EASE_OUT } },
};

export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: SPRING_SNAPPY },
};

/** Container that staggers its children's entrance. */
export function staggerContainer(stagger = 0.07, delayChildren = 0.04): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren } },
  };
}

/** Press feedback for buttons/affordances. */
export const tapScale = { scale: 0.97 } as const;
