import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure your API URL here
// For physical devices: Use your computer's local IP (find with: ifconfig | grep "inet " | grep -v 127.0.0.1)
// For production: Update with your production API URL
const API_CONFIG = {
  // Development URLs
  // use localhost LOCAL IP for physical devices
  DEV_IP: process.env.EXPO_PUBLIC_LOCAL_IP, // Replace with your local IP
  DEV_PORT: '5001',
  
  // Production URL
  PROD_URL: 'https://api.yourapp.com',
};

const getBaseUrl = (): string => {
  if (!__DEV__) {
    return API_CONFIG.PROD_URL;
    }
    
  const isPhysicalDevice = Constants.isDevice;
  const { DEV_IP, DEV_PORT } = API_CONFIG;

  // iOS Simulator can use localhost
  if (Platform.OS === 'ios' && !isPhysicalDevice) {
    return `http://0.0.0.0:${DEV_PORT}`;
  }

  // Physical devices and Android emulator need the actual IP
  return `http://${DEV_IP}:${DEV_PORT}`;
};

export const API_BASE_URL = getBaseUrl();

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
