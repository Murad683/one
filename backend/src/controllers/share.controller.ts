import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response.util';
import { getSecureDownloadUrl, getSecureDownloadUrlForDownload } from '../services/upload.service';

// ─── GET /api/v1/share/:token ───────────────────
// Public, unauthenticated — read-only view of a client's READY deliverables.
export const getSharedProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.params.token as string;

    const client = await prisma.user.findUnique({ where: { shareToken: token } });

    if (
      !client ||
      client.role !== 'CLIENT' ||
      !client.shareTokenExpiresAt ||
      client.shareTokenExpiresAt < new Date()
    ) {
      // Deliberately identical to a missing token — never reveal whether one ever existed.
      sendError(res, 'Link tapılmadı və ya vaxtı bitib', 404);
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 6);
    const skip = (page - 1) * limit;

    const [deliverables, total] = await Promise.all([
      prisma.deliverable.findMany({
        where: { clientId: client.id, status: 'READY' },
        include: { category: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.deliverable.count({
        where: { clientId: client.id, status: 'READY' },
      }),
    ]);

    const serialized = await Promise.all(
      deliverables.map(async (d) => {
        const files = (d.files as any[]) || [];
        const filesWithSignedUrls = await Promise.all(
          files.map(async (f) => {
            try {
              const downloadUrl = await getSecureDownloadUrlForDownload(f.url);
              const previewSignedUrl = f.previewUrl
                ? await getSecureDownloadUrl(f.previewUrl)
                : (f.url ? await getSecureDownloadUrl(f.url) : null);
              return { ...f, downloadUrl, previewUrl: previewSignedUrl };
            } catch {
              return { ...f, downloadUrl: null };
            }
          })
        );

        let signedThumbnailUrl = d.thumbnailUrl;
        if (signedThumbnailUrl && typeof signedThumbnailUrl === 'string') {
          try {
            signedThumbnailUrl = await getSecureDownloadUrl(signedThumbnailUrl);
          } catch (e) {
            console.warn('Failed to sign thumbnailUrl', e);
          }
        }

        let signedOriginalUrl = d.originalUrl;
        if (signedOriginalUrl) {
          try {
            signedOriginalUrl = await getSecureDownloadUrlForDownload(signedOriginalUrl);
          } catch (e) {
            console.warn('Failed to sign originalUrl', e);
            signedOriginalUrl = null;
          }
        }

        // clientFeedback is intentionally omitted — never exposed on the public view.
        const { clientFeedback, ...rest } = d as typeof d & { clientFeedback?: unknown };

        return {
          ...rest,
          files: filesWithSignedUrls,
          thumbnailUrl: signedThumbnailUrl,
          originalUrl: signedOriginalUrl,
        };
      })
    );

    const hasMore = skip + limit < total;

    sendSuccess(res, serialized, 200, {
      total,
      page,
      limit,
      hasMore,
      client: {
        name: client.name,
        igUsername: client.igUsername,
        igBio: client.igBio,
        igFollowers: client.igFollowers,
        igFollowing: client.igFollowing,
        igPostsCount: client.igPostsCount,
        igProfilePic: client.igProfilePic,
      },
    });
  } catch (err) {
    console.error('getSharedProfile error:', err);
    sendError(res, 'Məlumatları yükləmək mümkün olmadı', 500);
  }
};
