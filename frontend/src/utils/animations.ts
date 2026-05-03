export const cinematicEasing: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const cinematicTransition = {
  duration: 0.8,
  ease: cinematicEasing,
};

export const cockpitContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

export const cockpitItem = {
  hidden: { opacity: 0, y: 30, filter: 'blur(4px)' },
  show: { 
    opacity: 1, 
    y: 0, 
    filter: 'blur(0px)',
    transition: cinematicTransition 
  },
};

export const pageVariants = {
  initial: { 
    opacity: 0, 
    scale: 0.98, 
    y: 20, 
    filter: 'blur(8px)' 
  },
  animate: { 
    opacity: 1, 
    scale: 1, 
    y: 0, 
    filter: 'blur(0px)',
    transition: {
      duration: 0.8,
      ease: cinematicEasing,
      when: "beforeChildren",
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.98, 
    filter: 'blur(8px)',
    transition: {
      duration: 0.6,
      ease: cinematicEasing,
    }
  },
};
