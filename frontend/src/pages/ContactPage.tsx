import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import PageTransition from '../components/utils/PageTransition';
import { cockpitContainer, cockpitItem } from '../utils/animations';
import { useTheme } from '../context/ThemeContext';
import { useSiteSettings } from '../hooks/useSiteData';
import { apiClient } from '../api/client';

const ContactPage = () => {
  const { isDark } = useTheme();
  const { data: settings, loading } = useSiteSettings();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    companyName: '',
    serviceName: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  if (loading || !settings) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      await apiClient.post('/contact-submissions', formData);
      setSubmitStatus('success');
      setFormData({
        name: '',
        email: '',
        companyName: '',
        serviceName: '',
        message: ''
      });
    } catch (err) {
      console.error('Submission error:', err);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactItems = [
    { icon: MapPin, label: settings.contactAddressLabel, value: settings.companyAddress },
    { icon: Phone, label: settings.contactPhoneLabel, value: settings.companyPhone },
    { icon: Mail, label: settings.contactEmailLabel, value: settings.companyEmail },
    { icon: Clock, label: settings.contactHoursLabel, value: settings.companyWorkingHours },
  ];

  const inputBaseStyles = "w-full rounded-xl px-5 py-4 text-sm focus:outline-none transition-colors disabled:opacity-50";

  return (
    <PageTransition className="min-h-screen transition-colors duration-300" style={{ backgroundColor: 'transparent' }}>
      <motion.div 
        variants={cockpitContainer}
        initial="hidden"
        animate="show"
        className="pt-40 pb-32 px-6 md:px-16 max-w-6xl mx-auto"
      >
        
        {/* Header */}
        <div className="mb-20">
          <motion.p variants={cockpitItem} className="text-xs uppercase tracking-widest font-medium mb-4" style={{ color: 'var(--accent-text)' }}>
            {settings.contactTopLabel || "Əlaqə"}
          </motion.p>
          <motion.h1 variants={cockpitItem} className="font-heading text-5xl md:text-6xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
            {settings.contactMainHeading}
          </motion.h1>
          <motion.p variants={cockpitItem} className="text-lg leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {settings.contactSubtext}
          </motion.p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
          
          {/* LEFT COLUMN — Contact info */}
          <motion.div variants={cockpitItem}>
            <h3 className="font-heading text-2xl font-semibold mb-10" style={{ color: 'var(--text-primary)' }}>
              {settings.contactInfoTitle || "Məlumatlar"}
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
            <form className="space-y-4" onSubmit={handleSubmit}>
              {submitStatus === 'success' && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm mb-4">
                  Mesajınız uğurla göndərildi! Tezlillə sizinlə əlaqə saxlayacağıq.
                </div>
              )}
              {submitStatus === 'error' && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm mb-4">
                  Xəta baş verdi. Zəhmət olmasa bir az sonra yenidən cəhd edin.
                </div>
              )}
              <input
                placeholder="Ad Soyad"
                type="text"
                required
                disabled={isSubmitting}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={inputBaseStyles}
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderWidth: '1px',
                  borderColor: 'var(--input-border)',
                  color: 'var(--text-primary)',
                }}
              />
              <input
                placeholder="E-poçt"
                type="email"
                required
                disabled={isSubmitting}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={inputBaseStyles}
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderWidth: '1px',
                  borderColor: 'var(--input-border)',
                  color: 'var(--text-primary)',
                }}
              />
              <input
                placeholder="Şirkət"
                type="text"
                disabled={isSubmitting}
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className={inputBaseStyles}
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderWidth: '1px',
                  borderColor: 'var(--input-border)',
                  color: 'var(--text-primary)',
                }}
              />
              <select
                disabled={isSubmitting}
                value={formData.serviceName}
                onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                className={inputBaseStyles}
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderWidth: '1px',
                  borderColor: 'var(--input-border)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="" style={{ backgroundColor: isDark ? '#0A0A0A' : '#F8F8F8' }}>Xidmət növünü seçin</option>
                <option value="Video Çəkiliş" style={{ backgroundColor: isDark ? '#0A0A0A' : '#F8F8F8' }}>Video Çəkiliş</option>
                <option value="Brendinq" style={{ backgroundColor: isDark ? '#0A0A0A' : '#F8F8F8' }}>Brendinq</option>
                <option value="SMM" style={{ backgroundColor: isDark ? '#0A0A0A' : '#F8F8F8' }}>SMM</option>
                <option value="Veb Dizayn" style={{ backgroundColor: isDark ? '#0A0A0A' : '#F8F8F8' }}>Veb Dizayn</option>
                <option value="Digər" style={{ backgroundColor: isDark ? '#0A0A0A' : '#F8F8F8' }}>Digər</option>
              </select>
              <textarea
                placeholder="Mesajınız"
                rows={5}
                required
                disabled={isSubmitting}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
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
                disabled={isSubmitting}
                className="w-full py-4 bg-accent font-semibold text-sm rounded-full hover:bg-accent/90 transition-all duration-200 mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ color: 'var(--accent-on-accent)' }}
              >
                {isSubmitting ? "Göndərilir..." : "Göndər"}
              </button>
            </form>
          </motion.div>
        </div>

        {/* Map area */}
        <motion.div
          variants={cockpitItem}
          className="w-full h-96 border rounded-2xl overflow-hidden mt-16"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          {settings.googleMapsEmbed ? (
            <iframe 
              src={settings.googleMapsEmbed} 
              width="100%" 
              height="100%" 
              style={{ border: 0, filter: isDark ? 'invert(90%) hue-rotate(180deg) grayscale(100%)' : 'grayscale(100%)' }} 
              allowFullScreen={true} 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--text-ghost)' }}>
              <MapPin size={32} />
              <span className="text-sm">Xəritə yüklənir...</span>
            </div>
          )}
        </motion.div>

      </motion.div>
    </PageTransition>
  );
};

export default ContactPage;
