/**
 * VENTII theme tokens — ported from the prototype's `themes` object.
 *
 * Two modes (dark / light) share the same shape so any component can consume
 * `t.bg.primary`, `t.text.primary`, etc.
 *
 * Reserved accent families (do not mix-and-match per design language):
 *   aurora   — platinum (primary CTA, premium surfaces)
 *   beam     — blue (info, links, calendar)
 *   glow     — gold (rewards, achievements, VENTII Pro/Black tier)
 *   deal     — mint (deals, discounts)
 *   pulse    — champagne/gold (RESERVED FOR VENTII AI — "black/gold luxury,"
 *              per the client's design law. NEVER purple/pink. AI is the only
 *              surface allowed the strongest/gradient treatment.)
 */
export type ThemeMode = 'dark' | 'light';

export interface Theme {
  mode: ThemeMode;
  bg: {
    primary: string;
    secondary: string;
    tertiary: string;
    elevated: string;
    overlay: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
  };
  border: {
    subtle: string;
    strong: string;
  };
  accents: {
    aurora: {base: string; tint: string; deep: string; bg: string};
    beam: {base: string; tint: string; deep: string; bg: string};
    glow: {base: string; tint: string; deep: string; bg: string};
    deal: {base: string; tint: string; deep: string; bg: string};
    pulse: {base: string; tint: string; deep: string; bg: string};
  };
  status: {
    success: string;
    warning: string;
    danger: string;
    info: string;
  };
}

export const darkTheme: Theme = {
  mode: 'dark',
  bg: {
    primary: '#0A0A0F',
    secondary: '#13131A',
    tertiary: '#1C1C26',
    elevated: '#23232F',
    overlay: 'rgba(10, 10, 15, 0.85)',
  },
  text: {
    primary: '#F8F8FB',
    secondary: '#A8A8B8',
    tertiary: '#6E6E80',
    inverse: '#0A0A0F',
  },
  border: {
    subtle: 'rgba(255, 255, 255, 0.08)',
    strong: 'rgba(255, 255, 255, 0.18)',
  },
  accents: {
    aurora: {base: '#E8E8F0', tint: '#FFFFFF', deep: '#B8B8C8', bg: 'rgba(232, 232, 240, 0.12)'},
    beam:   {base: '#5B9CFF', tint: '#8BBAFF', deep: '#3A7AE0', bg: 'rgba(91, 156, 255, 0.14)'},
    glow:   {base: '#FFD56B', tint: '#FFE399', deep: '#E0B040', bg: 'rgba(255, 213, 107, 0.14)'},
    deal:   {base: '#5BE5B8', tint: '#8BF0D0', deep: '#3AC598', bg: 'rgba(91, 229, 184, 0.14)'},
    pulse:  {base: '#E5C988', tint: '#F2DEAE', deep: '#C2A052', bg: 'rgba(229, 201, 136, 0.14)'},
  },
  status: {
    success: '#5BE5B8',
    warning: '#FFD56B',
    danger:  '#FF6B7D',
    info:    '#5B9CFF',
  },
};

export const lightTheme: Theme = {
  mode: 'light',
  bg: {
    primary: '#FAFAFC',
    secondary: '#F2F2F6',
    tertiary: '#E8E8ED',
    elevated: '#FFFFFF',
    overlay: 'rgba(250, 250, 252, 0.85)',
  },
  text: {
    primary: '#0A0A0F',
    secondary: '#48485A',
    tertiary: '#86869A',
    inverse: '#FAFAFC',
  },
  border: {
    subtle: 'rgba(10, 10, 15, 0.08)',
    strong: 'rgba(10, 10, 15, 0.18)',
  },
  accents: {
    aurora: {base: '#2E2E40', tint: '#48485A', deep: '#0A0A0F', bg: 'rgba(46, 46, 64, 0.08)'},
    beam:   {base: '#2870E0', tint: '#5B9CFF', deep: '#1B4FB0', bg: 'rgba(40, 112, 224, 0.10)'},
    glow:   {base: '#D49A1F', tint: '#FFD56B', deep: '#A07512', bg: 'rgba(212, 154, 31, 0.12)'},
    deal:   {base: '#1FAA7A', tint: '#5BE5B8', deep: '#0F7A56', bg: 'rgba(31, 170, 122, 0.10)'},
    pulse:  {base: '#A8842E', tint: '#D9B86A', deep: '#7E6220', bg: 'rgba(168, 132, 46, 0.12)'},
  },
  status: {
    success: '#1FAA7A',
    warning: '#D49A1F',
    danger:  '#D8344A',
    info:    '#2870E0',
  },
};

export const getTheme = (mode: ThemeMode): Theme =>
  mode === 'dark' ? darkTheme : lightTheme;
