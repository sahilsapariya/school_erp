import React, { useEffect } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useAttendance } from "../hooks/useAttendance";
import { ScreenContainer } from "@/src/components/ui/ScreenContainer";
import { Header } from "@/src/components/ui/Header";
import { SurfaceCard } from "@/src/components/ui/SurfaceCard";
import { LoadingState } from "@/src/components/ui/LoadingState";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { theme } from "@/src/design-system/theme";
import { Icons } from "@/src/design-system/icons";

export default function MyAttendanceScreen() {
  const router = useRouter();
  const { studentAttendance, loading, fetchMyAttendance } = useAttendance();

  useEffect(() => {
    fetchMyAttendance();
  }, []);

  const percentage = studentAttendance?.percentage ?? 0;
  const percentageStatus =
    percentage >= 75 ? "success" : percentage >= 50 ? "warning" : "danger";
  const percentageColor =
    percentageStatus === "success"
      ? theme.colors.success
      : percentageStatus === "warning"
      ? theme.colors.warning
      : theme.colors.danger;

  if (loading && !studentAttendance) {
    return (
      <ScreenContainer>
        <Header title="My Attendance" onBack={() => router.back()} compact />
        <LoadingState message="Loading attendance..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Header title="My Attendance" onBack={() => router.back()} compact />
      <FlatList
        data={studentAttendance?.records || []}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => fetchMyAttendance()}
            tintColor={theme.colors.primary[500]}
          />
        }
        ListHeaderComponent={
          studentAttendance ? (
            <SurfaceCard style={styles.summaryCard}>
              <View style={styles.summaryInner}>
                <View style={[styles.percentRing, { borderColor: percentageColor }]}>
                  <Text style={[styles.percentValue, { color: percentageColor }]}>
                    {percentage}%
                  </Text>
                  <Text style={styles.percentLabel}>Attendance</Text>
                </View>
                <View style={styles.summaryStats}>
                  <SummaryRow
                    icon={<Icons.CheckMark size={16} color={theme.colors.success} />}
                    label="Present"
                    value={studentAttendance.present}
                    color={theme.colors.success}
                  />
                  <SummaryRow
                    icon={<Icons.Close size={16} color={theme.colors.danger} />}
                    label="Absent"
                    value={studentAttendance.absent}
                    color={theme.colors.danger}
                  />
                  <SummaryRow
                    icon={<Icons.Clock size={16} color={theme.colors.warning} />}
                    label="Late"
                    value={studentAttendance.late}
                    color={theme.colors.warning}
                  />
                  <SummaryRow
                    icon={<Icons.Calendar size={16} color={theme.colors.text[500]} />}
                    label="Total Days"
                    value={studentAttendance.total_days}
                    color={theme.colors.text[500]}
                  />
                </View>
              </View>
            </SurfaceCard>
          ) : null
        }
        renderItem={({ item }) => {
          const status =
            item.status === "present"
              ? "success"
              : item.status === "absent"
              ? "danger"
              : item.status === "late"
              ? "warning"
              : "info";
          return (
            <View style={styles.recordRow}>
              <View style={styles.recordInfo}>
                <Text style={styles.recordDate}>{item.date}</Text>
                {item.remarks ? (
                  <Text style={styles.recordRemarks}>{item.remarks}</Text>
                ) : null}
              </View>
              <StatusBadge status={status} label={item.status || "—"} />
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            title="No records"
            description="Your attendance records will appear here."
          />
        }
      />
    </ScreenContainer>
  );
}

const SummaryRow = ({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) => (
  <View style={styles.summaryRow}>
    {icon}
    <Text style={styles.summaryLabel}>{label}:</Text>
    <Text style={[styles.summaryValue, { color }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: theme.spacing.m,
    paddingBottom: theme.spacing.xxl,
  },
  summaryCard: { marginBottom: theme.spacing.m, marginTop: theme.spacing.m },
  summaryInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  percentRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.l,
    flexShrink: 0,
  },
  percentValue: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 24,
  },
  percentLabel: {
    ...theme.typography.caption,
    color: theme.colors.text[500],
  },
  summaryStats: { flex: 1, gap: theme.spacing.s },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.s,
  },
  summaryLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.text[700],
    flex: 1,
  },
  summaryValue: {
    ...theme.typography.bodySmall,
    fontWeight: "600",
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  recordInfo: { flex: 1 },
  recordDate: {
    ...theme.typography.body,
    fontWeight: "500",
    color: theme.colors.text[900],
  },
  recordRemarks: {
    ...theme.typography.caption,
    color: theme.colors.text[500],
    marginTop: 2,
  },
});
