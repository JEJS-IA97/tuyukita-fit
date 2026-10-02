export const colors = {
  primary: '#014325',
  primaryVariant: '#025C34',
  success: '#82BB2C',
  accent: '#F9B02D',
  background: '#F6F8F6',
  surface: '#FFFFFF',
  text: '#141414',
  textMuted: '#6B7671',
  border: '#E3E9E4',
  tabBarInactive: '#8A9490',
  onPrimary: '#FFFFFF',
} as const;

export type ColorToken = keyof typeof colors;
