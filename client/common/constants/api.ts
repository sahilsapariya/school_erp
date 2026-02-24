import { Platform } from 'react-native';
import Constants from 'expo-constants';

const isDev = __DEV__;

/** Production backend URL (used when not in __DEV__) */
const PROD_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';

/** Development backend URL - from env or built from IP+port */
const getDevUrl = (): string => {
  const devUrl = process.env.EXPO_PUBLIC_BACKEND_URL_DEV;
  if (devUrl) return devUrl;

  const devIp = process.env.EXPO_PUBLIC_LOCAL_IP;
  const devPort = process.env.EXPO_PUBLIC_DEV_PORT ?? '5001';
  const isPhysicalDevice = Constants.isDevice;

  // iOS Simulator can use localhost
  if (Platform.OS === 'ios' && !isPhysicalDevice) {
    return `http://localhost:${devPort}`;
  }

  // Physical devices and Android emulator need the machine's IP
  if (devIp) return `http://${devIp}:${devPort}`;

  // Fallback to prod URL if no dev config (e.g. testing prod from dev build)
  return PROD_URL;
};

export const API_BASE_URL = isDev ? getDevUrl() : PROD_URL;

/** Current environment: 'development' | 'production' */
export const API_ENV = isDev ? 'development' : 'production';

export const API_ENDPOINTS = {
  REGISTER: '/api/auth/register',
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout',
  FORGOT_PASSWORD: '/api/auth/password/forgot',
  RESET_PASSWORD: '/api/auth/password/reset',
  EMAIL_VALIDATE: '/api/auth/email/validate',
  PROTECTED: '/api/protected',
  /** Lightweight: returns only { enabled_features }. Use on app focus to reflect plan changes. */
  ENABLED_FEATURES: '/api/auth/enabled-features',
} as const;

export const getApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};
