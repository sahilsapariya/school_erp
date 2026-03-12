import { colors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { radius } from './radius';
import { shadows } from './shadows';
import { screen, rs, ms, wp, hp } from './responsive';

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  screen,
  rs,
  ms,
  wp,
  hp,
} as const;

export type Theme = typeof theme;
