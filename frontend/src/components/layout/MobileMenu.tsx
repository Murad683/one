import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink, Link } from 'react-router-dom';
import { X, Moon, Sun, ChevronRight } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { cinematicEasing } from '../../utils/animations';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  logoUrl?: string;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose, logoUrl }) => {
  const { toggleTheme, isDark } = useTheme();

  React.useEffect(() => {
    if (isOpen) {
      document.body.classList.add('lock-scroll');
    } else {
      document.body.classList.remove('lock-scroll');
    }
    return () => {
      document.body.classList.remove('lock-scroll');
    };
  }, [isOpen]);

  const navLinks = [
    { name: 'ANA SƏHİFƏ', path: '/' },
    { name: 'PORTFOLİO', path: '/portfolio' },
    { name: 'PAKETLƏR', path: '/paketler' },
    { name: 'HAQQIMIZDA', path: '/haqqimizda' },
    { name: 'ƏLAQƏ', path: '/elaqe' },
  ];

  const menuVariants = {
    closed: {
      x: '100%',
      transition: {
        duration: 0.5,
        ease: cinematicEasing,
      },
    },
    open: {
      x: 0,
      transition: {
        duration: 0.5,
        ease: cinematicEasing,
      },
    },
  };

  const itemVariants = {
    closed: { opacity: 0, x: 20 },
    open: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: 0.2 + i * 0.1,
        duration: 0.4,
        ease: cinematicEasing,
      },
    }),
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[110] bg-black/60"
          />

          {/* Menu Panel */}
          <motion.div
            variants={menuVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="fixed top-0 right-0 h-screen w-[85%] max-w-[400px] z-[120] flex flex-col p-10 border-l backdrop-blur-xl"
            style={{
              backgroundColor: 'var(--modal-bg)',
              borderColor: 'var(--card-border)',
              willChange: 'transform',
              transform: 'translateZ(0)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-16">
              <Link to="/" onClick={onClose} className="font-heading text-2xl font-bold tracking-tighter">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-7 w-auto object-contain rounded-sm" />
                ) : (
                  <>ONE<span style={{ color: 'var(--accent-text)' }}>.</span></>
                )}
              </Link>
              <button
                onClick={onClose}
                className="p-2 rounded-full transition-colors hover:bg-white/10"
                style={{ color: 'var(--text-primary)' }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Nav Links */}
            <nav className="flex flex-col gap-8 mb-16">
              {navLinks.map((link, i) => (
                <motion.div key={link.path} custom={i} variants={itemVariants}>
                  <NavLink
                    to={link.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `text-3xl font-heading font-bold flex items-center justify-between group transition-colors ${
                        isActive ? 'text-accent' : 'text-primary hover:text-accent'
                      }`
                    }
                  >
                    {link.name}
                    <ChevronRight size={20} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </NavLink>
                </motion.div>
              ))}
            </nav>

            {/* Bottom Controls */}
            <div className="mt-auto space-y-10">
              {/* Theme & Login */}
              <motion.div variants={itemVariants} custom={7} className="flex items-center justify-between pt-8 border-t border-white/5">
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-3 text-sm font-medium transition-colors hover:text-accent"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {isDark ? <Moon size={18} /> : <Sun size={18} />}
                  {isDark ? 'Dark Mode' : 'Light Mode'}
                </button>
                
                <Link
                  to="/portal"
                  onClick={onClose}
                  className="px-6 py-2 rounded-full border text-xs font-bold uppercase tracking-widest"
                  style={{ borderColor: 'var(--accent-text)', color: 'var(--accent-text)' }}
                >
                  GİRİŞ
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileMenu;
