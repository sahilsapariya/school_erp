import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import StudentsScreen from "@/modules/students/screens/StudentsScreen";

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

  return <StudentsScreen />;
}
