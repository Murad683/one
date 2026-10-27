// Ready-made answers for the help assistant. Clicking one of these (or typing
// its exact question) answers instantly without calling the AI.
//
// Keep in sync with GuidePage.tsx: if a workflow changes there, update the
// matching answer here. Answers must stay under ~900 characters because they
// are also sent back to the AI as conversation history.

export interface FaqEntry {
  q: string;
  a: string;
}

const UPLOAD_PENDING: FaqEntry = {
  q: 'Fayl niyə "Gözləmədə" qalıb?',
  a: 'Fayl 2 saatdan çox **Gözləmədə** qalarsa, adətən yükləmə uğursuz olub.\n- Faylı redaktə edin, yeni fayl seçin və yadda saxlayın.\n- Davam edərsə developerlə əlaqə saxlayın.',
};

const REPLACE_BLOCKED: FaqEntry = {
  q: 'Faylı niyə redaktə və ya silə bilmirəm, qələm söndürülüb?',
  a: 'Fayl yüklənərkən və sonra emal olunarkən (1–5 dəqiqə, status **Hazırlanır**) həmin qeydin qələm və silmə düymələri söndürülür, üzərinə gətirəndə səbəb yazılır.\n- Cədvəldə statusun altında "Fayl yüklənir… 43%" və ya "Emal gedir" görünür.\n- Bitib status **Hazırdır** olandan sonra düymələr açılır.\n- Yükləmə gedərkən hesabdan çıxmayın, **Çıxış** basanda panel xəbərdarlıq edir.\n- 2 saatdan çox **Hazırlanır** qalarsa, düymələr yenidən açılır.',
};

export const STAFF_FAQ: FaqEntry[] = [
  {
    q: 'Müştəriyə paketi necə təyin edim?',
    a: 'Müştərilər bölməsində:\n1. Müştərinin sətrindəki **paket** ikonuna klikləyin.\n2. Açılan siyahıdan paketi seçin (ləğv üçün **Paketi sil**).\n3. ✓ ilə təsdiqləyin.\nYeni müştəri yaradanda paketi formda da seçmək olar.',
  },
  {
    q: 'Müştəriyə yeni ödəniş necə əlavə edim?',
    a: 'Müştərilər bölməsində:\n1. Müştərinin sətrindəki **+** ikonuna klikləyin (müştəri əvvəlcədən seçilmiş açılır).\n2. **Məbləği (AZN)** və ödəniş tarixini yazın. Növbəti ödəniş tarixi avtomatik bir ay sonraya təyin olunur, istəsəniz dəyişin.\n3. İstəyə görə qaimə (yalnız PDF) və daxili admin qeydi əlavə edin.\n4. Formu saxlayın.',
  },
  {
    q: 'Portfolio-ya video necə yükləyim?',
    a: 'Portfolio (və ya Paketlər) bölməsində layihəni açıb **Showcase Video** sahəsinə MP4/MOV seçin və **Yadda Saxla** basın.\n- Mətn məlumatları dərhal saxlanır və pəncərə bağlanır, video arxa planda yüklənir.\n- Küncdəki faiz göstəricisi bütün panel boyunca davam edir.\n- Emal bitənə qədər səhifəni bağlamayın və ya yeniləməyin.',
  },
  {
    q: 'Müştəri üçün fayl necə yükləyirəm?',
    a: 'Layihə Faylları bölməsində **Yeni Fayl** düyməsi:\n1. Başlıq, Müştəri, Növ və Tarixi doldurun (hamısı məcburidir).\n2. Faylları seçin (bir neçə ola bilər). Video kateqoriyasında kover şəkli də seçmək olar.\n3. Saxlayın, fayllar arxa planda yüklənir.\nEyni anda ən çox 3 yükləmə ola bilər, hər birinin öz faiz kartı var.\n**Vacib:** başqa səhifəyə keçə bilərsiniz, amma yükləmə bitənə qədər tabı bağlamayın və yeniləməyin.',
  },
  {
    q: 'Ayarlarda dəyişiklik niyə yadda qalmadı?',
    a: 'Hər kartın (Hero, Marquee, Haqqımızda, Statistikalar və s.) öz **Yadda Saxla** düyməsi var. Bir kartı dəyişib başqa taba keçsəniz, saxlamadığınız dəyişikliklər itir.\nHər kartı redaktədən dərhal sonra öz düyməsi ilə saxlayın.',
  },
  {
    q: 'Paketi "Ən Populyar" etdim, köhnəsi niyə görünür?',
    a: 'Sistem bunu avtomatik etmir. Yeni paketi **Ən Populyar** etsəniz, köhnəsini əl ilə tapıb söndürməlisiniz, əks halda bir neçə paket eyni vaxtda "Ən Populyar" görünə bilər.',
  },
  {
    q: 'Müştərinin şifrəsini necə dəyişim?',
    a: 'Müştərilər bölməsində müştərini redaktə edin və **Şifrə** sahəsinə yeni şifrə yazın (min. 8 simvol).\nSahəni boş buraxsanız köhnə şifrə dəyişmir.',
  },
  {
    q: 'Yeni creator (videoqraf) hesabı necə yaradım?',
    a: 'Bunu yalnız **Super Admin** edə bilər: Komanda → **Yeni Üzv** → Rol: **Creator**, sonra Ad Soyad, E-poçt və Şifrə (min. 8 simvol).\nCreator yalnız Layihə Faylları bölməsini görür və yalnız öz yüklədiyi faylları idarə edir. Girişi bağlamaq üçün hesabı Komanda səhifəsindən silin.',
  },
  {
    q: 'Müştəriyə Sorğular və ya Mesajlardan cavab yaza bilərəmmi?',
    a: 'Xeyr. Sorğular və Mesajlar bölmələri yalnız oxumaq və status dəyişmək üçündür, cavab yazmaq olmur.\nMüştəri ilə e-poçt və ya başqa kanaldan əlaqə saxlayın.',
  },
  UPLOAD_PENDING,
  REPLACE_BLOCKED,
];

