import { useColorScheme } from 'react-native';

import { useStore } from '@/state/store';

export type Theme = {
  dark: boolean;
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textDim: string;
  textFaint: string;
  accent: string;
  accentSoft: string;
  good: string;
  warn: string;
  bad: string;
};

const dark: Theme = {
  dark: true,
  bg: '#0D1528',
  surface: '#141F36',
  surfaceAlt: '#1B2745',
  border: '#243155',
  text: '#EEF2F8',
  textDim: '#9BA6B8',
  textFaint: '#68738A',
  accent: '#F2552F',
  accentSoft: '#3A1B12',
  good: '#4ED08A',
  warn: '#F2B84B',
  bad: '#F0666B',
};

const light: Theme = {
  dark: false,
  bg: '#FAF9F7',
  surface: '#FFFFFF',
  surfaceAlt: '#F1EFEC',
  border: '#E3DFD9',
  text: '#16191F',
  textDim: '#5B6472',
  textFaint: '#8A94A3',
  accent: '#D8441E',
  accentSoft: '#FBE8E1',
  good: '#1E8F5B',
  warn: '#B77C10',
  bad: '#C93B45',
};

export type ThemeMode = 'system' | 'light' | 'dark';

export function useTheme(): Theme {
  const system = useColorScheme();
  const mode = useStore((s) => s.themeMode);
  const resolved = mode === 'system' ? system ?? 'dark' : mode;
  return resolved === 'light' ? light : dark;
}

export const radius = { sm: 8, md: 14, lg: 20, pill: 999 };
export const space = (n: number) => n * 4;

export function timeAgo(ts: number) {
  const mins = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return days < 7 ? `${days}d` : new Date(ts).toLocaleDateString();
}
