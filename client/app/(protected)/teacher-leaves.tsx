import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/common/constants/colors";
import { Spacing, Layout } from "@/common/constants/spacing";
import { useTeacherLeaves } from "@/modules/teachers/hooks/useTeacherLeaves";
import { usePermissions } from "@/modules/permissions/hooks/usePermissions";
import * as PERMS from "@/modules/permissions/constants/permissions";
import { TeacherLeave, LeaveBalance, LeavePolicy, LEAVE_TYPES } from "@/modules/teachers/types";

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Cancelled", value: "cancelled" },
];

const LEAVE_TYPE_ICONS: Record<string, string> = {
  casual: "☀️",
  sick: "🤒",
  emergency: "🚨",
  unpaid: "💰",
  other: "📝",
};

function statusColor(status: string): string {
  switch (status) {
    case "approved": return Colors.success;
    case "rejected": return Colors.error;
    case "cancelled": return Colors.textSecondary;
    default: return Colors.warning;
  }
}

function leaveTypeColor(type: string): string {
  switch (type) {
    case "casual": return "#3B82F6";
    case "sick": return "#10B981";
    case "emergency": return "#EF4444";
    case "unpaid": return "#8B5CF6";
    default: return "#6B7280";
  }
}

// ---------------------------------------------------------------------------
// Teacher Balance Modal
// ---------------------------------------------------------------------------
interface TeacherBalanceModalProps {
  visible: boolean;
  teacherName: string;
  teacherId: string;
  balances: LeaveBalance[];
  balancesLoading: boolean;
  onAdjust: (leaveType: string, days: number, notes: string) => Promise<void>;
  onClose: () => void;
}

