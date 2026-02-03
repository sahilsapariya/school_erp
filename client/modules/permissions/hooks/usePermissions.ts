import { useAuth } from '@/modules/auth/hooks/useAuth';

/**
 * Hook for checking permissions
 * 
 * @example
 * const { hasPermission, hasAnyPermission } = usePermissions();
 * 
 * if (hasPermission('student.create')) {
 *   // Show create student button
 * }
 */
export const usePermissions = () => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, permissions } = useAuth();

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    permissions,
  };
};
