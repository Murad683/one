import { motion } from 'framer-motion';
import { useState } from 'react';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import PageTransition from '../components/utils/PageTransition';
import { cockpitContainer, cockpitItem } from '../utils/animations';

const PortalLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('İstifadəçi kabineti tezliklə istifadəyə veriləcək. Zəhmət olmasa agentliklə əlaqə saxlayın.');
  };

  return (
    <PageTransition className="min-h-screen flex flex-col items-center justify-center px-6 pt-32 pb-20 transition-colors duration-300" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <motion.div
        variants={cockpitContainer}
        initial="hidden"
        animate="show"
        className="max-w-md w-full"
      >
        <div className="text-center mb-10">
          <motion.p variants={cockpitItem} className="text-xs uppercase tracking-widest font-medium mb-4" style={{ color: 'var(--accent-text)' }}>
            Müştəri Portalı
          </motion.p>
          <motion.h1 variants={cockpitItem} className="font-heading text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Xoş Gəlmisiniz
          </motion.h1>
          <motion.p variants={cockpitItem} className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Layihələrinizi izləmək və idarə etmək üçün daxil olun.
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
                E-poçt Ünvanı
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 group-focus-within:text-accent transition-colors" style={{ color: 'var(--text-ghost)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-accent/40 transition-all"
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
                Şifrə
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 group-focus-within:text-accent transition-colors" style={{ color: 'var(--text-ghost)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-accent/40 transition-all"
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

            <button
              type="submit"
              className="w-full py-4 bg-accent font-semibold text-sm rounded-full hover:bg-accent/90 transition-all duration-200 flex items-center justify-center gap-2 group mt-4"
              style={{ color: 'var(--accent-on-accent)' }}
            >
              Daxil Ol
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[10px] leading-relaxed uppercase tracking-tighter" style={{ color: 'var(--text-ghost)' }}>
              Şifrənizi unutmusunuz? Zəhmət olmasa <br />
              <span className="cursor-pointer hover:opacity-80" style={{ color: 'var(--accent-text)', opacity: 0.6 }}>menecerinizlə əlaqə saxlayın.</span>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </PageTransition>
  );
};

export default PortalLoginPage;
