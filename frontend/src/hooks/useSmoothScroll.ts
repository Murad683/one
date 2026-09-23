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
        touchMultiplier: 1,
        // Lenis leaves touch scrolling to the browser's own native momentum
        // scroll by default (syncTouch: false) — its RAF loop just observes
        // `scroll` events rather than driving them, so ScrollTrigger.update
        // and Framer's scroll-linked transforms end up reacting to whatever
        // pace iOS's native fling delivers, which is fast, unthrottled, and
        // completely out of sync with gsap.ticker. That's what read as
        // "smooth while dragging, choppy after release" — the drag phase's
        // deltas are small enough to keep up, the momentum phase's aren't.
        // syncTouch hands touch scrolling to Lenis's own animated loop
        // (including its own touch-release inertia via touchInertiaExponent/
        // syncTouchLerp below), so every scroll-driven effect updates on the
        // same RAF tick as desktop, whether the finger is down or not.
        syncTouch: true,
        syncTouchLerp: 0.075,
        touchInertiaExponent: 1.7,
        // With syncTouch on, Lenis intercepts touch scroll globally unless a
        // node opts out — without this, dragging inside any of the app's
        // internal overflow-y-auto panels (ProjectModal, PackageModal,
        // ProfileSettingsModal, the portal layout/deliverables list) would
        // scroll the page behind them instead of the panel's own content.
        // This makes Lenis auto-detect those nested scrollers instead of
        // requiring a data-lenis-prevent attribute on each one.
        allowNestedScroll: true,
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
