// Filter / sort / paging state of the "Layihə Faylları" table and how it maps to
// the GET /deliverables query string (see backend/src/utils/deliverableList.ts).

export interface DeliverableFilters {
  clientId: string;
  /** Category id, or 'none' for files without a category. */
  categoryId: string;
  status: string;
  /** 'YYYY-MM' from <input type="month"> (the work month), or ''. */
  month: string;
  /** 'YYYY-MM-DD' range on the day the record was added (Baku days), or ''. */
  from: string;
  to: string;
  /** "Gözləmədə qalıb": PENDING for more than 2 hours. */
  stale: boolean;
  hasFeedback: boolean;
}

export const emptyFilters: DeliverableFilters = {
  clientId: '',
  categoryId: '',
  status: '',
  month: '',
  from: '',
  to: '',
  stale: false,
  hasFeedback: false,
};

export const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Yeni əvvəl (əlavə olunma)' },
  { value: 'createdAt:asc', label: 'Köhnə əvvəl (əlavə olunma)' },
  { value: 'client:asc', label: 'Müştəri A → Z' },
  { value: 'client:desc', label: 'Müştəri Z → A' },
  { value: 'title:asc', label: 'Başlıq A → Z' },
  { value: 'title:desc', label: 'Başlıq Z → A' },
  { value: 'status:asc', label: 'Status: gözləyənlər əvvəl' },
  { value: 'status:desc', label: 'Status: hazır olanlar əvvəl' },
];

export const DEFAULT_SORT = SORT_OPTIONS[0].value;
export const PAGE_SIZES = [50, 100, 150, 200];
export const DEFAULT_PAGE_SIZE = PAGE_SIZES[0];

const BAKU = 'Asia/Baku';

/** Calendar day in Baku as YYYY-MM-DD, `offsetDays` from today (the team works in Baku time). */
export const bakuDay = (offsetDays = 0): string => {
  const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: BAKU, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
};

/** "27.10.2026" in Baku time, or '' for a missing/invalid timestamp. */
export const formatAddedDay = (iso?: string | null): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  // Built from parts so the result never depends on the browser's locale data.
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: BAKU, day: '2-digit', month: '2-digit', year: 'numeric' })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  return `${parts.day}.${parts.month}.${parts.year}`;
};

/** How many filters are set (the date range counts once). The search box is separate. */
export const countActiveFilters = (f: DeliverableFilters): number =>
  [f.clientId, f.categoryId, f.status, f.month].filter(Boolean).length +
  (f.from || f.to ? 1 : 0) +
  (f.stale ? 1 : 0) +
  (f.hasFeedback ? 1 : 0);

interface ListParamsInput {
  page: number;
  pageSize: number;
  sort: string;
  search: string;
  filters: DeliverableFilters;
}

export const buildListParams = ({ page, pageSize, sort, search, filters }: ListParamsInput): URLSearchParams => {
  const [sortKey, order] = sort.split(':');
  const params = new URLSearchParams({ page: String(page), limit: String(pageSize), sort: sortKey, order });
  if (search) params.set('search', search);
  if (filters.clientId) params.set('clientId', filters.clientId);
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.status) params.set('status', filters.status);
  if (/^\d{4}-\d{2}$/.test(filters.month)) {
    const [year, month] = filters.month.split('-');
    params.set('year', String(parseInt(year, 10)));
    params.set('month', String(parseInt(month, 10)));
  }
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.stale) params.set('stale', '1');
  if (filters.hasFeedback) params.set('hasFeedback', '1');
  return params;
};
