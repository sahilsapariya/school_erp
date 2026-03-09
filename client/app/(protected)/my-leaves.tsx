import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/common/constants/colors";
import { Spacing, Layout } from "@/common/constants/spacing";
import { useTeacherLeaves } from "@/modules/teachers/hooks/useTeacherLeaves";
import { TeacherLeave, LeaveStatus } from "@/modules/teachers/types";

const LEAVE_TYPES = ["casual", "sick", "emergency", "unpaid", "other"];
const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Cancelled", value: "cancelled" },
];

function statusColor(status: string): string {
  switch (status) {
    case "approved": return Colors.success;
    case "rejected": return Colors.error;
    case "cancelled": return Colors.textSecondary;
    default: return Colors.warning;
  }
}

export default function MyLeavesScreen() {
  const router = useRouter();
  const { leaves, loading, error, fetchMyLeaves, createLeave, cancelLeave } = useTeacherLeaves();

  const [statusFilter, setStatusFilter] = useState("");
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveType, setLeaveType] = useState("casual");
  const [leaveReason, setLeaveReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(
    (filter?: string) => fetchMyLeaves(filter ? { status: filter } : undefined),
    [fetchMyLeaves]
  );

  useEffect(() => {
    load(statusFilter);
  }, [statusFilter]);

  const handleApply = async () => {
    if (!leaveStart || !leaveEnd) {
      Alert.alert("Validation", "Start date and end date are required");
      return;
    }
    try {
      setSubmitting(true);
      await createLeave({ start_date: leaveStart, end_date: leaveEnd, leave_type: leaveType, reason: leaveReason });
      setShowApplyModal(false);
      setLeaveStart("");
      setLeaveEnd("");
      setLeaveType("casual");
      setLeaveReason("");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to submit leave request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = (leave: TeacherLeave) => {
    Alert.alert("Cancel Leave", "Are you sure you want to cancel this leave request?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelLeave(leave.id);
          } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to cancel leave");
          }
        },
      },
    ]);
  };

  const renderLeave = ({ item }: { item: TeacherLeave }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.leaveType}>{item.leave_type.toUpperCase()}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + "20" }]}>
          <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.leaveDates}>
        <Ionicons name="calendar-outline" size={13} color={Colors.textSecondary} /> {item.start_date} → {item.end_date}
      </Text>
      {item.reason ? <Text style={styles.leaveReason}>{item.reason}</Text> : null}
      <Text style={styles.leaveDate}>Applied: {item.created_at.slice(0, 10)}</Text>
      {item.status === "pending" && (
        <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item)}>
          <Ionicons name="close-circle-outline" size={15} color={Colors.error} />
          <Text style={styles.cancelBtnText}>Cancel Request</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Leaves</Text>
        <TouchableOpacity style={styles.applyBtn} onPress={() => setShowApplyModal(true)}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.applyBtnText}>Apply</Text>
        </TouchableOpacity>
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
          data={leaves}
          keyExtractor={(item) => item.id}
          renderItem={renderLeave}
          contentContainerStyle={leaves.length === 0 ? styles.emptyContainer : { padding: Spacing.md }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load(statusFilter)} colors={[Colors.primary]} />}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.center}>
                <Ionicons name="document-text-outline" size={56} color={Colors.borderLight} />
                <Text style={styles.emptyText}>No leave requests found.</Text>
                <TouchableOpacity style={styles.applyEmptyBtn} onPress={() => setShowApplyModal(true)}>
                  <Text style={styles.applyEmptyBtnText}>Apply for Leave</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      {/* Apply Leave Modal */}
      <Modal visible={showApplyModal} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Apply for Leave</Text>
            <TouchableOpacity onPress={() => setShowApplyModal(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: Spacing.lg }}>
            <Text style={styles.fieldLabel}>Start Date (YYYY-MM-DD) *</Text>
            <TextInput
              style={styles.input}
              value={leaveStart}
              onChangeText={setLeaveStart}
              placeholder="2026-03-10"
              placeholderTextColor={Colors.textTertiary}
            />

            <Text style={styles.fieldLabel}>End Date (YYYY-MM-DD) *</Text>
            <TextInput
              style={styles.input}
              value={leaveEnd}
              onChangeText={setLeaveEnd}
              placeholder="2026-03-12"
              placeholderTextColor={Colors.textTertiary}
            />

            <Text style={styles.fieldLabel}>Leave Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
              {LEAVE_TYPES.map((lt) => (
                <TouchableOpacity
                  key={lt}
                  style={[styles.chip, leaveType === lt && styles.chipActive]}
                  onPress={() => setLeaveType(lt)}
                >
                  <Text style={[styles.chipText, leaveType === lt && styles.chipTextActive]}>{lt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Reason (optional)</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: "top" }]}
              value={leaveReason}
              onChangeText={setLeaveReason}
              placeholder="Brief reason..."
              placeholderTextColor={Colors.textTertiary}
              multiline
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleApply} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Leave Request</Text>
              )}
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
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: Spacing.xl },

  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backIcon: { padding: Spacing.sm },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: "bold", color: Colors.text, marginLeft: Spacing.md },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.sm,
    gap: 4,
  },
  applyBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },

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

  card: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.backgroundTertiary,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.sm },
  leaveType: { fontSize: 13, fontWeight: "700", color: Colors.text, letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Layout.borderRadius.sm },
  statusText: { fontSize: 12, fontWeight: "600" },
  leaveDates: { fontSize: 14, color: Colors.text, marginBottom: 4 },
  leaveReason: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, fontStyle: "italic" },
  leaveDate: { fontSize: 12, color: Colors.textTertiary, marginTop: 6 },

  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.error + "60",
    backgroundColor: Colors.error + "10",
  },
  cancelBtnText: { fontSize: 12, color: Colors.error, fontWeight: "500" },

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
  applyEmptyBtn: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.md,
  },
  applyEmptyBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },

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
});
