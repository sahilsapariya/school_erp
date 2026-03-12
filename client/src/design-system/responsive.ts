import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base design width (iPhone 14 Pro = 393px)
const BASE_WIDTH = 393;

export const screen = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  isSmall: SCREEN_WIDTH < 360,
  isMedium: SCREEN_WIDTH >= 360 && SCREEN_WIDTH < 430,
  isLarge: SCREEN_WIDTH >= 430,
};

/**
 * Scale a size proportionally to the screen width.
 * Use for font sizes and layout measurements.
 */
export function rs(size: number): number {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

/**
 * Scale a size with a moderate factor (less aggressive than rs).
 * Suitable for padding/margin values that shouldn't scale too aggressively.
 */
export function ms(size: number, factor = 0.4): number {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  return Math.round(PixelRatio.roundToNearestPixel(size + (size * scale - size) * factor));
}

/**
 * Get a percentage of screen width.
 */
export function wp(percentage: number): number {
  return (SCREEN_WIDTH * percentage) / 100;
}

/**
 * Get a percentage of screen height.
 */
export function hp(percentage: number): number {
  return (SCREEN_HEIGHT * percentage) / 100;
}
