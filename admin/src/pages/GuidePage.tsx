import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  FolderOpen,
  Info,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Package,
  Settings,
  ShieldAlert,
  UserCircle,
  Users,
  Wrench,
} from 'lucide-react';
import Badge from '../components/ui/Badge';

// ── shared building blocks ──────────────────────────────────────────────

const sections = [
  { id: 'giris', icon: ShieldAlert, label: 'Giriş, rollar və menyu' },
  { id: 'dashboard', icon: LayoutDashboard, label: 'İdarəetmə Paneli (Dashboard)' },
  { id: 'portfolio', icon: Briefcase, label: 'Portfolio (layihələr)' },
  { id: 'xidmetler', icon: Wrench, label: 'Xidmətlər' },
  { id: 'paketler', icon: Package, label: 'Paketlər' },
  { id: 'komandamiz', icon: Users, label: 'Komandamız (ictimai)' },
  { id: 'mushteriler', icon: UserCircle, label: 'Müştərilər və ödənişlər' },
  { id: 'fayllar', icon: FolderOpen, label: 'Layihə Faylları (Deliverables)' },
  { id: 'sorgular', icon: LifeBuoy, label: 'Sorğular (Tickets)' },
  { id: 'mesajlar', icon: MessageSquare, label: 'Mesajlar (Inbox)' },
  { id: 'admin-idareetmesi', icon: ShieldAlert, label: 'Komanda (admin idarəetməsi)' },
  { id: 'ayarlar', icon: Settings, label: 'Veb-sayt Ayarları' },
  { id: 'diqqet', icon: AlertTriangle, label: 'Diqqət ediləcək məqamlar' },
];

const Callout = ({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warn' | 'ok';
  title: string;
  children: ReactNode;
}) => {
  const toneMap = {
    info: { border: 'border-l-sky-500', icon: <Info className="h-4 w-4 text-sky-500" />, text: 'text-sky-600' },
    warn: { border: 'border-l-amber-500', icon: <AlertTriangle className="h-4 w-4 text-amber-500" />, text: 'text-amber-600' },
    ok: { border: 'border-l-emerald-500', icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />, text: 'text-emerald-600' },
  }[tone];

  return (
    <div className={`my-4 rounded-xl border border-edge ${toneMap.border} border-l-4 bg-surface-alt/40 p-4`}>
      <div className={`mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${toneMap.text}`}>
        {toneMap.icon}
        {title}
      </div>
      <div className="space-y-1.5 text-sm leading-relaxed text-body">{children}</div>
    </div>
  );
};

const Steps = ({ items }: { items: ReactNode[] }) => (
  <ol className="my-3">
    {items.map((item, i) => (
      <li
        key={i}
        className={`relative py-3 pl-11 text-sm leading-relaxed text-body ${
          i < items.length - 1 ? 'border-b border-dashed border-edge-light' : ''
        }`}
      >
        <span className="absolute left-0 top-2.5 flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-xs font-semibold text-blue-600 ring-1 ring-inset ring-blue-500/20">
          {i + 1}
        </span>
        {item}
      </li>
    ))}
  </ol>
);

