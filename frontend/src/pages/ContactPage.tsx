import { motion } from 'framer-motion';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import PageTransition from '../components/utils/PageTransition';
import { cockpitContainer, cockpitItem } from '../utils/animations';

const ContactPage = () => {
  const contactItems = [
    { icon: MapPin, label: 'Ünvan', value: 'Bakı, Neftçilər pr. 14, AZ1000' },
    { icon: Phone, label: 'Telefon', value: '+994 12 345 67 89' },
    { icon: Mail, label: 'E-poçt', value: 'salam@agensi.az' },
    { icon: Clock, label: 'İş Saatları', value: 'B.e – Cümə: 09:00 – 18:00' },
  ];

  const inputStyles = "w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-5 py-4 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-accent/40 transition-colors";

  return (
    <PageTransition className="min-h-screen bg-carbon">
      <motion.div 
        variants={cockpitContainer}
        initial="hidden"
        animate="show"
        className="py-32 px-6 md:px-16 max-w-6xl mx-auto"
      >
        
        {/* Header */}
        <div className="mb-20">
          <motion.p variants={cockpitItem} className="text-accent text-xs uppercase tracking-widest font-medium mb-4">
            Əlaqə
          </motion.p>
          <motion.h1 variants={cockpitItem} className="font-heading text-5xl md:text-6xl font-bold text-white mb-6">
            Bizimlə Əlaqə
          </motion.h1>
          <motion.p variants={cockpitItem} className="text-white/50 text-lg leading-relaxed">
            Layihənizi müzakirə etmək istəyirsiniz? Biz dinləməyə hazırıq.
          </motion.p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
          
          {/* LEFT COLUMN — Contact info */}
          <motion.div variants={cockpitItem}>
            <h3 className="font-heading text-2xl font-semibold text-white mb-10">
              Məlumatlar
            </h3>
            <div className="space-y-8">
              {contactItems.map((item, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                    <item.icon size={16} className="text-accent" />
                  </div>
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-widest mb-1">
                      {item.label}
                    </p>
                    <p className="text-white/80 text-sm">
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
              <input placeholder="Adınız *" type="text" required className={inputStyles} />
              <input placeholder="E-poçt ünvanınız *" type="email" required className={inputStyles} />
              <input placeholder="Şirkət adı (istəyə bağlı)" type="text" className={inputStyles} />
              <select className={inputStyles}>
                <option value="" className="bg-carbon">Xidmət seçin</option>
                <option className="bg-carbon">Video İstehsalı</option>
                <option className="bg-carbon">Brend Dizaynı</option>
                <option className="bg-carbon">SMM İdarəetməsi</option>
                <option className="bg-carbon">Veb Tərtibat</option>
                <option className="bg-carbon">Fərdi Paket</option>
              </select>
              <textarea placeholder="Layihənizi qısaca təsvir edin..." rows={5} className={inputStyles} />
              <button type="submit" className="w-full py-4 bg-accent text-black font-semibold text-sm rounded-full hover:bg-accent/90 transition-all duration-200 mt-2">
                Mesaj Göndər →
              </button>
            </form>
          </motion.div>
        </div>

        {/* Map placeholder */}
        <motion.div variants={cockpitItem} className="w-full h-64 bg-white/[0.02] border border-white/[0.05] rounded-2xl flex items-center justify-center mt-16">
          <div className="flex flex-col items-center gap-3 text-white/20">
            <MapPin size={32} />
            <span className="text-sm">Xəritə tezliklə</span>
          </div>
        </motion.div>

      </motion.div>
    </PageTransition>
  );
};

export default ContactPage;
