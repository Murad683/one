// One bold, fully-saturated color per service card (clou.ch's own project
// cards each read as a single confident hue, not a shared pale tint). Each
// hue is a deep "jewel tone" — chosen to sit in the same family as the
// site's near-black surfaces rather than the pastel/rustic register a
// generic warm palette would land in — so the cards read as part of this
// site's identity, not a stock template's. The brand accent green
// (--color-accent) itself stays reserved for the icon color and the
// progress dot's "this is the site's action color" signal, which needs to
// read the same regardless of which card is active. Light and dark variants
// are separate palettes, not the same hex values reused — the light
// palette's hues would blow out against the near-black dark-theme
// background, so the dark palette deepens each hue slightly for the same
// identity without the glare.
export interface ServicePaletteEntry {
  bg: string;
  title: string;
  description: string;
  dot: string;
}

export const lightPalette: ServicePaletteEntry[] = [
  {
    bg: '#1F2A24', // Graphite Green
    title: '#F5F7F4',
    description: 'rgba(245,247,244,0.68)',
    dot: 'rgba(245,247,244,0.24)',
  },
  {
    bg: '#122A4D', // Deep Indigo
    title: '#F1F4FA',
    description: 'rgba(241,244,250,0.68)',
    dot: 'rgba(241,244,250,0.24)',
  },
  {
    bg: '#3D1F2B', // Deep Bordeaux
    title: '#FBF1F3',
    description: 'rgba(251,241,243,0.68)',
    dot: 'rgba(251,241,243,0.24)',
  },
  {
    bg: '#12130F', // Ink Black
    title: '#F6F6F2',
    description: 'rgba(246,246,242,0.66)',
    dot: 'rgba(246,246,242,0.24)',
  },
];

export const darkPalette: ServicePaletteEntry[] = [
  {
    bg: '#26362E', // Graphite Green (dark)
    title: '#F1F4F2',
    description: 'rgba(241,244,242,0.68)',
    dot: 'rgba(241,244,242,0.26)',
  },
  {
    bg: '#1A3559', // Deep Indigo (dark)
    title: '#EEF2FA',
    description: 'rgba(238,242,250,0.68)',
    dot: 'rgba(238,242,250,0.26)',
  },
  {
    bg: '#4A2836', // Deep Bordeaux (dark)
    title: '#FAF1F3',
    description: 'rgba(250,241,243,0.68)',
    dot: 'rgba(250,241,243,0.26)',
  },
  {
    bg: '#1D1E19', // Ink Black (dark)
    title: '#F3F3EF',
    description: 'rgba(243,243,239,0.66)',
    dot: 'rgba(243,243,239,0.26)',
  },
];

export const getServicePalette = (index: number, isDark: boolean): ServicePaletteEntry => {
  const palette = isDark ? darkPalette : lightPalette;
  return palette[index % palette.length];
};
