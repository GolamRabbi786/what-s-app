import { ThemeMode } from './types';

export interface Palette {
  mode: ThemeMode;
  bg: string;
  panel: string;
  panelAlt: string;
  panelHover: string;
  rail: string;
  railSoft: string;
  railText: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  accent: string;
  accentDark: string;
  accentSoft: string;
  bubble: string;
  bubbleOut: string;
  bubbleText: string;
  chatBg: string;
  icon: string;
  chip: string;
  chipActive: string;
  danger: string;
  warning: string;
  header: string;
  overlay: string;
  shadow: string;
  search: string;
}

export const palettes: Record<ThemeMode, Palette> = {
  light: {
    mode: 'light',
    bg: '#eae6df',
    panel: '#ffffff',
    panelAlt: '#f7f8fa',
    panelHover: '#f5f6f6',
    rail: '#202c33',
    railSoft: '#374248',
    railText: '#aebac1',
    text: '#111b21',
    textSecondary: '#667781',
    textMuted: '#8696a0',
    border: '#e9edef',
    accent: '#00a884',
    accentDark: '#008069',
    accentSoft: '#d9fdd3',
    bubble: '#ffffff',
    bubbleOut: '#d9fdd3',
    bubbleText: '#111b21',
    chatBg: '#efeae2',
    icon: '#54656f',
    chip: '#f0f2f5',
    chipActive: '#d9fdd3',
    danger: '#ea4335',
    warning: '#f0a30a',
    header: '#f0f2f5',
    overlay: 'rgba(11, 20, 26, 0.55)',
    shadow: 'rgba(11, 20, 26, 0.16)',
    search: '#f0f2f5',
  },
  dark: {
    mode: 'dark',
    bg: '#0b141a',
    panel: '#111b21',
    panelAlt: '#202c33',
    panelHover: '#1f2c34',
    rail: '#111b21',
    railSoft: '#2a3942',
    railText: '#8696a0',
    text: '#e9edef',
    textSecondary: '#8696a0',
    textMuted: '#667781',
    border: '#222d34',
    accent: '#00a884',
    accentDark: '#00a884',
    accentSoft: '#005c4b',
    bubble: '#202c33',
    bubbleOut: '#005c4b',
    bubbleText: '#e9edef',
    chatBg: '#0b141a',
    icon: '#aebac1',
    chip: '#202c33',
    chipActive: '#005c4b',
    danger: '#f15c6d',
    warning: '#f0a30a',
    header: '#202c33',
    overlay: 'rgba(0, 0, 0, 0.6)',
    shadow: 'rgba(0, 0, 0, 0.4)',
    search: '#202c33',
  },
};

export const STATUS_COLORS = [
  '#1a6b5c',
  '#5b2d8e',
  '#a13b2f',
  '#1d4f91',
  '#8a5a1e',
  '#3d3d8f',
  '#7a2c55',
  '#2f6d35',
];
