import Badge from '../ui/Badge';
import { formatAddedDateTime } from '../../lib/deliverableList';
import type { UploadState } from '../../lib/uploadState';

interface Props {
  state: UploadState;
  progress?: number | null;
  reason?: string | null;
  at?: string | null;
  /** Shown to admins only: who started the upload. */
  uploader?: string | null;
  busy?: boolean;
  onReupload: () => void;
  onResume: () => void;
}

const linkButton =
  'text-xs font-medium text-accent hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline';

/**
 * One badge, one sentence that says what happened and what to do, and the matching buttons.
 * Shown instead of the bare "Gözləmədə" while a row has no file because its upload did not finish.
 */
const UploadStateNote = ({ state, progress, reason, at, uploader, busy, onReupload, onResume }: Props) => {
  const when = formatAddedDateTime(at);
  const who = uploader ? `Yükləyən: ${uploader}` : null;

  let badge: { variant: 'info' | 'warning' | 'default'; text: string };
  let sentence: string;
  switch (state) {
    case 'uploading':
      badge = { variant: 'info', text: `Yüklənir… ${progress ?? 0}%` };
      sentence = 'Səhifəni bağlamayın, bitənə qədər gözləyin.';
      break;
    case 'stalled':
      badge = { variant: 'warning', text: 'Yükləmə dayanıb' };
      sentence = 'Əlaqə kəsilib və ya səhifə bağlanıb. Faylı yenidən yükləyin və bitənə qədər səhifəni bağlamayın.';
      break;
    case 'unfinalized':
      badge = { variant: 'warning', text: 'Fayl yüklənib, emal başlamayıb' };
      sentence = 'Fayl serverdədir, amma təsdiq olunmayıb. "Emalı başlat" ilə davam edin.';
      break;
    default:
      badge = { variant: 'default', text: when ? `Yükləmə ləğv edildi (${when})` : 'Yükləmə ləğv edildi' };
      sentence = `${reason ? `${reason} ` : ''}Faylı yenidən yükləyin və bitənə qədər səhifəni bağlamayın.`;
  }

  return (
    <div className="flex max-w-[260px] flex-col items-start gap-1" role={state === 'uploading' ? undefined : 'status'}>
      <Badge variant={badge.variant}>{badge.text}</Badge>
      <p className="text-[11px] leading-snug text-muted">{sentence}</p>
      {who && <p className="text-[11px] text-faint">{who}</p>}
      {state !== 'uploading' && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {state === 'unfinalized' && (
            <button type="button" className={linkButton} onClick={onResume} disabled={busy}>
              Emalı başlat
            </button>
          )}
          <button type="button" className={linkButton} onClick={onReupload} disabled={busy}>
            Yenidən yüklə
          </button>
        </div>
      )}
    </div>
  );
};

export default UploadStateNote;
