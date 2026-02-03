import React, { ReactNode } from "react";
import { usePermissions } from "@/modules/permissions/hooks/usePermissions";

interface ProtectedProps {
  children: ReactNode;
  permission?: string;
  anyPermissions?: string[];
  allPermissions?: string[];
  fallback?: ReactNode;
}

/**
 * Component for conditionally rendering content based on permissions
 *
 * @example
 * // Single permission
 * <Protected permission="student.create">
 *   <Button>Create Student</Button>
 * </Protected>
 *
 * @example
 * // Any of multiple permissions
 * <Protected anyPermissions={['student.read', 'student.manage']}>
 *   <StudentList />
 * </Protected>
 *
 * @example
 * // All permissions required
 * <Protected allPermissions={['student.read', 'class.read']}>
 *   <StudentClassView />
 * </Protected>
 *
 * @example
 * // With fallback
 * <Protected permission="admin.access" fallback={<Text>Access Denied</Text>}>
 *   <AdminPanel />
 * </Protected>
 */
export const Protected: React.FC<ProtectedProps> = ({
  children,
  permission,
  anyPermissions,
  allPermissions,
  fallback = null,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } =
    usePermissions();

  // Check single permission
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  // Check any of multiple permissions
  if (anyPermissions && !hasAnyPermission(anyPermissions)) {
    return <>{fallback}</>;
  }

  // Check all permissions
  if (allPermissions && !hasAllPermissions(allPermissions)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
