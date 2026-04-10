export interface ColorPalette {
  bg: string;
  bgSecondary: string;
  targetStroke: string;
  arrow: string;
  accent: string;
  hud: string;
}

const palettes: ColorPalette[] = [
  { bg: '#0c0f14', bgSecondary: '#151a22', targetStroke: '#e8eef8', arrow: '#7dd3fc', accent: '#a78bfa', hud: '#94a3b8' },
  { bg: '#0f1419', bgSecondary: '#1a222c', targetStroke: '#f1f5f9', arrow: '#86efac', accent: '#fcd34d', hud: '#9ca3af' },
  { bg: '#12100e', bgSecondary: '#1c1917', targetStroke: '#fafaf9', arrow: '#fdba74', accent: '#f472b6', hud: '#a8a29e' },
  { bg: '#0b1020', bgSecondary: '#111827', targetStroke: '#e0e7ff', arrow: '#93c5fd', accent: '#34d399', hud: '#9ca3af' },
  { bg: '#0c0a09', bgSecondary: '#1c1917', targetStroke: '#f5f5f4', arrow: '#fca5a5', accent: '#fde047', hud: '#a8a29e' },
  { bg: '#052e16', bgSecondary: '#064e3b', targetStroke: '#ecfdf5', arrow: '#6ee7b7', accent: '#bbf7d0', hud: '#a7f3d0' },
  { bg: '#1e1b4b', bgSecondary: '#312e81', targetStroke: '#eef2ff', arrow: '#c4b5fd', accent: '#f9a8d4', hud: '#c7d2fe' },
  { bg: '#134e4a', bgSecondary: '#115e59', targetStroke: '#f0fdfa', arrow: '#5eead4', accent: '#fcd34d', hud: '#99f6e4' },
  { bg: '#18181b', bgSecondary: '#27272a', targetStroke: '#fafafa', arrow: '#e4e4e7', accent: '#a1a1aa', hud: '#d4d4d8' },
  { bg: '#0f172a', bgSecondary: '#1e293b', targetStroke: '#f8fafc', arrow: '#38bdf8', accent: '#818cf8', hud: '#94a3b8' },
];

export const getColorPalette = (index: number) => palettes[index % palettes.length];

export const themeSurfaces: Record<
  'light' | 'dark' | 'amoled',
  { bg: string; card: string; text: string; muted: string }
> = {
  light: { bg: '#f8fafc', card: '#ffffff', text: '#0f172a', muted: '#64748b' },
  dark: { bg: '#0b1220', card: '#111827', text: '#f1f5f9', muted: '#94a3b8' },
  amoled: { bg: '#000000', card: '#050505', text: '#f5f5f5', muted: '#737373' },
};
