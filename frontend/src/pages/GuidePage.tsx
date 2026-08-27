import { useState } from 'react';
import { motion } from 'framer-motion';
import PageTransition from '../components/utils/PageTransition';
import { cockpitContainer, cockpitItem } from '../utils/animations';

const sections = [
  { id: 'giris', label: 'Portala necə daxil olmaq' },
  { id: 'icmal', label: 'İcmal (əsas səhifə)' },
  { id: 'catdirilmalar', label: 'Çatdırılmalar — materialların idarəsi' },
  { id: 'baxis', label: 'Materiala baxmaq və endirmək' },
  { id: 'rey', label: 'Rəy və düzəliş istəkləri' },
  { id: 'status', label: '"Hazırlanır" və "Hazırdır" statusları' },
  { id: 'odenisler', label: 'Ödənişlər və qaimələr' },
  { id: 'destek', label: 'Dəstək müraciətləri' },
  { id: 'profil', label: 'Profil ayarları' },
  { id: 'cixis', label: 'Çıxış və təhlükəsizlik' },
  { id: 'suallar', label: 'Tez-tez verilən suallar' },
];

const Callout = ({ label, children, warn }: { label: string; children: React.ReactNode; warn?: boolean }) => (
  <div
    className="rounded-2xl p-5 my-5"
    style={{
      backgroundColor: 'var(--card-bg)',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: warn ? 'rgba(239, 68, 68, 0.3)' : 'var(--card-border)',
      borderLeftWidth: '3px',
      borderLeftColor: warn ? '#f87171' : 'var(--accent-text)',
    }}
  >
    <span
      className="block text-[11px] uppercase tracking-widest font-semibold mb-2"
      style={{ color: warn ? '#f87171' : 'var(--accent-text)' }}
    >
      {label}
    </span>
    <div className="text-sm leading-relaxed space-y-2" style={{ color: 'var(--text-secondary)' }}>
      {children}
    </div>
  </div>
);

const Steps = ({ items }: { items: React.ReactNode[] }) => (
  <ol className="my-4">
    {items.map((item, i) => (
      <li
        key={i}
        className="relative pl-14 py-4 text-sm leading-relaxed"
        style={{
          color: 'var(--text-secondary)',
          borderBottom: i < items.length - 1 ? '1px dashed var(--border-subtle)' : 'none',
        }}
      >
        <span
          className="absolute left-0 top-3 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold"
          style={{
            backgroundColor: 'var(--glow-accent-subtle)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'rgba(163,230,53,0.28)',
            color: 'var(--accent-text)',
          }}
        >
          {i + 1}
        </span>
        {item}
      </li>
    ))}
  </ol>
);

