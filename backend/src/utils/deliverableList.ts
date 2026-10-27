/**
 * Query building for GET /deliverables (admin + creator). Pure: no Prisma import,
 * so every rule can be unit-tested. Every parameter is optional and a malformed
 * value is ignored rather than rejected, so an old or hand-edited URL never
 * produces a 500.
 */

const STATUSES = ['PENDING', 'PROCESSING', 'READY', 'FAILED', 'ARCHIVED'] as const;
const SORTS = ['createdAt', 'client', 'title', 'status', 'category', 'month'] as const;

export const DEFAULT_LIMIT = 12;
export const MAX_LIMIT = 200;
// Same 2 h rule as isStalePending in admin/src/pages/DeliverablesPage.tsx.
export const STALE_PENDING_MS = 2 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
// Baku has no daylight saving: a fixed +04:00 offset is exact.
const BAKU_OFFSET = '+04:00';

export interface DeliverableListUser {
  id: string;
  role: string;
}

export interface DeliverableListQuery {
  where: Record<string, unknown>;
  orderBy: Array<Record<string, unknown>>;
  page: number;
  limit: number;
  skip: number;
}

const text = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined; // arrays/objects from ?a=1&a=2 are ignored
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const intParam = (value: unknown, min: number, max: number): number | undefined => {
  const raw = text(value);
  if (!raw || !/^\d+$/.test(raw)) return undefined;
  const n = parseInt(raw, 10);
  return n >= min && n <= max ? n : undefined;
};

const flag = (value: unknown): boolean => {
  const raw = text(value);
  return raw === '1' || raw === 'true';
};

/** Start of the given calendar day (YYYY-MM-DD) in Baku time, or null when invalid. */
const bakuDayStart = (value: unknown): Date | null => {
  const raw = text(value);
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00${BAKU_OFFSET}`);
  if (Number.isNaN(date.getTime())) return null;
  // Reject overflowing dates such as 2026-02-31, which Date would silently roll over.
  const roundTrip = new Date(date.getTime() + 4 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return roundTrip === raw ? date : null;
};

export const buildDeliverableListQuery = (
  query: Record<string, unknown>,
  user: DeliverableListUser,
  now: number = Date.now(),
): DeliverableListQuery => {
  // Same leniency as before: parseInt, a bad or zero value falls back to the
  // default, anything out of range is clamped.
  const pageRaw = parseInt(text(query.page) ?? '', 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.min(pageRaw, 1_000_000) : 1;
  const limitRaw = parseInt(text(query.limit) ?? '', 10);
  const limit = Number.isFinite(limitRaw) && limitRaw !== 0 ? Math.min(MAX_LIMIT, Math.max(1, limitRaw)) : DEFAULT_LIMIT;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  const and: Array<Record<string, unknown>> = [];

  const clientId = text(query.clientId);
  if (clientId) where.clientId = clientId;

  const categoryId = text(query.categoryId);
  if (categoryId === 'none') where.categoryId = null;
  else if (categoryId) where.categoryId = categoryId;

  const status = text(query.status);
  if (status && (STATUSES as readonly string[]).includes(status)) where.status = status;

  const year = intParam(query.year, 1, 9999);
  if (year) where.year = year;
  const month = intParam(query.month, 1, 12);
  if (month) where.month = month;

  // Day filter on when the record was added (createdAt): the form's "Tarix" only
  // keeps month and year, so the day exists nowhere else.
  const from = bakuDayStart(query.from);
  const to = bakuDayStart(query.to);
  if (from || to) {
    const createdAt: Record<string, Date> = {};
    if (from) createdAt.gte = from;
    if (to) createdAt.lt = new Date(to.getTime() + DAY_MS);
    where.createdAt = createdAt;
  }

  if (flag(query.stale)) {
    and.push({ status: 'PENDING' });
    and.push({ createdAt: { lt: new Date(now - STALE_PENDING_MS) } });
  }

  if (flag(query.hasFeedback)) {
    and.push({ clientFeedback: { not: null } });
    and.push({ NOT: { clientFeedback: '' } });
  }

  const isCreator = user.role === 'CREATOR';
  const search = text(query.search);
  if (search) {
    and.push({
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } },
        // Creators never see (or search) client e-mail addresses.
        ...(isCreator ? [] : [{ client: { email: { contains: search, mode: 'insensitive' } } }]),
      ],
    });
  }

  if (and.length > 0) where.AND = and;
  // Last, so no query parameter can widen a creator's scope.
  if (isCreator) where.createdById = user.id;

  const sortRaw = text(query.sort);
  const sort = (SORTS as readonly string[]).includes(sortRaw ?? '') ? sortRaw! : 'createdAt';
  const order: 'asc' | 'desc' = text(query.order) === 'asc' ? 'asc' : 'desc';
  // `id` is always the last key so rows never swap places between pages.
  let orderBy: Array<Record<string, unknown>>;
  switch (sort) {
    case 'client':
      orderBy = [{ client: { name: order } }, { createdAt: 'desc' }, { id: 'desc' }];
      break;
    case 'title':
      orderBy = [{ title: order }, { id: 'desc' }];
      break;
    case 'status':
      // Postgres sorts enums by declaration order: PENDING, PROCESSING, READY, ...
      orderBy = [{ status: order }, { createdAt: 'desc' }, { id: 'desc' }];
      break;
    case 'category':
      // Files without a category follow Postgres' default NULL order (last when
      // ascending, first when descending).
      orderBy = [{ category: { name: order } }, { createdAt: 'desc' }, { id: 'desc' }];
      break;
    case 'month':
      // The work month ("Ay/İl" column): year first, then month.
      orderBy = [{ year: order }, { month: order }, { createdAt: 'desc' }, { id: 'desc' }];
      break;
    default:
      orderBy = [{ createdAt: order }, { id: order }];
  }

  return { where, orderBy, page, limit, skip };
};
