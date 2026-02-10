import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAttendance } from "../hooks/useAttendance";
import { Colors } from "@/common/constants/colors";
import { Spacing, Layout } from "@/common/constants/spacing";
import { AttendanceRecord } from "../types";

export default function MarkAttendanceScreen() {
  const { classId, className } = useLocalSearchParams<{
    classId: string;
    className: string;
  }>();
  const router = useRouter();
  const { classAttendance, loading, fetchClassAttendance, markAttendance } = useAttendance();

  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [localRecords, setLocalRecords] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const dateScrollRef = useRef<ScrollView>(null);

  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Generate last 30 days up to today
  const dateList = useMemo(() => {
    const dates: { dateStr: string; day: number; weekday: string; month: string; isToday: boolean }[] = [];
    const todayDate = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      dates.push({
        dateStr,
        day: d.getDate(),
        weekday: DAY_NAMES[d.getDay()],
        month: MONTH_NAMES[d.getMonth()],
        isToday: dateStr === today,
      });
    }
    return dates;
  }, [today]);

  useEffect(() => {
    if (classId) {
      fetchClassAttendance(classId, selectedDate);
    }
  }, [classId, selectedDate]);

  // Sync fetched attendance into local state
  useEffect(() => {
    if (classAttendance?.attendance) {
      const map: Record<string, string> = {};
      classAttendance.attendance.forEach((r) => {
        if (r.status) map[r.student_id] = r.status;
      });
      setLocalRecords(map);
    }
  }, [classAttendance]);

  const toggleStatus = (studentId: string) => {
    setLocalRecords((prev) => {
      const current = prev[studentId];
      let next: string;
      if (!current || current === "absent") next = "present";
      else if (current === "present") next = "late";
      else next = "absent";
      return { ...prev, [studentId]: next };
    });
  };

  const markAllPresent = () => {
    if (!classAttendance?.attendance) return;
    const map: Record<string, string> = {};
    classAttendance.attendance.forEach((r) => {
      map[r.student_id] = "present";
    });
    setLocalRecords(map);
  };

  const markAllAbsent = () => {
    if (!classAttendance?.attendance) return;
    const map: Record<string, string> = {};
    classAttendance.attendance.forEach((r) => {
      map[r.student_id] = "absent";
    });
    setLocalRecords(map);
  };

  const handleSubmit = async () => {
    if (!classId) return;

    const records = Object.entries(localRecords).map(([student_id, status]) => ({
      student_id,
      status,
    }));

    if (records.length === 0) {
      Alert.alert("Error", "Please mark attendance for at least one student");
      return;
    }

    setSubmitting(true);
    try {
      await markAttendance({
        class_id: classId,
        date: selectedDate,
        records,
      });
      Alert.alert("Success", "Attendance saved successfully", [
        { text: "OK", onPress: () => fetchClassAttendance(classId, selectedDate) },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save attendance");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string | undefined) => {
    switch (status) {
      case "present":
        return { name: "checkmark-circle" as const, color: Colors.success };
      case "absent":
        return { name: "close-circle" as const, color: Colors.error };
      case "late":
        return { name: "time" as const, color: Colors.warning };
      default:
        return { name: "ellipse-outline" as const, color: Colors.textTertiary };
    }
  };

  const renderStudent = ({ item }: { item: AttendanceRecord }) => {
    const status = localRecords[item.student_id];
    const icon = getStatusIcon(status);

    return (
      <TouchableOpacity
        style={styles.studentRow}
        onPress={() => toggleStatus(item.student_id)}
        activeOpacity={0.7}
      >
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{item.student_name}</Text>
          <Text style={styles.studentDetail}>
            {item.roll_number ? `Roll: ${item.roll_number} - ` : ""}
            {item.admission_number}
          </Text>
        </View>
        <View style={[styles.statusBadge, { borderColor: icon.color }]}>
          <Ionicons name={icon.name} size={24} color={icon.color} />
          <Text style={[styles.statusText, { color: icon.color }]}>
            {status || "Not marked"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const presentCount = Object.values(localRecords).filter((s) => s === "present").length;
  const absentCount = Object.values(localRecords).filter((s) => s === "absent").length;
  const lateCount = Object.values(localRecords).filter((s) => s === "late").length;
  const total = classAttendance?.total_students || 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{className || "Attendance"}</Text>
          <Text style={styles.headerDate}>{selectedDate}</Text>
        </View>
      </View>

      {/* Date Navigation Strip */}
      <View style={styles.dateStripContainer}>
        <ScrollView
          ref={dateScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateStripContent}
          onLayout={() => {
            // Auto-scroll to the end (today) on mount
            dateScrollRef.current?.scrollToEnd({ animated: false });
          }}
        >
          {dateList.map((item) => {
            const isSelected = item.dateStr === selectedDate;
            return (
              <TouchableOpacity
                key={item.dateStr}
                style={[
                  styles.dateCell,
                  isSelected && styles.dateCellSelected,
                  item.isToday && !isSelected && styles.dateCellToday,
                ]}
                onPress={() => setSelectedDate(item.dateStr)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dateWeekday,
                    isSelected && styles.dateTextSelected,
                  ]}
                >
                  {item.weekday}
                </Text>
                <Text
                  style={[
                    styles.dateDay,
                    isSelected && styles.dateTextSelected,
                  ]}
                >
                  {item.day}
                </Text>
                <Text
                  style={[
                    styles.dateMonth,
                    isSelected && styles.dateTextSelected,
                  ]}
                >
                  {item.month}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{total}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNumber, { color: Colors.success }]}>{presentCount}</Text>
          <Text style={styles.summaryLabel}>Present</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNumber, { color: Colors.error }]}>{absentCount}</Text>
          <Text style={styles.summaryLabel}>Absent</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNumber, { color: Colors.warning }]}>{lateCount}</Text>
          <Text style={styles.summaryLabel}>Late</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickBtn} onPress={markAllPresent}>
          <Text style={styles.quickBtnText}>All Present</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickBtn} onPress={markAllAbsent}>
          <Text style={styles.quickBtnText}>All Absent</Text>
        </TouchableOpacity>
      </View>

      {/* Student List */}
      {loading && !classAttendance ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={classAttendance?.attendance || []}
          keyExtractor={(item) => item.student_id}
          renderItem={renderStudent}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No students in this class</Text>
            </View>
          }
        />
      )}

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitText}>Save Attendance</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backIcon: { padding: Spacing.sm },
  headerInfo: { marginLeft: Spacing.md },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: Colors.text },
  headerDate: { fontSize: 14, color: Colors.textSecondary },
  dateStripContainer: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.background,
  },
  dateStripContent: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: 6,
  },
  dateCell: {
    width: 52,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.backgroundSecondary,
  },
  dateCellSelected: {
    backgroundColor: Colors.primary,
  },
  dateCellToday: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  dateWeekday: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  dateDay: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginVertical: 2,
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: "500",
    color: Colors.textTertiary,
  },
  dateTextSelected: {
    color: "#FFFFFF",
  },
  summaryBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: Spacing.md,
    backgroundColor: Colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  summaryItem: { alignItems: "center" },
  summaryNumber: { fontSize: 20, fontWeight: "700", color: Colors.text },
  summaryLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  quickActions: {
    flexDirection: "row",
    padding: Spacing.sm,
    gap: Spacing.sm,
    justifyContent: "center",
  },
  quickBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  quickBtnText: { fontSize: 13, fontWeight: "500", color: Colors.text },
  listContent: { padding: Spacing.md },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: "500", color: Colors.text },
  studentDetail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: 1,
    minWidth: 110,
    justifyContent: "center",
  },
  statusText: { fontSize: 13, fontWeight: "500", textTransform: "capitalize" },
  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    alignItems: "center",
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  emptyText: { fontSize: 16, color: Colors.textSecondary },
});