const Table = ({ rows }: { rows: [React.ReactNode, React.ReactNode][] }) => (
  <div
    className="my-5 rounded-2xl overflow-hidden"
    style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--card-border)' }}
  >
    <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
      <tbody>
        {rows.map(([k, v], i) => (
          <tr key={i} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)' }}>
            <td className="p-3 md:p-4 font-semibold align-top whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
              {k}
            </td>
            <td className="p-3 md:p-4 align-top" style={{ color: 'var(--text-secondary)' }}>
              {v}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Pill = ({ tone, children }: { tone: 'ok' | 'wait'; children: React.ReactNode }) => (
  <span
    className="inline-block text-xs px-3 py-1 rounded-full"
    style={{
      color: tone === 'ok' ? 'var(--accent-text)' : '#fbbf24',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: tone === 'ok' ? 'rgba(163,230,53,0.28)' : 'rgba(251,191,36,0.3)',
      backgroundColor: tone === 'ok' ? 'var(--glow-accent-subtle)' : 'rgba(251,191,36,0.1)',
    }}
  >
    {children}
  </span>
);

const FaqItem = ({ q, children }: { q: string; children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-2xl mb-3 overflow-hidden"
      style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--card-border)', backgroundColor: 'var(--card-bg)' }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-left px-5 py-4 text-sm font-semibold"
        style={{ color: 'var(--text-primary)' }}
      >
        {q}
        <span style={{ color: 'var(--accent-text)' }}>{open ? '–' : '+'}</span>
      </button>
      {open && (
        <p className="px-5 pb-4 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {children}
        </p>
      )}
    </div>
  );
};

const Section = ({
  id,
  num,
  title,
  children,
}: {
  id: string;
  num: string;
  title: string;
  children: React.ReactNode;
}) => (
  <motion.section
    id={id}
    variants={cockpitItem}
    className="py-12 md:py-14"
    style={{ borderBottom: '1px solid var(--border-subtle)', scrollMarginTop: '100px' }}
  >
    <span
      className="block text-xs uppercase tracking-widest font-semibold mb-2"
      style={{ color: 'var(--accent-text)' }}
    >
      Bölmə {num}
    </span>
    <h2 className="font-heading text-2xl md:text-3xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
      {title}
    </h2>
    <div className="text-sm md:text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
      {children}
    </div>
  </motion.section>
);

const GuidePage = () => {
  return (
    <PageTransition className="min-h-screen transition-colors duration-300" style={{ backgroundColor: 'transparent' }}>
      <motion.div
        variants={cockpitContainer}
        initial="hidden"
        animate="show"
        className="max-w-4xl mx-auto px-6 md:px-8 pt-36 pb-10"
      >
        <motion.p variants={cockpitItem} className="text-xs uppercase tracking-widest font-medium mb-4" style={{ color: 'var(--accent-text)' }}>
          MÜŞTƏRİ PORTALI
        </motion.p>
        <motion.h1 variants={cockpitItem} className="font-heading text-4xl md:text-5xl font-bold mb-5" style={{ color: 'var(--text-primary)' }}>
          İstifadə Təlimatı
        </motion.h1>
        <motion.p variants={cockpitItem} className="text-sm md:text-base max-w-2xl mb-10" style={{ color: 'var(--text-muted)' }}>
          Bu səhifə One müştəri portalının bütün bölmələrini — necə daxil olacağınızı, göndərdiyimiz materialları necə görəcəyinizi, endirəcəyinizi, rəy yazacağınızı, ödənişlərinizi və dəstək müraciətlərinizi — addım-addım izah edir. Texniki bilik tələb olunmur.
        </motion.p>

        <motion.nav
          variants={cockpitItem}
          className="rounded-2xl p-5 md:p-6"
          style={{ backgroundColor: 'var(--card-bg)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--card-border)' }}
        >
          <h2 className="text-[11px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--text-ghost)' }}>
            İçindəkilər
          </h2>
          <ol className="columns-1 sm:columns-2 gap-x-8 text-sm list-decimal list-inside space-y-2" style={{ color: 'var(--text-muted)' }}>
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }}>
                  {s.label}
                </a>
              </li>
            ))}
          </ol>
        </motion.nav>
      </motion.div>

      <motion.div
        variants={cockpitContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-5%' }}
        className="max-w-4xl mx-auto px-6 md:px-8 pb-28"
      >
        <Section id="giris" num="01" title="Portala necə daxil olmaq">
          <p className="mb-3">Portal veb-brauzerdə işləyir — kompüter, planşet və ya telefonda. Heç bir proqram yükləmək lazım deyil.</p>
          <Steps
            items={[
              <>Brauzerdə <strong style={{ color: 'var(--text-primary)' }}>ourneweye.com</strong> ünvanını açın.</>,
              <>Yuxarı menyudan <strong style={{ color: 'var(--text-primary)' }}>"Portal"</strong> düyməsini seçin. (Birbaşa <code>ourneweye.com/portal</code> ünvanına da keçə bilərsiniz.)</>,
              <>Bizim sizə verdiyimiz <strong style={{ color: 'var(--text-primary)' }}>e-poçt</strong> və <strong style={{ color: 'var(--text-primary)' }}>şifrəni</strong> daxil edin.</>,
              <><strong style={{ color: 'var(--text-primary)' }}>"Daxil Ol"</strong> düyməsinə basın.</>,
            ]}
          />
          <Callout label="Vacib">
            <p>E-poçt və şifrəni sizə biz təqdim edirik. Şifrəni <strong style={{ color: 'var(--text-primary)' }}>təhlükəsiz yerdə</strong> (parol menecerində və ya şəxsi qeydlərinizdə) saxlayın.</p>
            <p>Şifrəni unutmusunuzsa — hazırda portalda özünüz sıfırlaya bilməzsiniz. <strong style={{ color: 'var(--text-primary)' }}>Bizə yazın</strong>, yenisini təyin edək.</p>
          </Callout>
          <Callout label="Məsləhət">
            <p>Girişi rahatlaşdırmaq üçün <code>ourneweye.com/portal</code> səhifəsini brauzerin əlfəcinlərinə (bookmark) əlavə edin.</p>
          </Callout>
        </Section>

        <Section id="icmal" num="02" title="İcmal — əsas səhifə">
          <p className="mb-3">Daxil olduqdan sonra ilk açılan səhifə <strong style={{ color: 'var(--text-primary)' }}>"İcmal"</strong>dır. Burada qısa mənzərəni görürsünüz:</p>
          <ul className="list-disc list-inside space-y-2 mb-3">
            <li><strong style={{ color: 'var(--text-primary)' }}>Növbəti ödəniş</strong> — növbəti ödənişin tarixi və məbləği (əgər təyin olunubsa).</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Son fəaliyyət</strong> — sizə göndərilmiş ən son materiallara qısa baxış.</li>
          </ul>
          <p>Sol tərəfdəki menyudan (telefonda — yuxarıdakı menyu ikonundan) bütün bölmələrə keçə bilərsiniz: <strong style={{ color: 'var(--text-primary)' }}>İcmal</strong>, <strong style={{ color: 'var(--text-primary)' }}>Çatdırılmalar</strong>, <strong style={{ color: 'var(--text-primary)' }}>Ödənişlər</strong>, <strong style={{ color: 'var(--text-primary)' }}>Dəstək</strong>.</p>
        </Section>

        <Section id="catdirilmalar" num="03" title="Çatdırılmalar — materialların idarəsi">
          <p className="mb-3">Bu, portalın <strong style={{ color: 'var(--text-primary)' }}>əsas bölməsidir</strong>. Sizin üçün hazırladığımız bütün materiallar — postlar, reels/video, dizaynlar — burada toplanır.</p>

          <h3 className="text-lg font-semibold mt-6 mb-2" style={{ color: 'var(--text-primary)' }}>Necə görünür</h3>
          <ul className="list-disc list-inside space-y-2 mb-3">
            <li>Materiallar <strong style={{ color: 'var(--text-primary)' }}>şəbəkə (grid) şəklində</strong>, kiçik önizləmə şəkilləri ilə düzülür — Instagram lentinə bənzər.</li>
            <li>Hər material <strong style={{ color: 'var(--text-primary)' }}>ay üzrə</strong> qruplaşdırılır (məsələn "Avqust 2026").</li>
            <li>Aşağı sürüşdürdükcə köhnə materiallar avtomatik yüklənir — səhifələmək lazım deyil.</li>
            <li>Hər elementin üzərində <strong style={{ color: 'var(--text-primary)' }}>status nişanı</strong> var: <Pill tone="ok">Hazırdır</Pill> və ya <Pill tone="wait">Hazırlanır</Pill>.</li>
          </ul>

          <h3 className="text-lg font-semibold mt-6 mb-2" style={{ color: 'var(--text-primary)' }}>Bir materialın içində nə var</h3>
          <p className="mb-3">Şəbəkədə istənilən elementə <strong style={{ color: 'var(--text-primary)' }}>klikləyin</strong> — tam ekran pəncərə açılır. Bir "çatdırılma" bir və ya bir neçə fayldan ibarət ola bilər (məsələn: bir video + bir neçə şəkil). Fayllar arasında <strong style={{ color: 'var(--text-primary)' }}>ox düymələri</strong> ilə keçirsiniz.</p>

          <div className="rounded-2xl p-5 my-5" style={{ backgroundColor: 'var(--card-bg)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--card-border)' }}>
            <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Bu pəncərədə edə biləcəkləriniz</h3>
            <Table
              rows={[
                ['Baxmaq', 'Video avtomatik oynayır (öz idarə düymələri ilə — pauza, səs, tam ekran). Şəkil böyük ölçüdə görünür.'],
                ['Endirmək', <>
                  <strong style={{ color: 'var(--text-primary)' }}>Endirmə ikonu</strong> (↓) — faylın{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>orijinal, tam keyfiyyətli</strong> nüsxəsini kompüterinizə/telefonunuza yükləyir.
                  Portalda gördüyünüz önizləmə sıxılmış versiyadır; endirdiyiniz fayl tam keyfiyyətdədir.
                </>],
                ['Rəy yazmaq', <>
                  <strong style={{ color: 'var(--text-primary)' }}>Şərh sahəsi</strong> — materialla bağlı fikirlərinizi, düzəliş istəklərinizi yazıb göndərirsiniz.
                  Biz bunu görürük. (Ətraflı: Bölmə 05.)
                </>],
              ]}
            />
          </div>

          <Callout label="Vacib">
            <p>Pəncərəni bağlamaq üçün kənara klikləyin və ya <strong style={{ color: 'var(--text-primary)' }}>×</strong> düyməsinə basın. Telefonda şərhləri açmaq üçün aşağıdakı <strong style={{ color: 'var(--text-primary)' }}>"Rəy yaz…"</strong> sətrinə toxunun.</p>
          </Callout>
        </Section>

        <Section id="baxis" num="04" title="Materiala baxmaq və endirmək">
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Videolara baxmaq</h3>
          <Steps
            items={[
              <>Çatdırılmalar şəbəkəsində video elementinə klikləyin.</>,
              <>Video pəncərədə açılıb oynamağa başlayır. Aşağıdakı zolaqdan <strong style={{ color: 'var(--text-primary)' }}>irəli/geri sarıya</strong>, səsi tənzimləyə, <strong style={{ color: 'var(--text-primary)' }}>tam ekrana</strong> keçə bilərsiniz.</>,
              <>Bir neçə fayl varsa — <strong style={{ color: 'var(--text-primary)' }}>sağ/sol ox</strong> ilə növbəti fayla keçin.</>,
            ]}
          />
          <h3 className="text-lg font-semibold mt-6 mb-2" style={{ color: 'var(--text-primary)' }}>Faylı endirmək</h3>
          <Steps
            items={[
              <>Materialı açın.</>,
              <>Endirmək istədiyiniz fayla keçin (bir neçə varsa).</>,
              <><strong style={{ color: 'var(--text-primary)' }}>Endirmə ikonuna</strong> (↓) basın. Fayl cihazınızın "Yükləmələr" qovluğuna enir.</>,
            ]}
          />
          <Callout label="Bilməli olduğunuz">
            <p><strong style={{ color: 'var(--text-primary)' }}>Önizləmə ≠ endirilən fayl.</strong> Portalda sürətli baxış üçün sıxılmış (məs. 720p) versiya oynadılır. <strong style={{ color: 'var(--text-primary)' }}>Endirdiyiniz fayl həmişə orijinal, tam keyfiyyətlidir</strong> — sosial şəbəkəyə yükləmək və ya arxivləmək üçün onu istifadə edin.</p>
          </Callout>
          <Callout label="Məsləhət">
            <p>Böyük video faylları yüklənərkən bir neçə saniyə çəkə bilər — internet sürətinizdən asılıdır. Səbirli olun, pəncərəni bağlamayın.</p>
          </Callout>
        </Section>

        <Section id="rey" num="05" title="Rəy və düzəliş istəkləri">
          <p className="mb-3">Hər materialın öz <strong style={{ color: 'var(--text-primary)' }}>şərh sahəsi</strong> var. Bura yazdıqlarınızı komandamız görür — düzəliş istəmək, təsdiq vermək və ya qeyd əlavə etmək üçün ən rahat yoldur.</p>
          <Steps
            items={[
              <>Materialı açın.</>,
              <>
                Şərh sahəsinə (kompüterdə sağda, telefonda aşağıda "Rəy yaz…") fikrinizi yazın.
                <br />
                <em>Nümunə: "Loqonu bir az böyüdün", "3-cü saniyədəki mətn düzdür, təsdiqləyirəm".</em>
              </>,
              <><strong style={{ color: 'var(--text-primary)' }}>Göndər</strong> (kağız təyyarə ikonu) düyməsinə basın və ya Enter.</>,
            ]}
          />
          <Callout label="Vacib">
            <p>Rəyiniz həmin materiala <strong style={{ color: 'var(--text-primary)' }}>bağlı</strong> qalır — hansı posta/videoya aid olduğunu ayrıca izah etməyə ehtiyac yoxdur.</p>
            <p>Təcili və ya ümumi məsələlər üçün <strong style={{ color: 'var(--text-primary)' }}>Dəstək</strong> bölməsindən müraciət açın (Bölmə 08).</p>
          </Callout>
        </Section>

        <Section id="status" num="06" title={'Status: "Hazırlanır" və "Hazırdır"'}>
          <p className="mb-3">Video göndərdiyimiz zaman serverimiz onu veb üçün optimallaşdırır (sürətli oynatma, önizləmə, kadr şəkli). Bu bir neçə saniyədən bir neçə dəqiqəyə qədər çəkə bilər — faylın ölçüsündən asılı.</p>
          <Table
            rows={[
              [<Pill tone="wait">Hazırlanır</Pill>, 'Material yüklənib, amma hələ emal olunur. Bir az gözləyin.'],
              [<Pill tone="ok">Hazırdır</Pill>, 'Emal bitib — baxmaq və endirmək olar.'],
            ]}
          />
          <Callout label="Nə etməli">
            <p>"Hazırlanır" görürsünüzsə — <strong style={{ color: 'var(--text-primary)' }}>səhifəni yeniləyin</strong> (brauzerin yenilə düyməsi) bir-iki dəqiqədən sonra. Status "Hazırdır"a keçəcək.</p>
          </Callout>
        </Section>

        <Section id="odenisler" num="07" title="Ödənişlər və qaimələr">
          <p className="mb-3"><strong style={{ color: 'var(--text-primary)' }}>"Ödənişlər"</strong> bölməsində ödəniş tarixçəniz cədvəl şəklində göstərilir:</p>
          <Table
            rows={[
              ['Tarix', 'Ödənişin qeydə alındığı tarix.'],
              ['Məbləğ', 'Ödənilmiş məbləğ.'],
              ['Növbəti Ödəniş', 'Növbəti ödənişin gözlənilən tarixi (əgər təyin olunubsa).'],
              ['Qeyd', 'Ödənişə aid qısa qeyd (varsa).'],
              ['Qaimə', <><strong style={{ color: 'var(--text-primary)' }}>"Yüklə"</strong> düyməsi — həmin ödənişin qaiməsini (PDF) endirir.</>],
            ]}
          />
          <Callout label="Qeyd">
            <p>Ödəniş qeydlərini və qaimələri biz əlavə edirik. Cədvəldə uyğunsuzluq görsəniz — Dəstəkdən yazın.</p>
          </Callout>
        </Section>

        <Section id="destek" num="08" title="Dəstək müraciətləri">
          <p className="mb-3"><strong style={{ color: 'var(--text-primary)' }}>"Dəstək"</strong> bölməsindən bizə birbaşa müraciət göndərə bilərsiniz — sual, problem, ümumi istək.</p>
          <Steps
            items={[
              <>Sol menyudan <strong style={{ color: 'var(--text-primary)' }}>"Dəstək"</strong>i seçin.</>,
              <>
                <strong style={{ color: 'var(--text-primary)' }}>"Yeni Müraciət"</strong> formasında:
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li><strong style={{ color: 'var(--text-primary)' }}>Mövzu</strong> — qısa başlıq (məs. "Sentyabr planı haqqında").</li>
                  <li><strong style={{ color: 'var(--text-primary)' }}>Mesajınız</strong> — məsələni ətraflı yazın.</li>
                </ul>
              </>,
              <><strong style={{ color: 'var(--text-primary)' }}>"Göndər"</strong> düyməsinə basın.</>,
            ]}
          />
          <p className="mb-3">Göndərdiyiniz bütün müraciətlər həmin səhifədə siyahı şəklində qalır — cavab verildikcə orada görəcəksiniz.</p>
          <Callout label="Hansı halda nə istifadə etməli">
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>Konkret bir materiala düzəliş</strong> → həmin materialın şərh sahəsi (Bölmə 05).
              <br />
              <strong style={{ color: 'var(--text-primary)' }}>Ümumi sual / problem / yeni istək</strong> → Dəstək müraciəti.
            </p>
          </Callout>
        </Section>

        <Section id="profil" num="09" title="Profil ayarları">
          <p className="mb-3">Sol menyunun aşağısındakı <strong style={{ color: 'var(--text-primary)' }}>"Profil Ayarları"</strong>ndan portalın sizə görünən hissəsini fərdiləşdirə bilərsiniz:</p>
          <ul className="list-disc list-inside space-y-2 mb-3">
            <li><strong style={{ color: 'var(--text-primary)' }}>Profil şəkli</strong> — şəklin üzərinə klikləyin, yeni şəkil seçin.</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>İstifadəçi adı (@username)</strong> və <strong style={{ color: 'var(--text-primary)' }}>bio</strong> mətni.</li>
            <li>Bəzi göstərici sahələr (izləyici sayı və s.) — istəyə görə.</li>
          </ul>
          <p className="mb-3">Dəyişikliklərdən sonra <strong style={{ color: 'var(--text-primary)' }}>"Yadda saxla"</strong> düyməsinə basın.</p>
          <Callout label="Diqqət" warn>
            <p>Portalda hazırda <strong style={{ color: 'var(--text-primary)' }}>şifrə dəyişmə</strong> funksiyası yoxdur. Şifrənizi dəyişmək və ya sıfırlamaq üçün bizə müraciət edin.</p>
          </Callout>
        </Section>

        <Section id="cixis" num="10" title="Çıxış və təhlükəsizlik">
          <ul className="list-disc list-inside space-y-2">
            <li>İşiniz bitəndə, xüsusən <strong style={{ color: 'var(--text-primary)' }}>ortaq/ictimai kompüterdə</strong> — sol menyunun aşağısındakı <strong style={{ color: 'var(--text-primary)' }}>"Çıxış"</strong> düyməsindən çıxın.</li>
            <li>Öz cihazınızda qalıb — bir müddət təkrar giriş tələb olunmaya bilər; bu normaldır.</li>
            <li>Şifrənizi <strong style={{ color: 'var(--text-primary)' }}>heç kəslə paylaşmayın</strong>. Komandamız heç vaxt şifrənizi soruşmur.</li>
            <li>Portal yalnız <strong style={{ color: 'var(--text-primary)' }}>ourneweye.com</strong> ünvanında işləyir. Başqa ünvanda giriş istənilirsə — daxil etməyin, bizə bildirin.</li>
          </ul>
        </Section>

        <Section id="suallar" num="11" title="Tez-tez verilən suallar">
          <FaqItem q="Şifrəmi unutdum, nə edim?">
            Bizə yazın (e-poçt və ya adi əlaqə kanalınızla). Yeni şifrə təyin edib sizə göndərəcəyik. Portalda özünüz sıfırlaya bilmirsiniz.
          </FaqItem>
          <FaqItem q="Yeni material gələndə bildiriş alırammı?">
            Hazırda avtomatik e-poçt/SMS bildirişi göndərilmir. Yeni materialları görmək üçün portala vaxtaşırı baxın — və ya biz sizə xəbər verəcəyik.
          </FaqItem>
          <FaqItem q='Material "Hazırlanır" statusunda ilişib qalıb?'>
            1–2 dəqiqə gözləyib səhifəni yeniləyin. Böyük videolar daha uzun çəkir. 10 dəqiqədən çox davam edərsə — Dəstəkdən bizə yazın.
          </FaqItem>
          <FaqItem q="Endirdiyim fayl niyə portaldakından fərqli görünür?">
            Fərqli görünmür — sadəcə portalda sürətli baxış üçün sıxılmış önizləmə oynadılır. Endirdiyiniz fayl orijinal, tam keyfiyyətlidir.
          </FaqItem>
          <FaqItem q="Telefondan istifadə edə bilərəmmi?">
            Bəli. Portal telefon və planşetdə tam işləyir. Menyu yuxarıdakı ikondan açılır, şərhlər aşağıdakı "Rəy yaz…" sətrindən.
          </FaqItem>
          <FaqItem q="Rəy yazdım, komanda görürmü?">
            Bəli. Materialın şərh sahəsinə yazdığınız hər şey bizə çatır və həmin materiala bağlı qalır.
          </FaqItem>
          <FaqItem q="Bir neçə nəfər eyni hesaba girə bilərmi?">
            Texniki olaraq mümkündür, amma tövsiyə olunmur. Komandanızdan bir neçə nəfərin ayrıca girişi lazımdırsa — bizə bildirin.
          </FaqItem>
        </Section>
      </motion.div>
    </PageTransition>
  );
};

export default GuidePage;
