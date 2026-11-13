import type { CallBackground } from './types';

export const BACKGROUND_PRESETS: CallBackground[] = [
  {
    id: 'aurora',
    label: 'Aurora',
    kind: 'animated',
    colors: ['#061b20', '#0d3b3a', '#155e63'],
  },
  {
    id: 'midnight',
    label: 'Midnight',
    kind: 'animated',
    colors: ['#0a0f1e', '#1a2145', '#2b2f63'],
  },
  {
    id: 'sunset',
    label: 'Sunset',
    kind: 'animated',
    colors: ['#1b0f18', '#4a1d3f', '#8a3b2e'],
  },
  {
    id: 'ocean',
    label: 'Ocean',
    kind: 'animated',
    colors: ['#04161f', '#0b3a4a', '#0f6472'],
  },
  {
    id: 'forest',
    label: 'Forest',
    kind: 'animated',
    colors: ['#07150e', '#14402a', '#256b45'],
  },
  {
    id: 'daylight',
    label: 'Daylight',
    kind: 'animated',
    colors: ['#e9f6f0', '#dbeafe', '#fdf1dd'],
  },
  {
    id: 'mountains',
    label: 'Mountains',
    kind: 'image',
    image:
      'https://images.pexels.com/photos/1287145/pexels-photo-1287145.jpeg?auto=compress&cs=tinysrgb&w=1400',
  },
  {
    id: 'beach',
    label: 'Beach',
    kind: 'image',
    image:
      'https://images.pexels.com/photos/189349/pexels-photo-189349.jpeg?auto=compress&cs=tinysrgb&w=1400',
  },
  {
    id: 'city',
    label: 'City lights',
    kind: 'image',
    image:
      'https://images.pexels.com/photos/1105766/pexels-photo-1105766.jpeg?auto=compress&cs=tinysrgb&w=1400',
  },
];

export const DEFAULT_BACKGROUND = BACKGROUND_PRESETS[0];

export function backgroundById(id: string | undefined): CallBackground {
  return BACKGROUND_PRESETS.find((preset) => preset.id === id) ?? DEFAULT_BACKGROUND;
}
