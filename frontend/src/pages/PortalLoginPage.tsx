import { motion } from 'framer-motion';
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import PageTransition from '../components/utils/PageTransition';
import { cockpitContainer, cockpitItem } from '../utils/animations';
import { useAuth } from '../context/AuthContext';

const PortalLoginPage = () => {
  const { user, isLoading, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect to panel
  if (!isLoading && user) {
    return <Navigate to="/portal/panel" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch {
      setError('E-poçt və ya şifrə yanlışdır.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageTransition className="min-h-screen flex flex-col items-center justify-center px-6 pt-32 pb-20 transition-colors duration-300" style={{ backgroundColor: 'transparent' }}>
      <motion.div
        variants={cockpitContainer}
        initial="hidden"
        animate="show"
        className="max-w-md w-full"
      >
        <div className="text-center mb-10">
          <motion.p variants={cockpitItem} className="text-xs uppercase tracking-widest font-medium mb-4" style={{ color: 'var(--accent-text)' }}>
            MÜŞTƏRİ PORTALI
          </motion.p>
          <motion.h1 variants={cockpitItem} className="font-heading text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Şəxsi Kabinet
          </motion.h1>
          <motion.p variants={cockpitItem} className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Hesabınıza daxil olun
          </motion.p>
        </div>

        <motion.div
          variants={cockpitItem}
          className="backdrop-blur-md border rounded-3xl p-8 shadow-2xl"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderColor: 'var(--card-border)',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs uppercase tracking-wider mb-2 ml-1" style={{ color: 'var(--text-secondary)' }}>
                E-POÇT
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 group-focus-within:text-accent transition-colors" style={{ color: 'var(--text-ghost)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  disabled={isSubmitting}
                  className="w-full rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-accent/40 transition-all disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderWidth: '1px',
                    borderColor: 'var(--input-border)',
                    color: 'var(--text-primary)',
                  }}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider mb-2 ml-1" style={{ color: 'var(--text-secondary)' }}>
                ŞİFRƏ
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 group-focus-within:text-accent transition-colors" style={{ color: 'var(--text-ghost)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  className="w-full rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-accent/40 transition-all disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderWidth: '1px',
                    borderColor: 'var(--input-border)',
                    color: 'var(--text-primary)',
                  }}
                  required
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-center py-2 px-3 rounded-xl" style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.08)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-accent font-semibold text-sm rounded-full hover:bg-accent/90 transition-all duration-200 flex items-center justify-center gap-2 group mt-4 disabled:opacity-70"
              style={{ color: 'var(--accent-on-accent)' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Yüklənir...
                </>
              ) : (
                <>
                  Daxil Ol
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[10px] leading-relaxed uppercase tracking-tighter" style={{ color: 'var(--text-ghost)' }}>
              Hesabınız yoxdur? <br />
              <Link to="/elaqe" className="cursor-pointer hover:opacity-80" style={{ color: 'var(--accent-text)', opacity: 0.6 }}>
                Bizimlə əlaqə saxlayın →
              </Link>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </PageTransition>
  );
};

export default PortalLoginPage;
