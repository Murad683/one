import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap, ScrollTrigger } from '../utils/gsap';

// Same Lenis + GSAP-ticker sync pattern as the leyla site: Lenis drives
// `window` scroll (no custom wrapper div), its `scroll` event tells
// ScrollTrigger to recompute, and its own RAF loop is driven by gsap.ticker
// (converting ticker time from seconds to the milliseconds `lenis.raf()`
// expects) so the two stay perfectly in sync — no separate rAF loop, no
// scrollerProxy (only needed when Lenis scrolls a custom container instead
// of window). `lagSmoothing(0)` stops GSAP's tab-backgrounding lag
// compensation from fighting Lenis's own timing once it's driving the tick.
let lenisInstance: Lenis | null = null;
export const getLenis = () => lenisInstance;

export function scrollToTop() {
  if (lenisInstance) lenisInstance.scrollTo(0, { immediate: true, force: true });
  window.scrollTo(0, 0);
}

export function useSmoothScroll() {
  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      (window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        new URLSearchParams(location.search).has('nosmooth'));

    let lenis: Lenis | undefined;
    let onRaf: ((time: number) => void) | undefined;

    if (!reduce) {
      lenis = new Lenis({
        duration: 1.35,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 0.85,
        touchMultiplier: 1.6,
      });
      lenis.on('scroll', ScrollTrigger.update);
      lenisInstance = lenis;
      onRaf = (time: number) => lenis!.raf(time * 1000);
      gsap.ticker.add(onRaf);
      gsap.ticker.lagSmoothing(0);
    }

    const refresh = () => ScrollTrigger.refresh();
    const timers = [300, 900, 1800, 3600].map((ms) => setTimeout(refresh, ms));
    window.addEventListener('load', refresh);
    if (document.fonts?.ready) document.fonts.ready.then(refresh);

    let lastW = window.innerWidth;
    const onResize = () => {
      if (window.innerWidth !== lastW) {
        lastW = window.innerWidth;
        refresh();
      }
    };
    window.addEventListener('resize', onResize);

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('load', refresh);
      window.removeEventListener('resize', onResize);
      if (onRaf) gsap.ticker.remove(onRaf);
      if (lenis) lenis.destroy();
      if (lenisInstance === lenis) lenisInstance = null;
    };
  }, []);
}
