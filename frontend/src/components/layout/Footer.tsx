import { Link } from 'react-router-dom';
import { useSiteSettings } from '../../hooks/useSiteData';

export default function Footer() {
  const { data: settings, loading } = useSiteSettings();

  if (loading || !settings) return null;

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
  ];

  return (
    <footer
      className="relative mt-32 overflow-hidden transition-colors duration-300"
      style={{ borderTop: '1px solid var(--border-subtle)' }}
    >
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(163,230,53,0.3), transparent)' }}
        aria-hidden
      />

      <div className="max-w-7xl mx-auto px-6 md:px-16 py-20">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-12 mb-16">
          <div className="max-w-xs">
            <Link to="/">
              <img
                src={settings?.footerLogoUrl || '/logo.jpg'}
                alt="Agency Logo"
                className="h-8 w-auto object-contain mb-5"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </Link>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-faint)' }}>
              {settings.footerShortText}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <p className="text-[10px] uppercase tracking-widest font-medium mb-2" style={{ color: 'var(--text-ghost)' }}>
              {settings.footerPagesTitle || "SƏHİFƏLƏR"}
            </p>
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm transition-colors duration-200 hover:opacity-80"
                style={{ color: 'var(--text-muted)' }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest font-medium mb-6" style={{ color: 'var(--text-ghost)' }}>
              {settings.footerSocialTitle || "SOSİAL MEDİA"}
            </p>
            <div className="flex gap-3">
              {socialLinks.map(({ href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group w-10 h-10 rounded-xl flex items-center justify-center hover:text-accent hover:border-accent/30 transition-all duration-200"
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    borderWidth: '1px',
                    borderColor: 'var(--card-border)',
                    color: 'var(--text-faint)',
                  }}
                >
                  <img src={getSocialIcon(label)} alt={label} className="w-4 h-4 object-contain brightness-0 invert opacity-60 group-hover:opacity-100 transition-opacity" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="h-px mb-8" style={{ backgroundColor: 'var(--border-subtle)' }} />

        <p className="text-center text-xs leading-relaxed" style={{ color: 'var(--text-ghost)' }}>
          © Bakı Texnoloji Layihələri 2026 — Bütün hüquqlar qorunur
        </p>
      </div>
    </footer>
  );
}
