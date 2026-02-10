import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAttendance } from "../hooks/useAttendance";
import { Colors } from "@/common/constants/colors";
import { Spacing, Layout } from "@/common/constants/spacing";

export default function MyAttendanceScreen() {
  const router = useRouter();
  const { studentAttendance, loading, fetchMyAttendance } = useAttendance();
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchMyAttendance(selectedMonth);
  }, [selectedMonth]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present": return Colors.success;
      case "absent": return Colors.error;
      case "late": return Colors.warning;
      default: return Colors.textTertiary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present": return "checkmark-circle" as const;
      case "absent": return "close-circle" as const;
      case "late": return "time" as const;
      default: return "ellipse-outline" as const;
    }
  };

  const percentage = studentAttendance?.percentage ?? 0;
  const percentageColor = percentage >= 75 ? Colors.success : percentage >= 50 ? Colors.warning : Colors.error;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Attendance</Text>
      </View>

      {loading && !studentAttendance ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <>
          {/* Summary Card */}
          {studentAttendance && (
            <View style={styles.summaryCard}>
              <View style={styles.percentageCircle}>
                <Text style={[styles.percentageText, { color: percentageColor }]}>
                  {percentage}%
                </Text>
                <Text style={styles.percentageLabel}>Attendance</Text>
              </View>
              <View style={styles.summaryStats}>
                <View style={styles.summaryRow}>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                  <Text style={styles.summaryText}>Present: {studentAttendance.present}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Ionicons name="close-circle" size={18} color={Colors.error} />
                  <Text style={styles.summaryText}>Absent: {studentAttendance.absent}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Ionicons name="time" size={18} color={Colors.warning} />
                  <Text style={styles.summaryText}>Late: {studentAttendance.late}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} />
                  <Text style={styles.summaryText}>Total Days: {studentAttendance.total_days}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Records List */}
          <FlatList
            data={studentAttendance?.records || []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={() => fetchMyAttendance(selectedMonth)} />
            }
            renderItem={({ item }) => (
              <View style={styles.recordRow}>
                <Ionicons
                  name={getStatusIcon(item.status)}
                  size={22}
                  color={getStatusColor(item.status)}
                />
                <View style={styles.recordInfo}>
                  <Text style={styles.recordDate}>{item.date}</Text>
                  {item.remarks && (
                    <Text style={styles.recordRemarks}>{item.remarks}</Text>
                  )}
                </View>
                <Text style={[styles.recordStatus, { color: getStatusColor(item.status) }]}>
                  {item.status}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyText}>No attendance records found</Text>
              </View>
            }
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: Spacing.xl },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backIcon: { padding: Spacing.sm },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: "bold", color: Colors.text, marginLeft: Spacing.md },
  summaryCard: {
    flexDirection: "row",
    margin: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Layout.borderRadius.lg,
    alignItems: "center",
  },
  percentageCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 4,
    borderColor: Colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.lg,
  },
  percentageText: { fontSize: 22, fontWeight: "700" },
  percentageLabel: { fontSize: 11, color: Colors.textSecondary },
  summaryStats: { flex: 1, gap: Spacing.sm },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  summaryText: { fontSize: 14, color: Colors.text },
  listContent: { padding: Spacing.md },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.md,
  },
  recordInfo: { flex: 1 },
  recordDate: { fontSize: 15, fontWeight: "500", color: Colors.text },
  recordRemarks: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  recordStatus: { fontSize: 14, fontWeight: "600", textTransform: "capitalize" },
  emptyText: { fontSize: 16, color: Colors.textSecondary },
});
