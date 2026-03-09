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
  TextInput,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useClasses } from "../hooks/useClasses";
import { useSubjectLoad } from "../hooks/useSubjectLoad";
import { CreateClassModal } from "../components/CreateClassModal";
import { usePermissions } from "@/modules/permissions/hooks/usePermissions";
import * as PERMS from "@/modules/permissions/constants/permissions";
import { Colors } from "@/common/constants/colors";
import { Spacing, Layout } from "@/common/constants/spacing";
import { Student } from "@/modules/students/types";
import { Teacher } from "@/modules/teachers/types";
import { subjectService } from "@/modules/subjects/services/subjectService";
import { Subject } from "@/modules/subjects/types";
import { SubjectLoad } from "../types";

export default function ClassDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    currentClass,
    loading,
    fetchClassDetail,
    updateClass,
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
  const canManage = hasPermission(PERMS.CLASS_MANAGE);
  const canViewTimetable = hasPermission(PERMS.TIMETABLE_READ) || hasPermission(PERMS.TIMETABLE_MANAGE);
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [showTeacherPicker, setShowTeacherPicker] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");

  // --- Subject Load ---
  const classId = id || "";
  const {
    subjectLoads,
    loading: loadLoading,
    fetchSubjectLoads,
    createSubjectLoad,
    updateSubjectLoad,
    deleteSubjectLoad,
  } = useSubjectLoad(classId);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [loadSubjectId, setLoadSubjectId] = useState("");
  const [loadPeriods, setLoadPeriods] = useState("4");
  const [loadSubmitting, setLoadSubmitting] = useState(false);
  const [editingLoad, setEditingLoad] = useState<SubjectLoad | null>(null);
  const [editPeriods, setEditPeriods] = useState("4");

  useEffect(() => {
    if (id) {
      fetchClassDetail(id);
      fetchSubjectLoads();
    }
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
    if (!selectedSubjectId) {
      Alert.alert("Select Subject", "Please select a subject first.");
      return;
    }
    try {
      await assignTeacher(id, teacher.id, selectedSubjectId);
      setShowTeacherPicker(false);
      setSelectedSubjectId("");
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

  const handleUpdateClass = async (data: { name: string; section: string; academic_year_id: string; teacher_id?: string; start_date?: string; end_date?: string }) => {
    if (!id) return;
    try {
      await updateClass(id, data);
      setShowEditModal(false);
      Alert.alert("Success", "Class updated successfully");
      fetchClassDetail(id);
    } catch (err: any) {
      throw err;
    }
  };

  const openTeacherPicker = async () => {
    if (!id) return;
    setSelectedSubjectId("");
    setSubjectsLoading(true);
    try {
      const subs = await subjectService.getSubjects();
      setSubjects(subs);
    } catch {
      setSubjects([]);
    } finally {
      setSubjectsLoading(false);
    }
    await fetchUnassignedTeachers(id);
    setShowTeacherPicker(true);
  };

  // --- Subject Load helpers ---
  const openLoadModal = async () => {
    setLoadSubjectId("");
    setLoadPeriods("4");
    setSubjectsLoading(true);
    try {
      const subs = await subjectService.getSubjects();
      const assigned = new Set(subjectLoads.map((l) => l.subject_id));
      setSubjects(subs.filter((s) => !assigned.has(s.id)));
    } catch {
      setSubjects([]);
    } finally {
      setSubjectsLoading(false);
    }
    setShowLoadModal(true);
  };

  const handleCreateLoad = async () => {
    if (!loadSubjectId) {
      Alert.alert("Validation", "Select a subject");
      return;
    }
    const periods = parseInt(loadPeriods);
    if (!periods || periods < 1) {
      Alert.alert("Validation", "Enter a valid period count (≥ 1)");
      return;
    }
    try {
      setLoadSubmitting(true);
      await createSubjectLoad({ subject_id: loadSubjectId, weekly_periods: periods });
      setShowLoadModal(false);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save");
    } finally {
      setLoadSubmitting(false);
    }
  };

  const openEditLoad = (load: SubjectLoad) => {
    setEditingLoad(load);
    setEditPeriods(load.weekly_periods.toString());
  };

  const handleUpdateLoad = async () => {
    if (!editingLoad) return;
    const periods = parseInt(editPeriods);
    if (!periods || periods < 1) {
      Alert.alert("Validation", "Enter a valid period count");
      return;
    }
    try {
      await updateSubjectLoad(editingLoad.id, periods);
      setEditingLoad(null);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const handleDeleteLoad = (load: SubjectLoad) => {
    Alert.alert("Delete", `Remove ${load.subject_name} from weekly load?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try { await deleteSubjectLoad(load.id); } catch (e: any) { Alert.alert("Error", e.message); }
        },
      },
    ]);
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
        {canUpdate && (
          <TouchableOpacity
            style={styles.editIcon}
            onPress={() => setShowEditModal(true)}
          >
            <Ionicons name="create-outline" size={24} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        {/* Class Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Class Information</Text>
            {canViewTimetable && (
              <TouchableOpacity
                style={styles.addSmallBtn}
                onPress={() => router.push(`/(protected)/timetable/${id}` as any)}
              >
                <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                <Text style={styles.addSmallBtnText}>Timetable</Text>
              </TouchableOpacity>
            )}
          </View>
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
                    {(ct.subject_name || ct.subject) ? ` - ${ct.subject_name || ct.subject}` : ""}
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

        {/* Subject Weekly Load Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Subject Weekly Load</Text>
            {canManage && (
              <TouchableOpacity style={styles.addSmallBtn} onPress={openLoadModal}>
                <Ionicons name="add" size={20} color={Colors.primary} />
                <Text style={styles.addSmallBtnText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.helperText}>Periods per week per subject for timetable generation.</Text>
          {loadLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: Spacing.md }} />
          ) : subjectLoads.length === 0 ? (
            <Text style={styles.emptyText}>No subject loads configured.</Text>
          ) : (
            subjectLoads.map((load) => (
              <View key={load.id} style={styles.loadRow}>
                <View style={styles.listItemInfo}>
                  <Text style={styles.listItemName}>{load.subject_name}</Text>
                  {load.subject_code ? <Text style={styles.listItemDetail}>{load.subject_code}</Text> : null}
                </View>
                <View style={styles.loadPeriodBadge}>
                  <Text style={styles.loadPeriodText}>{load.weekly_periods} / wk</Text>
                </View>
                {canManage && (
                  <View style={styles.loadActions}>
                    <TouchableOpacity onPress={() => openEditLoad(load)} style={styles.loadActionBtn}>
                      <Ionicons name="create-outline" size={18} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteLoad(load)} style={styles.loadActionBtn}>
                      <Ionicons name="close-circle-outline" size={18} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Subject Load Create Modal */}
      <Modal visible={showLoadModal} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Subject Load</Text>
            <TouchableOpacity onPress={() => setShowLoadModal(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: Spacing.lg }}>
            <Text style={styles.fieldLabel}>Select Subject *</Text>
            {subjectsLoading ? (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: Spacing.md }} />
            ) : (
              <View style={styles.subjectGrid}>
                {subjects.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.subjectChip, loadSubjectId === s.id && styles.subjectChipActive]}
                    onPress={() => setLoadSubjectId(s.id)}
                  >
                    <Text style={[styles.subjectChipText, loadSubjectId === s.id && styles.subjectChipTextActive]}>
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                ))}
                {!subjectsLoading && subjects.length === 0 && (
                  <Text style={styles.emptyText}>All subjects already have loads set.</Text>
                )}
              </View>
            )}
            <Text style={styles.fieldLabel}>Weekly Periods *</Text>
            <TextInput
              style={styles.input}
              value={loadPeriods}
              onChangeText={setLoadPeriods}
              keyboardType="number-pad"
              placeholder="e.g. 5"
            />
            <TouchableOpacity style={styles.submitBtn} onPress={handleCreateLoad} disabled={loadSubmitting}>
              <Text style={styles.submitBtnText}>{loadSubmitting ? "Saving..." : "Save"}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Subject Load Edit Modal */}
      <Modal visible={!!editingLoad} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Weekly Periods</Text>
            <TouchableOpacity onPress={() => setEditingLoad(null)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <View style={{ padding: Spacing.lg }}>
            {editingLoad && (
              <Text style={styles.fieldLabel}>{editingLoad.subject_name} — Weekly Periods</Text>
            )}
            <TextInput
              style={styles.input}
              value={editPeriods}
              onChangeText={setEditPeriods}
              keyboardType="number-pad"
              placeholder="e.g. 5"
            />
            <TouchableOpacity style={styles.submitBtn} onPress={handleUpdateLoad}>
              <Text style={styles.submitBtnText}>Update</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

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

      {/* Edit Class Modal */}
      {canUpdate && (
        <CreateClassModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleUpdateClass}
          initialData={{
            name: currentClass.name,
            section: currentClass.section,
            academic_year_id: currentClass.academic_year_id ?? "",
            teacher_id: currentClass.teacher_id,
            start_date: currentClass.start_date,
            end_date: currentClass.end_date,
          }}
          classId={id}
        />
      )}

      {/* Teacher Picker Modal */}
      <Modal visible={showTeacherPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Teacher</Text>
            <TouchableOpacity onPress={() => { setShowTeacherPicker(false); setSelectedSubjectId(""); }}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.subjectSection}>
            <Text style={styles.subjectLabel}>1. Select Subject *</Text>
            {subjectsLoading ? (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: Spacing.md }} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectChips}>
                {subjects.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.subjectChip, selectedSubjectId === s.id && styles.subjectChipActive]}
                    onPress={() => setSelectedSubjectId(s.id)}
                  >
                    <Text style={[styles.subjectChipText, selectedSubjectId === s.id && styles.subjectChipTextActive]}>
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                ))}
                {!subjectsLoading && subjects.length === 0 && (
                  <Text style={styles.subjectEmpty}>No subjects. Create subjects first.</Text>
                )}
              </ScrollView>
            )}
          </View>
          <View style={styles.teacherSection}>
            <Text style={styles.subjectLabel}>2. Select Teacher</Text>
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
  editIcon: { padding: Spacing.sm },
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
  subjectSection: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  subjectLabel: { fontSize: 14, fontWeight: "500", color: Colors.text, marginBottom: Spacing.sm },
  subjectChips: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  subjectChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.backgroundSecondary,
  },
  subjectChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + "20" },
  subjectChipText: { fontSize: 14, color: Colors.text },
  subjectChipTextActive: { color: Colors.primary, fontWeight: "600" },
  subjectEmpty: { fontSize: 14, color: Colors.textSecondary, fontStyle: "italic", paddingVertical: Spacing.sm },
  teacherSection: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  pickerItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  pickerName: { fontSize: 16, fontWeight: "500", color: Colors.text },
  pickerDetail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  // Subject Load styles
  helperText: { fontSize: 13, color: Colors.textTertiary, marginBottom: Spacing.sm, fontStyle: "italic" },
  loadRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  loadPeriodBadge: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Layout.borderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginRight: Spacing.sm,
  },
  loadPeriodText: { fontSize: 13, fontWeight: "600", color: Colors.primary },
  loadActions: { flexDirection: "row", gap: 4 },
  loadActionBtn: { padding: 4 },
  subjectGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, marginBottom: Spacing.md },
  fieldLabel: { fontSize: 14, fontWeight: "500", color: Colors.text, marginBottom: Spacing.xs, marginTop: Spacing.md },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.backgroundSecondary,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    alignItems: "center",
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
