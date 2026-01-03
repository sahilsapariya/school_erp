import { useAuthContext } from '@/common/context/AuthContext';

/**
 * Main authentication hook
 * Provides access to auth state and methods
 */
export const useAuth = () => {
  return useAuthContext();
};

