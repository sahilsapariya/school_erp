import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  getAccessToken,
  getRefreshToken,
  getUserData,
  getPermissions,
  setAccessToken,
  setRefreshToken,
  setUserData,
  setPermissions,
  clearAuth,
} from '@/common/utils/storage';
import { login as loginService, LoginResponse } from '@/common/services/authService';

interface User {
  id: number;
  email: string;
  profilePicture?: string;
}

interface AuthContextType {
  user: User | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setAuthData: (data: LoginResponse) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
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
  const [permissions, setPermissionsState] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const [accessToken, refreshToken, userData, userPermissions] = await Promise.all([
          getAccessToken(),
          getRefreshToken(),
          getUserData(),
          getPermissions(),
        ]);

        if (accessToken && refreshToken && userData) {
          setUser(userData);
          setPermissionsState(userPermissions || []);
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
        setPermissions(data.permissions || []),
      ]);
      setUser(data.user);
      setPermissionsState(data.permissions || []);
  };

  const login = async (email: string, password: string) => {
      const response = await loginService({ email, password });
      await setAuthData(response);
  };

  const logout = async () => {
      await clearAuth();
      setUser(null);
      setPermissionsState([]);
  };

  // Check if user has a specific permission
  const hasPermission = (permission: string): boolean => {
    if (!permissions || permissions.length === 0) return false;
    
    // Check for exact permission
    if (permissions.includes(permission)) return true;
    
    // Check for hierarchical manage permission
    // e.g., if checking "attendance.mark" and user has "attendance.manage"
    const resource = permission.split('.')[0];
    const managePermission = `${resource}.manage`;
    if (permissions.includes(managePermission)) return true;
    
    // Check for system.manage (super admin)
    if (permissions.includes('system.manage')) return true;
    
    return false;
  };

  // Check if user has any of the provided permissions
  const hasAnyPermission = (perms: string[]): boolean => {
    return perms.some(perm => hasPermission(perm));
  };

  // Check if user has all of the provided permissions
  const hasAllPermissions = (perms: string[]): boolean => {
    return perms.every(perm => hasPermission(perm));
  };

  return (
    <AuthContext.Provider
      value={{
    user,
    permissions,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    setAuthData,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
