import { Link } from 'react-router-dom';
import { Camera, Link as LinkIcon, Play, Send } from 'lucide-react';

const navLinks = [
  { label: 'Ana Səhifə',  to: '/' },
  { label: 'Portfolio',    to: '/portfolio' },
  { label: 'Paketlər',    to: '/paketler' },
  { label: 'Haqqımızda', to: '/haqqimizda' },
  { label: 'Əlaqə',       to: '/elaqe' },
];

const socialLinks = [
  { icon: Camera,   href: '#', label: 'Instagram' },
  { icon: LinkIcon, href: '#', label: 'LinkedIn'  },
  { icon: Play,     href: '#', label: 'YouTube'   },
  { icon: Send,     href: '#', label: 'X (Twitter)' },
];

export default function Footer() {
  return (
    <footer className="relative border-t border-white/[0.05] mt-32">

      {/* Very subtle top glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(163,230,53,0.3), transparent)' }}
        aria-hidden
      />

      <div className="max-w-7xl mx-auto px-6 md:px-16 py-20">

        {/* Top row: Logo+tagline left, Social icons right */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-12 mb-16">

          {/* Left: Brand */}
          <div className="max-w-xs">
            <Link to="/">
              <img
                src="/logo.jpg"
                alt="Agency Logo"
                className="h-8 w-auto object-contain mb-5"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </Link>
            <p className="text-white/40 text-sm leading-relaxed">
              Brendləri gələcəyə daşıyan kreativ rəqəmsal tərəfdaşınız.
              Video, marketinq və dizayn xidmətləri.
            </p>
          </div>

          {/* Center: Nav links */}
          <div className="flex flex-col gap-4">
            <p className="text-white/20 text-[10px] uppercase tracking-widest font-medium mb-2">
              Səhifələr
            </p>
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-white/50 text-sm hover:text-white transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right: Social icons */}
          <div>
            <p className="text-white/20 text-[10px] uppercase tracking-widest font-medium mb-6">
              Sosial Media
            </p>
            <div className="flex gap-3">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.07]
                    flex items-center justify-center text-white/40
                    hover:text-accent hover:border-accent/30 hover:bg-accent/5
                    transition-all duration-200"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/[0.05] mb-8" />

        {/* Bottom: Copyright */}
        <p className="text-center text-white/20 text-xs leading-relaxed">
          © Bakı Texnoloji Layihələri 2026 — Bütün hüquqlar qorunur
        </p>

      </div>
    </footer>
  );
}
