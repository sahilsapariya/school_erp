import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useTeacherLeaves } from "@/modules/teachers/hooks/useTeacherLeaves";
import { TeacherLeave } from "@/modules/teachers/types";
import { ScreenContainer } from "@/src/components/ui/ScreenContainer";
import { Header } from "@/src/components/ui/Header";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { PrimaryButton } from "@/src/components/ui/PrimaryButton";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { LoadingState } from "@/src/components/ui/LoadingState";
import { FloatingActionButton } from "@/src/components/ui/FloatingActionButton";
import { useToast } from "@/src/components/ui/Toast";
import { theme } from "@/src/design-system/theme";
import { Icons } from "@/src/design-system/icons";

const LEAVE_TYPES = ["casual", "sick", "emergency", "unpaid", "other"];
const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

function leaveStatusType(status: string): "success" | "danger" | "warning" | "info" {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  if (status === "cancelled") return "info";
  return "warning";
}

export default function MyLeavesScreen() {
  const router = useRouter();
  const toast = useToast();
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
      toast.warning("Required fields", "Start date and end date are required.");
      return;
    }
    try {
      setSubmitting(true);
      await createLeave({ start_date: leaveStart, end_date: leaveEnd, leave_type: leaveType, reason: leaveReason });
      setShowApplyModal(false);
      setLeaveStart(""); setLeaveEnd(""); setLeaveType("casual"); setLeaveReason("");
      toast.success("Leave applied", "Your leave request has been submitted.");
    } catch (e: any) {
      toast.error("Failed to apply", e.message || "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (leave: TeacherLeave) => {
    try {
      await cancelLeave(leave.id);
      toast.success("Leave cancelled");
    } catch (e: any) {
      toast.error("Error", e.message || "Failed to cancel leave");
    }
  };

  if (loading && leaves.length === 0) {
    return (
      <ScreenContainer>
        <Header title="My Leaves" onBack={() => router.back()} compact />
        <LoadingState message="Loading leaves..." />
      </ScreenContainer>
    );
  }

  const renderLeave = ({ item }: { item: TeacherLeave }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.leaveTypeLbl}>{item.leave_type.toUpperCase()}</Text>
        <StatusBadge status={leaveStatusType(item.status)} label={item.status} />
      </View>
      <View style={styles.cardDetail}>
        <Icons.Calendar size={14} color={theme.colors.text[500]} />
        <Text style={styles.cardDetailText}>{item.start_date} → {item.end_date}</Text>
      </View>
      {item.reason ? (
        <Text style={styles.cardReason}>{item.reason}</Text>
      ) : null}
      <Text style={styles.cardApplied}>Applied: {item.created_at.slice(0, 10)}</Text>
      {item.status === "pending" && (
        <TouchableOpacity
          style={styles.cancelChip}
          onPress={() => handleCancel(item)}
          activeOpacity={0.7}
        >
          <Icons.Close size={13} color={theme.colors.danger} />
          <Text style={styles.cancelChipText}>Cancel Request</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ScreenContainer>
      <Header title="My Leaves" onBack={() => router.back()} compact />

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
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, statusFilter === f.value && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={leaves}
        keyExtractor={(item) => item.id}
        renderItem={renderLeave}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => load(statusFilter)}
            tintColor={theme.colors.primary[500]}
          />
        }
        ListEmptyComponent={
          error ? (
            <EmptyState
              icon={<Icons.AlertCircle size={32} color={theme.colors.danger} />}
              title="Failed to load"
              description={error}
              action={{ label: "Retry", onPress: () => load(statusFilter) }}
            />
          ) : (
            <EmptyState
              icon={<Icons.FileText size={32} color={theme.colors.primary[300]} />}
              title="No leave requests"
              description="Apply for a leave using the button below."
              action={{ label: "Apply for Leave", onPress: () => setShowApplyModal(true) }}
            />
          )
        }
      />

      <FloatingActionButton onPress={() => setShowApplyModal(true)} icon={<Icons.Add size={26} color="white" />} />

      {/* Apply Modal */}
      <Modal visible={showApplyModal} animationType="slide" presentationStyle="formSheet">
        <ScreenContainer keyboardAvoiding>
          <Header title="Apply for Leave" onBack={() => setShowApplyModal(false)} compact />
          <ScrollView contentContainerStyle={styles.modalForm} showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>Start Date (YYYY-MM-DD) *</Text>
            <TextInput
              style={styles.fieldInput}
              value={leaveStart}
              onChangeText={setLeaveStart}
              placeholder="2026-03-10"
              placeholderTextColor={theme.colors.text[400]}
            />

            <Text style={styles.fieldLabel}>End Date (YYYY-MM-DD) *</Text>
            <TextInput
              style={styles.fieldInput}
              value={leaveEnd}
              onChangeText={setLeaveEnd}
              placeholder="2026-03-12"
              placeholderTextColor={theme.colors.text[400]}
            />

            <Text style={styles.fieldLabel}>Leave Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
              {LEAVE_TYPES.map((lt) => (
                <TouchableOpacity
                  key={lt}
                  style={[styles.typeChip, leaveType === lt && styles.typeChipActive]}
                  onPress={() => setLeaveType(lt)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.typeChipText, leaveType === lt && styles.typeChipTextActive]}>
                    {lt}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Reason (optional)</Text>
            <TextInput
              style={[styles.fieldInput, styles.textArea]}
              value={leaveReason}
              onChangeText={setLeaveReason}
              placeholder="Brief reason..."
              placeholderTextColor={theme.colors.text[400]}
              multiline
              textAlignVertical="top"
            />

            <PrimaryButton
              title="Submit Leave Request"
              onPress={handleApply}
              loading={submitting}
              style={styles.submitBtn}
            />
          </ScrollView>
        </ScreenContainer>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  filterBar: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    maxHeight: 48,
  },
  filterBarContent: {
    paddingHorizontal: theme.spacing.m,
    alignItems: "center",
    gap: theme.spacing.s,
  },
  filterChip: {
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  filterChipActive: {
    borderColor: theme.colors.primary[500],
    backgroundColor: theme.colors.primary[50],
  },
  filterChipText: {
    ...theme.typography.caption,
    color: theme.colors.text[500],
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: theme.colors.primary[600],
    fontWeight: "600",
  },
  listContent: {
    padding: theme.spacing.m,
    paddingBottom: theme.spacing.xxl + 60,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.m,
    marginBottom: theme.spacing.s,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.s,
  },
  leaveTypeLbl: {
    ...theme.typography.overline,
    color: theme.colors.text[700],
  },
  cardDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  cardDetailText: {
    ...theme.typography.body,
    fontWeight: "500",
    color: theme.colors.text[900],
  },
  cardReason: {
    ...theme.typography.bodySmall,
    color: theme.colors.text[500],
    fontStyle: "italic",
    marginBottom: theme.spacing.xs,
  },
  cardApplied: {
    ...theme.typography.caption,
    color: theme.colors.text[400],
    marginTop: theme.spacing.xs,
  },
  cancelChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    alignSelf: "flex-start",
    marginTop: theme.spacing.s,
    paddingHorizontal: theme.spacing.s,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.danger + "60",
    backgroundColor: theme.colors.dangerLight,
  },
  cancelChipText: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    fontWeight: "500",
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
  textArea: {
    height: 80,
    paddingTop: theme.spacing.sm,
    textAlignVertical: "top",
  },
  typeRow: { marginBottom: theme.spacing.s },
  typeChip: {
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginRight: theme.spacing.s,
  },
  typeChipActive: {
    borderColor: theme.colors.primary[500],
    backgroundColor: theme.colors.primary[500],
  },
  typeChipText: {
    ...theme.typography.caption,
    color: theme.colors.text[500],
    fontWeight: "500",
  },
  typeChipTextActive: {
    color: "white",
    fontWeight: "600",
  },
  submitBtn: {
    marginTop: theme.spacing.xl,
  },
});
