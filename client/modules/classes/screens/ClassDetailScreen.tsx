import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useClasses } from "../hooks/useClasses";
import { usePermissions } from "@/modules/permissions/hooks/usePermissions";
import * as PERMS from "@/modules/permissions/constants/permissions";
import { Colors } from "@/common/constants/colors";
import { Spacing, Layout } from "@/common/constants/spacing";
import { Student } from "@/modules/students/types";
import { Teacher } from "@/modules/teachers/types";

export default function ClassDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    currentClass,
    loading,
    fetchClassDetail,
    assignStudent,
    removeStudent,
    assignTeacher,
    removeTeacher,
    fetchUnassignedStudents,
    fetchUnassignedTeachers,
    unassignedStudents,
    unassignedTeachers,
  } = useClasses();
  const { hasPermission } = usePermissions();

  const canUpdate = hasPermission(PERMS.CLASS_UPDATE);
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [showTeacherPicker, setShowTeacherPicker] = useState(false);

  useEffect(() => {
    if (id) fetchClassDetail(id);
  }, [id]);

  const handleAssignStudent = async (student: Student) => {
    if (!id) return;
    try {
      await assignStudent(id, student.id);
      setShowStudentPicker(false);
      Alert.alert("Success", `${student.name} assigned to class`);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to assign student");
    }
  };

  const handleRemoveStudent = (student: Student) => {
    Alert.alert("Remove Student", `Remove ${student.name} from this class?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          if (!id) return;
          try {
            await removeStudent(id, student.id);
          } catch (err: any) {
            Alert.alert("Error", err.message);
          }
        },
      },
    ]);
  };

  const handleAssignTeacher = async (teacher: Teacher) => {
    if (!id) return;
    try {
      await assignTeacher(id, teacher.id);
      setShowTeacherPicker(false);
      Alert.alert("Success", `${teacher.name} assigned to class`);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to assign teacher");
    }
  };

  const handleRemoveTeacher = (teacherId: string, teacherName: string) => {
    Alert.alert("Remove Teacher", `Remove ${teacherName} from this class?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          if (!id) return;
          try {
            await removeTeacher(id, teacherId);
          } catch (err: any) {
            Alert.alert("Error", err.message);
          }
        },
      },
    ]);
  };

  const openStudentPicker = async () => {
    if (!id) return;
    await fetchUnassignedStudents(id);
    setShowStudentPicker(true);
  };

  const openTeacherPicker = async () => {
    if (!id) return;
    await fetchUnassignedTeachers(id);
    setShowTeacherPicker(true);
  };

  if (loading && !currentClass) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!currentClass) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Class not found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {currentClass.name} - {currentClass.section}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Class Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Class Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Academic Year</Text>
            <Text style={styles.value}>{currentClass.academic_year}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Class Teacher</Text>
            <Text style={styles.value}>{currentClass.teacher_name || "Not assigned"}</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{currentClass.student_count || 0}</Text>
              <Text style={styles.statLabel}>Students</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{currentClass.teacher_count || 0}</Text>
              <Text style={styles.statLabel}>Teachers</Text>
            </View>
          </View>
        </View>

        {/* Students Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Students</Text>
            {canUpdate && (
              <TouchableOpacity style={styles.addSmallBtn} onPress={openStudentPicker}>
                <Ionicons name="add" size={20} color={Colors.primary} />
                <Text style={styles.addSmallBtnText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>
          {currentClass.students && currentClass.students.length > 0 ? (
            currentClass.students.map((student) => (
              <View key={student.id} style={styles.listItem}>
                <View style={styles.listItemInfo}>
                  <Text style={styles.listItemName}>{student.name}</Text>
                  <Text style={styles.listItemDetail}>{student.admission_number}</Text>
                </View>
                {canUpdate && (
                  <TouchableOpacity onPress={() => handleRemoveStudent(student)}>
                    <Ionicons name="close-circle-outline" size={22} color={Colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No students assigned</Text>
          )}
        </View>

        {/* Teachers Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Teachers</Text>
            {canUpdate && (
              <TouchableOpacity style={styles.addSmallBtn} onPress={openTeacherPicker}>
                <Ionicons name="add" size={20} color={Colors.primary} />
                <Text style={styles.addSmallBtnText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>
          {currentClass.teachers && currentClass.teachers.length > 0 ? (
            currentClass.teachers.map((ct) => (
              <View key={ct.id} style={styles.listItem}>
                <View style={styles.listItemInfo}>
                  <Text style={styles.listItemName}>{ct.teacher_name}</Text>
                  <Text style={styles.listItemDetail}>
                    {ct.teacher_employee_id}
                    {ct.subject ? ` - ${ct.subject}` : ""}
                  </Text>
                </View>
                {canUpdate && (
                  <TouchableOpacity onPress={() => handleRemoveTeacher(ct.teacher_id, ct.teacher_name)}>
                    <Ionicons name="close-circle-outline" size={22} color={Colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No teachers assigned</Text>
          )}
        </View>
      </ScrollView>

      {/* Student Picker Modal */}
      <Modal visible={showStudentPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Student</Text>
            <TouchableOpacity onPress={() => setShowStudentPicker(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={unassignedStudents}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: Spacing.md }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.pickerItem}
                onPress={() => handleAssignStudent(item)}
              >
                <Text style={styles.pickerName}>{item.name}</Text>
                <Text style={styles.pickerDetail}>{item.admission_number}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyText}>No unassigned students available</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>

      {/* Teacher Picker Modal */}
      <Modal visible={showTeacherPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Teacher</Text>
            <TouchableOpacity onPress={() => setShowTeacherPicker(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={unassignedTeachers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: Spacing.md }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.pickerItem}
                onPress={() => handleAssignTeacher(item)}
              >
                <Text style={styles.pickerName}>{item.name}</Text>
                <Text style={styles.pickerDetail}>
                  {item.employee_id}
                  {item.department ? ` - ${item.department}` : ""}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyText}>No available teachers</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
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
  content: { flex: 1, padding: Spacing.lg },
  section: {
    marginBottom: Spacing.xl,
    backgroundColor: Colors.background,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
  },
  addSmallBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.sm,
    gap: 4,
  },
  addSmallBtnText: { fontSize: 14, color: Colors.primary, fontWeight: "500" },
  infoRow: { marginBottom: Spacing.md },
  label: { fontSize: 14, color: Colors.textSecondary, marginBottom: 4 },
  value: { fontSize: 16, fontWeight: "500", color: Colors.text },
  statsRow: { flexDirection: "row", gap: Spacing.md, marginTop: Spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    alignItems: "center",
  },
  statNumber: { fontSize: 24, fontWeight: "700", color: Colors.text },
  statLabel: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  listItemInfo: { flex: 1 },
  listItemName: { fontSize: 15, fontWeight: "500", color: Colors.text },
  listItemDetail: { fontSize: 13, color: Colors.textSecondary },
  emptyText: { fontSize: 14, color: Colors.textSecondary, fontStyle: "italic" },
  errorText: { fontSize: 16, color: Colors.error, textAlign: "center", marginBottom: Spacing.lg },
  backBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Layout.borderRadius.md,
  },
  backBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  // Modal styles
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: { fontSize: 18, fontWeight: "600", color: Colors.text },
  pickerItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  pickerName: { fontSize: 16, fontWeight: "500", color: Colors.text },
  pickerDetail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
});
