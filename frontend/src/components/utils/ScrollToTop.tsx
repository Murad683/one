import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Instant scroll — not smooth — so the user doesn't see a janky scroll animation
    // when they land on a new page. Smooth scrolling is for in-page anchor links only.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null; // This component renders nothing
}
