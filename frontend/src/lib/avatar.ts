export interface PastelPalette {
  bg: string;
  text: string;
  border: string;
}

export const PASTEL_PALETTES: PastelPalette[] = [
  { bg: '#E0F2FE', text: '#0369A1', border: '#BAE6FD' }, // Soft Sky Blue
  { bg: '#EDE9FE', text: '#6D28D9', border: '#DDD6FE' }, // Soft Lavender
  { bg: '#FCE7F3', text: '#BE185D', border: '#FBCFE8' }, // Soft Pink
  { bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0' }, // Soft Mint Green
  { bg: '#FFEDD5', text: '#C2410C', border: '#FED7AA' }, // Soft Peach
  { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' }, // Soft Warm Amber
  { bg: '#CCFBF1', text: '#0F766E', border: '#99F6E4' }, // Soft Teal
  { bg: '#E0E7FF', text: '#4338CA', border: '#C7D2FE' }, // Soft Indigo
  { bg: '#FFE4E6', text: '#E11D48', border: '#FECDD3' }, // Soft Rose
  { bg: '#D1FAE5', text: '#047857', border: '#A7F3D0' }, // Soft Emerald
  { bg: '#F3E8FF', text: '#7E22CE', border: '#E9D5FF' }, // Soft Violet
  { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA' }, // Soft Coral
  { bg: '#ECFCCB', text: '#4D7C0F', border: '#D9F99D' }, // Soft Lime
  { bg: '#F1F5F9', text: '#334155', border: '#CBD5E1' }, // Soft Slate
];

export function getPastelPalette(seed: string = ''): PastelPalette {
  if (!seed) return PASTEL_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PASTEL_PALETTES.length;
  return PASTEL_PALETTES[index];
}

export function getUserInitials(
  firstName?: string | null,
  lastName?: string | null,
  fallback?: string
): string {
  const f = (firstName || '').trim();
  const l = (lastName || '').trim();

  if (f && l) {
    return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase();
  }
  if (f && f.length >= 2) {
    return f.slice(0, 2).toUpperCase();
  }
  if (f) {
    return `${f.charAt(0)}U`.toUpperCase();
  }
  if (l && l.length >= 2) {
    return l.slice(0, 2).toUpperCase();
  }
  if (fallback && fallback.trim().length >= 2) {
    return fallback.trim().slice(0, 2).toUpperCase();
  }
  return 'JS';
}
