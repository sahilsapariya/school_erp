import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useClasses } from "../hooks/useClasses";
import { useSubjectLoad } from "../hooks/useSubjectLoad";
import { CreateClassModal } from "../components/CreateClassModal";
import { usePermissions } from "@/modules/permissions/hooks/usePermissions";
import * as PERMS from "@/modules/permissions/constants/permissions";
import { Student } from "@/modules/students/types";
import { Teacher } from "@/modules/teachers/types";
import { subjectService } from "@/modules/subjects/services/subjectService";
import { Subject } from "@/modules/subjects/types";
import { SubjectLoad } from "../types";
import { ScreenContainer } from "@/src/components/ui/ScreenContainer";
import { Header } from "@/src/components/ui/Header";
import { SurfaceCard } from "@/src/components/ui/SurfaceCard";
import { DataRow } from "@/src/components/ui/DataRow";
import { LoadingState } from "@/src/components/ui/LoadingState";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { PrimaryButton } from "@/src/components/ui/PrimaryButton";
import { ConfirmationDialog } from "@/src/components/ui/ConfirmationDialog";
import { useToast } from "@/src/components/ui/Toast";
import { theme } from "@/src/design-system/theme";
import { Icons } from "@/src/design-system/icons";

export default function ClassDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const {
    currentClass, loading, fetchClassDetail, updateClass,
    assignStudent, removeStudent, assignTeacher, removeTeacher,
    fetchUnassignedStudents, fetchUnassignedTeachers,
    unassignedStudents, unassignedTeachers,
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

  // Remove confirmations
  const [removeStudentTarget, setRemoveStudentTarget] = useState<Student | null>(null);
  const [removeTeacherTarget, setRemoveTeacherTarget] = useState<{ id: string; name: string } | null>(null);
  const [removing, setRemoving] = useState(false);

  const classId = id || "";
  const {
    subjectLoads, loading: loadLoading,
    fetchSubjectLoads, createSubjectLoad, updateSubjectLoad, deleteSubjectLoad,
  } = useSubjectLoad(classId);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [loadSubjectId, setLoadSubjectId] = useState("");
  const [loadPeriods, setLoadPeriods] = useState("4");
  const [loadSubmitting, setLoadSubmitting] = useState(false);
  const [editingLoad, setEditingLoad] = useState<SubjectLoad | null>(null);
  const [editPeriods, setEditPeriods] = useState("4");
  const [deleteLoadTarget, setDeleteLoadTarget] = useState<SubjectLoad | null>(null);

  useEffect(() => {
    if (id) { fetchClassDetail(id); fetchSubjectLoads(); }
  }, [id]);

  const handleAssignStudent = async (student: Student) => {
    if (!id) return;
    try {
      await assignStudent(id, student.id);
      setShowStudentPicker(false);
      toast.success("Student assigned", `${student.name} added to class.`);
    } catch (err: any) {
      toast.error("Failed", err.message || "Could not assign student");
    }
  };

  const handleRemoveStudentConfirm = async () => {
    if (!removeStudentTarget || !id) return;
    setRemoving(true);
    try {
      await removeStudent(id, removeStudentTarget.id);
      toast.success("Student removed");
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setRemoving(false);
      setRemoveStudentTarget(null);
    }
  };

  const handleAssignTeacher = async (teacher: Teacher) => {
    if (!id) return;
    if (!selectedSubjectId) {
      toast.warning("Select a subject", "Please select a subject before assigning a teacher.");
      return;
    }
    try {
      await assignTeacher(id, teacher.id, selectedSubjectId);
      setShowTeacherPicker(false);
      setSelectedSubjectId("");
      toast.success("Teacher assigned", `${teacher.name} added to class.`);
    } catch (err: any) {
      toast.error("Failed", err.message || "Could not assign teacher");
    }
  };

  const handleRemoveTeacherConfirm = async () => {
    if (!removeTeacherTarget || !id) return;
    setRemoving(true);
    try {
      await removeTeacher(id, removeTeacherTarget.id);
      toast.success("Teacher removed");
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setRemoving(false);
      setRemoveTeacherTarget(null);
    }
  };

  const openStudentPicker = async () => {
    if (!id) return;
    await fetchUnassignedStudents(id);
    setShowStudentPicker(true);
  };

  const handleUpdateClass = async (data: any) => {
    if (!id) return;
    try {
      await updateClass(id, data);
      setShowEditModal(false);
      toast.success("Class updated successfully");
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
      toast.warning("Validation", "Please select a subject.");
      return;
    }
    const periods = parseInt(loadPeriods);
    if (!periods || periods < 1) {
      toast.warning("Validation", "Enter a valid period count (≥ 1).");
      return;
    }
    try {
      setLoadSubmitting(true);
      await createSubjectLoad({ subject_id: loadSubjectId, weekly_periods: periods });
      setShowLoadModal(false);
      toast.success("Subject load added");
    } catch (e: any) {
      toast.error("Error", e.message || "Failed to save");
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
      toast.warning("Validation", "Enter a valid period count.");
      return;
    }
    try {
      await updateSubjectLoad(editingLoad.id, periods);
      setEditingLoad(null);
      toast.success("Updated successfully");
    } catch (e: any) {
      toast.error("Error", e.message);
    }
  };

  const handleDeleteLoadConfirm = async () => {
    if (!deleteLoadTarget) return;
    try {
      await deleteSubjectLoad(deleteLoadTarget.id);
      toast.success("Subject load removed");
    } catch (e: any) {
      toast.error("Error", e.message);
    } finally {
      setDeleteLoadTarget(null);
    }
  };

  if (loading && !currentClass) {
    return (
      <ScreenContainer>
        <Header title="Class Details" onBack={() => router.back()} compact />
        <LoadingState message="Loading class..." />
      </ScreenContainer>
    );
  }

  if (!currentClass) {
    return (
      <ScreenContainer>
        <Header title="Class Details" onBack={() => router.back()} compact />
        <EmptyState
          icon={<Icons.Class size={32} color={theme.colors.text[300]} />}
          title="Class not found"
          description="This class could not be loaded."
          action={{ label: "Go Back", onPress: () => router.back() }}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Header
        title={`${currentClass.name} – ${currentClass.section}`}
        onBack={() => router.back()}
        compact
        rightAction={
          <View style={styles.headerActions}>
            {canViewTimetable && (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => router.push(`/(protected)/timetable/${id}` as any)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icons.Calendar size={20} color={theme.colors.primary[500]} />
              </TouchableOpacity>
            )}
            {canUpdate && (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => setShowEditModal(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icons.Edit size={20} color={theme.colors.primary[500]} />
              </TouchableOpacity>
            )}
          </View>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Class Info */}
        <SurfaceCard title="Class Information" style={styles.section}>
          <DataRow title="Academic Year" subtitle={currentClass.academic_year} noBorder />
          <DataRow title="Class Teacher" subtitle={currentClass.teacher_name || "Not assigned"} />
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
        </SurfaceCard>

        {/* Students */}
        <SurfaceCard
          title="Students"
          style={styles.section}
          rightAction={
            canUpdate ? (
              <TouchableOpacity style={styles.addBtn} onPress={openStudentPicker}>
                <Icons.Add size={18} color={theme.colors.primary[500]} />
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            ) : undefined
          }
          padded={false}
        >
          {currentClass.students && currentClass.students.length > 0 ? (
            currentClass.students.map((student) => (
              <DataRow
                key={student.id}
                title={student.name}
                subtitle={student.admission_number}
                leftIcon={<Icons.Student size={18} color={theme.colors.primary[500]} />}
                rightComponent={
                  canUpdate ? (
                    <TouchableOpacity onPress={() => setRemoveStudentTarget(student)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Icons.Close size={18} color={theme.colors.danger} />
                    </TouchableOpacity>
                  ) : undefined
                }
              />
            ))
          ) : (
            <View style={styles.emptySection}>
              <Text style={styles.emptyText}>No students assigned</Text>
            </View>
          )}
        </SurfaceCard>

        {/* Teachers */}
        <SurfaceCard
          title="Teachers"
          style={styles.section}
          rightAction={
            canUpdate ? (
              <TouchableOpacity style={styles.addBtn} onPress={openTeacherPicker}>
                <Icons.Add size={18} color={theme.colors.primary[500]} />
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            ) : undefined
          }
          padded={false}
        >
          {currentClass.teachers && currentClass.teachers.length > 0 ? (
            currentClass.teachers.map((ct) => (
              <DataRow
                key={ct.id}
                title={ct.teacher_name}
                subtitle={`${ct.teacher_employee_id}${ct.subject_name || ct.subject ? ` • ${ct.subject_name || ct.subject}` : ""}`}
                leftIcon={<Icons.Users size={18} color={theme.colors.primary[500]} />}
                rightComponent={
                  canUpdate ? (
                    <TouchableOpacity onPress={() => setRemoveTeacherTarget({ id: ct.teacher_id, name: ct.teacher_name })} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Icons.Close size={18} color={theme.colors.danger} />
                    </TouchableOpacity>
                  ) : undefined
                }
              />
            ))
          ) : (
            <View style={styles.emptySection}>
              <Text style={styles.emptyText}>No teachers assigned</Text>
            </View>
          )}
        </SurfaceCard>

        {/* Subject Weekly Load */}
        <SurfaceCard
          title="Subject Weekly Load"
          style={styles.section}
          rightAction={
            canManage ? (
              <TouchableOpacity style={styles.addBtn} onPress={openLoadModal}>
                <Icons.Add size={18} color={theme.colors.primary[500]} />
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            ) : undefined
          }
          padded={false}
        >
          <Text style={styles.helperText}>Periods per week for timetable generation.</Text>
          {loadLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary[500]} style={styles.loader} />
          ) : subjectLoads.length === 0 ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptyText}>No subject loads configured.</Text>
            </View>
          ) : (
            subjectLoads.map((load) => (
              <DataRow
                key={load.id}
                title={load.subject_name}
                subtitle={load.subject_code}
                rightComponent={
                  <View style={styles.loadRight}>
                    <View style={styles.periodBadge}>
                      <Text style={styles.periodText}>{load.weekly_periods}/wk</Text>
                    </View>
                    {canManage && (
                      <>
                        <TouchableOpacity onPress={() => openEditLoad(load)} style={styles.actionIconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Icons.Edit size={16} color={theme.colors.primary[500]} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setDeleteLoadTarget(load)} style={styles.actionIconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Icons.Delete size={16} color={theme.colors.danger} />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                }
              />
            ))
          )}
        </SurfaceCard>
      </ScrollView>

      {/* Edit Class Modal */}
      {canUpdate && (
        <CreateClassModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleUpdateClass}
          initialData={{
            name: currentClass.name, section: currentClass.section,
            academic_year_id: currentClass.academic_year_id ?? "",
            teacher_id: currentClass.teacher_id,
            start_date: currentClass.start_date, end_date: currentClass.end_date,
          }}
          classId={id}
        />
      )}

      {/* Subject Load Create Modal */}
      <Modal visible={showLoadModal} animationType="slide" presentationStyle="formSheet">
        <ScreenContainer>
          <Header title="Add Subject Load" onBack={() => setShowLoadModal(false)} compact />
          <ScrollView contentContainerStyle={styles.modalForm} showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>Select Subject *</Text>
            {subjectsLoading ? (
              <ActivityIndicator size="small" color={theme.colors.primary[500]} style={styles.loader} />
            ) : (
              <View style={styles.chipGrid}>
                {subjects.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.chip, loadSubjectId === s.id && styles.chipActive]}
                    onPress={() => setLoadSubjectId(s.id)}
                  >
                    <Text style={[styles.chipText, loadSubjectId === s.id && styles.chipTextActive]}>{s.name}</Text>
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
              placeholderTextColor={theme.colors.text[400]}
            />
            <PrimaryButton title={loadSubmitting ? "Saving…" : "Save"} onPress={handleCreateLoad} loading={loadSubmitting} style={styles.submitBtn} />
          </ScrollView>
        </ScreenContainer>
      </Modal>

      {/* Subject Load Edit Modal */}
      <Modal visible={!!editingLoad} animationType="slide" presentationStyle="formSheet">
        <ScreenContainer>
          <Header title="Edit Weekly Periods" onBack={() => setEditingLoad(null)} compact />
          <View style={styles.modalForm}>
            {editingLoad && <Text style={styles.fieldLabel}>{editingLoad.subject_name} — Weekly Periods</Text>}
            <TextInput
              style={styles.input}
              value={editPeriods}
              onChangeText={setEditPeriods}
              keyboardType="number-pad"
              placeholder="e.g. 5"
              placeholderTextColor={theme.colors.text[400]}
            />
            <PrimaryButton title="Update" onPress={handleUpdateLoad} style={styles.submitBtn} />
          </View>
        </ScreenContainer>
      </Modal>

      {/* Student Picker */}
      <Modal visible={showStudentPicker} animationType="slide" presentationStyle="pageSheet">
        <ScreenContainer>
          <Header title="Add Student" onBack={() => setShowStudentPicker(false)} compact />
          <FlatList
            data={unassignedStudents}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.pickerList}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.pickerItem} onPress={() => handleAssignStudent(item)} activeOpacity={0.7}>
                <Icons.Student size={18} color={theme.colors.primary[500]} />
                <View style={styles.pickerInfo}>
                  <Text style={styles.pickerName}>{item.name}</Text>
                  <Text style={styles.pickerDetail}>{item.admission_number}</Text>
                </View>
                <Icons.Add size={18} color={theme.colors.primary[500]} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={<EmptyState title="No unassigned students" description="All students are already assigned to a class." />}
          />
        </ScreenContainer>
      </Modal>

      {/* Teacher Picker */}
      <Modal visible={showTeacherPicker} animationType="slide" presentationStyle="pageSheet">
        <ScreenContainer>
          <Header
            title="Add Teacher"
            onBack={() => { setShowTeacherPicker(false); setSelectedSubjectId(""); }}
            compact
          />
          <View style={styles.subjectSection}>
            <Text style={styles.fieldLabel}>1. Select Subject *</Text>
            {subjectsLoading ? (
              <ActivityIndicator size="small" color={theme.colors.primary[500]} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {subjects.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.chip, selectedSubjectId === s.id && styles.chipActive]}
                      onPress={() => setSelectedSubjectId(s.id)}
                    >
                      <Text style={[styles.chipText, selectedSubjectId === s.id && styles.chipTextActive]}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                  {!subjectsLoading && subjects.length === 0 && (
                    <Text style={styles.emptyText}>No subjects. Create subjects first.</Text>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
          <Text style={[styles.fieldLabel, { paddingHorizontal: theme.spacing.m }]}>2. Select Teacher</Text>
          <FlatList
            data={unassignedTeachers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.pickerList}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.pickerItem} onPress={() => handleAssignTeacher(item)} activeOpacity={0.7}>
                <Icons.Users size={18} color={theme.colors.primary[500]} />
                <View style={styles.pickerInfo}>
                  <Text style={styles.pickerName}>{item.name}</Text>
                  <Text style={styles.pickerDetail}>{item.employee_id}{item.department ? ` • ${item.department}` : ""}</Text>
                </View>
                <Icons.Add size={18} color={theme.colors.primary[500]} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={<EmptyState title="No available teachers" description="All teachers are already assigned." />}
          />
        </ScreenContainer>
      </Modal>

      {/* Remove Student Confirmation */}
      <ConfirmationDialog
        visible={!!removeStudentTarget}
        title="Remove Student"
        message={removeStudentTarget ? `Remove ${removeStudentTarget.name} from this class?` : ''}
        confirmLabel="Remove"
        onConfirm={handleRemoveStudentConfirm}
        onCancel={() => setRemoveStudentTarget(null)}
        loading={removing}
        destructive
      />

      {/* Remove Teacher Confirmation */}
      <ConfirmationDialog
        visible={!!removeTeacherTarget}
        title="Remove Teacher"
        message={removeTeacherTarget ? `Remove ${removeTeacherTarget.name} from this class?` : ''}
        confirmLabel="Remove"
        onConfirm={handleRemoveTeacherConfirm}
        onCancel={() => setRemoveTeacherTarget(null)}
        loading={removing}
        destructive
      />

      {/* Delete Load Confirmation */}
      <ConfirmationDialog
        visible={!!deleteLoadTarget}
        title="Remove Subject Load"
        message={deleteLoadTarget ? `Remove ${deleteLoadTarget.subject_name} from weekly load?` : ''}
        confirmLabel="Remove"
        onConfirm={handleDeleteLoadConfirm}
        onCancel={() => setDeleteLoadTarget(null)}
        destructive
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: theme.spacing.m, paddingBottom: theme.spacing.xxl },
  headerActions: { flexDirection: "row", gap: theme.spacing.xs },
  iconBtn: {
    width: 36, height: 36, borderRadius: theme.radius.m,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: "center", justifyContent: "center",
  },
  section: { marginBottom: theme.spacing.m },
  statsRow: { flexDirection: "row", gap: theme.spacing.m, marginTop: theme.spacing.m },
  statCard: {
    flex: 1, backgroundColor: theme.colors.backgroundSecondary, borderRadius: theme.radius.l,
    padding: theme.spacing.m, alignItems: "center",
  },
  statNumber: { ...theme.typography.h1, color: theme.colors.text[900] },
  statLabel: { ...theme.typography.caption, color: theme.colors.text[500], marginTop: 4 },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: theme.colors.primary[50], paddingHorizontal: theme.spacing.s,
    paddingVertical: theme.spacing.xs, borderRadius: theme.radius.m,
    borderWidth: 1, borderColor: theme.colors.primary[200],
  },
  addBtnText: { ...theme.typography.caption, color: theme.colors.primary[600], fontWeight: "600" },
  emptySection: { padding: theme.spacing.m },
  emptyText: { ...theme.typography.body, color: theme.colors.text[400], fontStyle: "italic" },
  helperText: { ...theme.typography.caption, color: theme.colors.text[400], fontStyle: "italic", padding: theme.spacing.m, paddingBottom: 0 },
  loader: { marginVertical: theme.spacing.m },
  loadRight: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs },
  periodBadge: {
    backgroundColor: theme.colors.primary[50], borderRadius: theme.radius.m,
    paddingHorizontal: theme.spacing.s, paddingVertical: 2,
    borderWidth: 1, borderColor: theme.colors.primary[200],
  },
  periodText: { ...theme.typography.caption, fontWeight: "700", color: theme.colors.primary[600] },
  actionIconBtn: { padding: 4 },
  // Modal
  modalForm: { padding: theme.spacing.m, paddingBottom: theme.spacing.xxl },
  fieldLabel: { ...theme.typography.label, color: theme.colors.text[700], marginBottom: theme.spacing.xs, marginTop: theme.spacing.m },
  input: {
    borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: theme.radius.l,
    paddingHorizontal: theme.spacing.m, paddingVertical: theme.spacing.sm,
    ...theme.typography.body, color: theme.colors.text[900],
    backgroundColor: theme.colors.surface,
  },
  submitBtn: { marginTop: theme.spacing.xl },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.s, marginBottom: theme.spacing.m },
  chipRow: { flexDirection: "row", gap: theme.spacing.s, paddingBottom: theme.spacing.s },
  chip: {
    paddingVertical: theme.spacing.s, paddingHorizontal: theme.spacing.m,
    borderRadius: theme.radius.full, borderWidth: 1, borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipActive: { borderColor: theme.colors.primary[500], backgroundColor: theme.colors.primary[500] },
  chipText: { ...theme.typography.caption, fontWeight: "600", color: theme.colors.text[700] },
  chipTextActive: { color: "#fff" },
  subjectSection: { paddingHorizontal: theme.spacing.m, paddingBottom: theme.spacing.m, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  pickerList: { padding: theme.spacing.m },
  pickerItem: {
    flexDirection: "row", alignItems: "center", gap: theme.spacing.m,
    paddingVertical: theme.spacing.m, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  pickerInfo: { flex: 1 },
  pickerName: { ...theme.typography.body, fontWeight: "500", color: theme.colors.text[900] },
  pickerDetail: { ...theme.typography.caption, color: theme.colors.text[500], marginTop: 2 },
});
