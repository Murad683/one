/**
 * A deliverable whose upload is still being processed (status PROCESSING) must not
 * receive another upload: the second run would not know about the first run's
 * output and would leave it orphaned in storage. A PROCESSING row that has not
 * been touched for this long is treated as stuck (e.g. the API restarted and the
 * in-memory queue was lost) and may be re-uploaded. Keep in sync with
 * `isProcessingBusy` in admin/src/pages/DeliverablesPage.tsx.
 */
export const PROCESSING_STALE_MS = 2 * 60 * 60 * 1000;

export const PROCESSING_BUSY_MESSAGE =
  'Bu faylın əvvəlki emalı hələ bitməyib. Bir neçə dəqiqə sonra yenidən cəhd edin.';

export const isProcessingBusy = (
  deliverable: { status: string; updatedAt?: Date | string | null },
  now: number = Date.now(),
): boolean => {
  if (deliverable.status !== 'PROCESSING' || !deliverable.updatedAt) return false;
  const updated = new Date(deliverable.updatedAt).getTime();
  if (Number.isNaN(updated)) return false;
  return now - updated < PROCESSING_STALE_MS;
};
