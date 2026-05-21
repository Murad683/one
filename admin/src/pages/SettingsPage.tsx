import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Home, Info, Globe, X, Upload, CheckCircle2, Hash, Quote, PhoneCall, Share2, ImageIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { assetUrl } from '../lib/apiHelpers';

// --- Helpers ---

const parseJSON = (raw?: string | null, fallback: any = []) => {
  try {
    return JSON.parse(raw || (Array.isArray(fallback) ? '[]' : '{}'));
  } catch {
    return fallback;
  }
};

// --- Components ---

const Card = ({ title, icon, children, onSave, isSaving }: { title: string; icon: ReactNode; children: ReactNode; onSave: () => void; isSaving: boolean }) => (
  <div className="rounded-2xl border border-edge bg-surface shadow-sm overflow-hidden flex flex-col">
    <div className="border-b border-edge-light bg-surface-alt/50 px-4 md:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-body shadow-sm ring-1 ring-slate-200">
          {icon}
        </div>
        <h3 className="font-semibold text-heading">{title}</h3>
      </div>
      <Button onClick={onSave} isLoading={isSaving} size="sm" className="w-full sm:w-auto">
        Yadda Saxla
      </Button>
    </div>
    <div className="p-6 space-y-4 flex-1">
      {children}
    </div>
  </div>
);

