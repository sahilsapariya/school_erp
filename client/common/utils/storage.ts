import * as SecureStore from 'expo-secure-store';

const KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  PERMISSIONS: 'permissions',
} as const;

export const setAccessToken = async (token: string) => {
  await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, token);
};

export const getAccessToken = async (): Promise<string | null> => {
  return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
};

export const setRefreshToken = async (token: string) => {
  await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, token);
};

export const getRefreshToken = async (): Promise<string | null> => {
  return SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
};

export const setUserData = async (userData: any) => {
  await SecureStore.setItemAsync(KEYS.USER_DATA, JSON.stringify(userData));
};

export const getUserData = async (): Promise<any | null> => {
  const data = await SecureStore.getItemAsync(KEYS.USER_DATA);
    return data ? JSON.parse(data) : null;
};

export const setPermissions = async (permissions: string[]) => {
  await SecureStore.setItemAsync(KEYS.PERMISSIONS, JSON.stringify(permissions));
};

export const getPermissions = async (): Promise<string[] | null> => {
  const data = await SecureStore.getItemAsync(KEYS.PERMISSIONS);
  return data ? JSON.parse(data) : null;
};

export const clearAuth = async () => {
    await Promise.all([
    SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN),
    SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
    SecureStore.deleteItemAsync(KEYS.USER_DATA),
    SecureStore.deleteItemAsync(KEYS.PERMISSIONS),
    ]);
};
