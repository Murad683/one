import { z } from 'zod';

// A JSON-ish field can arrive either as an already-serialized string
// (the admin panel always sends JSON.stringify(...) today) or as a raw
// object/array (the controller normalizes those via JSON.stringify before
// persisting — see siteSettings.controller.ts updateSettings).
const jsonish = z.union([z.string(), z.record(z.string(), z.any()), z.array(z.any())]);

const text = (max: number) => z.string().max(max).optional().nullable();
// Relative paths (e.g. "/paketler") are valid CTA/link targets in this app,
// so these are NOT restricted to absolute URLs.
const path = (max: number) => z.string().max(max).optional().nullable();
const email = z.union([z.string().email('Invalid email'), z.literal('')]).optional().nullable();

export const updateSiteSettingsSchema = z.object({
  // Hero
  heroBadge: text(200),
  heroHeading1: text(200),
  heroHeading2: text(200),
  heroSubtext: text(1000),
  heroCtaText: text(100),
  heroCtaUrl: path(500),
  heroVideoUrl: text(1000),

  // About
  aboutTopLabel: text(100),
  aboutMainHeading: text(300),
  aboutDescription: text(5000),
  aboutTeamBadge: text(100),
  aboutTeamTitle: text(300),
  aboutQuote: text(1000),
  aboutStats: jsonish.optional(),

  // Contact
  contactTopLabel: text(100),
  contactMainHeading: text(300),
  contactSubtext: text(1000),
  contactInfoTitle: text(300),
  contactAddressLabel: text(100),
  contactPhoneLabel: text(100),
  contactEmailLabel: text(100),
  contactHoursLabel: text(100),
  companyAddress: text(500),
  companyPhone: text(50),
  companyEmail: email,
  companyWorkingHours: text(200),
  googleMapsEmbed: text(2000),

  // Footer
  footerShortText: text(1000),
  footerPagesTitle: text(100),
  footerSocialTitle: text(100),
  socialLinks: jsonish.optional(),
  navbarLogoUrl: text(500),
  footerLogoUrl: text(500),

  // Marquee
  marqueeWords: jsonish.optional(),

  // Packages / Portfolio section headings
  packagesMainHeading: text(300),
  packagesSubtext: text(1000),
  packagesTopLabel: text(100),
  portfolioMainHeading: text(300),
  portfolioTopLabel: text(100),
});
