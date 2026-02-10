import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAttendance } from "../hooks/useAttendance";
import { useClasses } from "@/modules/classes/hooks/useClasses";
import { Colors } from "@/common/constants/colors";
import { Spacing, Layout } from "@/common/constants/spacing";
import { ClassItem } from "@/modules/classes/types";

export default function AdminAttendanceScreen() {
  const router = useRouter();
  const { classAttendance, loading: attLoading, fetchClassAttendance } = useAttendance();
  const { classes, fetchClasses, loading: classesLoading } = useClasses();

  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleClassSelect = (cls: ClassItem) => {
    setSelectedClass(cls);
    fetchClassAttendance(cls.id, selectedDate);
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    if (selectedClass) {
      fetchClassAttendance(selectedClass.id, date);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present": return Colors.success;
      case "absent": return Colors.error;
      case "late": return Colors.warning;
      default: return Colors.textTertiary;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance Overview</Text>
      </View>

      {/* Date Picker */}
      <View style={styles.dateRow}>
        <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />
        <TextInput
          style={styles.dateInput}
          value={selectedDate}
          onChangeText={handleDateChange}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Colors.textTertiary}
        />
      </View>

      {/* Class Selector */}
      {!selectedClass ? (
        <>
          <Text style={styles.sectionLabel}>Select a class:</Text>
          {classesLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : (
            <FlatList
              data={classes}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.classItem}
                  onPress={() => handleClassSelect(item)}
                >
                  <Text style={styles.classItemName}>
                    {item.name} - {item.section}
                  </Text>
                  <Text style={styles.classItemDetail}>{item.academic_year}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </>
      ) : (
        <>
          {/* Selected Class Header */}
          <TouchableOpacity
            style={styles.selectedClass}
            onPress={() => setSelectedClass(null)}
          >
            <Text style={styles.selectedClassName}>
              {selectedClass.name} - {selectedClass.section}
            </Text>
            <Text style={styles.changeText}>Change</Text>
          </TouchableOpacity>

          {/* Summary */}
          {classAttendance && (
            <View style={styles.summaryBar}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNum}>{classAttendance.total_students}</Text>
                <Text style={styles.summaryLabel}>Total</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNum, { color: Colors.success }]}>
                  {classAttendance.present_count}
                </Text>
                <Text style={styles.summaryLabel}>Present</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNum, { color: Colors.error }]}>
                  {classAttendance.absent_count}
                </Text>
                <Text style={styles.summaryLabel}>Absent</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNum, { color: Colors.warning }]}>
                  {classAttendance.late_count}
                </Text>
                <Text style={styles.summaryLabel}>Late</Text>
              </View>
            </View>
          )}

          {/* Attendance Records */}
          {attLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : (
            <FlatList
              data={classAttendance?.attendance || []}
              keyExtractor={(item) => item.student_id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View style={styles.recordRow}>
                  <View style={styles.recordInfo}>
                    <Text style={styles.recordName}>{item.student_name}</Text>
                    <Text style={styles.recordDetail}>{item.admission_number}</Text>
                  </View>
                  <Text
                    style={[
                      styles.recordStatus,
                      { color: getStatusColor(item.status || "unmarked") },
                    ]}
                  >
                    {item.marked ? item.status : "Not marked"}
                  </Text>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.center}>
                  <Text style={styles.emptyText}>No attendance data for this date</Text>
                </View>
              }
            />
          )}
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
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    margin: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Layout.borderRadius.md,
    gap: Spacing.sm,
  },
  dateInput: { flex: 1, fontSize: 16, color: Colors.text },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  listContent: { padding: Spacing.md },
  classItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  classItemName: { fontSize: 16, fontWeight: "500", color: Colors.text },
  classItemDetail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  selectedClass: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    margin: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Layout.borderRadius.md,
  },
  selectedClassName: { fontSize: 16, fontWeight: "600", color: Colors.text },
  changeText: { fontSize: 14, color: Colors.primary, fontWeight: "500" },
  summaryBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: Spacing.md,
    backgroundColor: Colors.backgroundSecondary,
    marginHorizontal: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Spacing.sm,
  },
  summaryItem: { alignItems: "center" },
  summaryNum: { fontSize: 18, fontWeight: "700", color: Colors.text },
  summaryLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  recordInfo: { flex: 1 },
  recordName: { fontSize: 15, fontWeight: "500", color: Colors.text },
  recordDetail: { fontSize: 13, color: Colors.textSecondary },
  recordStatus: { fontSize: 14, fontWeight: "600", textTransform: "capitalize" },
  emptyText: { fontSize: 16, color: Colors.textSecondary },
});
