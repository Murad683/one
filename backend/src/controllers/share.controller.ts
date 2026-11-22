import { NextFunction, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response.util';
import { getSecureDownloadUrl, getSecureDownloadUrlForDownload, getAttachmentUrl } from '../services/upload.service';
import { CLIENT_LISTED_WHERE, presentForClient } from '../utils/retention';
import { getForViewer, listForViewer } from '../services/highlight.service';
import { isShareLinkValid, SHARE_VIEW_WRITE_INTERVAL_MS } from '../utils/shareLink';

// ─── GET /api/v1/share/:token ───────────────────
// Public, unauthenticated — the client's deliverables, as the signed-in portal lists them.
export const getSharedProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.params.token as string;

    const client = await prisma.user.findUnique({ where: { shareToken: token } });

    if (!client || !isShareLinkValid(client)) {
      // Deliberately identical to a missing token — never reveal whether one ever existed.
      sendError(res, 'Link tapılmadı və ya vaxtı bitib', 404);
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 6);
    const skip = (page - 1) * limit;

    // "Last viewed" for the admin panel: only on the first page, and not more often than every few minutes.
    const now = new Date();
    if (page === 1 && (!client.shareLastViewedAt || now.getTime() - client.shareLastViewedAt.getTime() > SHARE_VIEW_WRITE_INTERVAL_MS)) {
      await prisma.user
        .update({ where: { id: client.id }, data: { shareLastViewedAt: now } })
        .catch((e) => console.warn('getSharedProfile: could not record last view', e));
    }

    const [deliverables, total] = await Promise.all([
      prisma.deliverable.findMany({
        where: { clientId: client.id, ...CLIENT_LISTED_WHERE },
        include: { category: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.deliverable.count({
        where: { clientId: client.id, ...CLIENT_LISTED_WHERE },
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
              return { ...f, downloadUrl, previewUrl: previewSignedUrl, originalDownloadUrl: await getAttachmentUrl(f.originalUrl) };
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

        // Same fields as the portal (feedback and the team's reply included): the link works as the client's panel.
        return presentForClient({
          ...d,
          status: 'READY',
          files: filesWithSignedUrls,
          thumbnailUrl: signedThumbnailUrl,
          thumbnailDownloadUrl: await getAttachmentUrl(d.thumbnailUrl),
          originalUrl: signedOriginalUrl,
        });
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
        igHighlights: client.igHighlights,
      },
    });
  } catch (err) {
    console.error('getSharedProfile error:', err);
    sendError(res, 'Məlumatları yükləmək mümkün olmadı', 500);
  }
};

// The client behind a valid, unexpired share link; null otherwise (same rule as getSharedProfile).
const findSharedClient = async (token: string) => {
  const client = await prisma.user.findUnique({ where: { shareToken: token } });
  return client && isShareLinkValid(client) ? client : null;
};

/**
 * For the panel actions on a share link (feedback, ZIP, support message): the link stands in for the
 * client's sign-in. req.user becomes that client, so the portal's own handlers run unchanged and keep
 * their checks (a deliverable of another client is still "not found"). res.locals.viaShare marks it.
 */
export const resolveShareClient = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const client = await findSharedClient(req.params.token as string);
    if (!client) {
      sendError(res, 'Link tapılmadı və ya vaxtı bitib', 404);
      return;
    }
    req.user = { id: client.id, email: client.email, role: 'CLIENT' };
    res.locals.viaShare = true;
    next();
  } catch (err) {
    console.error('resolveShareClient error:', err);
    sendError(res, 'Məlumatları yükləmək mümkün olmadı', 500);
  }
};

// GET /api/v1/share/:token/highlights - public, read-only list of the client's highlights.
export const getSharedHighlights = async (req: Request, res: Response): Promise<void> => {
  try {
    const client = await findSharedClient(req.params.token as string);
    if (!client) {
      sendError(res, 'Link tapılmadı və ya vaxtı bitib', 404);
      return;
    }
    sendSuccess(res, await listForViewer(client.id));
  } catch (err) {
    console.error('getSharedHighlights error:', err);
    sendError(res, 'Highlight-ları yükləmək mümkün olmadı', 500);
  }
};

// GET /api/v1/share/:token/highlights/:id - one highlight with its images.
export const getSharedHighlight = async (req: Request, res: Response): Promise<void> => {
  try {
    const client = await findSharedClient(req.params.token as string);
    const highlight = client ? await getForViewer(client.id, req.params.id as string) : null;
    if (!highlight) {
      sendError(res, 'Link tapılmadı və ya vaxtı bitib', 404);
      return;
    }
    sendSuccess(res, highlight);
  } catch (err) {
    console.error('getSharedHighlight error:', err);
    sendError(res, 'Highlight-ı yükləmək mümkün olmadı', 500);
  }
};
