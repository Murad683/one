import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getLenis } from '../../hooks/useSmoothScroll';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Force scroll to top on every route change or refresh. When Lenis is
    // active (public routes) it owns the scroll position, so plain
    // window.scrollTo alone doesn't reset it — nudge Lenis too. On routes
    // without Lenis (e.g. the portal), getLenis() is null and this no-ops.
    getLenis()?.scrollTo(0, { immediate: true, force: true });
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    });
  }, [pathname]);

  return null;
};

export default ScrollToTop;
