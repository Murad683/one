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
    <PageTransition className="min-h-[90vh] flex items-center justify-center px-6 py-20 bg-carbon">
      <motion.div
        variants={cockpitContainer}
        initial="hidden"
        animate="show"
        className="max-w-md w-full"
      >
        <div className="text-center mb-10">
          <motion.p variants={cockpitItem} className="text-accent text-xs uppercase tracking-widest font-medium mb-4">
            Müştəri Portalı
          </motion.p>
          <motion.h1 variants={cockpitItem} className="font-heading text-4xl font-bold text-white mb-4">
            Xoş Gəlmisiniz
          </motion.h1>
          <motion.p variants={cockpitItem} className="text-white/50 text-sm">
            Layihələrinizi izləmək və idarə etmək üçün daxil olun.
          </motion.p>
        </div>

        <motion.div
          variants={cockpitItem}
          className="bg-white/[0.03] backdrop-blur-md border border-white/[0.05] rounded-3xl p-8 shadow-2xl"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-white/60 text-xs uppercase tracking-wider mb-2 ml-1">
                E-poçt Ünvanı
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-accent transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-white/[0.05] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-accent/40 focus:bg-white/[0.08] transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-white/60 text-xs uppercase tracking-wider mb-2 ml-1">
                Şifrə
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-accent transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/[0.05] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-accent/40 focus:bg-white/[0.08] transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-accent text-black font-semibold text-sm rounded-full hover:bg-accent/90 transition-all duration-200 flex items-center justify-center gap-2 group mt-4"
            >
              Daxil Ol
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-white/30 text-[10px] leading-relaxed uppercase tracking-tighter">
              Şifrənizi unutmusunuz? Zəhmət olmasa <br />
              <span className="text-accent/60 cursor-pointer hover:text-accent">menecerinizlə əlaqə saxlayın.</span>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </PageTransition>
  );
};

export default PortalLoginPage;
