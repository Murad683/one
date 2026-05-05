import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';

const Navbar = () => {
  const { language, setLanguage } = useLang();
  const { toggleTheme, isDark } = useTheme();
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    // Hide if scrolling down and past 150px
    if (latest > previous && latest > 150) {
      setHidden(true);
    } else {
      setHidden(false);
    }
  });

  const navLinks = [
    { name: 'Ana Səhifə', path: '/' },
    { name: 'Portfolio', path: '/portfolio' },
    { name: 'Paketlər', path: '/paketler' },
    { name: 'Haqqımızda', path: '/haqqimizda' },
    { name: 'Əlaqə', path: '/elaqe' },
  ];

  return (
    <motion.nav 
      variants={{
        visible: { y: 0, opacity: 1 },
        hidden: { y: "-150%", opacity: 0 },
      }}
      animate={hidden ? "hidden" : "visible"}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-6 left-0 right-0 mx-auto z-[100] w-[95%] max-w-5xl rounded-full px-6 py-3 flex items-center justify-between border backdrop-blur-xl transition-colors duration-300"
      style={{
        backgroundColor: 'var(--glass-bg)',
        borderColor: 'var(--glass-border)',
        boxShadow: 'var(--shadow-navbar)',
      }}
    >
      {/* Logo */}
      <div className="flex-shrink-0">
        <Link to="/" className="block">
          <img
            src="/logo.jpg"
            alt="Agency Logo"
            className="h-7 w-auto object-contain rounded-sm"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </Link>
      </div>

      {/* Nav center */}
      <div className="hidden md:flex items-center gap-7">
        {navLinks.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) =>
              `text-[13px] tracking-wide transition-all duration-300 ${
                isActive
                  ? 'font-semibold'
                  : 'font-normal hover:opacity-100'
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

      {/* Controls right */}
      <div className="flex items-center gap-5">
        {/* Language toggle */}
        <div
          className="flex items-center gap-1.5 p-1 rounded-full border transition-colors duration-300"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          {(['AZ', 'EN', 'RU'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`text-[9px] font-bold px-2.5 py-1 rounded-full transition-all ${
                language === lang
                  ? 'border border-accent/20'
                  : ''
              }`}
              style={{
                color: language === lang ? 'var(--accent-text)' : 'var(--text-ghost)',
                backgroundColor: language === lang ? 'var(--glow-accent-subtle)' : 'transparent',
              }}
            >
              {lang}
            </button>
          ))}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="transition-colors duration-300 cursor-pointer hover:opacity-80"
          style={{ color: 'var(--text-faint)' }}
          aria-label="Toggle theme"
        >
          {isDark ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {/* Login button */}
        <Link
          to="/portal"
          className="text-[13px] px-6 py-2 rounded-full border transition-all font-medium hover:opacity-90"
          style={{
            backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          Giriş
        </Link>
      </div>
    </motion.nav>
  );
};

export default Navbar;
