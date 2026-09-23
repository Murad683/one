export const cinematicEasing: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const cinematicTransition = {
  duration: 0.6,
  ease: cinematicEasing,
};

// Shared reveal used both for hero entrance and for the whileInView sections.
// Kept the easing/character; tightened the travel + stagger + duration so
// fast-scrolling past the lower sections no longer reads as a "rush".
export const cockpitContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
};

export const cockpitItem = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: cinematicEasing },
  },
};

// Page-level enter/exit only. Same easing + shape as before — just shorter, so
// route changes (with mode="wait") no longer feel like a stall. Content-stagger
// timings (cinematicTransition / cockpitItem) are untouched.
export const pageVariants = {
  initial: {
    opacity: 0,
    scale: 0.99,
    y: 10
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: cinematicEasing,
      when: "beforeChildren",
    }
  },
  exit: {
    opacity: 0,
    scale: 0.99,
    y: -10,
    transition: {
      duration: 0.18,
      ease: cinematicEasing,
    }
  },
};
