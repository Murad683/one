import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import GlobalBackground from '../ui/GlobalBackground';
import Footer from './Footer';

const Layout = () => {
  return (
    <div className="min-h-screen relative">
      <GlobalBackground />
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
