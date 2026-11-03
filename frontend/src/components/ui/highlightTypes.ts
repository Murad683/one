/** One circle on the profile: the cover plus how many images the highlight holds. */
export interface HighlightSummary {
  id: string;
  title: string;
  coverUrl: string | null;
  itemCount: number;
  /** Still the old one-image form; shown the same way. */
  legacy?: boolean;
}

export interface HighlightItemView {
  id: string;
  /** Signed link; null when it could not be signed (the viewer skips it). */
  url: string | null;
}

export interface HighlightDetail {
  id: string;
  title: string;
  items: HighlightItemView[];
}

export type LoadHighlight = (id: string) => Promise<HighlightDetail>;
