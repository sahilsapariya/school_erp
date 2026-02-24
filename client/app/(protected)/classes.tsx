import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import ClassesScreen from "@/modules/classes/screens/ClassesScreen";

export default function Page() {
  const router = useRouter();
  const { isFeatureEnabled } = useAuth();

  useEffect(() => {
    if (!isFeatureEnabled("class_management")) {
      router.replace("/(protected)/home");
    }
  }, [isFeatureEnabled, router]);

  if (!isFeatureEnabled("class_management")) {
    return null;
  }

  return <ClassesScreen />;
}
