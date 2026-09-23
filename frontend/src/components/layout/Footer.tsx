import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { ArrowUp, ArrowUpRight } from 'lucide-react';
import { useSiteSettings } from '../../hooks/useSiteData';
import { assetUrl } from '../../utils/api';
import { cinematicEasing } from '../../utils/animations';

// "ourneweye." — the site's domain (ourneweye.com) spelled out as the
// footer's giant wordmark, all lowercase. The "o", "n", "e" at the same
// positions the old "ONE" mark occupied stay in the brand green so that
// mark still reads inside the new name, just without the capitalization.
// Each letter is its own motion.span so hovering nudges just that letter.
const WORDMARK_LETTERS = [
  { char: 'o', accent: true },
  { char: 'u', accent: false },
  { char: 'r', accent: false },
  { char: 'n', accent: true },
  { char: 'e', accent: false },
  { char: 'w', accent: false },
  { char: 'e', accent: true },
  { char: 'y', accent: false },
  { char: 'e', accent: false },
  { char: '.', accent: false },
];

// Same rise-into-place trick as IntroRiseSection.tsx: as the footer scrolls
// into view it rises (y) and scales up, on a fixed-dark, rounded-top panel —
// clou.ch's own footer only has a mild internal parallax (no scale/rounding),
// the "rises from under the site" feel there actually comes from a separate
// sticky CTA banner before it. Reusing our own intro-panel mechanic gets the
// same feeling without that extra component, and bookends every page with
// the same dark rounded-panel language as the Hero.
export default function Footer() {
  const { data: settings, loading } = useSiteSettings();
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'start start'],
  });

  const yRaw = useTransform(scrollYProgress, [0, 1], ['16%', '0%']);
  const scaleRaw = useTransform(scrollYProgress, [0, 1], [0.85, 1]);
  const y = reduceMotion ? '0%' : yRaw;
  const scale = reduceMotion ? 1 : scaleRaw;

  // The ref div must mount on the very first render, loading or not — see
  // IntroRiseSection.tsx for why a ref that only attaches once `settings`
  // arrives leaves useScroll permanently inert.
  if (loading || !settings) {
    return (
      <div ref={ref}>
        <div className="h-[28rem] rounded-t-[2rem] md:rounded-t-[2.5rem]" style={{ backgroundColor: '#101114' }} />
      </div>
    );
  }

  let socialData: any = {};
  try {
    socialData = typeof settings.socialLinks === 'string' ? JSON.parse(settings.socialLinks) : (settings.socialLinks || {});
  } catch (e) {
    socialData = {};
  }
  const getSocialIcon = (label: string) => {
    switch (label.toLowerCase()) {
      case 'instagram': return '/instagram-logo-facebook-2-svgrepo-com.svg';
      case 'linkedin': return '/linkedin-logo-thin-svgrepo-com.svg';
      case 'youtube': return '/youtube-logo-thin-svgrepo-com.svg';
      case 'telegram': return '/telegram-logo-thin-svgrepo-com.svg';
      default: return '';
    }
  };

  const socialLinks = [
    { href: socialData.instagram || '#', label: 'Instagram' },
    { href: socialData.linkedin || '#',  label: 'LinkedIn'  },
    { href: socialData.youtube || '#',   label: 'YouTube'   },
    { href: socialData.telegram || socialData.twitter || '#',  label: 'Telegram'  },
  ];

  const navLinks = [
    { label: 'ANA SƏHİFƏ',      to: '/' },
    { label: 'PORTFOLİO', to: '/portfolio' },
    { label: 'PAKETLƏR',  to: '/paketler' },
    { label: 'HAQQIMIZDA',     to: '/haqqimizda' },
    { label: 'ƏLAQƏ',   to: '/elaqe' },
    { label: 'TƏLİMAT',  to: '/telimat' },
  ];

  const contactItems = [
    settings.companyAddress,
    settings.companyPhone ? { text: settings.companyPhone, href: `tel:${settings.companyPhone.replace(/\s+/g, '')}` } : null,
    settings.companyEmail ? { text: settings.companyEmail, href: `mailto:${settings.companyEmail}` } : null,
  ];

  return (
    <div ref={ref}>
      <motion.footer
        style={{ y, scale, backgroundColor: '#101114' }}
        className="relative overflow-hidden rounded-t-[2rem] md:rounded-t-[2.5rem] px-6 md:px-16 pt-16 md:pt-20 pb-10"
      >
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(163,230,53,0.3), transparent)' }}
          aria-hidden
        />

        <div className="max-w-7xl mx-auto">
          {/* CTA banner — fills what was previously dead space above the
              wordmark using heroCtaText/heroCtaUrl, two settings fields that
              exist in the schema/admin but weren't rendered anywhere on the
              site until now. */}
          <div className="flex flex-col items-center text-center md:flex-row md:items-center md:justify-between md:text-left gap-8 mb-16 pb-16 border-b border-white/10">
            <h3
              className="font-heading text-3xl md:text-5xl font-medium leading-tight max-w-xl"
              style={{ color: '#FAFAFA' }}
            >
              Layihənizi birlikdə həyata keçirək
            </h3>
            <Link
              to={settings.heroCtaUrl || '/elaqe'}
              className="shrink-0 inline-flex items-center gap-2 px-7 py-4 rounded-full font-semibold text-sm transition-transform duration-300 hover:scale-105"
              style={{ backgroundColor: '#A3E635', color: '#101114' }}
            >
              {settings.heroCtaText || 'Bizimlə Əlaqə'} <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="flex flex-col items-center text-center md:flex-row md:items-end md:justify-between md:text-left gap-12 mb-16">
            <h2
              className="font-heading font-bold leading-none select-none flex justify-center md:justify-start"
              style={{ fontSize: 'clamp(4rem, 12vw, 10rem)' }}
            >
              {WORDMARK_LETTERS.map(({ char, accent }, i) => (
                <motion.span
                  key={i}
                  whileHover={{ y: -10 }}
                  transition={{ duration: 0.3, ease: cinematicEasing }}
                  style={{ color: accent ? '#A3E635' : '#FFFFFF' }}
                >
                  {char}
                </motion.span>
              ))}
            </h2>

            <div className="flex flex-col sm:flex-row gap-12 sm:gap-20">
              <div className="flex flex-col items-center text-center sm:items-start sm:text-left gap-3">
                <p className="text-[10px] uppercase tracking-widest font-medium mb-2 text-white/40">
                  ƏLAQƏ
                </p>
                {contactItems.map((item, i) => {
                  if (!item) return null;
                  const text = typeof item === 'string' ? item : item.text;
                  const href = typeof item === 'string' ? undefined : item.href;
                  const className = 'text-sm text-white/70 hover:text-white transition-colors duration-200 max-w-[14rem]';
                  return href ? (
                    <a key={i} href={href} className={className}>{text}</a>
                  ) : (
                    <p key={i} className={className}>{text}</p>
                  );
                })}
              </div>

              <div className="flex flex-col items-center text-center sm:items-start sm:text-left gap-4">
                <p className="text-[10px] uppercase tracking-widest font-medium mb-2 text-white/40">
                  {settings.footerPagesTitle || 'SƏHİFƏLƏR'}
                </p>
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="text-sm text-white/70 hover:text-white transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="flex gap-3 mt-2">
                  {socialLinks.map(({ href, label }) => (
                    <a
                      key={label}
                      href={href}
                      aria-label={label}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-lg flex items-center justify-center border border-white/10 bg-white/5 hover:border-white/30 transition-all duration-200"
                    >
                      <img
                        src={getSocialIcon(label)}
                        alt={label}
                        className="w-4 h-4 object-contain opacity-70"
                        style={{ filter: 'brightness(0) invert(1)' }}
                      />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="h-px mb-6 bg-white/10" />

          <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:justify-between sm:text-left gap-4">
            <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left gap-2 sm:gap-6">
              <Link to="/" className="shrink-0">
                <img
                  src={assetUrl(settings?.footerLogoUrl) || assetUrl(settings?.navbarLogoUrl) || '/logo.jpg'}
                  alt="Logo"
                  className="h-6 w-auto object-contain rounded-sm"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </Link>
              <p className="text-xs leading-relaxed text-white/40">
                {settings.footerShortText}
              </p>
            </div>
            <p className="text-xs text-white/40 order-3 sm:order-2">
              © Bakı Texnoloji Layihələri 2026 — Bütün hüquqlar qorunur
            </p>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              aria-label="Yuxarı qayıt"
              className="order-2 sm:order-3 w-11 h-11 rounded-full flex items-center justify-center border border-white/15 text-white/70 hover:text-white hover:border-white/40 transition-all duration-200 shrink-0"
            >
              <ArrowUp size={18} />
            </button>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
