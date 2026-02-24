import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import TeacherDetailScreen from "@/modules/teachers/screens/TeacherDetailScreen";

export default function Page() {
  const router = useRouter();
  const { isFeatureEnabled } = useAuth();

  useEffect(() => {
    if (!isFeatureEnabled("teacher_management")) {
      router.replace("/(protected)/home");
    }
  }, [isFeatureEnabled, router]);

  if (!isFeatureEnabled("teacher_management")) {
    return null;
  }

  return <TeacherDetailScreen />;
}