const TabButton = ({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: ReactNode; children: ReactNode }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all ${
      active ? 'bg-sidebar-active text-white shadow-lg shadow-slate-900/20' : 'text-muted hover:bg-surface-hover hover:text-heading'
    }`}
  >
    {icon}
    {children}
  </button>
);

// --- Settings Page ---

export const SettingsPage = () => {
  const { settings, isLoading, save, uploadMedia } = useSiteSettings();
  const [activeTab, setActiveTab] = useState<'home' | 'about' | 'contact' | 'footer'>('home');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  if (isLoading) return <div className="p-6 text-muted text-sm">Yüklənir...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-heading">Veb-sayt Ayarları</h1>
        <p className="text-sm text-muted">Veb-saytın məzmununu modul şəklində idarə edin.</p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl bg-surface p-1.5 border border-edge shadow-sm sticky top-4 z-40">
        <TabButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<Home className="h-4 w-4" />}>Ana Səhifə</TabButton>
        <TabButton active={activeTab === 'about'} onClick={() => setActiveTab('about')} icon={<Info className="h-4 w-4" />}>Haqqımızda</TabButton>
        <TabButton active={activeTab === 'contact'} onClick={() => setActiveTab('contact')} icon={<PhoneCall className="h-4 w-4" />}>Əlaqə</TabButton>
        <TabButton active={activeTab === 'footer'} onClick={() => setActiveTab('footer')} icon={<Globe className="h-4 w-4" />}>Ümumi (Footer)</TabButton>
      </div>

      {success && (
        <div className="fixed top-6 right-6 z-[100] flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-2xl shadow-emerald-900/20 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="h-4 w-4" />
          {success}
        </div>
      )}

      <div className="space-y-6">

        {/* TAB 1: ANA SƏHİFƏ */}
        {activeTab === 'home' && (
          <div className="grid gap-6 lg:grid-cols-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <HeroCard settings={settings} onSave={save} onUpload={uploadMedia} setSuccess={setSuccess} />
            <MarqueeCard settings={settings} onSave={save} setSuccess={setSuccess} />
          </div>
        )}

        {/* TAB 2: HAQQIMIZDA */}
        {activeTab === 'about' && (
          <div className="grid gap-6 lg:grid-cols-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AboutIntroCard settings={settings} onSave={save} setSuccess={setSuccess} />
            <div className="space-y-6">
              <StatisticsCard settings={settings} onSave={save} setSuccess={setSuccess} />
              <QuoteCard settings={settings} onSave={save} setSuccess={setSuccess} />
            </div>
          </div>
        )}

        {/* TAB 3: ƏLAQƏ */}
        {activeTab === 'contact' && (
          <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-2 duration-300">
            <ContactCard settings={settings} onSave={save} setSuccess={setSuccess} />
          </div>
        )}

        {/* TAB 4: ÜMUMİ */}
        {activeTab === 'footer' && (
          <div className="max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <LogosCard settings={settings} onUpload={uploadMedia} setSuccess={setSuccess} />
            <FooterCard settings={settings} onSave={save} setSuccess={setSuccess} />
          </div>
        )}
      </div>
    </div>
  );
};

// --- Section Cards ---

const HeroCard = ({ settings, onSave, onUpload, setSuccess }: any) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      heroBadge: settings?.heroBadge || '',
      heroHeading1: settings?.heroHeading1 || '',
      heroHeading2: settings?.heroHeading2 || '',
      heroSubtext: settings?.heroSubtext || '',
      heroCtaText: settings?.heroCtaText || '',
      heroCtaUrl: settings?.heroCtaUrl || '',
    }
  });

  useEffect(() => {
    if (settings) reset({
      heroBadge: settings.heroBadge || '',
      heroHeading1: settings.heroHeading1 || '',
      heroHeading2: settings.heroHeading2 || '',
      heroSubtext: settings.heroSubtext || '',
      heroCtaText: settings.heroCtaText || '',
      heroCtaUrl: settings.heroCtaUrl || '',
    });
  }, [settings]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await onUpload(file, 'heroVideoUrl');
      setSuccess('Media uğurla yükləndi.');
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (values: any) => {
    setIsSaving(true);
    try {
      await onSave(values);
      setSuccess('Ana səhifə məlumatları yadda saxlanıldı.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card title="Hero Bölməsi" icon={<Home className="h-4 w-4" />} onSave={handleSubmit(onSubmit)} isSaving={isSaving}>
      <Input label="Hero Etiket (Badge)" {...register('heroBadge')} placeholder="Məs: Rəqəmsal İnkişaf Şirkəti" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Böyük Başlıq (Sətir 1)" {...register('heroHeading1')} placeholder="Brendinizi" />
        <Input label="Böyük Başlıq (Sətir 2)" {...register('heroHeading2')} placeholder="Gələcəyə Daşıyırıq" />
      </div>
      <Textarea label="Alt Mətn" {...register('heroSubtext')} placeholder="Qısa məlumat..." rows={3} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="CTA Düymə Mətni" {...register('heroCtaText')} placeholder="Məsələn: Xidmətlərimizə Bax →" />
        <Input label="CTA Düymə Linki" {...register('heroCtaUrl')} placeholder="Məsələn: /paketler" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-body">Hero Media (Video/Şəkil)</label>
        <div className="flex items-center gap-4">
          <div className="relative flex h-24 w-full items-center justify-center rounded-xl border-2 border-dashed border-edge bg-surface-alt transition hover:bg-surface-hover">
            <input type="file" accept="video/*,image/*" onChange={handleUpload} className="absolute inset-0 cursor-pointer opacity-0" disabled={isUploading} />
            <div className="flex flex-col items-center gap-1 text-faint">
              <Upload className={`h-5 w-5 ${isUploading ? 'animate-bounce' : ''}`} />
              <span className="text-[10px] font-medium uppercase tracking-wider">Yüklə</span>
            </div>
          </div>
          {settings?.heroVideoUrl && (
            <div className="h-24 w-40 overflow-hidden rounded-xl border border-edge shadow-inner bg-surface-hover flex items-center justify-center">
               {settings.heroVideoUrl.match(/\.(mp4|webm|ogg)$|video/i) ? (
                 <video src={assetUrl(settings.heroVideoUrl)} className="h-full w-full object-cover" autoPlay muted loop playsInline />
               ) : (
                 <img src={assetUrl(settings.heroVideoUrl)} alt="Hero" className="h-full w-full object-cover" />
               )}
            </div>
          )}
        </div>
      </div>
      <p className="text-[10px] text-faint font-medium uppercase tracking-wider italic">Qeyd: Düymə mətni və linki avtomatik təyin edilir.</p>
    </Card>
  );
};

const AboutIntroCard = ({ settings, onSave, setSuccess }: any) => {
  const [isSaving, setIsSaving] = useState(false);
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      aboutTopLabel: settings?.aboutTopLabel || '',
      aboutMainHeading: settings?.aboutMainHeading || '',
      aboutDescription: settings?.aboutDescription || '',
      aboutTeamBadge: settings?.aboutTeamBadge || '',
      aboutTeamTitle: settings?.aboutTeamTitle || '',
    }
  });

  useEffect(() => {
    if (settings) reset({
      aboutTopLabel: settings.aboutTopLabel || '',
      aboutMainHeading: settings.aboutMainHeading || '',
      aboutDescription: settings.aboutDescription || '',
      aboutTeamBadge: settings.aboutTeamBadge || '',
      aboutTeamTitle: settings.aboutTeamTitle || '',
    });
  }, [settings]);

  const onSubmit = async (values: any) => {
    setIsSaving(true);
    try {
      await onSave(values);
      setSuccess('Haqqımızda məlumatları yadda saxlanıldı.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card title="Haqqımızda Giriş" icon={<Info className="h-4 w-4" />} onSave={handleSubmit(onSubmit)} isSaving={isSaving}>
      <Input label="Bölmə Etiketi" {...register('aboutTopLabel')} />
      <Input label="Başlıq" {...register('aboutMainHeading')} />
      <Textarea label="Mətn" rows={10} {...register('aboutDescription')} />
      <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t border-edge-light">
        <Input label="Komanda Etiketi" {...register('aboutTeamBadge')} />
        <Input label="Komanda Başlığı" {...register('aboutTeamTitle')} />
      </div>
    </Card>
  );
};

const StatisticsCard = ({ settings, onSave, setSuccess }: any) => {
  const [isSaving, setIsSaving] = useState(false);
  const stats = parseJSON(settings?.aboutStats, [{value:'',label:''},{value:'',label:''},{value:'',label:''},{value:'',label:''}]).slice(0, 4);
  
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      stat0_val: stats[0]?.value || '', stat0_lab: stats[0]?.label || '',
      stat1_val: stats[1]?.value || '', stat1_lab: stats[1]?.label || '',
      stat2_val: stats[2]?.value || '', stat2_lab: stats[2]?.label || '',
      stat3_val: stats[3]?.value || '', stat3_lab: stats[3]?.label || '',
    }
  });

  useEffect(() => {
    if (settings && settings.aboutStats) {
      const s = parseJSON(settings.aboutStats, []);
      reset({
        stat0_val: s[0]?.value || '', stat0_lab: s[0]?.label || '',
        stat1_val: s[1]?.value || '', stat1_lab: s[1]?.label || '',
        stat2_val: s[2]?.value || '', stat2_lab: s[2]?.label || '',
        stat3_val: s[3]?.value || '', stat3_lab: s[3]?.label || '',
      });
    }
  }, [settings]);

  const onSubmit = async (values: any) => {
    setIsSaving(true);
    try {
      const aboutStats = [
        { value: values.stat0_val, label: values.stat0_lab },
        { value: values.stat1_val, label: values.stat1_lab },
        { value: values.stat2_val, label: values.stat2_lab },
        { value: values.stat3_val, label: values.stat3_lab },
      ];
      await onSave({ aboutStats: JSON.stringify(aboutStats) });
      setSuccess('Statistikalar yadda saxlanıldı.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card title="Statistikalar" icon={<Hash className="h-4 w-4" />} onSave={handleSubmit(onSubmit)} isSaving={isSaving}>
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="rounded-xl border border-edge-light bg-surface-alt/50 p-3 space-y-2">
            <Input label="Rəqəm" {...register(`stat${i}_val` as any)} placeholder="Məs: 300+" />
            <Input label="Açıqlama" {...register(`stat${i}_lab` as any)} placeholder="Məs: Layihə" />
          </div>
        ))}
      </div>
    </Card>
  );
};

const QuoteCard = ({ settings, onSave, setSuccess }: any) => {
  const [isSaving, setIsSaving] = useState(false);
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      aboutQuote: settings?.aboutQuote || '',
    }
  });

  useEffect(() => {
    if (settings) reset({
      aboutQuote: settings.aboutQuote || '',
    });
  }, [settings]);

  const onSubmit = async (values: any) => {
    setIsSaving(true);
    try {
      await onSave(values);
      setSuccess('Slogan yadda saxlanıldı.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card title="Sitat / Slogan" icon={<Quote className="h-4 w-4" />} onSave={handleSubmit(onSubmit)} isSaving={isSaving}>
      <Textarea label="Mərkəzi Slogan" rows={3} {...register('aboutQuote')} />
    </Card>
  );
};

const ContactCard = ({ settings, onSave, setSuccess }: any) => {
  const [isSaving, setIsSaving] = useState(false);
  const { register, handleSubmit, watch, reset } = useForm({
    defaultValues: {
      contactTopLabel: settings?.contactTopLabel || '',
      contactMainHeading: settings?.contactMainHeading || '',
      contactSubtext: settings?.contactSubtext || '',
      contactInfoTitle: settings?.contactInfoTitle || '',
      contactAddressLabel: settings?.contactAddressLabel || '',
      contactPhoneLabel: settings?.contactPhoneLabel || '',
      contactEmailLabel: settings?.contactEmailLabel || '',
      contactHoursLabel: settings?.contactHoursLabel || '',
      companyAddress: settings?.companyAddress || '',
      companyPhone: settings?.companyPhone || '',
      companyEmail: settings?.companyEmail || '',
      companyWorkingHours: settings?.companyWorkingHours || '',
      googleMapsEmbed: settings?.googleMapsEmbed || '',
    }
  });

  useEffect(() => {
    if (settings) reset({
      contactTopLabel: settings.contactTopLabel || '',
      contactMainHeading: settings.contactMainHeading || '',
      contactSubtext: settings.contactSubtext || '',
      contactInfoTitle: settings.contactInfoTitle || '',
      contactAddressLabel: settings.contactAddressLabel || '',
      contactPhoneLabel: settings.contactPhoneLabel || '',
      contactEmailLabel: settings.contactEmailLabel || '',
      contactHoursLabel: settings.contactHoursLabel || '',
      companyAddress: settings.companyAddress || '',
      companyPhone: settings.companyPhone || '',
      companyEmail: settings.companyEmail || '',
      companyWorkingHours: settings.companyWorkingHours || '',
      googleMapsEmbed: settings.googleMapsEmbed || '',
    });
  }, [settings]);

  const onSubmit = async (values: any) => {
    setIsSaving(true);
    try {
      await onSave(values);
      setSuccess('Əlaqə məlumatları yadda saxlanıldı.');
    } finally {
      setIsSaving(false);
    }
  };

  const mapUrl = watch('googleMapsEmbed');

  return (
    <Card title="Əlaqə Məlumatları" icon={<PhoneCall className="h-4 w-4" />} onSave={handleSubmit(onSubmit)} isSaving={isSaving}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Bölmə Etiketi" {...register('contactTopLabel')} />
        <Input label="Bölmə Başlığı" {...register('contactMainHeading')} />
      </div>
      <div className="grid gap-4 sm:grid-cols-1 pt-4 border-t border-edge-light">
        <Input label="Məlumat Sütunu Başlığı" {...register('contactInfoTitle')} />
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Input label="Ünvan Etiketi" {...register('contactAddressLabel')} />
        <Input label="Telefon Etiketi" {...register('contactPhoneLabel')} />
        <Input label="E-poçt Etiketi" {...register('contactEmailLabel')} />
        <Input label="İş Saatları Etiketi" {...register('contactHoursLabel')} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t border-edge-light">
        <Input label="E-poçt" {...register('companyEmail')} placeholder="Məs: info@example.com" />
        <Input label="Telefon" {...register('companyPhone')} placeholder="Məs: +994 50 000 00 00" />
        <Input label="İş Saatları" {...register('companyWorkingHours')} placeholder="Məs: B.E - Cəma, 09:00 - 18:00" />
        <Input label="Ünvan" {...register('companyAddress')} placeholder="Məs: Bakı şəhəri, Nizami küç. 42" />
      </div>
      <Textarea label="Google Maps İframe Linki" rows={2} {...register('googleMapsEmbed')} placeholder="https://www.google.com/maps/embed?..." />
      {mapUrl && (
        <div className="aspect-video w-full overflow-hidden rounded-xl border border-edge bg-surface-hover">
           <iframe src={mapUrl} className="h-full w-full grayscale" loading="lazy" />
        </div>
      )}
    </Card>
  );
};

const LogosCard = ({ settings, onUpload, setSuccess }: any) => {
  const [isUploadingNavbar, setIsUploadingNavbar] = useState(false);
  const [isUploadingFooter, setIsUploadingFooter] = useState(false);

  const handleNavbarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingNavbar(true);
    try {
      await onUpload(file, 'navbarLogoUrl');
      setSuccess('Navbar logosu uğurla yükləndi.');
    } finally {
      setIsUploadingNavbar(false);
    }
  };

  const handleFooterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingFooter(true);
    try {
      await onUpload(file, 'footerLogoUrl');
      setSuccess('Footer logosu uğurla yükləndi.');
    } finally {
      setIsUploadingFooter(false);
    }
  };

  return (
    <div className="rounded-2xl border border-edge bg-surface shadow-sm overflow-hidden flex flex-col">
      <div className="border-b border-edge-light bg-surface-alt/50 px-4 md:px-6 py-4 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-body shadow-sm ring-1 ring-slate-200">
          <ImageIcon className="h-4 w-4" />
        </div>
        <h3 className="font-semibold text-heading">Logolar</h3>
      </div>
      <div className="p-6">
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Navbar Logo */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-body">Navbar Logosu</label>
            <div className="flex items-center gap-4">
              <div className="relative flex h-24 w-full items-center justify-center rounded-xl border-2 border-dashed border-edge bg-surface-alt transition hover:bg-surface-hover">
                <input type="file" accept="image/*" onChange={handleNavbarUpload} className="absolute inset-0 cursor-pointer opacity-0" disabled={isUploadingNavbar} />
                <div className="flex flex-col items-center gap-1 text-faint">
                  <Upload className={`h-5 w-5 ${isUploadingNavbar ? 'animate-bounce' : ''}`} />
                  <span className="text-[10px] font-medium uppercase tracking-wider">Yüklə</span>
                </div>
              </div>
              {settings?.navbarLogoUrl && (
                <div className="h-24 w-28 shrink-0 overflow-hidden rounded-xl border border-edge shadow-inner bg-surface-hover flex items-center justify-center p-2">
                  <img src={assetUrl(settings.navbarLogoUrl)} alt="Navbar Logo" className="max-h-full max-w-full object-contain" />
                </div>
              )}
            </div>
          </div>
          {/* Footer Logo */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-body">Footer Logosu</label>
            <div className="flex items-center gap-4">
              <div className="relative flex h-24 w-full items-center justify-center rounded-xl border-2 border-dashed border-edge bg-surface-alt transition hover:bg-surface-hover">
                <input type="file" accept="image/*" onChange={handleFooterUpload} className="absolute inset-0 cursor-pointer opacity-0" disabled={isUploadingFooter} />
                <div className="flex flex-col items-center gap-1 text-faint">
                  <Upload className={`h-5 w-5 ${isUploadingFooter ? 'animate-bounce' : ''}`} />
                  <span className="text-[10px] font-medium uppercase tracking-wider">Yüklə</span>
                </div>
              </div>
              {settings?.footerLogoUrl && (
                <div className="h-24 w-28 shrink-0 overflow-hidden rounded-xl border border-edge shadow-inner bg-surface-hover flex items-center justify-center p-2">
                  <img src={assetUrl(settings.footerLogoUrl)} alt="Footer Logo" className="max-h-full max-w-full object-contain" />
                </div>
              )}
            </div>
          </div>
        </div>
        <p className="mt-4 text-[10px] text-faint font-medium uppercase tracking-wider italic">Qeyd: Logoları yüklədikdən sonra saytda avtomatik yenilənəcək.</p>
      </div>
    </div>
  );
};

const FooterCard = ({ settings, onSave, setSuccess }: any) => {
  const [isSaving, setIsSaving] = useState(false);
  const social = parseJSON(settings?.socialLinks, {});
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      footerShortText: settings?.footerShortText || '',
      footerPagesTitle: settings?.footerPagesTitle || '',
      footerSocialTitle: settings?.footerSocialTitle || '',
      instagram: social.instagram || '',
      linkedin: social.linkedin || '',
      youtube: social.youtube || '',
      telegram: social.telegram || '',
    }
  });

  useEffect(() => {
    if (settings) reset({
      footerShortText: settings.footerShortText || '',
      footerPagesTitle: settings.footerPagesTitle || '',
      footerSocialTitle: settings.footerSocialTitle || '',
      instagram: social.instagram || '',
      linkedin: social.linkedin || '',
      youtube: social.youtube || '',
      telegram: social.telegram || '',
    });
  }, [settings]);

  const onSubmit = async (values: any) => {
    setIsSaving(true);
    try {
      const socialLinks = JSON.stringify({
        instagram: values.instagram,
        linkedin: values.linkedin,
        youtube: values.youtube,
        telegram: values.telegram,
      });
      await onSave({ footerShortText: values.footerShortText, socialLinks });
      setSuccess('Footer və Sosial linklər yadda saxlanıldı.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card title="Footer və Sosial Media" icon={<Share2 className="h-4 w-4" />} onSave={handleSubmit(onSubmit)} isSaving={isSaving}>
      <Textarea label="Footer Bio" rows={2} {...register('footerShortText')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Səhifələr Sütunu Başlığı" {...register('footerPagesTitle')} />
        <Input label="Sosial Media Sütunu Başlığı" {...register('footerSocialTitle')} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 pt-4 border-t border-edge-light">
        <Input label="Instagram" {...register('instagram')} placeholder="Link" />
        <Input label="LinkedIn" {...register('linkedin')} placeholder="Link" />
        <Input label="YouTube" {...register('youtube')} placeholder="Link" />
        <Input label="Telegram" {...register('telegram')} placeholder="Link" />
      </div>
      <p className="text-[10px] text-faint font-medium uppercase tracking-wider italic">Qeyd: Müəllif hüquqları (Copyright) mətni sabitdir.</p>
    </Card>
  );
};

const MarqueeCard = ({ settings, onSave, setSuccess }: any) => {
  const [isSaving, setIsSaving] = useState(false);
  const [words, setWords] = useState<string[]>([]);
  const [newWord, setNewWord] = useState('');

  useEffect(() => {
    if (settings && settings.marqueeWords) {
      setWords(parseJSON(settings.marqueeWords, []));
    }
  }, [settings]);

  const addWord = () => {
    const trimmed = newWord.trim();
    if (!trimmed) return;
    setWords(curr => [...curr, trimmed]);
    setNewWord('');
  };

  const removeWord = (idx: number) => {
    setWords(curr => curr.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ marqueeWords: JSON.stringify(words) });
      setSuccess('Marquee mətni yadda saxlanıldı.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card title="Marquee (Axan Mətn)" icon={<X className="h-4 w-4" />} onSave={handleSave} isSaving={isSaving}>
      <div className="flex flex-wrap gap-2 min-h-[60px] p-4 rounded-xl bg-surface-alt border border-edge-light">
        {words.map((word, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-surface border border-edge px-3 py-1 text-xs font-medium text-body shadow-sm transition hover:border-field-border">
            {word}
            <button onClick={() => removeWord(i)} className="hover:text-red-500"><X className="h-3 w-3" /></button>
          </span>
        ))}
        {words.length === 0 && <span className="text-xs text-faint">Heç bir söz əlavə edilməyib.</span>}
      </div>
      <div className="flex gap-2">
        <Input placeholder="Yeni söz..." value={newWord} onChange={e => setNewWord(e.target.value)} onKeyDown={e => e.key === 'Enter' && addWord()} />
        <Button variant="secondary" onClick={addWord}>Əlavə Et</Button>
      </div>
    </Card>
  );
};

export default SettingsPage;
