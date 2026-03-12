import { useEffect, useState } from "react";
import { FlatList, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { classService } from "@/modules/classes/services/classService";
import { ClassItem } from "@/modules/classes/types";
import { ScreenContainer } from "@/src/components/ui/ScreenContainer";
import { Header } from "@/src/components/ui/Header";
import { DataRow } from "@/src/components/ui/DataRow";
import { LoadingState } from "@/src/components/ui/LoadingState";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { theme } from "@/src/design-system/theme";
import { Icons } from "@/src/design-system/icons";

export default function TimetableIndexPage() {
  const router = useRouter();
  const { isFeatureEnabled } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFeatureEnabled("class_management")) {
      router.replace("/(protected)/dashboard" as any);
      return;
    }
    classService.getClasses()
      .then((data) => setClasses(Array.isArray(data) ? data : []))
      .catch(() => setClasses([]))
      .finally(() => setLoading(false));
  }, [isFeatureEnabled, router]);

  if (!isFeatureEnabled("class_management")) return null;

  if (loading) {
    return (
      <ScreenContainer>
        <Header title="Select Class" onBack={() => router.back()} compact />
        <LoadingState message="Loading classes..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Header title="Select Class" subtitle="Choose a class to view its timetable" onBack={() => router.back()} compact />
      <FlatList
        data={classes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: theme.spacing.m, paddingBottom: theme.spacing.xxl }}
        renderItem={({ item }) => (
          <DataRow
            title={`${item.name} – ${item.section}`}
            subtitle={item.academic_year}
            leftIcon={<Icons.Calendar size={20} color={theme.colors.primary[500]} />}
            rightComponent={<Icons.ChevronRight size={18} color={theme.colors.text[400]} />}
            onPress={() => router.push(`/(protected)/timetable/${item.id}` as any)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon={<Icons.Class size={32} color={theme.colors.primary[300]} />}
            title="No classes found"
            description="No classes have been created yet."
          />
        }
      />
    </ScreenContainer>
  );
}
