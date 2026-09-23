import { useEffect } from 'react';
import { getLenis } from './useSmoothScroll';

// `.lock-scroll` (index.css) sets `overflow: hidden` on <body>, but Lenis
// drives its own virtual scroll off `window` wheel/touch events entirely
// independently of native overflow — locking the body alone does nothing
// to it, which is why the page kept scrolling behind open modals. Lenis's
// own `stop()`/`start()` actually halts/resumes that virtual scroll.
//
// Module-level ref count so two modals open at once (e.g. MobileMenu plus
// another dialog) don't have the first one's close prematurely unlocking
// scroll while the second is still open.
let lockCount = 0;

export function useLockBodyScroll(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    lockCount += 1;
    if (lockCount === 1) {
      document.body.classList.add('lock-scroll');
      getLenis()?.stop();
    }

    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        document.body.classList.remove('lock-scroll');
        getLenis()?.start();
      }
    };
  }, [isLocked]);
}
