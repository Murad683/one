import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { useSmoothScroll } from '../../hooks/useSmoothScroll';

// Smooth scroll is scoped to the public site (this layout) only — the portal
// dashboard (PortalLayout) intentionally doesn't get it, same split as leyla.
const Layout = () => {
  useSmoothScroll();

  return (
    <div className="min-h-screen relative">
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Layout;
