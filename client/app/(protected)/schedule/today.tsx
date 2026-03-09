import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import TodayScheduleScreen from "@/modules/schedule/screens/TodayScheduleScreen";

export default function ScheduleTodayPage() {
  const router = useRouter();
  const { isFeatureEnabled } = useAuth();

  useEffect(() => {
    if (!isFeatureEnabled("timetable")) {
      router.replace("/(protected)/home");
    }
  }, [isFeatureEnabled, router]);

  if (!isFeatureEnabled("timetable")) {
    return null;
  }

  return <TodayScheduleScreen />;
}
