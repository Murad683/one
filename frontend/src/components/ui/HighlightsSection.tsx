import { useState } from 'react';
import { StoryViewer } from './StoryViewer';
import type { HighlightSummary, LoadHighlight } from './highlightTypes';

/**
 * The row of highlight circles under the profile bio, plus the story viewer they open.
 * Shared by the client portal and the public share page. Renders nothing when there are none.
 */
export const HighlightsSection = ({
  highlights,
  loadDetail,
}: {
  highlights: HighlightSummary[];
  loadDetail: LoadHighlight;
}) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (highlights.length === 0) return null;

  return (
    <>
      <div className="mt-4 md:mt-6 overflow-x-auto no-scrollbar">
        <div className="flex gap-4 md:gap-8 pb-1" style={{ minWidth: 'min-content' }}>
          {highlights.map((h, index) => (
            <button
              key={h.id}
              type="button"
              onClick={() => setOpenIndex(index)}
              aria-label={`${h.title} highlight-ını aç`}
              className="flex flex-col items-center gap-2 shrink-0 select-none w-[72px] md:w-[85px] transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-lg"
            >
              {/* Outer grey ring */}
              <div
                className="rounded-full flex items-center justify-center shrink-0 w-[64px] h-[64px] md:w-[80px] md:h-[80px]"
                style={{ border: '1px solid var(--ig-border)', padding: '3px' }}
              >
                <div className="w-full h-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--ig-empty-bg)' }}>
                  {h.coverUrl && (
                    <img
                      src={h.coverUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                  )}
                </div>
              </div>
              <span className="text-[11px] md:text-[12px] text-center truncate w-full" style={{ color: 'var(--ig-text)' }}>
                {h.title}
              </span>
            </button>
          ))}
        </div>
      </div>

      {openIndex !== null && (
        <StoryViewer
          highlights={highlights}
          startIndex={openIndex}
          loadDetail={loadDetail}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  );
};
