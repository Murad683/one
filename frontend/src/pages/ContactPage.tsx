import { motion } from 'framer-motion';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageTransition from '../components/utils/PageTransition';
import { cockpitContainer, cockpitItem } from '../utils/animations';
import { useTheme } from '../context/ThemeContext';

const ContactPage = () => {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  const contactItems = [
    { icon: MapPin, label: t('contact.label_address'), value: t('contact.value_address') },
    { icon: Phone, label: t('contact.label_phone'), value: t('contact.value_phone') },
    { icon: Mail, label: t('contact.label_email'), value: t('contact.value_email') },
    { icon: Clock, label: t('contact.label_hours'), value: t('contact.value_hours') },
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
            {t('contact.badge')}
          </motion.p>
          <motion.h1 variants={cockpitItem} className="font-heading text-5xl md:text-6xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
            {t('contact.title')}
          </motion.h1>
          <motion.p variants={cockpitItem} className="text-lg leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {t('contact.subtitle')}
          </motion.p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
          
          {/* LEFT COLUMN — Contact info */}
          <motion.div variants={cockpitItem}>
            <h3 className="font-heading text-2xl font-semibold mb-10" style={{ color: 'var(--text-primary)' }}>
              {t('contact.info_title')}
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
                placeholder={t('contact.form_name')}
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
                placeholder={t('contact.form_email')}
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
                placeholder={t('contact.form_company')}
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
                <option value="" style={{ backgroundColor: isDark ? '#0A0A0A' : '#F8F8F8' }}>{t('contact.form_service_placeholder')}</option>
                <option style={{ backgroundColor: isDark ? '#0A0A0A' : '#F8F8F8' }}>{t('contact.form_service_video')}</option>
                <option style={{ backgroundColor: isDark ? '#0A0A0A' : '#F8F8F8' }}>{t('contact.form_service_brand')}</option>
                <option style={{ backgroundColor: isDark ? '#0A0A0A' : '#F8F8F8' }}>{t('contact.form_service_smm')}</option>
                <option style={{ backgroundColor: isDark ? '#0A0A0A' : '#F8F8F8' }}>{t('contact.form_service_web')}</option>
                <option style={{ backgroundColor: isDark ? '#0A0A0A' : '#F8F8F8' }}>{t('contact.form_service_custom')}</option>
              </select>
              <textarea
                placeholder={t('contact.form_message')}
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
                {t('contact.form_submit')}
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
            <span className="text-sm">{t('contact.map_placeholder')}</span>
          </div>
        </motion.div>

      </motion.div>
    </PageTransition>
  );
};

export default ContactPage;
