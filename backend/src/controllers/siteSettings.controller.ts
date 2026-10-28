import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { getSecureDownloadUrl, processAndStoreFile } from '../services/upload.service';
import { optimizeAndStore } from '../services/image.service';
import { processHeroVideo } from '../services/heroMedia.service';
import { sendSuccess, sendError } from '../utils/response.util';

const signSettingsUrls = async (settings: any) => {
  if (settings.heroVideoUrl) {
    try {
      settings.heroVideoUrl = await getSecureDownloadUrl(settings.heroVideoUrl);
    } catch (e) {
      console.warn('Failed to sign heroVideoUrl', e);
    }
  }
  if (settings.navbarLogoUrl) {
    try {
      settings.navbarLogoUrl = await getSecureDownloadUrl(settings.navbarLogoUrl);
    } catch (e) {
      console.warn('Failed to sign navbarLogoUrl', e);
    }
  }
  if (settings.footerLogoUrl) {
    try {
      settings.footerLogoUrl = await getSecureDownloadUrl(settings.footerLogoUrl);
    } catch (e) {
      console.warn('Failed to sign footerLogoUrl', e);
    }
  }
  return settings;
};

// GET /api/v1/site-settings
export const getSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    let settings = await prisma.siteSettings.findUnique({ where: { id: 'global' } });
    if (!settings) {
      settings = await prisma.siteSettings.create({ data: { id: 'global' } });
    }
    const signedSettings = await signSettingsUrls(settings);
    sendSuccess(res, signedSettings);
  } catch (err) {
    console.error('getSettings error:', err);
    sendError(res, 'Failed to fetch settings', 500);
  }
};

// PATCH /api/v1/site-settings
// Handles partial updates for site settings
export const updateSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = { ...req.body };
    
    // Ensure ID is not being updated
    delete data.id;
    delete data.updatedAt;

    // Handle JSON string fields if they are sent as objects
    if (data.aboutStats && typeof data.aboutStats !== 'string') {
      data.aboutStats = JSON.stringify(data.aboutStats);
    }
    if (data.marqueeWords && typeof data.marqueeWords !== 'string') {
      data.marqueeWords = JSON.stringify(data.marqueeWords);
    }
    if (data.socialLinks && typeof data.socialLinks !== 'string') {
      data.socialLinks = JSON.stringify(data.socialLinks);
    }

    // Filter out empty strings, null, and undefined to prevent overwriting with blank data
    const filteredData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== "" && value !== null && value !== undefined)
    );

    const settings = await prisma.siteSettings.upsert({
      where: { id: 'global' },
      update: filteredData,
      create: { id: 'global', ...data }, // Keep original data for creation
    });
    
    const signedSettings = await signSettingsUrls(settings);
    sendSuccess(res, signedSettings);
  } catch (err) {
    console.error('updateSettings error:', err);
    sendError(res, 'Failed to update settings', 500);
  }
};

// PATCH /api/v1/site-settings/upload
export const uploadSettingsMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      sendError(res, 'No file uploaded', 400);
      return;
    }

    const field = req.query.field as string || 'heroVideoUrl';
    // List of fields that accept media uploads
    const allowedFields = ['heroVideoUrl', 'navbarLogoUrl', 'footerLogoUrl']; 
    if (!allowedFields.includes(field)) {
      sendError(res, 'Invalid field for media upload', 400);
      return;
    }

    const folder = 'site'; // Store site-related assets in a 'site' folder
    // Hero image gets a generous cap; logos are small on-screen and benefit
    // from a higher-quality WebP to keep sharp edges clean. A hero *video*
    // isn't a raster image, so optimizeAndStore passes it through untouched.
    const imageOpts = field === 'heroVideoUrl'
      ? { maxEdge: 2400, quality: 85 }
      : { maxEdge: 800, quality: 90 };

    // A hero video gets faststart + a poster frame so it starts quickly; a hero
    // image (or a logo) just goes through the usual optimization. heroPoster
    // always follows heroVideoUrl: a new image must not keep the old poster.
    let result;
    const extra: { heroPoster?: string | null } = {};
    if (field === 'heroVideoUrl' && req.file.mimetype.startsWith('video/')) {
      const hero = await processHeroVideo(req.file);
      result = await processAndStoreFile(hero.file, folder);
      extra.heroPoster = hero.poster;
    } else {
      result = await optimizeAndStore(req.file, folder, imageOpts);
      if (field === 'heroVideoUrl') extra.heroPoster = null;
    }

    // Store the RELATIVE path (url) in the database, not the absolute storageKey
    const updated = await prisma.siteSettings.upsert({
      where: { id: 'global' },
      update: { [field]: result.url, ...extra },
      create: { id: 'global', [field]: result.url, ...extra },
    });

    const signedSettings = await signSettingsUrls(updated);
    sendSuccess(res, signedSettings);
  } catch (err) {
    console.error('uploadSettingsMedia error:', err);
    sendError(res, 'Failed to upload site media', 500);
  }
};