const FieldTable = ({ rows }: { rows: [ReactNode, ReactNode][] }) => (
  <div className="my-4 overflow-hidden rounded-xl border border-edge">
    <table className="w-full text-sm">
      <tbody>
        {rows.map(([k, v], i) => (
          <tr key={i} className={i === 0 ? '' : 'border-t border-edge-light'}>
            <td className="w-1/3 whitespace-nowrap p-3 align-top font-semibold text-heading">{k}</td>
            <td className="p-3 align-top text-body">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const B = ({ children }: { children: ReactNode }) => <strong className="font-semibold text-heading">{children}</strong>;
const Code = ({ children }: { children: ReactNode }) => (
  <code className="rounded border border-edge bg-surface-alt px-1.5 py-0.5 font-mono text-[0.85em] text-body">{children}</code>
);

const FaqItem = ({ q, children }: { q: string; children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-2 overflow-hidden rounded-xl border border-edge bg-surface">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-heading"
      >
        {q}
        <span className="text-blue-600">{open ? '–' : '+'}</span>
      </button>
      {open && <p className="px-4 pb-4 text-sm leading-relaxed text-muted">{children}</p>}
    </div>
  );
};

const Section = ({
  id,
  icon: Icon,
  num,
  title,
  children,
}: {
  id: string;
  icon: any;
  num: string;
  title: string;
  children: ReactNode;
}) => (
  <section id={id} className="scroll-mt-24 border-b border-edge-light py-10 last:border-b-0">
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 ring-1 ring-inset ring-blue-500/20">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div>
        <span className="block text-[11px] font-semibold uppercase tracking-widest text-muted">Bölmə {num}</span>
        <h2 className="text-xl font-semibold text-heading">{title}</h2>
      </div>
    </div>
    <div className="space-y-3 text-sm leading-relaxed text-body">{children}</div>
  </section>
);

// ── page ─────────────────────────────────────────────────────────────────

export const GuidePage = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-heading">Admin Panel — İstifadə Təlimatı</h1>
        <p className="max-w-3xl text-sm text-muted">
          Bu səhifə admin panelinin bütün bölmələrini, hər düymənin nə etdiyini və diqqət ediləcək məqamları
          ətraflı izah edir. Yeni komanda üzvləri üçün istinad sənədidir.
        </p>
      </div>

      <nav className="rounded-2xl border border-edge bg-surface p-5 shadow-sm">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-faint">İçindəkilər</h2>
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((s, i) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted transition hover:bg-surface-hover hover:text-heading"
              >
                <span className="text-xs text-faint">{String(i + 1).padStart(2, '0')}</span>
                <s.icon className="h-3.5 w-3.5 shrink-0" />
                {s.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="rounded-2xl border border-edge bg-surface px-6 shadow-sm">
        {/* 01 — GİRİŞ */}
        <Section id="giris" icon={ShieldAlert} num="01" title="Giriş, rollar və menyu">
          <p>
            Admin panelə <Code>/login</Code> ünvanından e-poçt və şifrə ilə daxil olunur. Yalnız rolu{' '}
            <Code>ADMIN</Code> və ya <Code>SUPER_ADMIN</Code> olan hesablar panelə buraxılır — müştəri (portal)
            hesabı ilə daxil olmağa cəhd etsəniz, sistem sizi dərhal çıxarıb bildiriş göstərəcək:{' '}
            <em>"Yalnız admin istifadəçilər bu panelə daxil ola bilər."</em>
          </p>
          <Callout tone="info" title="İki rol var">
            <p>
              <B>Admin</B> — gündəlik iş üçün bütün əməliyyat bölmələrinə (Portfolio, Xidmətlər, Paketlər,
              Müştərilər, Layihə Faylları, Sorğular, Mesajlar, Ayarlar) tam giriş var.
            </p>
            <p>
              <B>Super Admin</B> — yuxarıdakı hər şeyə əlavə olaraq, yalnız Super Admin-ə görünən{' '}
              <B>"Komanda"</B> bölməsindən yeni admin hesabları yarada və silə bilir (Bölmə 11).
            </p>
          </Callout>
          <p>
            Sol menyu (mobil cihazda yuxarı sağdakı ☰ ikonundan açılır) bütün bölmələrə keçidi göstərir. Yuxarı
            sağda (və mobil paneldə) günəş/ay ikonu ilə <B>tünd/açıq rejim</B> arasında keçid edə bilərsiniz —
            seçim yadda saxlanılır. Sol menyunun aşağısında <B>"Çıxış"</B> düyməsi var.
          </p>
          <p>
            <B>Mesajlar</B> menyu bəndinin yanında qırmızı rəqəm görsəniz — bu, oxunmamış sayt mesajlarının
            sayıdır (Bölmə 10).
          </p>
        </Section>

        {/* 02 — DASHBOARD */}
        <Section id="dashboard" icon={LayoutDashboard} num="02" title="İdarəetmə Paneli (Dashboard)">
          <p>
            Panelə daxil olanda ilk açılan səhifədir (<Code>/</Code>). Yalnız <B>məlumat göstərir</B>, heç bir
            əməliyyat düyməsi yoxdur:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>4 statistik kart: Ümumi Layihələr, Aktiv Xidmətlər, Ümumi Müştərilər, Oxunmamış Mesajlar.</li>
            <li>"Son Mesajlar" cədvəli — ən son sayt mesajlarının qısa siyahısı (ad, mesaj, status, tarix).</li>
          </ul>
          <p>
            Bu cədvəldəki mesaja klikləmək heç nə etmir — mesaja cavab vermək və ya oxunmuş kimi işarələmək
            üçün <B>Mesajlar</B> bölməsinə keçməlisiniz (Bölmə 10).
          </p>
        </Section>

        {/* 03 — PORTFOLIO */}
        <Section id="portfolio" icon={Briefcase} num="03" title="Portfolio (layihələr)">
          <p>
            Bu bölmə saytda "Portfolio" kimi göstərilən — müştərilərə nümayiş üçün olan iş nümunələrini (case
            study) idarə edir. Diqqət: bu, müştərilərin öz fayllarının olduğu "Layihə Faylları" bölməsi ilə{' '}
            <B>eyni şey deyil</B> (bax Bölmə 08).
          </p>

          <h3 className="pt-2 text-base font-semibold text-heading">Kateqoriyalar</h3>
          <p>Səhifənin yuxarısında kateqoriya çipləri var:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Yeni kateqoriya — sahəyə ad yazıb <B>"Əlavə Et"</B> basın.</li>
            <li>Redaktə — qələm ikonu, ad dəyişib Enter və ya <B>"Yadda Saxla"</B>.</li>
            <li>
              Silmək — X ikonu, təsdiq pəncərəsi açılır. <Callout tone="warn" title="Xəbərdarlıq">
                <p>Kateqoriyanı silsəniz, ona aid bütün layihələr kateqoriyasız qalır (layihələr silinmir).</p>
              </Callout>
            </li>
          </ul>

          <h3 className="pt-2 text-base font-semibold text-heading">Layihələr cədvəli</h3>
          <p>
            Hər sətirdə: şəkil, başlıq, kateqoriya, <B>"Seçilmiş"</B> (ana səhifədə göstərilsin) və{' '}
            <B>"Dərc edilib"</B> açar-düymələri (toggle) var — bunlara toxunduqda dəyişiklik <B>dərhal</B> tətbiq
            olunur, ayrıca yadda saxlamaq lazım deyil.
          </p>

          <h3 className="pt-2 text-base font-semibold text-heading">"Yeni Layihə" / redaktə pəncərəsi</h3>
          <FieldTable
            rows={[
              ['Başlıq', 'Məcburi.'],
              ['Kateqoriya', 'Siyahıdan seçim, məcburi deyil.'],
              [
                'Şəkil (Thumbnail)',
                'JPEG/PNG/WEBP. Redaktə zamanı yeni fayl seçməsəniz, mövcud şəkil olduğu kimi qalır.',
              ],
              ['YouTube ID/link', 'Köhnə üsul — sadəcə mətn sahəsi. Aşağıdakı video yükləmə üsulu tövsiyə olunur.'],
              ['Canlı layihə linki', 'Saytda "Canlı Bax" düyməsinin apardığı xarici ünvan.'],
              [
                'Showcase Video',
                'MP4/MOV faylı — aşağıda ətraflı izah olunan arxa-fon yükləmə sistemi ilə işləyir.',
              ],
              ['Təsvir', 'Məcburi.'],
              ['İl', 'Rəqəm, məcburi deyil.'],
              ['Dərc edilsin / Ana səhifədə göstərilsin', 'İki açar-düymə.'],
            ]}
          />

          <Callout tone="info" title="Video yükləmə necə işləyir">
            <p>
              Video seçib <B>"Yadda Saxla"</B> basdıqda, mətn məlumatları dərhal saxlanılır və pəncərə{' '}
              <B>bağlanır</B> — video isə arxa planda, ayrıca yüklənir. Ekranın küncündə üzən bir{' '}
              <B>irəliləyiş göstəricisi (progress pill)</B> görünür, faizini göstərir.
            </p>
            <p>
              Bu göstərici <B>bütün admin panel boyunca sizi izləyir</B> — başqa səhifəyə keçsəniz belə
              yoxa çıxmır, yükləmə arxa planda davam edir. Yükləmə bitəndən ~15 saniyə sonra göstərici özü
              yoxa çıxır.
            </p>
            <p>
              Video hələ emal olunarkən (server tərəfdə sürətli-başlanğıc/720p emalı) səhifəni bağlasanız
              brauzer sizi xəbərdar edəcək — <B>yükləmə bitənə qədər səhifəni bağlamayın və ya yeniləməyin.</B>
            </p>
            <p>
              Mövcud videosu olan layihəni açsanız, kiçik önizləmə və status görünür; <B>"Videonu sil"</B>{' '}
              düyməsi ilə videonu tamamilə silə bilərsiniz.
            </p>
          </Callout>

          <p>
            Silmək üçün zibil qutusu ikonu — təsdiqdən sonra layihə <B>həmişəlik</B> silinir.
          </p>
        </Section>

        {/* 04 — XİDMƏTLƏR */}
        <Section id="xidmetler" icon={Wrench} num="04" title="Xidmətlər">
          <p>Saytda göstərilən xidmət kartlarını (ikon + başlıq + təsvir) idarə edir.</p>
          <FieldTable
            rows={[
              ['İkon', '15 hazır ikondan biri seçilir (məsələn Megaphone, Video, Globe...).'],
              ['Başlıq / Təsvir', 'Hər ikisi məcburi.'],
              ['Sıra', 'Rəqəm — saytda göstərilmə ardıcıllığını təyin edir (kiçikdən böyüyə).'],
              ['Aktiv', 'Açar-düymə — cədvəldə də dərhal dəyişdirilə bilər, ayrı yadda saxlamaq lazım deyil.'],
            ]}
          />
          <p>Bu bölmədə fayl/şəkil yükləmək lazım deyil — ikonlar hazır dəst içindən seçilir.</p>
          <p>Silmək — zibil qutusu ikonu, təsdiqdən sonra həmişəlik silinir.</p>
        </Section>

        {/* 05 — PAKETLƏR */}
        <Section id="paketler" icon={Package} num="05" title="Paketlər">
          <p>Saytda göstərilən qiymət/plan paketlərini idarə edir.</p>
          <FieldTable
            rows={[
              ['Ad / Təsvir / Qiymət', 'Qiymət sərbəst mətndir (məs. "200 AZN-dən"), rəqəm formatı tələb olunmur.'],
              [
                'Üstünlüklər (Features)',
                'Sərbəst siyahı — "Əlavə Et" ilə yeni sətir, hər sətrin yanındakı X ilə silinir. Boş sətirlər saxlanmır.',
              ],
              ['Showcase Video', 'Portfolio bölməsindəki ilə eyni arxa-fon yükləmə sistemi (yuxarı bax).'],
              [
                '"Ən Populyar" işarəsi',
                'Açar-düymə. Panel xəbərdarlıq göstərir ki, yalnız bir paket "Ən Populyar" ola bilər — lakin bunu sistem avtomatik təmin etmir. Yeni paketi "Ən Populyar" etsəniz, köhnəsini əl ilə söndürməyi unutmayın.',
              ],
              ['Aktiv', 'Açar-düymə.'],
            ]}
          />
          <Callout tone="warn" title="Diqqət">
            <p>
              "Planı Seç" düyməsinin mətni və linki (müştəri "Əlaqə" səhifəsinə yönləndirilir) panel
              içindən dəyişdirilə bilmir — bu, kod səviyyəsində sabitlənib.
            </p>
          </Callout>
        </Section>

        {/* 06 — KOMANDAMIZ */}
        <Section id="komandamiz" icon={Users} num="06" title="Komandamız (ictimai)">
          <p>
            Saytın "Haqqımızda" səhifəsindəki komanda üzvləri kartlarını idarə edir. Bunu{' '}
            <B>"Komanda"</B> (admin idarəetməsi, Bölmə 11) ilə qarışdırmayın — o, tamamilə fərqli bir bölmədir
            və panelin öz operator hesablarını idarə edir.
          </p>
          <FieldTable
            rows={[
              ['Avatar', 'JPEG/PNG/WEBP şəkil yükləmə, canlı önizləmə ilə.'],
              ['Ad Soyad / Vəzifə', 'Hər ikisi məcburi.'],
              ['Sıra', 'Göstərilmə ardıcıllığı.'],
              ['Aktiv', 'Açar-düymə, dərhal tətbiq olunur.'],
            ]}
          />
        </Section>

        {/* 07 — MÜŞTƏRİLƏR */}
        <Section id="mushteriler" icon={UserCircle} num="07" title="Müştərilər və ödənişlər">
          <p>Müştəri portalına giriş edən hesabları (rol: CLIENT), onların paketini və ödəniş tarixçəsini idarə edir.</p>

          <h3 className="pt-2 text-base font-semibold text-heading">Paket təyin etmək</h3>
          <p>
            Sətirdəki "paket" ikonuna klikləyin — həmin xanada açılan seçim siyahısından paket seçin (və ya
            "Paketi sil" ilə paketi ləğv edin), sonra ✓ ilə təsdiqləyin.
          </p>

          <h3 className="pt-2 text-base font-semibold text-heading">Yeni müştəri / redaktə</h3>
          <FieldTable
            rows={[
              ['Ad Soyad, E-poçt', 'Məcburi, e-poçt formatı yoxlanılır.'],
              [
                'Şifrə',
                'Yeni müştəri yaradarkən məcburidir (min. 8 simvol). Mövcud müştərini redaktə edərkən bu sahəni boş buraxsanız, köhnə şifrə dəyişmir.',
              ],
              ['Paket', 'Yalnız yeni müştəri yaradarkən burada seçilə bilər.'],
            ]}
          />

          <h3 className="pt-2 text-base font-semibold text-heading">Ödəniş əlavə etmək</h3>
          <p>
            Sətirdəki "+" ikonu sizi ayrıca <Code>/payments/new</Code> səhifəsinə aparır (müştəri əvvəlcədən
            seçilmiş olur):
          </p>
          <FieldTable
            rows={[
              ['Müştəri', 'Axtarışlı seçim (əvvəlcədən doldurula bilər).'],
              ['Məbləğ (AZN)', 'Məcburi.'],
              [
                'Ödəniş tarixi / Növbəti ödəniş tarixi',
                'Ödəniş tarixini dəyişdikdə, növbəti ödəniş tarixi avtomatik olaraq bir ay sonrasına təyin olunur (ay sonu tarixləri düzgün hesablanır). İstəsəniz əl ilə dəyişə bilərsiniz.',
              ],
              [
                'Qaimə (PDF)',
                'Yalnız PDF qəbul olunur. Yükləndikdən sonra faylın adı yaşıl çipdə görünür, "Sil" ilə silinib yenidən yüklənə bilər.',
              ],
              ['Admin qeydi', 'Daxili qeyd, müştəriyə göstərilmir.'],
            ]}
          />

          <h3 className="pt-2 text-base font-semibold text-heading">Ödəniş tarixçəsi</h3>
          <p>
            Cədvəldəki ödəniş sayı rəqəminə klikləyin — həmin müştərinin bütün ödənişləri (tarix, məbləğ,
            növbəti tarix) siyahı şəklində açılır, hər sətirdə silmək düyməsi var.
          </p>

          <Callout tone="warn" title="Müştərini silmək">
            <p>Bu əməliyyat geri qaytarıla bilməz — müştəri hesabı və ona bağlı məlumatlar həmişəlik silinir.</p>
          </Callout>
        </Section>

        {/* 08 — FAYLLAR */}
        <Section id="fayllar" icon={FolderOpen} num="08" title="Layihə Faylları (Deliverables)">
          <p>
            Panelin ən mürəkkəb bölməsi — müştərilərə aylıq təhvil verilən material fayllarını (foto/video)
            idarə edir. İki alt-tab var: <B>"Layihə Faylları"</B> və <B>"Önə Çıxanlar (Highlights)"</B>.
          </p>

          <h3 className="pt-2 text-base font-semibold text-heading">Növ (kateqoriya) idarəsi</h3>
          <p>
            Portfolio bölməsindəki kimi çip siyahısı, əlavə olaraq yeni növ yaradarkən{' '}
            <B>"Video kateqoriyasıdır?"</B> qutusu var. Bu seçim yalnız <B>yaradılış anında</B> təyin olunur —
            sonradan adı dəyişdirmək mümkündür, amma video/foto tipini dəyişmək mümkün deyil.
          </p>

          <h3 className="pt-2 text-base font-semibold text-heading">Fayllar cədvəli</h3>
          <p>
            Yuxarıdakı axtarış qutusu ad/e-poçt üzrə axtarır. Status sütununda 5 mümkün vəziyyət var:
          </p>
          <div className="my-3 flex flex-wrap gap-2">
            <Badge variant="warning">Gözləmədə</Badge>
            <Badge variant="info">Hazırlanır</Badge>
            <Badge variant="success">Hazırdır</Badge>
            <Badge variant="danger">Xəta</Badge>
            <Badge variant="default">Arxivlənib</Badge>
          </div>
          <Callout tone="warn" title='"Gözləmədə qalıb" xəbərdarlığı'>
            <p>
              Fayl 2 saatdan çox <B>Gözləmədə</B> statusunda qalarsa, sətir açıq-qırmızı rənglə işarələnir və
              "Gözləmədə qalıb" çipi görünür — bu, adətən yükləmənin uğursuz olduğunu göstərir, yoxlanılmalıdır.
            </p>
          </Callout>
          <p>
            Müştəri həmin fayla rəy yazıbsa, mavi <B>"Rəy"</B> çipi görünür — klikləyəndə müştərinin yazdığı
            mətn açılır.
          </p>

          <h3 className="pt-2 text-base font-semibold text-heading">"Yeni Fayl" / redaktə pəncərəsi</h3>
          <FieldTable
            rows={[
              ['Başlıq, Müştəri, Növ, Tarix', 'Hamısı məcburi. Tarix seçdikdə avtomatik ay/il-ə çevrilir.'],
              ['Fayllar', 'Birdən çox fayl seçilə bilər.'],
              [
                'Kover şəkli',
                'Yalnız video kateqoriyası seçildikdə görünür. Yükləməsəniz, sistem videodan avtomatik kadr çəkib kover kimi istifadə edir.',
              ],
            ]}
          />

          <Callout tone="info" title="Fayl yükləmə necə işləyir">
            <p>
              Mətn məlumatları saxlanıldıqdan sonra pəncərə bağlanır və fayl(lar) arxa planda yüklənir — sağ
              alt küncdə irəliləyiş göstəricisi görünür.
            </p>
            <p>
              50 MB-dan böyük videolar birbaşa yaddaş sisteminə (S3) yüklənir; 20 MB-dan böyük olanlar isə
              hissə-hissə (multipart, paralel) yüklənir — bu, böyük fayllar üçün daha etibarlıdır və şəbəkə
              kəsilsə avtomatik təkrar cəhd edir.
            </p>
            <Callout tone="warn" title="Vacib fərq">
              <p>
                Portfolio/Paketlər bölmələrindəki video yükləməsindən fərqli olaraq, bu bölmədəki yükləmə
                göstəricisi <B>yalnız "Layihə Faylları" səhifəsində</B> aktivdir. Yükləmə davam edərkən başqa
                admin səhifəsinə keçməyin — səhifəni tərk etməyin, yükləmə bitənə qədər bu bölmədə qalın.
              </p>
            </Callout>
          </Callout>

          <h3 className="pt-2 text-base font-semibold text-heading">Fayla baxmaq</h3>
          <p>
            Cədvəldə başlığa klikləyin — tam ekran önizləmə açılır (video/şəkil), birdən çox fayl varsa
            aşağıda kiçik önizləmə zolağından fayllar arasında keçid edə bilərsiniz. <B>"Yüklə"</B> düyməsi
            faylın orijinal versiyasını endirir. Bağlamaq üçün × və ya Esc.
          </p>

          <h3 className="pt-2 text-base font-semibold text-heading">Önə Çıxanlar (Instagram Highlights)</h3>
          <p>
            Müştəri seçdikdən sonra onun portalında görünəcək dairəvi "highlight" ikonlarını idarə edirsiniz.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Hər müştəri üçün <B>maksimum 20</B> highlight (sərt limit).</li>
            <li>Yeni highlight: şəkil seçin + başlıq yazın (maks. 30 simvol) → "Siyahıya Əlavə Et".</li>
            <li>
              <Callout tone="warn" title="Diqqət">
                <p>
                  Bu "Siyahıya Əlavə Et" düyməsi faylı hələ <B>yükləmir</B> — yalnız lokal olaraq siyahıya
                  əlavə edir. Faktiki yükləmə və saxlama yalnız səhifənin <B>"Yadda Saxla"</B> düyməsinə
                  basdıqda baş verir. Bu addımı unutsanız, dəyişiklikləriniz itir.
                </p>
              </Callout>
            </li>
          </ul>

          <p>Fayl/Növ silmək — hər ikisi təsdiq pəncərəsi ilə, silinən fayl və ona bağlı məlumatlar həmişəlik itir.</p>
        </Section>

        {/* 09 — SORĞULAR */}
        <Section id="sorgular" icon={LifeBuoy} num="09" title="Sorğular (Tickets)">
          <p>Müştəri portalından göndərilən dəstək müraciətlərini idarə edir.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Status sətirdə birbaşa dəyişdirilir (Açıq / İcrada / Bağlı) — seçim edən kimi dərhal tətbiq olunur.
            </li>
            <li>Göz ikonu — sorğunun tam mətnini (müştəri, mövzu, tarix, mesaj) açır.</li>
          </ul>
          <Callout tone="warn" title="Diqqət">
            <p>
              Bu bölmədən müştəriyə <B>cavab yazmaq mümkün deyil</B> — yalnız statusu dəyişdirə və oxuya
              bilərsiniz. Silmə funksiyası da yoxdur. Cavab lazımdırsa, müştəri ilə başqa kanaldan (e-poçt və s.)
              əlaqə saxlanmalıdır.
            </p>
          </Callout>
        </Section>

        {/* 10 — MESAJLAR */}
        <Section id="mesajlar" icon={MessageSquare} num="10" title="Mesajlar (Inbox)">
          <p>
            Saytın "Əlaqə" formasından göndərilən mesajları idarə edir (portal müraciətlərindən fərqlidir —
            onlar "Sorğular"dadır).
          </p>
          <Callout tone="info" title="Avtomatik oxundu işarəsi">
            <p>
              Göz ikonuna basıb mesajı açan kimi, mesaj avtomatik <B>"oxunub"</B> statusuna keçir və sol
              menyudakı qırmızı say göstəricisi azalır.
            </p>
          </Callout>
          <p>
            Zibil qutusu ikonu — təsdiqdən sonra mesaj həmişəlik silinir. Bu bölmədən də müştəriyə birbaşa
            cavab yazmaq mümkün deyil.
          </p>
        </Section>

        {/* 11 — ADMIN İDARƏETMƏSİ */}
        <Section id="admin-idareetmesi" icon={ShieldAlert} num="11" title="Komanda (admin idarəetməsi)">
          <Callout tone="warn" title="Yalnız Super Admin">
            <p>Bu bölmə sol menyuda yalnız Super Admin rolunda olan istifadəçilərə görünür.</p>
          </Callout>
          <p>Panelə giriş edə bilən operator hesablarını (Admin/Super Admin) idarə edir.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <B>"Yeni Admin"</B> — Ad Soyad, E-poçt, Şifrə (min. 8 simvol) daxil edilir. Yeni yaradılan hesab
              həmişə adi <B>Admin</B> rolunda olur — bu formadan Super Admin yaratmaq mümkün deyil.
            </li>
            <li>
              Silmək — Super Admin hesabları və özünüzü heç vaxt silə bilməzsiniz (zibil qutusu ikonu belə
              hesablar üçün göstərilmir). Yalnız adi Admin hesabları silinə bilər.
            </li>
            <li>Mövcud adminin adını, e-poçtunu və ya şifrəsini bu bölmədən dəyişmək mümkün deyil.</li>
          </ul>
        </Section>

        {/* 12 — AYARLAR */}
        <Section id="ayarlar" icon={Settings} num="12" title="Veb-sayt Ayarları">
          <p>
            Bu bölmə saytın statik məzmununu (mətnlər, şəkillər, əlaqə məlumatları) idarə edir. 4 tab var:{' '}
            <B>Ana Səhifə</B>, <B>Haqqımızda</B>, <B>Əlaqə</B>, <B>Ümumi (Footer)</B>.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li><B>Ana Səhifə</B>: Hero bölməsi (başlıq, alt mətn, CTA, hero video/şəkil) və axan mətn (marquee) sözləri.</li>
            <li><B>Haqqımızda</B>: giriş mətni, komanda bölməsi başlığı, 4 sabit statistika (rəqəm+izah), sitat.</li>
            <li><B>Əlaqə</B>: e-poçt, telefon, ünvan, iş saatları, Google Xəritə əlaqə linki (əlavə edən kimi aşağıda canlı önizləmə görünür).</li>
            <li><B>Ümumi</B>: sayt logosu (seçən kimi avtomatik yüklənir, ayrıca saxlamaq lazım deyil), footer bio mətni, sosial media linkləri.</li>
          </ul>
          <Callout tone="warn" title="Ən vacib qayda: hər kartı ayrıca saxlayın">
            <p>
              Hər kartın (Hero, Marquee, Haqqımızda, Statistikalar və s.) öz ayrıca <B>"Yadda Saxla"</B>{' '}
              düyməsi var. Bir kartda dəyişiklik edib başqa taba keçsəniz — <B>saxlamadığınız dəyişikliklər
              itir</B>. Hər kartı redaktə etdikdən dərhal sonra onun öz "Yadda Saxla" düyməsinə basın.
            </p>
          </Callout>
        </Section>

        {/* 13 — DİQQƏT */}
        <Section id="diqqet" icon={AlertTriangle} num="13" title="Diqqət ediləcək məqamlar (xülasə)">
          <FaqItem q='Video/fayl yükləyirəm, "Yükləmə davam edir" görürəm — nə etməliyəm?'>
            Portfolio və Paketlər bölmələrindəki video yükləməsi bütün panel boyunca davam edir, başqa
            səhifəyə keçə bilərsiniz. Amma "Layihə Faylları" bölməsindəki fayl yükləməsi yalnız həmin
            səhifədə aktivdir — yükləmə bitənə qədər həmin səhifədə qalın, tabı bağlamayın.
          </FaqItem>
          <FaqItem q='Paketi "Ən Populyar" etdim, köhnəsi niyə hələ də görünür?'>
            Sistem avtomatik söndürmür — əvvəlki "Ən Populyar" paketi əl ilə tapıb söndürməlisiniz, əks
            halda bir neçə paket eyni vaxtda "Ən Populyar" görünə bilər.
          </FaqItem>
          <FaqItem q="Ayarlar bölməsində dəyişiklik etdim, amma yadda qalmadı">
            Hər kart öz ayrıca saxlama düyməsinə malikdir. Başqa taba keçməzdən əvvəl redaktə etdiyiniz
            kartın öz "Yadda Saxla" düyməsinə basdığınızdan əmin olun.
          </FaqItem>
          <FaqItem q="Müştəri şifrəsini necə dəyişə bilərəm?">
            Müştərilər bölməsindən həmin müştərini redaktə edin və Şifrə sahəsinə yeni şifrə yazın — boş
            saxlasanız köhnə şifrə qorunur.
          </FaqItem>
          <FaqItem q="Bir statusu 2 saatdan çox “Gözləmədə” görürəm">
            Bu, adətən yükləmənin uğursuz olduğunu göstərir. Faylı yenidən yükləməyi (redaktə → yeni fayl
            seç → yadda saxla) sınayın, davam edərsə developerlə əlaqə saxlayın.
          </FaqItem>
          <FaqItem q="Müştəriyə Sorğular/Mesajlar bölməsindən birbaşa cavab yaza bilərəmmi?">
            Xeyr. Bu bölmələr yalnız oxumaq və status dəyişmək üçündür. Cavab üçün müştəri ilə e-poçt və ya
            digər əlaqə kanalından istifadə edin.
          </FaqItem>
          <FaqItem q="Yeni Super Admin necə yaradıla bilər?">
            Panel daxilindən mümkün deyil — "Yeni Admin" forması yalnız adi Admin hesabı yaradır. Super
            Admin rolu yalnız developer tərəfindən verilə bilər.
          </FaqItem>
        </Section>
      </div>
    </div>
  );
};

export default GuidePage;
