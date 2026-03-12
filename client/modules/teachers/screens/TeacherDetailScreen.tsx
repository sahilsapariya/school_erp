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
  Switch,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTeachers } from "../hooks/useTeachers";
import { useTeacherSubjects } from "../hooks/useTeacherSubjects";
import { useTeacherAvailability } from "../hooks/useTeacherAvailability";
import { useTeacherLeaves } from "../hooks/useTeacherLeaves";
import { useTeacherWorkload } from "../hooks/useTeacherWorkload";
import { usePermissions } from "@/modules/permissions/hooks/usePermissions";
import * as PERMS from "@/modules/permissions/constants/permissions";
import { CreateTeacherModal } from "../components/CreateTeacherModal";
import { subjectService } from "@/modules/subjects/services/subjectService";
import { Subject } from "@/modules/subjects/types";
import { TeacherLeave, TeacherAvailability } from "../types";
import { ScreenContainer } from "@/src/components/ui/ScreenContainer";
import { Header } from "@/src/components/ui/Header";
import { SurfaceCard } from "@/src/components/ui/SurfaceCard";
import { DataRow } from "@/src/components/ui/DataRow";
import { LoadingState } from "@/src/components/ui/LoadingState";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { PrimaryButton } from "@/src/components/ui/PrimaryButton";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { ConfirmationDialog } from "@/src/components/ui/ConfirmationDialog";
import { Avatar } from "@/src/components/ui/Avatar";
import { useToast } from "@/src/components/ui/Toast";
import { theme } from "@/src/design-system/theme";
import { Icons } from "@/src/design-system/icons";

type TabKey = "info" | "subjects" | "availability" | "leaves" | "workload";

const DAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TABS: { key: TabKey; label: string }[] = [
  { key: "info", label: "Info" },
  { key: "subjects", label: "Subjects" },
  { key: "availability", label: "Availability" },
  { key: "leaves", label: "Leaves" },
  { key: "workload", label: "Workload" },
];

