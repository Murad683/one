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
  /** Saves the file (the original when kept); null when it could not be signed. */
  downloadUrl: string | null;
}

export interface HighlightDetail {
  id: string;
  title: string;
  /** The image on the circle; null = the first one. */
  coverItemId: string | null;
  items: HighlightItemView[];
}

export type LoadHighlight = (id: string) => Promise<HighlightDetail>;

/** Downloads every image of one highlight as a ZIP; rejects with a message to show. Portal only. */
export type DownloadHighlightZip = (id: string) => Promise<void>;
