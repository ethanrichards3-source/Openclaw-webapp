import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

export type DeviceType = 'phone' | 'tablet';

/**
 * Detect whether the device is a phone or tablet based on screen size.
 * Samsung Galaxy S25 Ultra: 6.9" (1440x3120) ~412dp wide
 * Samsung Galaxy S26 Ultra: ~6.9" (1440x3120) ~412dp wide
 * Samsung Tab S10 FE: 10.9" (1920x1200) ~800dp wide
 */
export function getDeviceType(): DeviceType {
  const shortSide = Math.min(width, height);
  // Tablets typically have shortest side >= 600dp
  return shortSide >= 600 ? 'tablet' : 'phone';
}

export const IS_TABLET = getDeviceType() === 'tablet';
export const IS_PHONE = !IS_TABLET;
export const SCREEN_WIDTH = width;
export const SCREEN_HEIGHT = height;

/**
 * Samsung device detection helpers.
 * S25 Ultra / S26 Ultra: tall narrow screens with S Pen
 * Tab S10 FE: wide tablet screen with S Pen
 */
export const DEVICE_PROFILES = {
  's25_ultra': { width: 412, height: 915, ppi: 505, hasSPen: true },
  's26_ultra': { width: 412, height: 915, ppi: 505, hasSPen: true },
  'tab_s10_fe': { width: 800, height: 1280, ppi: 207, hasSPen: true },
} as const;

/**
 * Responsive value: returns phone value on phones, tablet value on tablets.
 */
export function responsive<T>(phone: T, tablet: T): T {
  return IS_TABLET ? tablet : phone;
}

/**
 * Responsive layout constants that adapt to phone vs tablet.
 */
export const LAYOUT = {
  // Sidebar
  sidebarWidth: responsive(280, 320),
  sidebarDefaultOpen: IS_TABLET,

  // Chat
  chatMaxWidth: responsive(width, 900),
  messagePadding: responsive(12, 16),
  messageMaxWidth: responsive(width * 0.85, 720),

  // Feature grid
  featureCardWidth: responsive(110, 150),
  featureCardPadding: responsive(12, 16),
  featureGridGap: responsive(8, 12),

  // Font sizes
  fontSize: {
    xs: responsive(10, 11),
    sm: responsive(12, 13),
    md: responsive(14, 15),
    lg: responsive(16, 17),
    xl: responsive(20, 22),
    title: responsive(22, 28),
    hero: responsive(26, 32),
  },

  // Spacing
  spacing: {
    xs: responsive(2, 4),
    sm: responsive(4, 8),
    md: responsive(10, 16),
    lg: responsive(16, 24),
    xl: responsive(24, 32),
  },

  // Tab bar
  tabBar: {
    height: responsive(56, 64),
    iconSize: responsive(22, 24),
    labelSize: responsive(10, 12),
    paddingBottom: responsive(4, 8),
  },

  // Input
  input: {
    minHeight: responsive(44, 48),
    borderRadius: responsive(22, 24),
    fontSize: responsive(15, 16),
  },

  // Header
  header: {
    height: responsive(48, 56),
    titleSize: responsive(16, 17),
  },

  // Border radius
  borderRadius: {
    sm: responsive(6, 8),
    md: responsive(10, 12),
    lg: responsive(14, 16),
    xl: responsive(20, 24),
  },

  // Settings
  settings: {
    inputWidth: responsive(160, 200),
  },
};

/**
 * Safe area helper for phones with dynamic island / punch hole cameras.
 * S25/S26 Ultra have centered punch-hole cameras.
 */
export const SAFE_AREA = {
  top: Platform.OS === 'android' ? responsive(24, 0) : 0,
  bottom: responsive(16, 0),
};
