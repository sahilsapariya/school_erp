import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  FlatList,
  Switch,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTeachers } from "../hooks/useTeachers";
import { useTeacherSubjects } from "../hooks/useTeacherSubjects";
import { useTeacherAvailability } from "../hooks/useTeacherAvailability";
import { useTeacherLeaves } from "../hooks/useTeacherLeaves";
import { useTeacherWorkload } from "../hooks/useTeacherWorkload";
import { usePermissions } from "@/modules/permissions/hooks/usePermissions";
import * as PERMS from "@/modules/permissions/constants/permissions";
import { Colors } from "@/common/constants/colors";
import { Spacing, Layout } from "@/common/constants/spacing";
import { CreateTeacherModal } from "../components/CreateTeacherModal";
import { subjectService } from "@/modules/subjects/services/subjectService";
import { Subject } from "@/modules/subjects/types";
import { TeacherLeave, TeacherAvailability } from "../types";

type TabKey = "info" | "subjects" | "availability" | "leaves" | "workload";

const DAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function TeacherDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentTeacher, loading, fetchTeacher, updateTeacher, deleteTeacher } = useTeachers();
  const { hasPermission } = usePermissions();
  const [activeTab, setActiveTab] = useState<TabKey>("info");
  const [editModalVisible, setEditModalVisible] = useState(false);

  const canUpdate = hasPermission(PERMS.TEACHER_UPDATE);
  const canDelete = hasPermission(PERMS.TEACHER_DELETE);
  const canManage = hasPermission(PERMS.TEACHER_MANAGE);
  const canLeaveManage = hasPermission(PERMS.TEACHER_LEAVE_MANAGE);

  const teacherId = id || "";

  // --- Subjects tab ---
  const {
    subjects: teacherSubjects,
    loading: subjectsLoading,
    fetchSubjects,
    addSubject,
    removeSubject,
  } = useTeacherSubjects(teacherId);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);

  // --- Availability tab ---
  const {
    availability,
    loading: availLoading,
    fetchAvailability,
    createSlot,
    deleteSlot,
  } = useTeacherAvailability(teacherId);
  const [showAvailModal, setShowAvailModal] = useState(false);
  const [availDay, setAvailDay] = useState("1");
  const [availPeriod, setAvailPeriod] = useState("1");
  const [availIsAvailable, setAvailIsAvailable] = useState(false);

  // --- Leaves tab ---
  const { leaves, loading: leavesLoading, fetchLeaves, approveLeave, rejectLeave } = useTeacherLeaves();

  // --- Workload tab ---
  const { workload, loading: workloadLoading, fetchWorkload, saveWorkload } = useTeacherWorkload(teacherId);
  const [showWorkloadModal, setShowWorkloadModal] = useState(false);
  const [maxPerDay, setMaxPerDay] = useState("6");
  const [maxPerWeek, setMaxPerWeek] = useState("30");
  const [workloadSaving, setWorkloadSaving] = useState(false);

  useEffect(() => {
    if (id) fetchTeacher(id);
  }, [id]);

  // Load tab data on first visit
  const tabVisited = React.useRef<Partial<Record<TabKey, boolean>>>({});

  useEffect(() => {
    if (!teacherId) return;
    if (!tabVisited.current[activeTab]) {
      tabVisited.current[activeTab] = true;
      if (activeTab === "subjects") fetchSubjects();
      if (activeTab === "availability") fetchAvailability();
      if (activeTab === "leaves") fetchLeaves({ teacher_id: teacherId });
      if (activeTab === "workload") {
        fetchWorkload();
      }
    }
  }, [activeTab, teacherId]);

  const handleUpdate = async (data: any) => {
    if (!id) return;
    try {
      await updateTeacher(id, data);
      setEditModalVisible(false);
      Alert.alert("Success", "Teacher updated successfully");
      fetchTeacher(id);
    } catch (error: any) {
      throw error;
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Teacher", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (!id) return;
          await deleteTeacher(id);
          Alert.alert("Success", "Teacher deleted");
          router.back();
        },
      },
    ]);
  };

  // --- Subject helpers ---
  const openSubjectPicker = async () => {
    try {
      const subs = await subjectService.getSubjects();
      const assigned = new Set(teacherSubjects.map((s) => s.subject_id));
      setAllSubjects(subs.filter((s) => !assigned.has(s.id)));
      setShowSubjectPicker(true);
    } catch {
      Alert.alert("Error", "Failed to load subjects");
    }
  };

  const handleAddSubject = async (subjectId: string) => {
    try {
      await addSubject(subjectId);
      setShowSubjectPicker(false);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to assign subject");
    }
  };

  const handleRemoveSubject = (subjectId: string, name: string) => {
    Alert.alert("Remove Subject", `Remove ${name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await removeSubject(subjectId);
          } catch (e: any) {
            Alert.alert("Error", e.message);
          }
        },
      },
    ]);
  };

  // --- Availability helpers ---
  const handleCreateAvail = async () => {
    try {
      await createSlot({
        day_of_week: parseInt(availDay),
        period_number: parseInt(availPeriod),
        available: availIsAvailable,
      });
      setShowAvailModal(false);
      setAvailDay("1");
      setAvailPeriod("1");
      setAvailIsAvailable(false);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save");
    }
  };

  const handleDeleteAvail = (slot: TeacherAvailability) => {
    Alert.alert("Delete Slot", `Remove ${DAYS[slot.day_of_week]} period ${slot.period_number}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try { await deleteSlot(slot.id); } catch (e: any) { Alert.alert("Error", e.message); }
        },
      },
    ]);
  };

  // --- Leave helpers ---
  const handleApproveLeave = async (leave: TeacherLeave) => {
    try {
      await approveLeave(leave.id);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const handleRejectLeave = async (leave: TeacherLeave) => {
    try {
      await rejectLeave(leave.id);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  // --- Workload helpers ---
  const openWorkloadModal = () => {
    setMaxPerDay(workload?.max_periods_per_day?.toString() ?? "6");
    setMaxPerWeek(workload?.max_periods_per_week?.toString() ?? "30");
    setShowWorkloadModal(true);
  };

  const handleSaveWorkload = async () => {
    const day = parseInt(maxPerDay);
    const week = parseInt(maxPerWeek);
    if (!day || !week || day < 1 || week < 1) {
      Alert.alert("Validation", "Enter valid period counts (≥ 1)");
      return;
    }
    try {
      setWorkloadSaving(true);
      await saveWorkload({ max_periods_per_day: day, max_periods_per_week: week });
      setShowWorkloadModal(false);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save workload");
    } finally {
      setWorkloadSaving(false);
    }
  };

  const statusColor = (status: string) => {
    if (status === "approved") return Colors.success;
    if (status === "rejected") return Colors.error;
    return Colors.warning;
  };

  if (loading && !currentTeacher) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!currentTeacher) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Teacher not found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const InfoRow = ({ label, value }: { label: string; value?: string | number | null }) => {
    if (!value && value !== 0) return null;
    return (
      <View style={styles.infoRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    );
  };

  const TABS: { key: TabKey; label: string }[] = [
    { key: "info", label: "Info" },
    { key: "subjects", label: "Subjects" },
    { key: "availability", label: "Availability" },
    { key: "leaves", label: "Leaves" },
    { key: "workload", label: "Workload" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{currentTeacher.name}</Text>
        {canDelete && (
          <TouchableOpacity style={styles.iconBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={22} color={Colors.error} />
          </TouchableOpacity>
        )}
        {canUpdate && (
          <TouchableOpacity style={styles.iconBtn} onPress={() => setEditModalVisible(true)}>
            <Ionicons name="create-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── INFO TAB ── */}
      {activeTab === "info" && (
        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            <InfoRow label="Full Name" value={currentTeacher.name} />
            <InfoRow label="Employee ID" value={currentTeacher.employee_id} />
            <InfoRow label="Email" value={currentTeacher.email} />
            <InfoRow label="Phone" value={currentTeacher.phone} />
            <InfoRow label="Status" value={currentTeacher.status} />
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Information</Text>
            <InfoRow label="Designation" value={currentTeacher.designation} />
            <InfoRow label="Department" value={currentTeacher.department} />
            <InfoRow label="Qualification" value={currentTeacher.qualification} />
            <InfoRow label="Specialization" value={currentTeacher.specialization} />
            <InfoRow label="Experience" value={currentTeacher.experience_years ? `${currentTeacher.experience_years} years` : undefined} />
            <InfoRow label="Date of Joining" value={currentTeacher.date_of_joining} />
          </View>
          {currentTeacher.address && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Address</Text>
              <Text style={styles.addressText}>{currentTeacher.address}</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── SUBJECTS TAB ── */}
      {activeTab === "subjects" && (
        <View style={styles.tabContent}>
          <View style={styles.tabContentHeader}>
            <Text style={styles.tabContentTitle}>Subject Expertise</Text>
            {canManage && (
              <TouchableOpacity style={styles.addBtn} onPress={openSubjectPicker}>
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>
          {subjectsLoading ? (
            <ActivityIndicator style={{ marginTop: Spacing.xl }} color={Colors.primary} />
          ) : teacherSubjects.length === 0 ? (
            <Text style={styles.emptyText}>No subjects assigned yet.</Text>
          ) : (
            <FlatList
              data={teacherSubjects}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: Spacing.md }}
              renderItem={({ item }) => (
                <View style={styles.listItem}>
                  <View style={styles.listItemInfo}>
                    <Text style={styles.listItemName}>{item.subject_name}</Text>
                    {item.subject_code ? <Text style={styles.listItemDetail}>{item.subject_code}</Text> : null}
                  </View>
                  {canManage && (
                    <TouchableOpacity onPress={() => handleRemoveSubject(item.subject_id, item.subject_name || "")}>
                      <Ionicons name="close-circle-outline" size={22} color={Colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            />
          )}
        </View>
      )}

      {/* ── AVAILABILITY TAB ── */}
      {activeTab === "availability" && (
        <View style={styles.tabContent}>
          <View style={styles.tabContentHeader}>
            <Text style={styles.tabContentTitle}>Unavailability Slots</Text>
            {canManage && (
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowAvailModal(true)}>
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.helperText}>Records where teacher is marked unavailable (available = false).</Text>
          {availLoading ? (
            <ActivityIndicator style={{ marginTop: Spacing.xl }} color={Colors.primary} />
          ) : availability.length === 0 ? (
            <Text style={styles.emptyText}>No constraints set. Teacher is available for all slots.</Text>
          ) : (
            <FlatList
              data={availability}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: Spacing.md }}
              renderItem={({ item }) => (
                <View style={styles.listItem}>
                  <View style={styles.listItemInfo}>
                    <Text style={styles.listItemName}>{DAYS[item.day_of_week]} — Period {item.period_number}</Text>
                    <Text style={[styles.listItemDetail, { color: item.available ? Colors.success : Colors.error }]}>
                      {item.available ? "Available" : "Unavailable"}
                    </Text>
                  </View>
                  {canManage && (
                    <TouchableOpacity onPress={() => handleDeleteAvail(item)}>
                      <Ionicons name="close-circle-outline" size={22} color={Colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            />
          )}
        </View>
      )}

      {/* ── LEAVES TAB ── */}
      {activeTab === "leaves" && (
        <View style={styles.tabContent}>
          <View style={styles.tabContentHeader}>
            <Text style={styles.tabContentTitle}>Leave Requests</Text>
          </View>
          {leavesLoading ? (
            <ActivityIndicator style={{ marginTop: Spacing.xl }} color={Colors.primary} />
          ) : leaves.length === 0 ? (
            <Text style={styles.emptyText}>No leave requests.</Text>
          ) : (
            <FlatList
              data={leaves}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: Spacing.md }}
              renderItem={({ item }) => (
                <View style={styles.leaveCard}>
                  <View style={styles.leaveCardHeader}>
                    <Text style={styles.leaveType}>{item.leave_type.toUpperCase()}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + "20" }]}>
                      <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{item.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.leaveDates}>{item.start_date} → {item.end_date}</Text>
                  {item.reason ? <Text style={styles.leaveReason}>{item.reason}</Text> : null}
                  {canLeaveManage && item.status === "pending" && (
                    <View style={styles.leaveActions}>
                      <TouchableOpacity style={styles.approveBtn} onPress={() => handleApproveLeave(item)}>
                        <Text style={styles.approveBtnText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRejectLeave(item)}>
                        <Text style={styles.rejectBtnText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            />
          )}
        </View>
      )}

      {/* ── WORKLOAD TAB ── */}
      {activeTab === "workload" && (
        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Workload Rule</Text>
              {canManage && (
                <TouchableOpacity style={styles.addSmallBtn} onPress={openWorkloadModal}>
                  <Ionicons name={workload ? "create-outline" : "add"} size={18} color={Colors.primary} />
                  <Text style={styles.addSmallBtnText}>{workload ? "Edit" : "Set Rule"}</Text>
                </TouchableOpacity>
              )}
            </View>
            {workloadLoading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : workload ? (
              <>
                <View style={styles.workloadRow}>
                  <Text style={styles.workloadLabel}>Max Periods / Day</Text>
                  <Text style={styles.workloadValue}>{workload.max_periods_per_day}</Text>
                </View>
                <View style={styles.workloadRow}>
                  <Text style={styles.workloadLabel}>Max Periods / Week</Text>
                  <Text style={styles.workloadValue}>{workload.max_periods_per_week}</Text>
                </View>
              </>
            ) : (
              <Text style={styles.emptyText}>No workload rule set. Default limits will apply.</Text>
            )}
          </View>
        </ScrollView>
      )}

      {/* Edit Teacher Modal */}
      {canUpdate && (
        <CreateTeacherModal
          visible={editModalVisible}
          onClose={() => setEditModalVisible(false)}
          onSubmit={handleUpdate}
          initialData={currentTeacher}
          mode="edit"
        />
      )}

      {/* Subject Picker Modal */}
      <Modal visible={showSubjectPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Assign Subject</Text>
            <TouchableOpacity onPress={() => setShowSubjectPicker(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={allSubjects}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: Spacing.md }}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.pickerItem} onPress={() => handleAddSubject(item.id)}>
                <Text style={styles.pickerName}>{item.name}</Text>
                {item.code ? <Text style={styles.pickerDetail}>{item.code}</Text> : null}
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>All subjects already assigned.</Text>}
          />
        </SafeAreaView>
      </Modal>

      {/* Availability Modal */}
      <Modal visible={showAvailModal} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Availability Slot</Text>
            <TouchableOpacity onPress={() => setShowAvailModal(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: Spacing.lg }}>
            <Text style={styles.fieldLabel}>Day of Week (1=Mon … 7=Sun)</Text>
            <TextInput
              style={styles.input}
              value={availDay}
              onChangeText={setAvailDay}
              keyboardType="number-pad"
              placeholder="e.g. 1"
            />
            <Text style={styles.fieldLabel}>Period Number</Text>
            <TextInput
              style={styles.input}
              value={availPeriod}
              onChangeText={setAvailPeriod}
              keyboardType="number-pad"
              placeholder="e.g. 3"
            />
            <View style={styles.switchRow}>
              <Text style={styles.fieldLabel}>Available</Text>
              <Switch
                value={availIsAvailable}
                onValueChange={setAvailIsAvailable}
                trackColor={{ true: Colors.success, false: Colors.error }}
              />
            </View>
            <Text style={styles.helperText}>
              Turn OFF to mark this slot as unavailable (e.g. teacher has a meeting).
            </Text>
            <TouchableOpacity style={styles.submitBtn} onPress={handleCreateAvail}>
              <Text style={styles.submitBtnText}>Save Slot</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Workload Rule Modal */}
      <Modal visible={showWorkloadModal} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Set Workload Rule</Text>
            <TouchableOpacity onPress={() => setShowWorkloadModal(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: Spacing.lg }}>
            <Text style={styles.fieldLabel}>Max Periods Per Day *</Text>
            <TextInput style={styles.input} value={maxPerDay} onChangeText={setMaxPerDay} keyboardType="number-pad" placeholder="e.g. 6" />

            <Text style={styles.fieldLabel}>Max Periods Per Week *</Text>
            <TextInput style={styles.input} value={maxPerWeek} onChangeText={setMaxPerWeek} keyboardType="number-pad" placeholder="e.g. 30" />

            <TouchableOpacity style={styles.submitBtn} onPress={handleSaveWorkload} disabled={workloadSaving}>
              <Text style={styles.submitBtnText}>{workloadSaving ? "Saving..." : "Save Rule"}</Text>
            </TouchableOpacity>
          </ScrollView>
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
  iconBtn: {
    padding: Spacing.sm,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Layout.borderRadius.md,
    marginLeft: Spacing.sm,
  },
  // Tab bar
  tabBar: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight, maxHeight: 40 },
  tabBarContent: { paddingHorizontal: Spacing.md },
  tab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginRight: 4,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: Colors.primary },
  tabText: { fontSize: 14, fontWeight: "500", color: Colors.textSecondary },
  tabTextActive: { color: Colors.primary },
  // Content
  content: { flex: 1, padding: Spacing.lg },
  tabContent: { flex: 1 },
  tabContentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tabContentTitle: { fontSize: 17, fontWeight: "600", color: Colors.text },
  section: {
    marginBottom: Spacing.xl,
    backgroundColor: Colors.background,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingBottom: Spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingBottom: Spacing.sm,
  },
  infoRow: { marginBottom: Spacing.md },
  label: { fontSize: 14, color: Colors.textSecondary, marginBottom: 4 },
  value: { fontSize: 16, fontWeight: "500", color: Colors.text },
  addressText: { fontSize: 16, color: Colors.text, lineHeight: 24 },
  // List items
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  listItemInfo: { flex: 1 },
  listItemName: { fontSize: 15, fontWeight: "500", color: Colors.text },
  listItemDetail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  emptyText: { fontSize: 14, color: Colors.textSecondary, fontStyle: "italic", padding: Spacing.lg },
  helperText: { fontSize: 13, color: Colors.textTertiary, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  // Leave cards
  leaveCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.backgroundTertiary,
  },
  leaveCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.sm },
  leaveType: { fontSize: 13, fontWeight: "700", color: Colors.text, letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Layout.borderRadius.sm },
  statusText: { fontSize: 12, fontWeight: "600" },
  leaveDates: { fontSize: 14, color: Colors.text, marginBottom: 4 },
  leaveReason: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  leaveActions: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.sm },
  approveBtn: {
    flex: 1,
    backgroundColor: Colors.success + "20",
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.sm,
    alignItems: "center",
  },
  approveBtnText: { color: Colors.success, fontWeight: "600", fontSize: 13 },
  rejectBtn: {
    flex: 1,
    backgroundColor: Colors.error + "20",
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.sm,
    alignItems: "center",
  },
  rejectBtnText: { color: Colors.error, fontWeight: "600", fontSize: 13 },
  // Workload
  workloadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  workloadLabel: { fontSize: 15, color: Colors.textSecondary },
  workloadValue: { fontSize: 15, fontWeight: "600", color: Colors.text },
  // Buttons
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.sm,
    gap: 4,
  },
  addBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
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
  // Modal
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
  pickerItem: { padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  pickerName: { fontSize: 16, fontWeight: "500", color: Colors.text },
  pickerDetail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  // Form
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
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: Spacing.md },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.backgroundSecondary,
    marginRight: Spacing.sm,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + "20" },
  chipText: { fontSize: 13, color: Colors.text },
  chipTextActive: { color: Colors.primary, fontWeight: "600" },
  submitBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    alignItems: "center",
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  errorText: { fontSize: 16, color: Colors.error, textAlign: "center", marginBottom: Spacing.lg },
  backBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Layout.borderRadius.md,
  },
  backBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});
