// Plain-text knowledge base for the admin-panel help assistant.
//
// This is a condensed copy of admin/src/pages/GuidePage.tsx (the user guide).
// Keep the two in sync: when roles, menus or workflows change in the admin
// panel, update GuidePage.tsx AND this file.

export const ASSISTANT_KNOWLEDGE = `
=== GİRİŞ, ROLLAR VƏ MENYU ===
Admin panelə /login ünvanından e-poçt və şifrə ilə daxil olunur. Yalnız rolu ADMIN, SUPER_ADMIN və ya CREATOR olan hesablar buraxılır. Müştəri (portal) hesabı ilə daxil olmaq olmur.
Üç rol var:
- Admin: gündəlik iş üçün bütün əməliyyat bölmələrinə (Portfolio, Xidmətlər, Paketlər, Müştərilər, Layihə Faylları, Sorğular, Mesajlar, Ayarlar) tam giriş.
- Super Admin: Admin-in hər şeyi + yalnız ona görünən "Komanda" bölməsindən yeni admin və creator hesabları yaradır və silir.
- Creator (videoqraf): məhdud rol. Yalnız "Layihə Faylları" bölməsini görür və müştərilərə fayl yükləyir. Ödənişlərə, müştəri e-poçtlarına, mesajlara, ayarlara girişi yoxdur.
Sol menyu (mobil cihazda yuxarı sağdakı menyu ikonundan açılır) bütün bölmələrə keçid verir. Günəş/ay ikonu ilə tünd/açıq rejim seçilir. Menyunun aşağısında "Çıxış" düyməsi var. "Mesajlar" yanındakı qırmızı rəqəm oxunmamış sayt mesajlarının sayıdır.
Sağ aşağıdakı kiçik robot ("Kömək") düyməsi (yarı şəffafdır, üzərinə gələndə tam görünür) bu köməkçi çat pəncərəsini açır (sən də odursan). Tez-tez verilən suallar hazır düymələr kimi göstərilir və cavabı dərhal verir; digər suallara (sənin kimi) süni intellekt cavab verir. Köməkçi yalnız izah edir, panelə heç bir əməliyyat icra etmir. Söhbət yalnız brauzerdə qalır. Sual limiti: dəqiqədə 6, gündə 100.

=== İDARƏETMƏ PANELİ (DASHBOARD) ===
Giriş səhifəsidir. Yalnız məlumat göstərir: 4 kart (Ümumi Layihələr, Aktiv Xidmətlər, Ümumi Müştərilər, Oxunmamış Mesajlar) və "Son Mesajlar" cədvəli. Cədvəldəki mesaja klikləmək heç nə etmir, mesajla işləmək üçün Mesajlar bölməsinə keçmək lazımdır.

=== PORTFOLIO (LAYİHƏLƏR) ===
Saytda "Portfolio" kimi göstərilən iş nümunələrini idarə edir. Müştərilərin faylları olan "Layihə Faylları" ilə eyni şey deyil.
Kateqoriyalar (səhifənin yuxarısında çiplər): yeni kateqoriya üçün ad yazıb "Əlavə Et"; redaktə üçün qələm ikonu; silmək üçün X ikonu. Kateqoriya silinəndə ona aid layihələr silinmir, kateqoriyasız qalır.
Layihələr cədvəlində "Seçilmiş" (ana səhifədə göstərilsin) və "Dərc edilib" açar-düymələri var, dəyişiklik dərhal tətbiq olunur, ayrıca saxlamaq lazım deyil.
"Yeni Layihə" pəncərəsi: Başlıq (məcburi), Kateqoriya (məcburi deyil), Şəkil (JPEG/PNG/WEBP; redaktədə yeni seçilməsə köhnə qalır), YouTube ID/link (köhnə üsul), Canlı layihə linki, Showcase Video (MP4/MOV), Təsvir (məcburi), İl, "Dərc edilsin" və "Ana səhifədə göstərilsin".
Video yükləmə: "Yadda Saxla" basılanda mətn məlumatları dərhal saxlanır və pəncərə bağlanır, video arxa planda yüklənir. Küncdə üzən irəliləyiş göstəricisi (progress pill) faizi göstərir və bütün panel boyunca davam edir. Emal bitənə qədər səhifəni bağlamamaq və ya yeniləməmək lazımdır, brauzer xəbərdarlıq edir. Mövcud videonu "Videonu sil" düyməsi ilə silmək olar.
Layihəni silmək: zibil qutusu ikonu, təsdiqdən sonra həmişəlik silinir.

=== XİDMƏTLƏR ===
Saytdakı xidmət kartlarını (ikon, başlıq, təsvir) idarə edir. İkon: 15 hazır ikondan biri. Başlıq və Təsvir məcburidir. Sıra: kiçikdən böyüyə göstərilmə ardıcıllığı. Aktiv: açar-düymə, cədvəldə də dərhal dəyişir. Fayl yükləmək lazım deyil. Silmək: zibil qutusu, həmişəlik.

=== PAKETLƏR ===
Qiymət/plan paketlərini idarə edir. Ad, Təsvir, Qiymət (sərbəst mətn, məsələn "200 AZN-dən"), Üstünlüklər (siyahı, "Əlavə Et" ilə sətir, X ilə silinir, boş sətirlər saxlanmır), Showcase Video (Portfolio ilə eyni yükləmə sistemi), "Ən Populyar" işarəsi, Aktiv.
Vacib: yalnız bir paket "Ən Populyar" olmalıdır, amma sistem bunu avtomatik təmin etmir. Yeni paketi "Ən Populyar" etsəniz köhnəsini əl ilə söndürmək lazımdır. "Planı Seç" düyməsinin mətni və linki panel içindən dəyişdirilə bilmir (kodda sabitdir).

=== KOMANDAMIZ (İCTİMAİ) ===
Saytın "Haqqımızda" səhifəsindəki komanda üzvləri kartlarını idarə edir. Panelin öz hesabları olan "Komanda" bölməsi ilə qarışdırmaq olmaz. Sahələr: Avatar (JPEG/PNG/WEBP), Ad Soyad və Vəzifə (məcburi), Sıra, Aktiv.

=== MÜŞTƏRİLƏR VƏ ÖDƏNİŞLƏR ===
Müştəri portalına daxil olan hesabları (rol CLIENT), onların paketini və ödənişlərini idarə edir.
Paket təyin etmək: sətirdəki "paket" ikonuna klikləyin, açılan siyahıdan paketi seçin (və ya "Paketi sil"), sonra ✓ ilə təsdiqləyin.
Yeni müştəri: Ad Soyad və E-poçt məcburi. Şifrə yeni müştəri üçün məcburidir (min. 8 simvol); redaktədə boş buraxılsa köhnə şifrə dəyişmir. Paket yalnız yeni müştəri yaradanda burada seçilir.
Müştəri şifrəsini dəyişmək: müştərini redaktə edin və Şifrə sahəsinə yeni şifrə yazın.
Ödəniş əlavə etmək: sətirdəki "+" ikonu /payments/new səhifəsinə aparır (müştəri əvvəlcədən seçilir). Sahələr: Müştəri, Məbləğ (AZN, məcburi), Ödəniş tarixi (dəyişəndə növbəti ödəniş tarixi avtomatik bir ay sonraya təyin olunur, əl ilə dəyişmək olar), Qaimə (yalnız PDF), Admin qeydi (daxili, müştəriyə göstərilmir).
Ödəniş tarixçəsi: cədvəldəki ödəniş sayı rəqəminə klikləyin; bütün ödənişlər açılır, hər sətirdə silmək düyməsi var.
Müştərini silmək geri qaytarıla bilməz: hesab, ona bağlı məlumatlar və onun BÜTÜN videoları və faylları (Layihə Faylları, 720p nüsxələr, kover şəkilləri) yaddaşdan həmişəlik silinir. Silməzdən əvvəl lazımi faylları endirmək tövsiyə olunur.

=== LAYİHƏ FAYLLARI (DELİVERABLES) ===
Müştərilərə aylıq təhvil verilən foto/video fayllarını idarə edir. İki tab: "Layihə Faylları" və "Önə Çıxanlar (Highlights)".
Növ (kateqoriya) idarəsi: çip siyahısı; yeni növ yaradanda "Video kateqoriyasıdır?" qutusu var. Bu seçim yalnız yaradılış anında təyin olunur, sonradan ad dəyişmək olar, video/foto tipini dəyişmək olmaz.
Fayllar cədvəli: axtarış müştəri adı, e-poçt və fayl başlığı üzrə işləyir (creator e-poçtla axtara bilmir). Filtr: Müştəri, Növ, Status və Əlavə olunub başlıqlarındakı kiçik huni ikonuna basıb seçilir (aktiv olanda mavi olur); Status hunisində "Gözləmədə qalıb", "Müştəri rəyi var" və "Saxlama müddəti" (Silinəcək, Müştəridən gizlədilib, Faylı silinib) da var, Əlavə olunub hunisində tarix aralığı və Bu gün, Son 7 gün, Bu ay düymələri. Aktiv filtrlər cədvəlin üstündə çip kimi görünür, ✕ ilə tək-tək, "Hamısını təmizlə" ilə hamısı silinir. Sıralama: istənilən sütun başlığına (Müştəri, Başlıq, Növ, Status, Əlavə olunub) basmaq kifayətdir; ikinci basış istiqaməti dəyişir, aktiv sütunda ox görünür; defolt Əlavə olunub üzrə yeni əvvəldir. Telefonda başlıqlar gizli olduğu üçün axtarışın yanındakı "Filtr / Sırala" düyməsi eyni seçimləri açır. Cədvəl səhifələnir: defolt 50 sətir; cədvəlin altında "Səhifədə" seçimi (50/100/150/200) və Əvvəlki/Növbəti düymələri var. "Əlavə olunub" faylın sistemə əlavə olunduğu gündür (cədvəldə iş ayı göstərilmir, amma yükləmə formasında "Ay" və "İl" seçilir və müştəri portalında görünür). Emal müddətini (Emal: 3 dəq 10 san) görmək üçün Status nişanının üzərinə gətirin. Status 5 cür: Gözləmədə, Hazırlanır, Hazırdır, Xəta, Arxivlənib. Fayl 2 saatdan çox "Gözləmədə" qalarsa sətir qırmızı olur və "Gözləmədə qalıb" çipi görünür: bu, adətən yükləmənin uğursuz olduğunu göstərir. Müştəri rəy yazıbsa mavi "Rəy" çipi görünür, klikləyəndə rəy açılır.
Videoların saxlanma müddəti (60 gün): video ilk dəfə "Hazırdır" olandan (müştəri portalında göründüyü andan) 60 gün sonra müştəridən gizlənir, daha 7 gün sonra (67-ci gün) faylları (video, 720p önizləmə, kover) serverdən birdəfəlik silinir. Faylı əvəz etmək müddəti uzatmır. Şəkil və dizayn faylları silinmir. Statusun altında: "X gün sonra silinəcək", sonra "Müştəridən gizlədilib · fayllar X gün sonra silinir", sonda sətir solğun olur və "Fayl silinib (tarix)" yazılır, belə sətirlər siyahının sonundadır, ayrıca tapmaq üçün Status hunisindəki "Saxlama müddəti" seçimindən istifadə edilir. Qeydin özü (başlıq, müştəri, rəy) qalır. Gizlədilmiş və ya faylları silinmiş videoya yeni fayl yükləmək olmur, lazımdırsa Yeni Fayl ilə yeni qeyd yaradılır. Gizlədilmiş video 7 gün ərzində admin paneldə hələ endirilə bilər. Silinmiş fayllar geri qaytarılmır. Müştəri portalında hər videonun üstündə qalan gün sayı görünür. Müştəriyə mail xəbərdarlığı gedir: video silinməzdən (müştəri üçün əlçatmaz olmazdan) 3 gün əvvəl, hər video üçün bir mail. Silinmə vaxtları bir-birinə 5 gün yaxın olan videolar mail sayını azaltmaq üçün bir mailə yığılır (maildə hər videonun öz tarixi və saatı yazılır), gündə ən çox bir mail, Bakı vaxtı ilə 10:00-20:00 arası. Müştərinin e-poçtu @ourneweye.com olarsa və ya real deyilsə mail getmir: Müştərilər siyahısında e-poçtun altında "Real e-poçt deyil, xəbərdarlıq getməyəcək", Layihə Faylları siyahısında isə gizlənməsinə 14 gün qalan videoda "Müştərinin real e-poçtu yoxdur" yazılır. Real e-poçt yazılan kimi müştəriyə bir dəfə "ONE Agency ailəsinə xoş gəlmisiniz" maili gedir (portalın bölmələri, giriş və 60 günlük qayda barədə). Mail çatmayanda e-poçtun altında qırmızı "Mail çatmadı" yazılır, e-poçtu düzəldəndə silinir. Müştərinin e-poçtunu Müştərilər bölməsində redaktə edin (şifrə xanasını boş buraxın, köhnə şifrə qalır), müştərini silməyin: silmək bütün fayllarını silir. E-poçt kiçik hərflə saxlanır, girişdə hərf böyüklüyü fərq etmir, eyni e-poçt başqa hesabda olarsa saxlanmır.
"Yeni Fayl" pəncərəsi: Başlıq, Müştəri, Növ, Tarix hamısı məcburidir (tarix ay/il-ə çevrilir). Fayllar: bir neçə fayl seçmək olar. Kover şəkli yalnız video kateqoriyasında görünür; yüklənməsə sistem videodan avtomatik kadr çəkir.
Yükləmə: mətn saxlanandan sonra pəncərə bağlanır, fayllar arxa planda yüklənir, sağ alt küncdə irəliləyiş göstəricisi görünür. Eyni anda ən çox 3 yükləmə göndərmək olar: hər birinin öz kartı və faizi var, biri bitəndə yalnız öz kartı bağlanır; 4-cü üçün əvvəlkilərdən birinin bitməsini gözləmək lazımdır. 50 MB-dan böyük videolar birbaşa yaddaşa (S3), 20 MB-dan böyüklər hissə-hissə (multipart) yüklənir; şəbəkə kəsilsə avtomatik təkrar cəhd edir. Yükləmə davam edərkən panelin başqa səhifələrinə keçmək olar, göstərici küncdə qalır. Amma brauzer tabını bağlamaq və ya yeniləmək (F5) yükləməni dayandırır. Fayl yüklənəndən sonra status "Hazırlanır" olur (emal 1–5 dəqiqə); bu müddətdə həmin faylı əvəz etmək olmur (qələm və silmə düymələri söndürülür, cədvəldə statusun altında "Fayl yüklənir… N%" və ya "Emal gedir" görünür), emal bitəndən sonra əvəz edin. Yükləmə gedərkən "Çıxış" düyməsi basılsa panel əvvəlcə xəbərdarlıq edir.
Fayla baxmaq: cədvəldə başlığa klikləyin, tam ekran önizləmə açılır; birdən çox fayl varsa aşağıdakı zolaqla keçid edilir; "Yüklə" orijinalı endirir; bağlamaq üçün × və ya Esc.
Önə Çıxanlar (Instagram Highlights): müştəri seçdikdən sonra onun portalındakı dairəvi ikonlar idarə olunur. Hər müştəri üçün maksimum 20. Yeni highlight: şəkil seçin + başlıq (maks. 30 simvol) → "Siyahıya Əlavə Et". Bu düymə faylı yükləmir, yalnız siyahıya əlavə edir. Faktiki yükləmə və saxlama səhifənin "Yadda Saxla" düyməsi ilə olur; basmasanız dəyişikliklər itir.
Faylı əvəz etmək: redaktə pəncərəsində "Faylı əvəz et" sahəsindən yeni fayl seçib saxlayanda, yeni fayl hazır olan kimi köhnə fayl, onun 720p nüsxəsi və köhnə kover yaddaşdan silinir. Yeni kover yüklənməsə, yeni videodan avtomatik kover yaradılır. Emal uğursuz olsa köhnə fayl toxunulmaz qalır.
Silmək (fayl və ya növ) təsdiq pəncərəsi ilə, faylın bütün nüsxələri və koveri ilə birlikdə həmişəlik silinir. Təsdiqdən sonra düymələr söndürülür və fırlanan işarə görünür; təkrar basmaq lazım deyil.
Creator üçün görünüş: yalnız bu səhifəni görür. İstənilən müştəri üçün "Fayl Əlavə Et" ilə fayl yükləyə bilər (müştərinin yalnız adı görünür, e-poçt yox). Siyahıda yalnız özünün yüklədiyi fayllar görünür; başqasının faylına baxa, dəyişə, silə bilməz. Öz fayllarını redaktə edə (yeni fayl, başlıq, müştəri, növ, tarix) və silə bilər. Statusu əl ilə dəyişə bilməz, status yükləmədən sonra avtomatik dəyişir. Müştəri rəy yazanda öz faylının yanında "Rəy" işarəsini görür. Önə Çıxanlar və müştərinin paylaşım linki ilə də işləyə bilər; linki yeniləmək və ya ləğv etmək köhnə linki dərhal işləməz edir, ona görə sistem əvvəl təsdiq soruşur. Növ (kateqoriya) yarada, adını dəyişə və silə bilməz. Creator-ın yüklədiyi fayl üçün admin təsdiqi tələb olunmur, emal bitən kimi müştərinin portalında görünür.

=== SORĞULAR (TİCKETS) ===
Müştəri portalından gələn dəstək müraciətləri. Status sətirdə birbaşa dəyişir (Açıq / İcrada / Bağlı), dərhal tətbiq olunur. Göz ikonu tam mətni açır. Axtarış müştəri, e-poçt, mövzu və ya mesaj üzrə; açılan siyahı status üzrə süzür. Zibil qutusu sorğunu yalnız admin siyahısından gizlədir, müştəri onu öz kabinetində görməyə davam edir.
Bu bölmədən müştəriyə cavab yazmaq mümkün deyil. Cavab üçün müştəri ilə e-poçt və ya başqa kanaldan əlaqə saxlamaq lazımdır.

=== MESAJLAR (İNBOX) ===
Saytın "Əlaqə" formasından gələn mesajlar (portal sorğularından fərqlidir). Axtarış ad, e-poçt, şirkət, xidmət və ya mesaj mətni üzrə. Göz ikonu ilə açılan mesaj avtomatik "oxunub" olur və menyudakı qırmızı say azalır. Zibil qutusu ilə mesaj həmişəlik silinir. Bu bölmədən də müştəriyə birbaşa cavab yazmaq olmur.

=== KOMANDA (ADMİN İDARƏETMƏSİ) ===
Yalnız Super Admin-ə görünür. Panelə daxil ola bilən hesabları (Admin, Super Admin, Creator) idarə edir.
"Yeni Üzv": Rol (Admin və ya Creator), Ad Soyad, E-poçt, Şifrə (min. 8 simvol). Bu formadan Super Admin yaratmaq olmaz. Cədvəldə rol rəngli etiketlə göstərilir.
Silmək: Super Admin hesabları və özünüzü silə bilməzsiniz. Admin və Creator silinə bilər. Creator silinəndə onun yüklədiyi fayllar silinmir, müştərilər onları görməyə davam edir.
Mövcud üzvün adını, e-poçtunu və ya şifrəsini bu bölmədən dəyişmək mümkün deyil.
Təhlükəsizlik: adi Admin yalnız müştəri hesablarını dəyişə və silə bilər; digər Admin, Creator və Super Admin hesablarına toxuna bilməz.
Yeni Super Admin panel daxilindən yaradıla bilməz, bu rolu yalnız developer verə bilər.
Videoqrafa admin hüququ vermədən yükləmə icazəsi: Komanda → "Yeni Üzv" → Rol: Creator. Girişi bağlamaq üçün hesabı Komanda səhifəsindən silin.

=== VEB-SAYT AYARLARI ===
Saytın statik məzmununu idarə edir. 4 tab: Ana Səhifə (Hero: başlıq, alt mətn, CTA, hero video/şəkil; axan mətn sözləri), Haqqımızda (giriş mətni, komanda başlığı, 4 statistika, sitat), Əlaqə (e-poçt, telefon, ünvan, iş saatları, Google Xəritə linki), Ümumi/Footer (logo, footer bio, sosial linklər; logo seçən kimi avtomatik yüklənir).
Ən vacib qayda: hər kartın öz ayrıca "Yadda Saxla" düyməsi var. Bir kartda dəyişiklik edib başqa taba keçsəniz saxlamadığınız dəyişikliklər itir. Hər kartı redaktədən dərhal sonra saxlayın.

=== TEZ-TEZ VERİLƏN SUALLAR ===
- Video/fayl yüklənir, "Yükləmə davam edir" görürəm: Portfolio, Paketlər və Layihə Faylları yükləmələri bütün panel boyunca davam edir, başqa səhifəyə keçmək olar. Yalnız tabı bağlamayın və yeniləməyin.
- Paketi "Ən Populyar" etdim, köhnəsi niyə hələ görünür: sistem avtomatik söndürmür, köhnəni əl ilə söndürün.
- Ayarlarda dəyişiklik yadda qalmadı: hər kartın öz "Yadda Saxla" düyməsinə basın.
- Müştəri şifrəsi: Müştərilər bölməsində müştərini redaktə edib Şifrə sahəsinə yeni şifrə yazın.
- Status 2 saatdan çox "Gözləmədə": yükləmə uğursuz ola bilər; redaktə → yeni fayl seç → yadda saxla; davam edərsə developerlə əlaqə.
- Faylı əvəz edə bilmirəm, "Hazırlanır": emal gedir (1–5 dəqiqə), bu müddətdə qələm və silmə düymələri söndürülür; status "Hazırdır" olandan sonra əvəz edin və ya silin. 2 saatdan çox "Hazırlanır" qalarsa yenidən yükləmək olar.
- Müştəriyə Sorğular/Mesajlar-dan cavab yazmaq: mümkün deyil, e-poçt və ya başqa kanal.
- Yeni Super Admin: panel daxilindən mümkün deyil, developer verir.
`;
