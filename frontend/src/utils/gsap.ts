import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Mobile browsers resize the viewport (innerHeight changes) when the
// address bar shows/hides on scroll — without this, ScrollTrigger treats
// that as a real resize and recalculates pin distances mid-scroll, which
// on this site was compounding with the Services/Portfolio load-placeholder
// height jump to produce a visible scroll-position snap.
ScrollTrigger.config({ ignoreMobileResize: true });

export { gsap, ScrollTrigger };
