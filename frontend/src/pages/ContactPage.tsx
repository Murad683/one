import { motion } from 'framer-motion';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import PageTransition from '../components/utils/PageTransition';
import { cockpitContainer, cockpitItem } from '../utils/animations';
import { useTheme } from '../context/ThemeContext';

const ContactPage = () => {
  const { isDark } = useTheme();

  const contactItems = [
    { icon: MapPin, label: 'Ünvan', value: 'Bakı, Neftçilər pr. 14, AZ1000' },
    { icon: Phone, label: 'Telefon', value: '+994 12 345 67 89' },
    { icon: Mail, label: 'E-poçt', value: 'salam@agensi.az' },
    { icon: Clock, label: 'İş Saatları', value: 'B.e – Cümə: 09:00 – 18:00' },
  ];

  const inputBaseStyles = "w-full rounded-xl px-5 py-4 text-sm focus:outline-none transition-colors";

  return (
    <PageTransition className="min-h-screen transition-colors duration-300" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <motion.div 
        variants={cockpitContainer}
        initial="hidden"
        animate="show"
        className="pt-40 pb-32 px-6 md:px-16 max-w-6xl mx-auto"
      >
        
        {/* Header */}
        <div className="mb-20">
          <motion.p variants={cockpitItem} className="text-xs uppercase tracking-widest font-medium mb-4" style={{ color: 'var(--accent-text)' }}>
            Əlaqə
          </motion.p>
          <motion.h1 variants={cockpitItem} className="font-heading text-5xl md:text-6xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
            Bizimlə Əlaqə
          </motion.h1>
          <motion.p variants={cockpitItem} className="text-lg leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Layihənizi müzakirə etmək istəyirsiniz? Biz dinləməyə hazırıq.
          </motion.p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
          
          {/* LEFT COLUMN — Contact info */}
          <motion.div variants={cockpitItem}>
            <h3 className="font-heading text-2xl font-semibold mb-10" style={{ color: 'var(--text-primary)' }}>
              Məlumatlar
            </h3>
            <div className="space-y-8">
              {contactItems.map((item, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: 'var(--card-bg)',
                      borderColor: 'var(--card-border)',
                    }}
                  >
                    <item.icon size={16} style={{ color: 'var(--accent-text)' }} />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-faint)' }}>
                      {item.label}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {item.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* RIGHT COLUMN — Form */}
          <motion.div variants={cockpitItem}>
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <input
                placeholder="Adınız *"
                type="text"
                required
                className={inputBaseStyles}
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderWidth: '1px',
                  borderColor: 'var(--input-border)',
                  color: 'var(--text-primary)',
                }}
              />
              <input
                placeholder="E-poçt ünvanınız *"
                type="email"
                required
                className={inputBaseStyles}
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderWidth: '1px',
                  borderColor: 'var(--input-border)',
                  color: 'var(--text-primary)',
                }}
              />
              <input
                placeholder="Şirkət adı (istəyə bağlı)"
                type="text"
                className={inputBaseStyles}
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderWidth: '1px',
                  borderColor: 'var(--input-border)',
                  color: 'var(--text-primary)',
                }}
              />
              <select
                className={inputBaseStyles}
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderWidth: '1px',
                  borderColor: 'var(--input-border)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="" style={{ backgroundColor: isDark ? '#0A0A0A' : '#F8F8F8' }}>Xidmət seçin</option>
                <option style={{ backgroundColor: isDark ? '#0A0A0A' : '#F8F8F8' }}>Video İstehsalı</option>
                <option style={{ backgroundColor: isDark ? '#0A0A0A' : '#F8F8F8' }}>Brend Dizaynı</option>
                <option style={{ backgroundColor: isDark ? '#0A0A0A' : '#F8F8F8' }}>SMM İdarəetməsi</option>
                <option style={{ backgroundColor: isDark ? '#0A0A0A' : '#F8F8F8' }}>Veb Tərtibat</option>
                <option style={{ backgroundColor: isDark ? '#0A0A0A' : '#F8F8F8' }}>Fərdi Paket</option>
              </select>
              <textarea
                placeholder="Layihənizi qısaca təsvir edin..."
                rows={5}
                className={inputBaseStyles}
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderWidth: '1px',
                  borderColor: 'var(--input-border)',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                type="submit"
                className="w-full py-4 bg-accent font-semibold text-sm rounded-full hover:bg-accent/90 transition-all duration-200 mt-2"
                style={{ color: 'var(--accent-on-accent)' }}
              >
                Mesaj Göndər →
              </button>
            </form>
          </motion.div>
        </div>

        {/* Map placeholder */}
        <motion.div
          variants={cockpitItem}
          className="w-full h-64 border rounded-2xl flex items-center justify-center mt-16"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex flex-col items-center gap-3" style={{ color: 'var(--text-ghost)' }}>
            <MapPin size={32} />
            <span className="text-sm">Xəritə tezliklə</span>
          </div>
        </motion.div>

      </motion.div>
    </PageTransition>
  );
};

export default ContactPage;
