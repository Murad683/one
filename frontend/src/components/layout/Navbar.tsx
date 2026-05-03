import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';

const Navbar = () => {
  const { language, setLanguage } = useLang();
  const [isDark, setIsDark] = useState(true);
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50);
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
      initial={false}
      animate={{
        backgroundColor: isScrolled ? "rgba(10, 10, 10, 0.75)" : "transparent",
        borderBottom: isScrolled ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid transparent",
        backdropFilter: isScrolled ? "blur(16px)" : "blur(0px)"
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed top-0 inset-x-0 z-50 py-4 px-8 md:px-16 flex items-center justify-between"
    >
      {/* Logo */}
      <div className="flex-1">
        <Link to="/">
          <img
            src="/logo.jpg"
            alt="Agency Logo"
            className="h-8 w-auto object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </Link>
      </div>

      {/* Nav center */}
      <div className="hidden md:flex items-center gap-8">
        {navLinks.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) =>
              `text-sm transition-colors duration-200 ${
                isActive ? 'text-accent font-semibold' : 'text-white/50 font-normal hover:text-white'
              }`
            }
          >
            {link.name}
          </NavLink>
        ))}
      </div>

      {/* Controls right */}
      <div className="flex-1 flex items-center justify-end gap-6">
        {/* Language toggle */}
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg">
          {(['AZ', 'EN', 'RU'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`text-[10px] px-2 py-1 rounded transition-all ${
                language === lang
                  ? 'text-accent border border-accent/40 bg-accent/5'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>

        {/* Theme toggle */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="text-white/60 hover:text-white transition-colors"
        >
          {isDark ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Login button */}
        <Link
          to="/portal"
          className="text-sm px-5 py-2 rounded-full border border-white/10 text-white/70 hover:text-white hover:border-white/30 transition-all"
        >
          Giriş
        </Link>
      </div>
    </motion.nav>
  );
};

export default Navbar;
