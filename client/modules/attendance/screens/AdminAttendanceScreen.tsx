import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useAttendance } from "../hooks/useAttendance";
import { useClasses } from "@/modules/classes/hooks/useClasses";
import { ClassItem } from "@/modules/classes/types";
import { ScreenContainer } from "@/src/components/ui/ScreenContainer";
import { Header } from "@/src/components/ui/Header";
import { SurfaceCard } from "@/src/components/ui/SurfaceCard";
import { LoadingState } from "@/src/components/ui/LoadingState";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { SearchBar } from "@/src/components/ui/SearchBar";
import { theme } from "@/src/design-system/theme";
import { Icons } from "@/src/design-system/icons";
import { useDebounce } from "@/src/hooks/useDebounce";

export default function AdminAttendanceScreen() {
  const router = useRouter();
  const { classAttendance, loading: attLoading, fetchClassAttendance } = useAttendance();
  const { classes, fetchClasses, loading: classesLoading } = useClasses();

  const today = new Date().toISOString().split("T")[0];
  const [selectedDate] = useState(today);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [classSearch, setClassSearch] = useState("");
  const debouncedSearch = useDebounce(classSearch, 300);

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleClassSelect = (cls: ClassItem) => {
    setSelectedClass(cls);
    fetchClassAttendance(cls.id, selectedDate);
  };

  const filteredClasses = debouncedSearch
    ? classes.filter((c) =>
        `${c.name} ${c.section}`.toLowerCase().includes(debouncedSearch.toLowerCase())
      )
    : classes;

  const getStatusBadgeType = (status: string): "success" | "danger" | "warning" | "info" => {
    switch (status) {
      case "present": return "success";
      case "absent": return "danger";
      case "late": return "warning";
      default: return "info";
    }
  };

  return (
    <ScreenContainer>
      <Header title="Attendance Overview" onBack={() => router.back()} compact />

      {!selectedClass ? (
        <>
          <View style={styles.searchWrap}>
            <SearchBar
              value={classSearch}
              onChangeText={setClassSearch}
              placeholder="Search classes..."
            />
          </View>
          {classesLoading && classes.length === 0 ? (
            <LoadingState message="Loading classes..." />
          ) : (
            <FlatList
              data={filteredClasses}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.classCard}
                  onPress={() => handleClassSelect(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.classIconBg}>
                    <Icons.Class size={22} color={theme.colors.primary[500]} />
                  </View>
                  <View style={styles.classInfo}>
                    <Text style={styles.className}>
                      {item.name} - {item.section}
                    </Text>
                    <Text style={styles.classDetail}>{item.academic_year}</Text>
                  </View>
                  <Icons.ChevronRight size={18} color={theme.colors.text[400]} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <EmptyState title="No classes found" description="Try adjusting your search." />
              }
            />
          )}
        </>
      ) : (
        <>
          <TouchableOpacity
            style={styles.selectedClassBanner}
            onPress={() => setSelectedClass(null)}
          >
            <View style={styles.selectedClassInfo}>
              <Icons.Class size={18} color={theme.colors.primary[500]} />
              <Text style={styles.selectedClassName}>
                {selectedClass.name} - {selectedClass.section}
              </Text>
            </View>
            <Text style={styles.changeText}>Change</Text>
          </TouchableOpacity>

          <View style={styles.dateInfo}>
            <Icons.Calendar size={14} color={theme.colors.text[500]} />
            <Text style={styles.dateText}>{selectedDate}</Text>
          </View>

          {classAttendance && (
            <View style={styles.statsRow}>
              <StatBox
                label="Total"
                value={classAttendance.total_students}
                color={theme.colors.text[700]}
              />
              <StatBox
                label="Present"
                value={classAttendance.present_count ?? 0}
                color={theme.colors.success}
              />
              <StatBox
                label="Absent"
                value={classAttendance.absent_count ?? 0}
                color={theme.colors.danger}
              />
              <StatBox
                label="Late"
                value={classAttendance.late_count ?? 0}
                color={theme.colors.warning}
              />
            </View>
          )}

          {attLoading ? (
            <LoadingState message="Loading attendance..." />
          ) : (
            <FlatList
              data={classAttendance?.attendance || []}
              keyExtractor={(item) => item.student_id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.recordRow}>
                  <View style={styles.recordInfo}>
                    <Text style={styles.recordName}>{item.student_name}</Text>
                    <Text style={styles.recordAdm}>{item.admission_number}</Text>
                  </View>
                  {item.marked ? (
                    <StatusBadge
                      status={getStatusBadgeType(item.status || "")}
                      label={item.status || "—"}
                    />
                  ) : (
                    <StatusBadge status="info" label="Not Marked" />
                  )}
                </View>
              )}
              ListEmptyComponent={
                <EmptyState
                  title="No attendance data"
                  description="No attendance recorded for this date."
                />
              }
            />
          )}
        </>
      )}
    </ScreenContainer>
  );
}

const StatBox = ({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) => (
  <View style={styles.statBox}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  searchWrap: {
    paddingHorizontal: theme.spacing.m,
    paddingTop: theme.spacing.s,
    paddingBottom: theme.spacing.s,
  },
  listContent: {
    paddingHorizontal: theme.spacing.m,
    paddingBottom: theme.spacing.xxl,
  },
  classCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.s,
    ...theme.shadows.sm,
  },
  classIconBg: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.l,
    backgroundColor: theme.colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.m,
    flexShrink: 0,
  },
  classInfo: { flex: 1 },
  className: {
    ...theme.typography.body,
    fontWeight: "600",
    color: theme.colors.text[900],
  },
  classDetail: {
    ...theme.typography.caption,
    color: theme.colors.text[500],
    marginTop: 2,
  },
  selectedClassBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.primary[50],
    marginHorizontal: theme.spacing.m,
    marginTop: theme.spacing.s,
    marginBottom: theme.spacing.xs,
    padding: theme.spacing.m,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
  },
  selectedClassInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.s,
  },
  selectedClassName: {
    ...theme.typography.body,
    fontWeight: "600",
    color: theme.colors.primary[600],
  },
  changeText: {
    ...theme.typography.label,
    color: theme.colors.primary[500],
    fontWeight: "600",
  },
  dateInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.m,
    paddingBottom: theme.spacing.s,
  },
  dateText: {
    ...theme.typography.caption,
    color: theme.colors.text[500],
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.s,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: theme.spacing.m,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.text[500],
    marginTop: 2,
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  recordInfo: { flex: 1 },
  recordName: {
    ...theme.typography.body,
    fontWeight: "500",
    color: theme.colors.text[900],
  },
  recordAdm: {
    ...theme.typography.caption,
    color: theme.colors.text[500],
    marginTop: 2,
  },
});