export const CREATOR_FAQ: FaqEntry[] = [
  {
    q: 'Müştəri üçün fayl necə yükləyirəm?',
    a: 'Layihə Faylları səhifəsində **Fayl Əlavə Et** düyməsi:\n1. Başlıq, Müştəri, Növ və Tarixi doldurun (hamısı məcburidir).\n2. Faylları seçin (bir neçə ola bilər). Video kateqoriyasında kover şəkli də seçmək olar.\n3. Saxlayın, fayllar arxa planda yüklənir.\nEyni anda ən çox 3 yükləmə ola bilər, hər birinin öz faiz kartı var.\n**Vacib:** başqa səhifəyə keçə bilərsiniz, amma yükləmə bitənə qədər tabı bağlamayın və yeniləməyin.',
  },
  {
    q: 'Müştərinin rəyini harada görürəm?',
    a: 'Müştəri sizin yüklədiyiniz fayla rəy yazanda, faylın yanında mavi **Rəy** çipi görünür. Üzərinə klikləyəndə müştərinin yazdığı mətn açılır.',
  },
  UPLOAD_PENDING,
  REPLACE_BLOCKED,
  {
    q: 'Yüklədiyim faylı necə dəyişim və ya silim?',
    a: 'Cədvəldə öz faylınızı redaktə edə (yeni fayl, başlıq, müştəri, növ, tarix) və silə bilərsiniz.\n- Silmə təsdiq pəncərəsi ilə olur və geri qaytarılmır.\n- Statusu əl ilə dəyişmək olmur, yükləmədən sonra avtomatik dəyişir.',
  },
  {
    q: 'Başqasının yüklədiyi faylı niyə görmürəm?',
    a: 'Creator rolunda siyahıda yalnız özünüzün yüklədiyiniz fayllar görünür. Başqa creator-ın və ya adminin faylına baxa, dəyişə və ya silə bilməzsiniz.',
  },
  {
    q: 'Müştərinin paylaşım linkini necə yeniləyim?',
    a: 'Müştərini seçdikdən sonra paylaşım linkini yarada, yeniləyə və ləğv edə bilərsiniz.\nLinki yeniləmək və ya ləğv etmək köhnə linki dərhal işləməz edir, ona görə sistem əvvəl təsdiq soruşur.',
  },
];

const normalize = (s: string): string =>
  s
    .toLocaleLowerCase('az')
    .replace(/["'?!.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export const findFaqAnswer = (faq: FaqEntry[], text: string): string | null => {
  const wanted = normalize(text);
  const hit = faq.find((e) => normalize(e.q) === wanted);
  return hit ? hit.a : null;
};
