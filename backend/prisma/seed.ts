import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SALT_ROUNDS = 12;

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function main() {
  console.log('🌱 Starting single-language (Azerbaijani) seed...\n');

  // Clear existing data to avoid conflicts
  console.log('🧹 Cleaning database...');
  await prisma.siteSettings.deleteMany(); console.log('Deleted site settings');
  await prisma.project.deleteMany(); console.log('Deleted projects');
  await prisma.teamMember.deleteMany(); console.log('Deleted team members');
  await prisma.package.deleteMany(); console.log('Deleted packages');
  await prisma.service.deleteMany(); console.log('Deleted services');
  await prisma.category.deleteMany(); console.log('Deleted categories');
  // await prisma.user.deleteMany(); // Keep admin user

  // ─── Admin User ─────────────────────────────────
  const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@bakutech.az';
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Admin123!';
  const hashedAdminPassword = await hashPassword(adminPassword);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: hashedAdminPassword },
    create: {
      email: adminEmail,
      password: hashedAdminPassword,
      name: 'Admin User',
      role: 'SUPER_ADMIN',
    },
  });
  console.log(`✅ Admin: ${admin.email}`);

  // ─── Site Settings ──────────────────────────────
  await prisma.siteSettings.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      // Hero
      heroBadge: "Rəqəmsal İnkişaf Şirkəti",
      heroHeading1: "Brendinizi",
      heroHeading2: "Gələcəyə Daşıyırıq",
      heroSubtext: "Strateji kreativ həllər, premium video istehsalı və rəqəmsal marketinq xidmətləri.",
      heroCtaText: "Xidmətlərimizə Bax →",
      heroCtaUrl: "/paketler",
      
      // Marquee
      marqueeWords: JSON.stringify([
        "REELS", "GRAPHIC DESIGN", "BRAND STRATEGY", "CONTENT CREATION", "ANALYTICS", "COMMUNITY"
      ]),

      // About
      aboutTopLabel: "BİZ KİMİK",
      aboutMainHeading: "Brendləri Quranlara Tərəfdaşıq",
      aboutDescription: "2019-cu ildə qurulan şirkətimiz, Azərbaycandakı ən innovativ brendlərə kreativ xidmətlər göstərməkdə ixtisaslaşmışdır. Biz yalnız görüntü yaratmır, brendlər üçün uzunmüddətli rəqəmsal miras qururuq.\n\nKomandamız video rejissorlar, brend strateglar, veb developerlar və məzmun yaradıcılarından ibarətdir. Hər layihəyə fərdi yanaşaraq ölçülə bilən nəticələr çatdırırıq.",
      aboutQuote: "\"Biz sadəcə xidmət göstərmirik — brendlərin uzunmüddətli uğuruna sərmayə edirik.\"",
      aboutTeamBadge: "KOMANDAMIZ",
      aboutTeamTitle: "Bizimlə Tanış Olun",
      aboutStats: JSON.stringify([
        { value: "320+", label: "Tamamlanan Layihə" },
        { value: "48", label: "Aktiv Müştəri" },
        { value: "5+", label: "İllik Təcrübə" },
        { value: "12", label: "Komanda Üzvü" }
      ]),

      // Contact
      contactTopLabel: "ƏLAQƏ",
      contactMainHeading: "Bizimlə Əlaqə",
      contactSubtext: "Layihənizi müzakirə etmək istəyirsiniz? Biz dinləməyə hazırıq.",
      contactInfoTitle: "Məlumatlar",
      contactAddressLabel: "Ünvan",
      contactPhoneLabel: "Telefon",
      contactEmailLabel: "E-poçt",
      contactHoursLabel: "İş Saatları",
      companyAddress: "Bakı, Neftçilər pr. 14, AZ1000",
      companyPhone: "+994 12 345 67 89",
      companyEmail: "salam@agensi.az",
      companyWorkingHours: "B.e – Cümə: 09:00 – 18:00",
      
      // Sections
      packagesTopLabel: "QİYMƏT PAKETLƏRİ",
      packagesMainHeading: "Sizin üçün doğru plan",
      packagesSubtext: "Hər ölçüdə biznes üçün uyğun paketlər. Şəffaf qiymət, aydın nəticələr.",
      portfolioTopLabel: "PORTFOLİO",
      portfolioMainHeading: "Seçilmiş İşlər",

      // Footer
      footerShortText: "Brendləri gələcəyə daşıyan kreativ rəqəmsal tərəfdaşınız. Video, marketinq və dizayn xidmətləri.",
      footerPagesTitle: "SƏHİFƏLƏR",
      footerSocialTitle: "SOSİAL MEDİA",
      socialLinks: JSON.stringify({
        instagram: "https://instagram.com",
        linkedin: "https://linkedin.com",
        youtube: "https://youtube.com"
      }),
      heroVideoUrl: "/videos/hero-bg.mp4"
    }
  });
  console.log('✅ Site settings seeded');

  // ─── Team Members ──────────────────────────────
  const teamData = [
    { name: 'Elnur Hüseynov', role: 'Kurucu & CEO', avatar: '/uploads/avatar-icon.png' },
    { name: 'Aytən Quliyeva', role: 'Kreativ Direktor', avatar: '/uploads/avatar-icon.png' },
    { name: 'Murad Əliyev',   role: 'Baş Operator',     avatar: '/uploads/avatar-icon.png' },
    { name: 'Günel Nəcəfli',  role: 'Brend Stratejist', avatar: '/uploads/avatar-icon.png' },
    { name: 'Rauf İsmayılov', role: 'Veb Developer',    avatar: '/uploads/avatar-icon.png' },
    { name: 'Leyla Babayeva', role: 'SMM Meneceri',     avatar: '/uploads/avatar-icon.png' },
  ];

  for (const t of teamData) {
    await prisma.teamMember.create({
      data: {
        name: t.name,
        role: t.role,
        avatarUrl: t.avatar,
        isActive: true,
      }
    });
  }
  console.log('✅ Team members seeded');

  // ─── Categories ─────────────────────────────────
  const videoCat = await prisma.category.create({ data: { name: 'Video İstehsalı', slug: 'video' } });
  const brandCat = await prisma.category.create({ data: { name: 'Brend Dizaynı', slug: 'brand' } });
  const smmCat = await prisma.category.create({ data: { name: 'SMM', slug: 'smm' } });

  // ─── Projects ───────────────────────────────────
  const projectData = [
    { title: "Azər Kimya Korporativ Film", cat: videoCat.id },
    { title: "TechAZ Marka Yeniləməsi", cat: brandCat.id },
    { title: "Baku Foods SMM Kampaniyası", cat: smmCat.id },
  ];

  for (const p of projectData) {
    await prisma.project.create({
      data: {
        title: p.title,
        description: "Layihə üçün ətraflı təsvir.",
        thumbnailUrl: "/uploads/portfolio.jpeg",
        categoryId: p.cat,
        isPublished: true,
        isFeatured: true,
      }
    });
  }
  console.log('✅ Projects seeded');

  // ─── Packages ───────────────────────────────────
  const packageData = [
    {
      name: "START",
      price: "299 ₼ / ay",
      description: "Başlanğıc üçün ideal",
      features: ["2 video / ay", "SMM idarəetməsi (3 platform)", "Aylıq hesabat", "5 dizayn asset"],
      popular: false,
      sortOrder: 1
    },
    {
      name: "GROW",
      price: "599 ₼ / ay",
      description: "Böyüməyə hazır bizneslər üçün",
      features: ["5 video / ay", "SMM + Aylıq kampaniya", "Həftəlik analitika", "Brendinq paketi", "Prioritet dəstək"],
      popular: true,
      sortOrder: 2
    },
    {
      name: "PREMIUM",
      price: "1,199 ₼ / ay",
      description: "Böyük brendlər üçün",
      features: ["Limitsiz video", "Tam SMM idarəetməsi", "Hər gün hesabat & izləmə", "Tam brendinq sistemi", "Şəxsi menecer"],
      popular: false,
      sortOrder: 3
    },
    {
      name: "FƏRDİ",
      price: "Fərdi",
      description: "Xüsusi tələblər üçün fərdi həll",
      features: ["Fərdi paket hazırlanması", "Çevik ödəniş şərtləri", "Hər xidməti seçin", "SLA müqaviləsi"],
      popular: false,
      buttonText: "Bizimlə Əlaqə",
      sortOrder: 4
    }
  ];

  for (const pkg of packageData) {
    await prisma.package.create({
      data: {
        name: pkg.name,
        description: pkg.description,
        priceLabel: pkg.price,
        features: pkg.features,
        isPopular: pkg.popular || false,
        buttonText: pkg.buttonText || "Planı Seç",
        sortOrder: pkg.sortOrder,
        isActive: true,
      }
    });
  }
  console.log('✅ Packages seeded');

  // ─── Services ───────────────────────────────────
  const serviceData = [
    { title: "Video İstehsalı", description: "Reklam, korporativ filmlər, sosial media üçün kreativ video məzmun istehsalı." },
    { title: "Rəqəmsal Marketinq", description: "Hədəfli kampaniyalar, SEO, SMM və performans marketinqi xidmətləri." },
    { title: "Brend Dizaynı", description: "Vizual kimlik, logo, brend kitabçası və kreativ dizayn sistemləri." },
    { title: "Veb Tərtibat", description: "Sürətli, müasir və cavabdeh veb saytlar və veb tətbiqlər." },
  ];

  for (const s of serviceData) {
    await prisma.service.create({
      data: {
        title: s.title,
        description: s.description,
        isActive: true,
      }
    });
  }
  console.log('✅ Services seeded');

  console.log('\n🎉 Single-language seed completed successfully!');
}

main()
  .catch((e) => {
    if (e.code) console.error(`❌ Prisma Error [${e.code}]:`, e.message);
    else console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