export default function TeacherDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { currentTeacher, loading, fetchTeacher, updateTeacher, deleteTeacher } = useTeachers();
  const { hasPermission } = usePermissions();
  const [activeTab, setActiveTab] = useState<TabKey>("info");
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canUpdate = hasPermission(PERMS.TEACHER_UPDATE);
  const canDelete = hasPermission(PERMS.TEACHER_DELETE);
  const canManage = hasPermission(PERMS.TEACHER_MANAGE);
  const canLeaveManage = hasPermission(PERMS.TEACHER_LEAVE_MANAGE);

  const teacherId = id || "";

  const { subjects: teacherSubjects, loading: subjectsLoading, fetchSubjects, addSubject, removeSubject } = useTeacherSubjects(teacherId);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);

  const { availability, loading: availLoading, fetchAvailability, createSlot, deleteSlot } = useTeacherAvailability(teacherId);
  const [showAvailModal, setShowAvailModal] = useState(false);
  const [availDay, setAvailDay] = useState("1");
  const [availPeriod, setAvailPeriod] = useState("1");
  const [availIsAvailable, setAvailIsAvailable] = useState(false);

  const { leaves, loading: leavesLoading, fetchLeaves, approveLeave, rejectLeave } = useTeacherLeaves();

  const { workload, loading: workloadLoading, fetchWorkload, saveWorkload } = useTeacherWorkload(teacherId);
  const [showWorkloadModal, setShowWorkloadModal] = useState(false);
  const [maxPerDay, setMaxPerDay] = useState("6");
  const [maxPerWeek, setMaxPerWeek] = useState("30");
  const [workloadSaving, setWorkloadSaving] = useState(false);

  useEffect(() => {
    if (id) fetchTeacher(id);
  }, [id]);

  const tabVisited = React.useRef<Partial<Record<TabKey, boolean>>>({});
  useEffect(() => {
    if (!teacherId) return;
    if (!tabVisited.current[activeTab]) {
      tabVisited.current[activeTab] = true;
      if (activeTab === "subjects") fetchSubjects();
      if (activeTab === "availability") fetchAvailability();
      if (activeTab === "leaves") fetchLeaves({ teacher_id: teacherId });
      if (activeTab === "workload") fetchWorkload();
    }
  }, [activeTab, teacherId]);

  const handleUpdate = async (data: any) => {
    if (!id) return;
    try {
      await updateTeacher(id, data);
      setEditModalVisible(false);
      toast.success("Teacher updated", "Changes saved successfully.");
      fetchTeacher(id);
    } catch (error: any) {
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await deleteTeacher(id);
      toast.success("Teacher deleted");
      router.back();
    } catch (e: any) {
      toast.error("Delete failed", e.message || "Could not delete teacher.");
    } finally {
      setDeleting(false);
      setDeleteDialogVisible(false);
    }
  };

  const openSubjectPicker = async () => {
    try {
      const subs = await subjectService.getSubjects();
      const assigned = new Set(teacherSubjects.map((s) => s.subject_id));
      setAllSubjects(subs.filter((s) => !assigned.has(s.id)));
      setShowSubjectPicker(true);
    } catch {
      toast.error("Failed to load subjects");
    }
  };

  const handleAddSubject = async (subjectId: string) => {
    try {
      await addSubject(subjectId);
      setShowSubjectPicker(false);
      toast.success("Subject assigned");
    } catch (e: any) {
      toast.error("Error", e.message || "Failed to assign subject");
    }
  };

  const handleRemoveSubject = async (subjectId: string, name: string) => {
    try {
      await removeSubject(subjectId);
      toast.success(`Removed ${name}`);
    } catch (e: any) {
      toast.error("Error", e.message);
    }
  };

  const handleCreateAvail = async () => {
    try {
      await createSlot({ day_of_week: parseInt(availDay), period_number: parseInt(availPeriod), available: availIsAvailable });
      setShowAvailModal(false);
      setAvailDay("1"); setAvailPeriod("1"); setAvailIsAvailable(false);
      toast.success("Slot added");
    } catch (e: any) {
      toast.error("Error", e.message || "Failed to save");
    }
  };

  const handleDeleteAvail = async (slot: TeacherAvailability) => {
    try {
      await deleteSlot(slot.id);
      toast.success("Slot removed");
    } catch (e: any) {
      toast.error("Error", e.message);
    }
  };

  const handleApproveLeave = async (leave: TeacherLeave) => {
    try {
      await approveLeave(leave.id);
      toast.success("Leave approved");
    } catch (e: any) {
      toast.error("Error", e.message);
    }
  };

  const handleRejectLeave = async (leave: TeacherLeave) => {
    try {
      await rejectLeave(leave.id);
      toast.warning("Leave rejected");
    } catch (e: any) {
      toast.error("Error", e.message);
    }
  };

  const openWorkloadModal = () => {
    setMaxPerDay(workload?.max_periods_per_day?.toString() ?? "6");
    setMaxPerWeek(workload?.max_periods_per_week?.toString() ?? "30");
    setShowWorkloadModal(true);
  };

  const handleSaveWorkload = async () => {
    const day = parseInt(maxPerDay);
    const week = parseInt(maxPerWeek);
    if (!day || !week || day < 1 || week < 1) {
      toast.warning("Enter valid period counts (≥ 1)");
      return;
    }
    try {
      setWorkloadSaving(true);
      await saveWorkload({ max_periods_per_day: day, max_periods_per_week: week });
      setShowWorkloadModal(false);
      toast.success("Workload rule saved");
    } catch (e: any) {
      toast.error("Error", e.message || "Failed to save workload");
    } finally {
      setWorkloadSaving(false);
    }
  };

  const leaveStatusBadge = (status: string): "success" | "danger" | "warning" | "info" => {
    if (status === "approved") return "success";
    if (status === "rejected") return "danger";
    return "warning";
  };

  if (loading && !currentTeacher) {
    return (
      <ScreenContainer>
        <Header title="Teacher Details" onBack={() => router.back()} compact />
        <LoadingState message="Loading teacher..." />
      </ScreenContainer>
    );
  }

  if (!currentTeacher) {
    return (
      <ScreenContainer>
        <Header title="Teacher Details" onBack={() => router.back()} compact />
        <EmptyState title="Teacher not found" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Header
        title={currentTeacher.name}
        onBack={() => router.back()}
        compact
        rightAction={
          <View style={styles.headerActions}>
            {canDelete && (
              <TouchableOpacity style={styles.iconBtn} onPress={() => setDeleteDialogVisible(true)}>
                <Icons.Delete size={18} color={theme.colors.danger} />
              </TouchableOpacity>
            )}
            {canUpdate && (
              <TouchableOpacity style={styles.iconBtn} onPress={() => setEditModalVisible(true)}>
                <Icons.Edit size={18} color={theme.colors.primary[500]} />
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Avatar row */}
      <View style={styles.avatarRow}>
        <Avatar name={currentTeacher.name} size={56} />
        <View style={styles.avatarInfo}>
          <Text style={styles.teacherName}>{currentTeacher.name}</Text>
          <Text style={styles.teacherEmpId}>{currentTeacher.employee_id}</Text>
        </View>
        <StatusBadge
          status={currentTeacher.status === "active" ? "success" : "warning"}
          label={currentTeacher.status || "active"}
        />
      </View>

      {/* Tab Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── INFO ── */}
      {activeTab === "info" && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
          <SurfaceCard title="Basic Information" style={styles.card}>
            <DataRow title="Full Name" subtitle={currentTeacher.name} noBorder />
            <DataRow title="Employee ID" subtitle={currentTeacher.employee_id} />
            <DataRow title="Email" subtitle={currentTeacher.email} />
            {currentTeacher.phone ? <DataRow title="Phone" subtitle={currentTeacher.phone} /> : null}
          </SurfaceCard>
          <SurfaceCard title="Professional" style={styles.card}>
            {currentTeacher.designation ? <DataRow title="Designation" subtitle={currentTeacher.designation} noBorder /> : null}
            {currentTeacher.department ? <DataRow title="Department" subtitle={currentTeacher.department} /> : null}
            {currentTeacher.qualification ? <DataRow title="Qualification" subtitle={currentTeacher.qualification} /> : null}
            {currentTeacher.specialization ? <DataRow title="Specialization" subtitle={currentTeacher.specialization} /> : null}
            {currentTeacher.experience_years ? <DataRow title="Experience" subtitle={`${currentTeacher.experience_years} years`} /> : null}
            {currentTeacher.date_of_joining ? <DataRow title="Date of Joining" subtitle={currentTeacher.date_of_joining} noBorder /> : null}
          </SurfaceCard>
          {currentTeacher.address ? (
            <SurfaceCard title="Address" style={styles.card}>
              <Text style={styles.addressText}>{currentTeacher.address}</Text>
            </SurfaceCard>
          ) : null}
        </ScrollView>
      )}

      {/* ── SUBJECTS ── */}
      {activeTab === "subjects" && (
        <View style={styles.flex}>
          <View style={styles.tabActionRow}>
            <Text style={styles.tabSectionTitle}>Subject Expertise</Text>
            {canManage && (
              <TouchableOpacity style={styles.addChipBtn} onPress={openSubjectPicker}>
                <Icons.Add size={16} color={theme.colors.primary[500]} />
                <Text style={styles.addChipBtnText}>Assign</Text>
              </TouchableOpacity>
            )}
          </View>
          {subjectsLoading ? (
            <LoadingState />
          ) : teacherSubjects.length === 0 ? (
            <EmptyState title="No subjects assigned" description="Assign subjects to this teacher." />
          ) : (
            <FlatList
              data={teacherSubjects}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.tabContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <DataRow
                  title={item.subject_name || "Subject"}
                  subtitle={item.subject_code}
                  leftIcon={<Icons.Class size={18} color={theme.colors.primary[500]} />}
                  rightComponent={
                    canManage ? (
                      <TouchableOpacity
                        onPress={() => handleRemoveSubject(item.subject_id, item.subject_name || "")}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Icons.Close size={18} color={theme.colors.danger} />
                      </TouchableOpacity>
                    ) : undefined
                  }
                />
              )}
            />
          )}
        </View>
      )}

      {/* ── AVAILABILITY ── */}
      {activeTab === "availability" && (
        <View style={styles.flex}>
          <View style={styles.tabActionRow}>
            <Text style={styles.tabSectionTitle}>Availability</Text>
            {canManage && (
              <TouchableOpacity style={styles.addChipBtn} onPress={() => setShowAvailModal(true)}>
                <Icons.Add size={16} color={theme.colors.primary[500]} />
                <Text style={styles.addChipBtnText}>Add Slot</Text>
              </TouchableOpacity>
            )}
          </View>
          {availLoading ? (
            <LoadingState />
          ) : availability.length === 0 ? (
            <EmptyState title="No constraints set" description="Teacher is available for all slots by default." />
          ) : (
            <FlatList
              data={availability}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.tabContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <DataRow
                  title={`${DAYS[item.day_of_week]} — Period ${item.period_number}`}
                  rightComponent={
                    <View style={styles.availRightRow}>
                      <StatusBadge
                        status={item.available ? "success" : "danger"}
                        label={item.available ? "Available" : "Unavailable"}
                      />
                      {canManage && (
                        <TouchableOpacity onPress={() => handleDeleteAvail(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Icons.Delete size={16} color={theme.colors.danger} />
                        </TouchableOpacity>
                      )}
                    </View>
                  }
                />
              )}
            />
          )}
        </View>
      )}

      {/* ── LEAVES ── */}
      {activeTab === "leaves" && (
        <View style={styles.flex}>
          <View style={styles.tabActionRow}>
            <Text style={styles.tabSectionTitle}>Leave Requests</Text>
          </View>
          {leavesLoading ? (
            <LoadingState />
          ) : leaves.length === 0 ? (
            <EmptyState title="No leave requests" />
          ) : (
            <FlatList
              data={leaves}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.tabContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.leaveCard}>
                  <View style={styles.leaveCardTop}>
                    <Text style={styles.leaveType}>{item.leave_type.toUpperCase()}</Text>
                    <StatusBadge status={leaveStatusBadge(item.status)} label={item.status} />
                  </View>
                  <Text style={styles.leaveDates}>{item.start_date} → {item.end_date}</Text>
                  {item.reason ? <Text style={styles.leaveReason}>{item.reason}</Text> : null}
                  {canLeaveManage && item.status === "pending" && (
                    <View style={styles.leaveActions}>
                      <PrimaryButton
                        title="Approve"
                        size="sm"
                        onPress={() => handleApproveLeave(item)}
                        style={{ flex: 1 }}
                      />
                      <PrimaryButton
                        title="Reject"
                        size="sm"
                        variant="outline"
                        onPress={() => handleRejectLeave(item)}
                        style={{ flex: 1 }}
                      />
                    </View>
                  )}
                </View>
              )}
            />
          )}
        </View>
      )}

      {/* ── WORKLOAD ── */}
      {activeTab === "workload" && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
          <View style={styles.tabActionRow}>
            <Text style={styles.tabSectionTitle}>Workload Rule</Text>
            {canManage && (
              <TouchableOpacity style={styles.addChipBtn} onPress={openWorkloadModal}>
                <Icons.Edit size={16} color={theme.colors.primary[500]} />
                <Text style={styles.addChipBtnText}>{workload ? "Edit" : "Set Rule"}</Text>
              </TouchableOpacity>
            )}
          </View>
          {workloadLoading ? (
            <LoadingState />
          ) : workload ? (
            <SurfaceCard style={styles.card}>
              <DataRow title="Max Periods / Day" subtitle={String(workload.max_periods_per_day)} noBorder />
              <DataRow title="Max Periods / Week" subtitle={String(workload.max_periods_per_week)} noBorder />
            </SurfaceCard>
          ) : (
            <EmptyState title="No workload rule" description="Default limits will apply." />
          )}
        </ScrollView>
      )}

      {/* Edit Modal */}
      {canUpdate && (
        <CreateTeacherModal
          visible={editModalVisible}
          onClose={() => setEditModalVisible(false)}
          onSubmit={handleUpdate}
          initialData={currentTeacher}
          mode="edit"
        />
      )}

      {/* Subject Picker */}
      <Modal visible={showSubjectPicker} animationType="slide" presentationStyle="pageSheet">
        <ScreenContainer>
          <Header
            title="Assign Subject"
            onBack={() => setShowSubjectPicker(false)}
            compact
          />
          <FlatList
            data={allSubjects}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.tabContent}
            renderItem={({ item }) => (
              <DataRow
                title={item.name}
                subtitle={item.code}
                leftIcon={<Icons.Class size={18} color={theme.colors.primary[500]} />}
                onPress={() => handleAddSubject(item.id)}
              />
            )}
            ListEmptyComponent={<EmptyState title="All subjects assigned" />}
          />
        </ScreenContainer>
      </Modal>

      {/* Availability Modal */}
      <Modal visible={showAvailModal} animationType="slide" presentationStyle="formSheet">
        <ScreenContainer keyboardAvoiding>
          <Header
            title="Add Availability Slot"
            onBack={() => setShowAvailModal(false)}
            compact
          />
          <ScrollView contentContainerStyle={styles.modalForm}>
            <Text style={styles.fieldLabel}>Day of Week (1=Mon … 7=Sun)</Text>
            <TextInput style={styles.fieldInput} value={availDay} onChangeText={setAvailDay} keyboardType="number-pad" placeholder="e.g. 1" placeholderTextColor={theme.colors.text[400]} />
            <Text style={styles.fieldLabel}>Period Number</Text>
            <TextInput style={styles.fieldInput} value={availPeriod} onChangeText={setAvailPeriod} keyboardType="number-pad" placeholder="e.g. 3" placeholderTextColor={theme.colors.text[400]} />
            <View style={styles.switchRow}>
              <Text style={styles.fieldLabel}>Available</Text>
              <Switch
                value={availIsAvailable}
                onValueChange={setAvailIsAvailable}
                trackColor={{ true: theme.colors.success, false: theme.colors.danger }}
                thumbColor="white"
              />
            </View>
            <PrimaryButton title="Save Slot" onPress={handleCreateAvail} style={{ marginTop: theme.spacing.m }} />
          </ScrollView>
        </ScreenContainer>
      </Modal>

      {/* Workload Modal */}
      <Modal visible={showWorkloadModal} animationType="slide" presentationStyle="formSheet">
        <ScreenContainer keyboardAvoiding>
          <Header
            title="Set Workload Rule"
            onBack={() => setShowWorkloadModal(false)}
            compact
          />
          <ScrollView contentContainerStyle={styles.modalForm}>
            <Text style={styles.fieldLabel}>Max Periods Per Day</Text>
            <TextInput style={styles.fieldInput} value={maxPerDay} onChangeText={setMaxPerDay} keyboardType="number-pad" placeholder="e.g. 6" placeholderTextColor={theme.colors.text[400]} />
            <Text style={styles.fieldLabel}>Max Periods Per Week</Text>
            <TextInput style={styles.fieldInput} value={maxPerWeek} onChangeText={setMaxPerWeek} keyboardType="number-pad" placeholder="e.g. 30" placeholderTextColor={theme.colors.text[400]} />
            <PrimaryButton title={workloadSaving ? "Saving..." : "Save Rule"} onPress={handleSaveWorkload} loading={workloadSaving} style={{ marginTop: theme.spacing.m }} />
          </ScrollView>
        </ScreenContainer>
      </Modal>

      <ConfirmationDialog
        visible={deleteDialogVisible}
        title="Delete Teacher"
        message={`Delete ${currentTeacher.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogVisible(false)}
        loading={deleting}
        destructive
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerActions: {
    flexDirection: "row",
    gap: theme.spacing.s,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.m,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.m,
    paddingBottom: theme.spacing.m,
    gap: theme.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  avatarInfo: { flex: 1 },
  teacherName: {
    ...theme.typography.h3,
    color: theme.colors.text[900],
  },
  teacherEmpId: {
    ...theme.typography.caption,
    color: theme.colors.text[500],
    marginTop: 2,
  },
  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexGrow: 0,
  },
  tabBarContent: {
    paddingHorizontal: theme.spacing.m,
    gap: theme.spacing.xs,
  },
  tab: {
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: theme.colors.primary[500] },
  tabText: {
    ...theme.typography.label,
    color: theme.colors.text[500],
  },
  tabTextActive: {
    color: theme.colors.primary[500],
    fontWeight: "600",
  },
  tabContent: {
    paddingHorizontal: theme.spacing.m,
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.xxl,
  },
  tabActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.sm,
  },
  tabSectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text[900],
  },
  addChipBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.primary[50],
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
  },
  addChipBtnText: {
    ...theme.typography.caption,
    color: theme.colors.primary[500],
    fontWeight: "600",
  },
  card: { marginBottom: theme.spacing.m },
  addressText: {
    ...theme.typography.body,
    color: theme.colors.text[700],
    lineHeight: 24,
  },
  availRightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.s,
  },
  leaveCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.s,
    ...theme.shadows.sm,
  },
  leaveCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.s,
  },
  leaveType: {
    ...theme.typography.overline,
    color: theme.colors.text[700],
  },
  leaveDates: {
    ...theme.typography.body,
    fontWeight: "500",
    color: theme.colors.text[900],
    marginBottom: theme.spacing.xs,
  },
  leaveReason: {
    ...theme.typography.bodySmall,
    color: theme.colors.text[500],
    marginBottom: theme.spacing.s,
  },
  leaveActions: {
    flexDirection: "row",
    gap: theme.spacing.s,
    marginTop: theme.spacing.s,
  },
  modalForm: {
    padding: theme.spacing.m,
    paddingBottom: theme.spacing.xxl,
  },
  fieldLabel: {
    ...theme.typography.label,
    color: theme.colors.text[700],
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.m,
  },
  fieldInput: {
    height: 48,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.l,
    paddingHorizontal: theme.spacing.m,
    ...theme.typography.body,
    color: theme.colors.text[900],
    backgroundColor: theme.colors.surface,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: theme.spacing.m,
  },
});