function TeacherBalanceModal({
  visible,
  teacherName,
  teacherId,
  balances,
  balancesLoading,
  onAdjust,
  onClose,
}: TeacherBalanceModalProps) {
  const [editingType, setEditingType] = useState<string | null>(null);
  const [editDays, setEditDays] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editingType) return;
    const days = parseInt(editDays, 10);
    if (isNaN(days) || days < 0) {
      Alert.alert("Validation", "Please enter a valid number of days (>= 0)");
      return;
    }
    setSaving(true);
    try {
      await onAdjust(editingType, days, editNotes);
      setEditingType(null);
      setEditDays("");
      setEditNotes("");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update balance");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onDismiss={onClose}>
      <SafeAreaView style={balModal.container}>
        <View style={balModal.header}>
          <TouchableOpacity onPress={onClose} style={balModal.backBtn}>
            <Ionicons name="close" size={22} color={Colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={balModal.title}>Leave Balances</Text>
            <Text style={balModal.subtitle}>{teacherName}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
          {balancesLoading ? (
            <View style={balModal.loadingRow}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={balModal.loadingText}>Loading balances…</Text>
            </View>
          ) : (
            balances.map(bal => (
              <View key={bal.leave_type} style={balModal.balanceRow}>
                <View style={[balModal.typeAccent, { backgroundColor: leaveTypeColor(bal.leave_type) }]} />
                <View style={{ flex: 1 }}>
                  <View style={balModal.typeHeader}>
                    <Text style={balModal.typeIcon}>{LEAVE_TYPE_ICONS[bal.leave_type]}</Text>
                    <Text style={[balModal.typeName, { color: leaveTypeColor(bal.leave_type) }]}>
                      {bal.leave_type.toUpperCase()}
                    </Text>
                    {bal.is_unlimited && (
                      <View style={balModal.unlimitedBadge}>
                        <Text style={balModal.unlimitedText}>Unlimited</Text>
                      </View>
                    )}
                  </View>

                  {!bal.is_unlimited && (
                    <View style={balModal.statsGrid}>
                      <View style={balModal.statBox}>
                        <Text style={balModal.statValue}>{bal.allocated_days + bal.carried_forward_days}</Text>
                        <Text style={balModal.statLabel}>Total</Text>
                      </View>
                      <View style={balModal.statBox}>
                        <Text style={[balModal.statValue, { color: Colors.error }]}>{bal.used_days.toFixed(1)}</Text>
                        <Text style={balModal.statLabel}>Used</Text>
                      </View>
                      <View style={balModal.statBox}>
                        <Text style={[balModal.statValue, { color: Colors.warning }]}>{bal.pending_days.toFixed(1)}</Text>
                        <Text style={balModal.statLabel}>Pending</Text>
                      </View>
                      <View style={balModal.statBox}>
                        <Text style={[balModal.statValue, {
                          color: bal.available_days <= 0 ? Colors.error : bal.available_days <= 2 ? Colors.warning : Colors.success
                        }]}>
                          {bal.available_days.toFixed(1)}
                        </Text>
                        <Text style={balModal.statLabel}>Available</Text>
                      </View>
                    </View>
                  )}

                  {bal.carried_forward_days > 0 && (
                    <Text style={balModal.carryForward}>+{bal.carried_forward_days}d carried from previous year</Text>
                  )}
                  {bal.notes && <Text style={balModal.notes}>Note: {bal.notes}</Text>}

                  {!bal.is_unlimited && (
                    editingType === bal.leave_type ? (
                      <View style={balModal.editBox}>
                        <Text style={balModal.editLabel}>Set allocated days:</Text>
                        <TextInput
                          style={balModal.editInput}
                          value={editDays}
                          onChangeText={setEditDays}
                          keyboardType="numeric"
                          placeholder={String(bal.allocated_days)}
                          placeholderTextColor={Colors.textTertiary}
                        />
                        <Text style={balModal.editLabel}>Admin note (optional):</Text>
                        <TextInput
                          style={[balModal.editInput, { height: 60, textAlignVertical: "top" }]}
                          value={editNotes}
                          onChangeText={setEditNotes}
                          placeholder="Reason for adjustment..."
                          placeholderTextColor={Colors.textTertiary}
                          multiline
                        />
                        <View style={balModal.editActions}>
                          <TouchableOpacity
                            style={balModal.cancelEditBtn}
                            onPress={() => { setEditingType(null); setEditDays(""); setEditNotes(""); }}
                          >
                            <Text style={balModal.cancelEditText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={balModal.saveBtn} onPress={handleSave} disabled={saving}>
                            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={balModal.saveBtnText}>Save</Text>}
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={balModal.adjustBtn}
                        onPress={() => { setEditingType(bal.leave_type); setEditDays(String(bal.allocated_days)); setEditNotes(""); }}
                      >
                        <Ionicons name="create-outline" size={14} color={Colors.primary} />
                        <Text style={balModal.adjustBtnText}>Adjust Allocation</Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Leave Policy Modal
// ---------------------------------------------------------------------------
interface PolicyModalProps {
  visible: boolean;
  policies: LeavePolicy[];
  policiesLoading: boolean;
  onUpdate: (leaveType: string, field: string, value: any) => void;
  onSave: (leaveType: string) => Promise<void>;
  onClose: () => void;
  editingPolicies: Record<string, Partial<LeavePolicy>>;
}

function PolicyModal({ visible, policies, policiesLoading, onUpdate, onSave, onClose, editingPolicies }: PolicyModalProps) {
  const [saving, setSaving] = useState<string | null>(null);

  const handleSave = async (leaveType: string) => {
    setSaving(leaveType);
    try {
      await onSave(leaveType);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update policy");
    } finally {
      setSaving(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onDismiss={onClose}>
      <SafeAreaView style={policyModal.container}>
        <View style={policyModal.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={policyModal.title}>Leave Policy</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
          <Text style={policyModal.description}>
            Configure default leave allocations for all teachers. Changes apply to new balance records only — existing allocations can be adjusted per teacher.
          </Text>

          {policiesLoading ? (
            <View style={policyModal.loadingRow}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={policyModal.loadingText}>Loading policies…</Text>
            </View>
          ) : (
            policies.map(policy => {
              const edits = editingPolicies[policy.leave_type] ?? {};
              const current = { ...policy, ...edits };

              return (
                <View key={policy.leave_type} style={policyModal.card}>
                  <View style={policyModal.cardTitle}>
                    <Text style={policyModal.typeIcon}>{LEAVE_TYPE_ICONS[policy.leave_type]}</Text>
                    <Text style={[policyModal.typeName, { color: leaveTypeColor(policy.leave_type) }]}>
                      {policy.leave_type.toUpperCase()}
                    </Text>
                  </View>

                  <View style={policyModal.fieldRow}>
                    <Text style={policyModal.fieldLabel}>Unlimited</Text>
                    <Switch
                      value={current.is_unlimited}
                      onValueChange={v => onUpdate(policy.leave_type, "is_unlimited", v)}
                      trackColor={{ false: Colors.borderLight, true: Colors.primary + "60" }}
                      thumbColor={current.is_unlimited ? Colors.primary : Colors.textSecondary}
                    />
                  </View>

                  {!current.is_unlimited && (
                    <View style={policyModal.fieldRow}>
                      <Text style={policyModal.fieldLabel}>Annual days</Text>
                      <TextInput
                        style={policyModal.numInput}
                        value={String(current.total_days ?? policy.total_days)}
                        onChangeText={v => onUpdate(policy.leave_type, "total_days", parseInt(v, 10) || 0)}
                        keyboardType="numeric"
                        selectTextOnFocus
                      />
                    </View>
                  )}

                  <View style={policyModal.fieldRow}>
                    <Text style={policyModal.fieldLabel}>Allow carry-forward</Text>
                    <Switch
                      value={current.is_carry_forward_allowed}
                      onValueChange={v => onUpdate(policy.leave_type, "is_carry_forward_allowed", v)}
                      trackColor={{ false: Colors.borderLight, true: Colors.primary + "60" }}
                      thumbColor={current.is_carry_forward_allowed ? Colors.primary : Colors.textSecondary}
                    />
                  </View>

                  {current.is_carry_forward_allowed && (
                    <View style={policyModal.fieldRow}>
                      <Text style={policyModal.fieldLabel}>Max carry-forward days{"\n"}(0 = no cap)</Text>
                      <TextInput
                        style={policyModal.numInput}
                        value={String(current.max_carry_forward_days ?? policy.max_carry_forward_days)}
                        onChangeText={v => onUpdate(policy.leave_type, "max_carry_forward_days", parseInt(v, 10) || 0)}
                        keyboardType="numeric"
                        selectTextOnFocus
                      />
                    </View>
                  )}

                  <View style={policyModal.fieldRow}>
                    <Text style={policyModal.fieldLabel}>Allow negative balance</Text>
                    <Switch
                      value={current.allow_negative}
                      onValueChange={v => onUpdate(policy.leave_type, "allow_negative", v)}
                      trackColor={{ false: Colors.borderLight, true: Colors.warning + "80" }}
                      thumbColor={current.allow_negative ? Colors.warning : Colors.textSecondary}
                    />
                  </View>

                  <View style={policyModal.fieldRow}>
                    <Text style={policyModal.fieldLabel}>Require reason</Text>
                    <Switch
                      value={current.requires_reason}
                      onValueChange={v => onUpdate(policy.leave_type, "requires_reason", v)}
                      trackColor={{ false: Colors.borderLight, true: Colors.primary + "60" }}
                      thumbColor={current.requires_reason ? Colors.primary : Colors.textSecondary}
                    />
                  </View>

                  <TouchableOpacity
                    style={policyModal.saveBtn}
                    onPress={() => handleSave(policy.leave_type)}
                    disabled={saving === policy.leave_type}
                  >
                    {saving === policy.leave_type ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={policyModal.saveBtnText}>Save {policy.leave_type} policy</Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
export default function TeacherLeavesScreen() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMS.TEACHER_LEAVE_MANAGE);

  const {
    leaves,
    loading,
    error,
    fetchLeaves,
    approveLeave,
    rejectLeave,
    balances,
    balancesLoading,
    fetchTeacherBalances,
    adjustBalance,
    policies,
    policiesLoading,
    fetchPolicies,
    updatePolicy,
  } = useTeacherLeaves();

  const [statusFilter, setStatusFilter] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");

  // Balance modal state
  const [balanceModalTeacherId, setBalanceModalTeacherId] = useState<string | null>(null);
  const [balanceModalTeacherName, setBalanceModalTeacherName] = useState("");

  // Policy modal state
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [editingPolicies, setEditingPolicies] = useState<Record<string, Partial<LeavePolicy>>>({});

  const load = useCallback(
    (filter?: string) => fetchLeaves(filter ? { status: filter } : undefined),
    [fetchLeaves]
  );

  useEffect(() => {
    load(statusFilter);
  }, [statusFilter]);

  const filteredLeaves = searchQuery.trim()
    ? leaves.filter(
        (l) =>
          l.teacher_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.teacher_employee_id?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : leaves;

  // -------------------------------------------------------------------------
  // Leave actions
  // -------------------------------------------------------------------------

  const handleApprove = (leave: TeacherLeave) => {
    Alert.alert(
      "Approve Leave",
      `Approve ${leave.teacher_name ?? "this teacher"}'s ${leave.leave_type} leave request` +
      (leave.working_days ? ` (${leave.working_days} working day(s))` : "") + "?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            try {
              await approveLeave(leave.id);
            } catch (e: any) {
              Alert.alert("Error", e.message || "Failed to approve leave");
            }
          },
        },
      ]
    );
  };

  const handleReject = (leave: TeacherLeave) => {
    Alert.alert(
      "Reject Leave",
      `Reject ${leave.teacher_name ?? "this teacher"}'s leave request?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              await rejectLeave(leave.id);
            } catch (e: any) {
              Alert.alert("Error", e.message || "Failed to reject leave");
            }
          },
        },
      ]
    );
  };

  // -------------------------------------------------------------------------
  // Balance modal
  // -------------------------------------------------------------------------

  const openBalanceModal = async (leave: TeacherLeave) => {
    setBalanceModalTeacherId(leave.teacher_id);
    setBalanceModalTeacherName(leave.teacher_name ?? "Teacher");
    await fetchTeacherBalances(leave.teacher_id);
  };

  const closeBalanceModal = () => {
    setBalanceModalTeacherId(null);
    setBalanceModalTeacherName("");
  };

  const handleAdjustBalance = async (leaveType: string, days: number, notes: string) => {
    if (!balanceModalTeacherId) return;
    await adjustBalance(balanceModalTeacherId, leaveType, { allocated_days: days, notes });
    Alert.alert("Updated", `${leaveType} leave allocation updated to ${days} day(s).`);
  };

  // -------------------------------------------------------------------------
  // Policy modal
  // -------------------------------------------------------------------------

  const openPolicyModal = async () => {
    setShowPolicyModal(true);
    await fetchPolicies();
  };

  const handlePolicyFieldChange = (leaveType: string, field: string, value: any) => {
    setEditingPolicies(prev => ({
      ...prev,
      [leaveType]: { ...(prev[leaveType] ?? {}), [field]: value },
    }));
  };

  const handleSavePolicy = async (leaveType: string) => {
    const edits = editingPolicies[leaveType];
    if (!edits || Object.keys(edits).length === 0) return;
    await updatePolicy(leaveType, edits);
    setEditingPolicies(prev => {
      const next = { ...prev };
      delete next[leaveType];
      return next;
    });
    Alert.alert("Saved", `${leaveType} leave policy updated.`);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const renderLeave = ({ item }: { item: TeacherLeave }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.teacherInfo}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {(item.teacher_name ?? "?").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.teacherName}>{item.teacher_name ?? "—"}</Text>
            {item.teacher_employee_id ? (
              <Text style={styles.employeeId}>#{item.teacher_employee_id}</Text>
            ) : null}
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + "20" }]}>
          <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.leaveDetails}>
        <View style={styles.detailRow}>
          <Text style={{ fontSize: 13 }}>{LEAVE_TYPE_ICONS[item.leave_type] ?? "📋"}</Text>
          <Text style={[styles.detailText, { color: leaveTypeColor(item.leave_type), fontWeight: "600" }]}>
            {item.leave_type.toUpperCase()}
          </Text>
          {item.working_days != null && (
            <View style={styles.workingDaysTag}>
              <Text style={styles.workingDaysText}>{item.working_days}d</Text>
            </View>
          )}
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.detailText}>{item.start_date} → {item.end_date}</Text>
        </View>
        {item.reason ? (
          <View style={styles.detailRow}>
            <Ionicons name="chatbubble-outline" size={14} color={Colors.textSecondary} />
            <Text style={[styles.detailText, styles.reasonText]}>{item.reason}</Text>
          </View>
        ) : null}
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.detailText}>Applied: {item.created_at.slice(0, 10)}</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        {canManage && item.status === "pending" && (
          <>
            <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item)}>
              <Ionicons name="checkmark-circle-outline" size={16} color={Colors.success} />
              <Text style={styles.approveBtnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item)}>
              <Ionicons name="close-circle-outline" size={16} color={Colors.error} />
              <Text style={styles.rejectBtnText}>Reject</Text>
            </TouchableOpacity>
          </>
        )}
        {canManage && (
          <TouchableOpacity style={styles.balanceBtn} onPress={() => openBalanceModal(item)}>
            <Ionicons name="wallet-outline" size={14} color={Colors.primary} />
            <Text style={styles.balanceBtnText}>Balance</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Teacher Leaves</Text>
        <View style={styles.headerActions}>
          {canManage && (
            <TouchableOpacity style={styles.policyBtn} onPress={openPolicyModal}>
              <Ionicons name="settings-outline" size={18} color={Colors.primary} />
              <Text style={styles.policyBtnText}>Policy</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.refreshBtn} onPress={() => load(statusFilter)}>
            <Ionicons name="refresh-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={Colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by teacher name or ID..."
          placeholderTextColor={Colors.textTertiary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Status filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterBarContent}
      >
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, statusFilter === f.value && styles.filterChipActive]}
            onPress={() => setStatusFilter(f.value)}
          >
            <Text style={[styles.filterChipText, statusFilter === f.value && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Count row */}
      {!loading && !error && (
        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {filteredLeaves.length} {filteredLeaves.length === 1 ? "request" : "requests"}
            {searchQuery ? " matching search" : ""}
          </Text>
        </View>
      )}

      {/* Content */}
      {error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load(statusFilter)}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredLeaves}
          keyExtractor={(item) => item.id}
          renderItem={renderLeave}
          contentContainerStyle={
            filteredLeaves.length === 0 ? styles.emptyContainer : { padding: Spacing.md }
          }
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={() => load(statusFilter)} colors={[Colors.primary]} />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.center}>
                <Ionicons name="document-text-outline" size={56} color={Colors.borderLight} />
                <Text style={styles.emptyText}>
                  {searchQuery ? "No results found for your search." : "No leave requests found."}
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Teacher Balance Modal */}
      {balanceModalTeacherId && (
        <TeacherBalanceModal
          visible={!!balanceModalTeacherId}
          teacherName={balanceModalTeacherName}
          teacherId={balanceModalTeacherId}
          balances={balances}
          balancesLoading={balancesLoading}
          onAdjust={handleAdjustBalance}
          onClose={closeBalanceModal}
        />
      )}

      {/* Policy Modal */}
      <PolicyModal
        visible={showPolicyModal}
        policies={policies}
        policiesLoading={policiesLoading}
        onUpdate={handlePolicyFieldChange}
        onSave={handleSavePolicy}
        onClose={() => setShowPolicyModal(false)}
        editingPolicies={editingPolicies}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Balance modal styles
// ---------------------------------------------------------------------------
const balModal = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: "700", color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 1 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, paddingVertical: Spacing.lg },
  loadingText: { color: Colors.textSecondary, fontSize: 14 },
  balanceRow: {
    flexDirection: "row",
    marginBottom: Spacing.lg,
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: "hidden",
  },
  typeAccent: { width: 4, borderRadius: 0 },
  typeHeader: { flexDirection: "row", alignItems: "center", gap: 6, padding: Spacing.md, paddingBottom: 4 },
  typeIcon: { fontSize: 16 },
  typeName: { fontSize: 13, fontWeight: "700", letterSpacing: 0.5, flex: 1 },
  unlimitedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: Colors.success + "20",
    borderRadius: 4,
  },
  unlimitedText: { fontSize: 11, color: Colors.success, fontWeight: "600" },
  statsGrid: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Layout.borderRadius.sm,
    paddingVertical: Spacing.sm,
  },
  statValue: { fontSize: 16, fontWeight: "800", color: Colors.text },
  statLabel: { fontSize: 10, color: Colors.textTertiary, marginTop: 2 },
  carryForward: {
    fontSize: 11,
    color: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingBottom: 4,
    fontStyle: "italic",
  },
  notes: {
    fontSize: 11,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.md,
    paddingBottom: 4,
    fontStyle: "italic",
  },
  adjustBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    margin: Spacing.md,
    marginTop: 4,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.primary + "10",
    borderRadius: Layout.borderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.primary + "30",
    alignSelf: "flex-start",
  },
  adjustBtnText: { color: Colors.primary, fontWeight: "600", fontSize: 13 },
  editBox: {
    margin: Spacing.md,
    marginTop: 4,
    padding: Spacing.md,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editLabel: { fontSize: 13, fontWeight: "500", color: Colors.text, marginBottom: 4, marginTop: 8 },
  editInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  editActions: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.md },
  cancelEditBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: "center",
  },
  cancelEditText: { color: Colors.textSecondary, fontWeight: "500" },
  saveBtn: {
    flex: 2,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.sm,
    backgroundColor: Colors.primary,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "700" },
});

// ---------------------------------------------------------------------------
// Policy modal styles
// ---------------------------------------------------------------------------
const policyModal = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  title: { fontSize: 18, fontWeight: "700", color: Colors.text },
  description: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: Spacing.lg,
  },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, paddingVertical: Spacing.lg },
  loadingText: { color: Colors.textSecondary, fontSize: 14 },
  card: {
    marginBottom: Spacing.lg,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.backgroundTertiary,
    overflow: "hidden",
  },
  cardTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.backgroundSecondary,
  },
  typeIcon: { fontSize: 18 },
  typeName: { fontSize: 14, fontWeight: "700", letterSpacing: 0.5 },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  fieldLabel: { fontSize: 13, color: Colors.text, flex: 1, lineHeight: 18 },
  numInput: {
    width: 72,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    fontSize: 14,
    color: Colors.text,
    textAlign: "center",
    backgroundColor: Colors.background,
  },
  saveBtn: {
    margin: Spacing.md,
    marginTop: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.sm,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});

// ---------------------------------------------------------------------------
// Main screen styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: Spacing.xl },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: Spacing.xl },

  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backIcon: { padding: Spacing.sm },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: "bold", color: Colors.text },
  headerActions: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  policyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.primary + "40",
    backgroundColor: Colors.primary + "10",
  },
  policyBtnText: { fontSize: 13, color: Colors.primary, fontWeight: "600" },
  refreshBtn: { padding: Spacing.sm },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  searchIcon: { marginRight: Spacing.sm },
  searchInput: { flex: 1, paddingVertical: Spacing.sm, fontSize: 14, color: Colors.text },

  filterBar: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight, maxHeight: 48 },
  filterBarContent: { paddingHorizontal: Spacing.md, alignItems: "center" },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.backgroundSecondary,
  },
  filterChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + "15" },
  filterChipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: "500" },
  filterChipTextActive: { color: Colors.primary, fontWeight: "600" },

  countRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  countText: { fontSize: 13, color: Colors.textSecondary },

  card: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.backgroundTertiary,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  teacherInfo: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, flex: 1 },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + "25",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "700", color: Colors.primary },
  teacherName: { fontSize: 15, fontWeight: "600", color: Colors.text },
  employeeId: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },

  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Layout.borderRadius.sm },
  statusText: { fontSize: 12, fontWeight: "600" },

  leaveDetails: { gap: 5, marginBottom: Spacing.sm },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  detailText: { fontSize: 13, color: Colors.textSecondary },
  reasonText: { fontStyle: "italic", flex: 1 },

  workingDaysTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  workingDaysText: { fontSize: 11, fontWeight: "600", color: Colors.textSecondary },

  cardActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    flexWrap: "wrap",
  },
  approveBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.success + "15",
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.success + "40",
    minWidth: 90,
  },
  approveBtnText: { color: Colors.success, fontWeight: "600", fontSize: 13 },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.error + "15",
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.error + "40",
    minWidth: 90,
  },
  rejectBtnText: { color: Colors.error, fontWeight: "600", fontSize: 13 },
  balanceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.primary + "30",
    backgroundColor: Colors.primary + "10",
  },
  balanceBtnText: { color: Colors.primary, fontWeight: "600", fontSize: 13 },

  errorText: { fontSize: 14, color: Colors.error, textAlign: "center", marginTop: Spacing.md },
  retryBtn: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.md,
  },
  retryBtnText: { color: "#fff", fontWeight: "600" },
  emptyText: { fontSize: 15, color: Colors.textSecondary, marginTop: Spacing.md, textAlign: "center" },
});
