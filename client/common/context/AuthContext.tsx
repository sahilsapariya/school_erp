import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  getAccessToken,
  getRefreshToken,
  getUserData,
  setAccessToken,
  setRefreshToken,
  setUserData,
  clearAuth,
} from '@/common/utils/storage';
import { login as loginService, LoginResponse } from '@/common/services/authService';

interface User {
  id: number;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setAuthData: (data: LoginResponse) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const [accessToken, refreshToken, userData] = await Promise.all([
          getAccessToken(),
          getRefreshToken(),
          getUserData(),
        ]);

        if (accessToken && refreshToken && userData) {
          setUser(userData);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const setAuthData = async (data: LoginResponse) => {
      await Promise.all([
        setAccessToken(data.access_token),
        setRefreshToken(data.refresh_token),
        setUserData(data.user),
      ]);
      setUser(data.user);
  };

  const login = async (email: string, password: string) => {
      const response = await loginService({ email, password });
      await setAuthData(response);
  };

  const logout = async () => {
      await clearAuth();
      setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    setAuthData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
