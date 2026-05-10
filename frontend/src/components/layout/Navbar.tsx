import { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Sun, Moon, Menu } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import MobileMenu from './MobileMenu';

const Navbar = () => {
  const { toggleTheme, isDark } = useTheme();
  const { scrollY } = useScroll();
  const location = useLocation();
  const [hidden, setHidden] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    if (latest > previous && latest > 150) {
      setHidden(true);
    } else {
      setHidden(false);
    }
  });

  const navLinks = [
    { name: 'ANA SƏHİFƏ', path: '/' },
    { name: 'PORTFOLİO', path: '/portfolio' },
    { name: 'PAKETLƏR', path: '/paketler' },
    { name: 'HAQQIMIZDA', path: '/haqqimizda' },
    { name: 'ƏLAQƏ', path: '/elaqe' },
  ];

  return (
    <>
      <motion.nav
        variants={{
          visible: { y: 0, opacity: 1 },
          hidden: { y: "-150%", opacity: 0 },
        }}
        animate={hidden ? "hidden" : "visible"}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-6 left-0 right-0 mx-auto z-[100] w-[92%] md:w-[95%] max-w-5xl rounded-full px-5 md:px-6 py-2.5 md:py-3 flex items-center justify-between border backdrop-blur-sm transition-colors duration-300"
        style={{
          backgroundColor: 'var(--glass-bg)',
          borderColor: 'var(--glass-border)',
          boxShadow: 'var(--shadow-navbar)',
        }}
      >
        {/* Logo */}
        <div className="flex-shrink-0">
          <Link to="/" className="block">
            {/* Desktop Logo Image */}
            <img
              src="/logo.jpg"
              alt="Logo"
              className="hidden md:block h-7 w-auto object-contain rounded-sm"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            {/* Mobile Logo Text */}
            <span className="md:hidden font-heading text-xl font-bold tracking-tighter" style={{ color: 'var(--text-primary)' }}>
              ONE<span style={{ color: 'var(--accent-text)' }}>.</span>
            </span>
          </Link>
        </div>

        {/* Nav center (Desktop) */}
        <div className="hidden lg:flex items-center gap-7">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `text-[13px] tracking-wide transition-all duration-300 ${isActive ? 'font-semibold' : 'font-normal hover:opacity-100'
                }`
              }
              style={({ isActive }) => ({
                color: isActive ? 'var(--accent-text)' : 'var(--text-muted)',
              })}
            >
              {link.name}
            </NavLink>
          ))}
        </div>

        {/* Controls right (Desktop) */}
        <div className="hidden md:flex items-center gap-5">
          <button
            onClick={toggleTheme}
            className="transition-colors duration-300 cursor-pointer hover:opacity-80"
            style={{ color: 'var(--text-faint)' }}
          >
            {isDark ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          <Link
            to="/portal"
            className="text-[12px] px-5 py-2 rounded-full border transition-all font-medium hover:opacity-90"
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            GİRİŞ
          </Link>
        </div>

        {/* Mobile Toggle */}
        <div className="flex lg:hidden items-center gap-4">
          <Link
            to="/portal"
            className="text-[11px] px-4 py-1.5 rounded-full border md:hidden"
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            GİRİŞ
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1 transition-colors hover:opacity-70"
            style={{ color: 'var(--text-primary)' }}
          >
            <Menu size={24} />
          </button>
        </div>
      </motion.nav>

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </>
  );
};

export default Navbar;
