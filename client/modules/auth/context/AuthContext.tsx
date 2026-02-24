import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import {
  getAccessToken,
  getRefreshToken,
  getUserData,
  getPermissions,
  getEnabledFeatures,
  setAccessToken,
  setRefreshToken,
  setUserData,
  setPermissions,
  setEnabledFeatures,
  setTenantId,
  clearAuth,
} from "@/common/utils/storage";
import {
  login as loginService,
  LoginResponse,
  TenantChoice,
} from "@/modules/auth/services/authService";
import { apiGet } from "@/common/services/api";
import { API_ENDPOINTS } from "@/common/constants/api";

/** Min interval (ms) between enabled-features refresh when app comes to foreground. Avoids overloading server. */
const ENABLED_FEATURES_REFRESH_THROTTLE_MS = 60_000;

interface User {
  id: number;
  email: string;
  name?: string;
  email_verified?: boolean;
  profile_picture_url?: string;
}

interface AuthContextType {
  user: User | null;
  permissions: string[];
  /** Plan-enabled feature keys (e.g. ['attendance', 'fees_management']). Use isFeatureEnabled(key) to gate UI. */
  enabledFeatures: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  /** After login with email+password only; set when backend returns multiple schools for that email */
  pendingTenantChoice: { tenants: TenantChoice[]; email: string; password: string } | null;
  login: (email: string, password: string) => Promise<void>;
  /** After user picks a school from pendingTenantChoice */
  loginWithTenant: (tenantId: string) => Promise<void>;
  clearPendingTenantChoice: () => void;
  logout: () => Promise<void>;
  setAuthData: (data: LoginResponse) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  /** True if the tenant's plan has this feature enabled. Gate nav/screens with this. */
  isFeatureEnabled: (featureKey: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissionsState] = useState<string[]>([]);
  const [enabledFeatures, setEnabledFeaturesState] = useState<string[]>([]);
  const [pendingTenantChoice, setPendingTenantChoice] = useState<{
    tenants: TenantChoice[];
    email: string;
    password: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastEnabledFeaturesRefreshRef = useRef(0);

  // Refresh enabled_features from server so plan changes in super admin panel take effect.
  // 1) On every app load / reload (Expo or production): fetch once when user is set and app is active.
  // 2) When app returns to foreground: fetch again (throttled) so changes made while in background apply.
  useEffect(() => {
    if (!user) return;

    const refreshEnabledFeaturesIfNeeded = async () => {
      const now = Date.now();
      if (lastEnabledFeaturesRefreshRef.current > 0 && now - lastEnabledFeaturesRefreshRef.current < ENABLED_FEATURES_REFRESH_THROTTLE_MS) {
        return;
      }
      try {
        const data = await apiGet<{ enabled_features?: string[] }>(
          API_ENDPOINTS.ENABLED_FEATURES
        );
        const features = Array.isArray(data?.enabled_features) ? data.enabled_features : [];
        lastEnabledFeaturesRefreshRef.current = now;
        await setEnabledFeatures(features);
        setEnabledFeaturesState(features);
      } catch {
        // Ignore (offline, 401, etc.) – keep existing enabled_features
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          refreshEnabledFeaturesIfNeeded();
        }
      }
    );

    // On mount/reload app is already "active" – AppState "change" only fires when going background→foreground.
    // So fetch once now so Expo reload / cold start gets latest enabled_features without logout.
    if (AppState.currentState === "active") {
      refreshEnabledFeaturesIfNeeded();
    }

    return () => subscription.remove();
  }, [user]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const [accessToken, refreshToken, userData, userPermissions, storedEnabledFeatures] =
          await Promise.all([
            getAccessToken(),
            getRefreshToken(),
            getUserData(),
            getPermissions(),
            getEnabledFeatures(),
          ]);

        if (accessToken && refreshToken && userData) {
          setUser(userData);
          setPermissionsState(userPermissions || []);
          setEnabledFeaturesState(storedEnabledFeatures || []);
        }
      } catch (error) {
        console.error("Error checking auth:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const setAuthData = async (data: LoginResponse) => {
    if (!data.access_token || !data.refresh_token || !data.user) return;
    const features = data.enabled_features ?? [];
    const tasks: Promise<void>[] = [
      setAccessToken(data.access_token),
      setRefreshToken(data.refresh_token),
      setUserData(data.user),
      setPermissions(data.permissions || []),
      setEnabledFeatures(features),
    ];
    if (data.tenant_id) {
      tasks.push(setTenantId(data.tenant_id));
    }
    await Promise.all(tasks);
    setUser(data.user);
    setPermissionsState(data.permissions || []);
    setEnabledFeaturesState(features);
    // Avoid redundant enabled-features fetch right after login (we already have fresh data)
    lastEnabledFeaturesRefreshRef.current = Date.now();
  };

  const login = async (email: string, password: string) => {
    setPendingTenantChoice(null);
    const response = await loginService({ email, password });
    if (response.requires_tenant_choice && response.tenants?.length) {
      setPendingTenantChoice({
        tenants: response.tenants,
        email,
        password,
      });
      return;
    }
    await setAuthData(response);
  };

  const loginWithTenant = async (tenantId: string) => {
    if (!pendingTenantChoice) return;
    const { email, password } = pendingTenantChoice;
    setPendingTenantChoice(null);
    const response = await loginService({ email, password, tenant_id: tenantId });
    await setAuthData(response);
  };

  const clearPendingTenantChoice = () => setPendingTenantChoice(null);

  const logout = async () => {
    await clearAuth();
    setUser(null);
    setPermissionsState([]);
    setEnabledFeaturesState([]);
  };

  const isFeatureEnabled = (featureKey: string): boolean => {
    if (!enabledFeatures || enabledFeatures.length === 0) return true;
    return enabledFeatures.includes(featureKey);
  };

  // Check if user has a specific permission
  const hasPermission = (permission: string): boolean => {
    if (!permissions || permissions.length === 0) return false;

    // Check for exact permission
    if (permissions.includes(permission)) return true;

    // Check for hierarchical manage permission
    // e.g., if checking "attendance.mark" and user has "attendance.manage"
    const resource = permission.split(".")[0];
    const managePermission = `${resource}.manage`;
    if (permissions.includes(managePermission)) return true;

    // Check for system.manage (super admin)
    if (permissions.includes("system.manage")) return true;

    return false;
  };

  // Check if user has any of the provided permissions
  const hasAnyPermission = (perms: string[]): boolean => {
    return perms.some((perm) => hasPermission(perm));
  };

  // Check if user has all of the provided permissions
  const hasAllPermissions = (perms: string[]): boolean => {
    return perms.every((perm) => hasPermission(perm));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        enabledFeatures,
        isAuthenticated: !!user,
        isLoading,
        pendingTenantChoice,
        login,
        loginWithTenant,
        clearPendingTenantChoice,
        logout,
        setAuthData,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        isFeatureEnabled,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
