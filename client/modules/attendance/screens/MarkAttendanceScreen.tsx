import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAttendance } from "../hooks/useAttendance";
import { AttendanceRecord } from "../types";
import { ScreenContainer } from "@/src/components/ui/ScreenContainer";
import { Header } from "@/src/components/ui/Header";
import { PrimaryButton } from "@/src/components/ui/PrimaryButton";
import { LoadingState } from "@/src/components/ui/LoadingState";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { useToast } from "@/src/components/ui/Toast";
import { theme } from "@/src/design-system/theme";
import { Icons } from "@/src/design-system/icons";

type AttendanceStatus = "present" | "absent" | "late";

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  present: {
    label: "Present",
    color: theme.colors.success,
    bg: theme.colors.successLight,
    icon: <Icons.CheckMark size={16} color={theme.colors.success} />,
  },
  late: {
    label: "Late",
    color: theme.colors.warning,
    bg: theme.colors.warningLight,
    icon: <Icons.Clock size={16} color={theme.colors.warning} />,
  },
  absent: {
    label: "Absent",
    color: theme.colors.danger,
    bg: theme.colors.dangerLight,
    icon: <Icons.Close size={16} color={theme.colors.danger} />,
  },
};

export default function MarkAttendanceScreen() {
  const { classId, className } = useLocalSearchParams<{
    classId: string;
    className: string;
  }>();
  const router = useRouter();
  const { classAttendance, loading, fetchClassAttendance, markAttendance } = useAttendance();
  const toast = useToast();

  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [localRecords, setLocalRecords] = useState<Record<string, AttendanceStatus>>({});
  const [submitting, setSubmitting] = useState(false);
  const dateScrollRef = useRef<ScrollView>(null);

  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
    if (classId) fetchClassAttendance(classId, selectedDate);
  }, [classId, selectedDate]);

  useEffect(() => {
    if (classAttendance?.attendance) {
      const map: Record<string, AttendanceStatus> = {};
      classAttendance.attendance.forEach((r) => {
        if (r.status) map[r.student_id] = r.status as AttendanceStatus;
      });
      setLocalRecords(map);
    }
  }, [classAttendance]);

  const toggleStatus = (studentId: string) => {
    setLocalRecords((prev) => {
      const current = prev[studentId];
      let next: AttendanceStatus;
      if (!current || current === "absent") next = "present";
      else if (current === "present") next = "late";
      else next = "absent";
      return { ...prev, [studentId]: next };
    });
  };

  const markAll = (status: AttendanceStatus) => {
    if (!classAttendance?.attendance) return;
    const map: Record<string, AttendanceStatus> = {};
    classAttendance.attendance.forEach((r) => {
      map[r.student_id] = status;
    });
    setLocalRecords(map);
    toast.info(`Marked all as ${status}`);
  };

  const handleSubmit = async () => {
    if (!classId) return;
    const records = Object.entries(localRecords).map(([student_id, status]) => ({
      student_id,
      status,
    }));
    if (records.length === 0) {
      toast.warning("No attendance", "Please mark attendance for at least one student.");
      return;
    }
    setSubmitting(true);
    try {
      await markAttendance({ class_id: classId, date: selectedDate, records });
      toast.success("Attendance saved", `Saved for ${records.length} students.`);
      fetchClassAttendance(classId, selectedDate);
    } catch (err: any) {
      toast.error("Save failed", err.message || "Could not save attendance. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const presentCount = Object.values(localRecords).filter((s) => s === "present").length;
  const absentCount = Object.values(localRecords).filter((s) => s === "absent").length;
  const lateCount = Object.values(localRecords).filter((s) => s === "late").length;
  const total = classAttendance?.total_students || 0;

  const renderStudent = ({ item }: { item: AttendanceRecord }) => {
    const status = localRecords[item.student_id] as AttendanceStatus | undefined;
    const config = status ? STATUS_CONFIG[status] : null;

    return (
      <TouchableOpacity
        style={styles.studentRow}
        onPress={() => toggleStatus(item.student_id)}
        activeOpacity={0.7}
      >
        <View style={styles.studentAvatar}>
          <Text style={styles.studentAvatarText}>
            {item.student_name?.charAt(0)?.toUpperCase() ?? "?"}
          </Text>
        </View>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{item.student_name}</Text>
          <Text style={styles.studentDetail}>
            {item.roll_number ? `Roll: ${item.roll_number} · ` : ""}{item.admission_number}
          </Text>
        </View>
        <View
          style={[
            styles.statusChip,
            { backgroundColor: config ? config.bg : theme.colors.backgroundSecondary },
          ]}
        >
          {config ? config.icon : <Icons.AlertCircle size={16} color={theme.colors.text[400]} />}
          <Text
            style={[
              styles.statusChipText,
              { color: config ? config.color : theme.colors.text[400] },
            ]}
          >
            {config ? config.label : "—"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer edges={["top"]}>
      <Header
        title={className || "Attendance"}
        subtitle={selectedDate}
        onBack={() => router.back()}
        compact
      />

      {/* Date Strip */}
      <View style={styles.dateStripContainer}>
        <ScrollView
          ref={dateScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateStripContent}
          onLayout={() => dateScrollRef.current?.scrollToEnd({ animated: false })}
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
                <Text style={[styles.dateWeekday, isSelected && styles.dateTextSelected]}>
                  {item.weekday}
                </Text>
                <Text style={[styles.dateDay, isSelected && styles.dateTextSelected]}>
                  {item.day}
                </Text>
                <Text style={[styles.dateMonth, isSelected && styles.dateTextSelected]}>
                  {item.month}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatItem label="Total" value={total} color={theme.colors.text[700]} />
        <View style={styles.statDivider} />
        <StatItem label="Present" value={presentCount} color={theme.colors.success} />
        <View style={styles.statDivider} />
        <StatItem label="Absent" value={absentCount} color={theme.colors.danger} />
        <View style={styles.statDivider} />
        <StatItem label="Late" value={lateCount} color={theme.colors.warning} />
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickBtn} onPress={() => markAll("present")}>
          <Icons.CheckMark size={14} color={theme.colors.success} />
          <Text style={[styles.quickBtnText, { color: theme.colors.success }]}>All Present</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickBtn} onPress={() => markAll("absent")}>
          <Icons.Close size={14} color={theme.colors.danger} />
          <Text style={[styles.quickBtnText, { color: theme.colors.danger }]}>All Absent</Text>
        </TouchableOpacity>
      </View>

      {/* Student List */}
      {loading && !classAttendance ? (
        <LoadingState message="Loading students..." />
      ) : (
        <FlatList
          data={classAttendance?.attendance || []}
          keyExtractor={(item) => item.student_id}
          renderItem={renderStudent}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              title="No students found"
              description="This class has no students enrolled."
            />
          }
        />
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <PrimaryButton
          title="Save Attendance"
          onPress={handleSubmit}
          loading={submitting}
        />
      </View>
    </ScreenContainer>
  );
}

const StatItem = ({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) => (
  <View style={styles.statItem}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  dateStripContainer: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  dateStripContent: {
    paddingHorizontal: theme.spacing.s,
    paddingVertical: theme.spacing.s,
    gap: 6,
  },
  dateCell: {
    width: 52,
    paddingVertical: 8,
    borderRadius: theme.radius.l,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.backgroundSecondary,
  },
  dateCellSelected: {
    backgroundColor: theme.colors.primary[500],
  },
  dateCellToday: {
    borderWidth: 1.5,
    borderColor: theme.colors.primary[500],
  },
  dateWeekday: {
    ...theme.typography.caption,
    color: theme.colors.text[500],
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  dateDay: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text[900],
    marginVertical: 2,
  },
  dateMonth: {
    ...theme.typography.caption,
    color: theme.colors.text[400],
  },
  dateTextSelected: {
    color: "white",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.m,
    paddingHorizontal: theme.spacing.m,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: theme.colors.border,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.text[500],
    marginTop: 2,
  },
  quickActions: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.s,
    gap: theme.spacing.s,
    backgroundColor: theme.colors.background,
  },
  quickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.s,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.l,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  quickBtnText: {
    ...theme.typography.caption,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: theme.spacing.m,
    paddingBottom: theme.spacing.xl,
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primary[100],
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.sm,
    flexShrink: 0,
  },
  studentAvatarText: {
    ...theme.typography.label,
    fontWeight: "700",
    color: theme.colors.primary[600],
  },
  studentInfo: {
    flex: 1,
    marginRight: theme.spacing.s,
  },
  studentName: {
    ...theme.typography.body,
    fontWeight: "500",
    color: theme.colors.text[900],
  },
  studentDetail: {
    ...theme.typography.caption,
    color: theme.colors.text[500],
    marginTop: 2,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.s,
    paddingVertical: 5,
    borderRadius: theme.radius.l,
    minWidth: 90,
    justifyContent: "center",
  },
  statusChipText: {
    ...theme.typography.caption,
    fontWeight: "600",
  },
  footer: {
    padding: theme.spacing.m,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
});
