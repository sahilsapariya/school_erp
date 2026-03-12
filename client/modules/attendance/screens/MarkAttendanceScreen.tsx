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
import { holidayService } from "@/modules/holidays/services/holidayService";
import { Holiday } from "@/modules/holidays/types";

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

  // Holiday awareness
  const [holidayMap, setHolidayMap] = useState<Record<string, Holiday>>({});

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

  // Fetch holidays for the date range shown in the strip
  useEffect(() => {
    const loadHolidays = async () => {
      if (dateList.length === 0) return;
      try {
        const startDate = dateList[0].dateStr;
        const endDate = dateList[dateList.length - 1].dateStr;
        const [nonRecurring, recurring] = await Promise.all([
          holidayService.getHolidays({ start_date: startDate, end_date: endDate, include_recurring: false }),
          holidayService.getRecurring(),
        ]);
        const map: Record<string, Holiday> = {};
        // Expand non-recurring holiday ranges into individual dates
        for (const h of nonRecurring) {
          if (!h.start_date) continue;
          const hStart = new Date(h.start_date);
          const hEnd = new Date(h.end_date || h.start_date);
          const cur = new Date(hStart);
          while (cur <= hEnd) {
            const ds = cur.toISOString().split("T")[0];
            if (!map[ds]) map[ds] = h;
            cur.setDate(cur.getDate() + 1);
          }
        }
        // Map recurring (weekly-off) holidays — convert JS getDay() to backend weekday (0=Mon…6=Sun)
        for (const item of dateList) {
          const d = new Date(item.dateStr);
          const backendWeekday = (d.getDay() + 6) % 7;
          const match = recurring.find((r) => r.recurring_day_of_week === backendWeekday);
          if (match && !map[item.dateStr]) map[item.dateStr] = match;
        }
        setHolidayMap(map);
      } catch {
        // Holiday indicators are informational — fail silently
      }
    };
    loadHolidays();
  }, [dateList]);

  // Derived: is the currently selected date a holiday?
  const selectedHoliday = holidayMap[selectedDate] ?? null;
  const isSelectedHoliday = selectedHoliday !== null;

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

    if (isSelectedHoliday) {
      const label = selectedHoliday.is_recurring
        ? (selectedHoliday.recurring_day_name ?? "Weekly Off")
        : selectedHoliday.name;
      Alert.alert("Holiday", `Cannot mark attendance on "${label}". This day is a holiday.`);
      return;
    }

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
        style={[styles.studentRow, isSelectedHoliday && styles.studentRowDisabled]}
        onPress={isSelectedHoliday ? undefined : () => toggleStatus(item.student_id)}
        activeOpacity={isSelectedHoliday ? 1 : 0.7}
        disabled={isSelectedHoliday}
      >
        <View style={styles.studentInfo}>
          <Text style={[styles.studentName, isSelectedHoliday && { color: Colors.textTertiary }]}>
            {item.student_name}
          </Text>
          <Text style={styles.studentDetail}>
            {item.roll_number ? `Roll: ${item.roll_number} - ` : ""}
            {item.admission_number}
          </Text>
        </View>
        <View style={[styles.statusBadge, { borderColor: isSelectedHoliday ? Colors.borderLight : icon.color }]}>
          <Ionicons
            name={icon.name}
            size={24}
            color={isSelectedHoliday ? Colors.textTertiary : icon.color}
          />
          <Text style={[styles.statusText, { color: isSelectedHoliday ? Colors.textTertiary : icon.color }]}>
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
            const isHolidayDate = !!holidayMap[item.dateStr];
            return (
              <TouchableOpacity
                key={item.dateStr}
                style={[
                  styles.dateCell,
                  isSelected && styles.dateCellSelected,
                  item.isToday && !isSelected && styles.dateCellToday,
                  isHolidayDate && !isSelected && styles.dateCellHoliday,
                ]}
                onPress={() => setSelectedDate(item.dateStr)}
                activeOpacity={0.7}
              >
                {isHolidayDate && (
                  <View style={[styles.holidayDot, isSelected && styles.holidayDotSelected]} />
                )}
                <Text
                  style={[
                    styles.dateWeekday,
                    isSelected && styles.dateTextSelected,
                    isHolidayDate && !isSelected && styles.dateTextHoliday,
                  ]}
                >
                  {item.weekday}
                </Text>
                <Text
                  style={[
                    styles.dateDay,
                    isSelected && styles.dateTextSelected,
                    isHolidayDate && !isSelected && styles.dateTextHoliday,
                  ]}
                >
                  {item.day}
                </Text>
                <Text
                  style={[
                    styles.dateMonth,
                    isSelected && styles.dateTextSelected,
                    isHolidayDate && !isSelected && styles.dateTextHoliday,
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

      {/* Holiday Banner */}
      {isSelectedHoliday && (
        <View style={styles.holidayBanner}>
          <Ionicons name="umbrella-outline" size={20} color="#FF6B35" />
          <View style={{ flex: 1 }}>
            <Text style={styles.holidayBannerTitle}>
              {selectedHoliday.is_recurring
                ? `Weekly Off — ${selectedHoliday.recurring_day_name ?? "Off Day"}`
                : selectedHoliday.name}
            </Text>
            <Text style={styles.holidayBannerSubtitle}>
              Attendance cannot be marked on this holiday.
            </Text>
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickBtn, isSelectedHoliday && styles.quickBtnDisabled]}
          onPress={isSelectedHoliday ? undefined : markAllPresent}
          disabled={isSelectedHoliday}
        >
          <Text style={[styles.quickBtnText, isSelectedHoliday && { color: Colors.textTertiary }]}>
            All Present
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickBtn, isSelectedHoliday && styles.quickBtnDisabled]}
          onPress={isSelectedHoliday ? undefined : markAllAbsent}
          disabled={isSelectedHoliday}
        >
          <Text style={[styles.quickBtnText, isSelectedHoliday && { color: Colors.textTertiary }]}>
            All Absent
          </Text>
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
          style={[
            styles.submitButton,
            (submitting || isSelectedHoliday) && styles.submitDisabled,
            isSelectedHoliday && styles.submitHoliday,
          ]}
          onPress={handleSubmit}
          disabled={submitting || isSelectedHoliday}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : isSelectedHoliday ? (
            <View style={styles.submitHolidayContent}>
              <Ionicons name="ban-outline" size={18} color="#FFFFFF" />
              <Text style={styles.submitText}>Holiday — Attendance Disabled</Text>
            </View>
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
  dateCellHoliday: {
    backgroundColor: "#FFF3F0",
    borderWidth: 1,
    borderColor: "#FF6B35",
  },
  dateTextHoliday: {
    color: "#FF6B35",
  },
  holidayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#FF6B35",
    position: "absolute",
    top: 4,
    right: 4,
  },
  holidayDotSelected: {
    backgroundColor: "#FFFFFF",
  },
  holidayBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: "#FFF3F0",
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: "#FF6B35",
  },
  holidayBannerTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#CC3300",
  },
  holidayBannerSubtitle: {
    fontSize: 12,
    color: "#FF6B35",
    marginTop: 2,
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
  quickBtnDisabled: {
    opacity: 0.4,
    backgroundColor: Colors.backgroundSecondary,
  },
  studentRowDisabled: {
    opacity: 0.5,
  },
  submitHoliday: {
    backgroundColor: "#CC3300",
  },
  submitHolidayContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
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
