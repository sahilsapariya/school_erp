/**
 * Student Detail Route
 * Route: /students/:id
 * Shows detailed information about a specific student.
 * Redirects to home if student_management is disabled for the plan.
 */

import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import StudentDetailScreen from "@/modules/students/screens/StudentDetailScreen";

export default function Page() {
  const router = useRouter();
  const { isFeatureEnabled } = useAuth();

  useEffect(() => {
    if (!isFeatureEnabled("student_management")) {
      router.replace("/(protected)/home");
    }
  }, [isFeatureEnabled, router]);

  if (!isFeatureEnabled("student_management")) {
    return null;
  }

  return <StudentDetailScreen />;
}
