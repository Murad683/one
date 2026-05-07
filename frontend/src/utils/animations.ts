export const cinematicEasing: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const cinematicTransition = {
  duration: 0.6,
  ease: cinematicEasing,
};

export const cockpitContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

export const cockpitItem = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: cinematicTransition 
  },
};

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
      duration: 0.5,
      ease: cinematicEasing,
      when: "beforeChildren",
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.99, 
    y: -10,
    transition: {
      duration: 0.4,
      ease: cinematicEasing,
    }
  },
};
