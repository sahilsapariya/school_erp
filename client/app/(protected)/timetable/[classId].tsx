import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import WeeklyTimetableScreen from "@/modules/timetable/screens/WeeklyTimetableScreen";

export default function TimetableClassPage() {
  const router = useRouter();
  const { isFeatureEnabled } = useAuth();

  useEffect(() => {
    if (!isFeatureEnabled("class_management")) {
      router.replace("/(protected)/dashboard" as any);
    }
  }, [isFeatureEnabled, router]);

  if (!isFeatureEnabled("class_management")) {
    return null;
  }

  return <WeeklyTimetableScreen />;
}
