import React, { useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useAttendance } from "../hooks/useAttendance";
import { MyClassItem } from "../types";
import { ScreenContainer } from "@/src/components/ui/ScreenContainer";
import { Header } from "@/src/components/ui/Header";
import { LoadingState } from "@/src/components/ui/LoadingState";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { theme } from "@/src/design-system/theme";
import { Icons } from "@/src/design-system/icons";

export default function MyClassesScreen() {
  const router = useRouter();
  const { myClasses, loading, fetchMyClasses } = useAttendance();

  useEffect(() => {
    fetchMyClasses();
  }, []);

  const handleClassPress = (cls: MyClassItem) => {
    router.push({
      pathname: "/(protected)/attendance/mark" as any,
      params: { classId: cls.id, className: `${cls.name} - ${cls.section}` },
    });
  };

  if (loading && myClasses.length === 0) {
    return (
      <ScreenContainer>
        <Header title="My Classes" onBack={() => router.back()} compact />
        <LoadingState message="Loading your classes..." />
      </ScreenContainer>
    );
  }

  const renderItem = ({ item }: { item: MyClassItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleClassPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardIconBg}>
        <Icons.Class size={24} color={theme.colors.primary[500]} />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>
          {item.name} - {item.section}
        </Text>
        <Text style={styles.cardDetail}>{item.academic_year}</Text>
        <View style={styles.cardStat}>
          <Icons.Users size={13} color={theme.colors.text[500]} />
          <Text style={styles.cardStatText}>{item.student_count} students</Text>
        </View>
      </View>
      <View style={styles.markBtn}>
        <Text style={styles.markBtnText}>Mark</Text>
        <Icons.ChevronRight size={16} color={theme.colors.primary[500]} />
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      <Header title="My Classes" onBack={() => router.back()} compact />
      <FlatList
        data={myClasses}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchMyClasses}
            tintColor={theme.colors.primary[500]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Icons.Class size={32} color={theme.colors.primary[400]} />}
            title="No classes assigned"
            description="Contact your admin to get assigned to classes."
          />
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: theme.spacing.m,
    gap: theme.spacing.s,
    paddingBottom: theme.spacing.xxl,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  cardIconBg: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.l,
    backgroundColor: theme.colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.m,
    flexShrink: 0,
  },
  cardInfo: { flex: 1 },
  cardTitle: {
    ...theme.typography.body,
    fontWeight: "600",
    color: theme.colors.text[900],
  },
  cardDetail: {
    ...theme.typography.caption,
    color: theme.colors.text[500],
    marginTop: 2,
  },
  cardStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: theme.spacing.xs,
  },
  cardStatText: {
    ...theme.typography.caption,
    color: theme.colors.text[500],
  },
  markBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: theme.radius.l,
  },
  markBtnText: {
    ...theme.typography.caption,
    fontWeight: "600",
    color: theme.colors.primary[500],
  },
});
