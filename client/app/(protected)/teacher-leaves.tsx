import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useTeacherLeaves } from "@/modules/teachers/hooks/useTeacherLeaves";
import { usePermissions } from "@/modules/permissions/hooks/usePermissions";
import * as PERMS from "@/modules/permissions/constants/permissions";
import { TeacherLeave } from "@/modules/teachers/types";
import { ScreenContainer } from "@/src/components/ui/ScreenContainer";
import { Header } from "@/src/components/ui/Header";
import { SearchBar } from "@/src/components/ui/SearchBar";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { PrimaryButton } from "@/src/components/ui/PrimaryButton";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { LoadingState } from "@/src/components/ui/LoadingState";
import { Avatar } from "@/src/components/ui/Avatar";
import { useToast } from "@/src/components/ui/Toast";
import { theme } from "@/src/design-system/theme";
import { Icons } from "@/src/design-system/icons";

const STATUS_FILTERS = [
  { label: "Pending", value: "pending" },
  { label: "All", value: "" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

function leaveStatusType(status: string): "success" | "danger" | "warning" | "info" {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  if (status === "cancelled") return "info";
  return "warning";
}

export default function TeacherLeavesScreen() {
  const router = useRouter();
  const toast = useToast();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission(PERMS.TEACHER_LEAVE_MANAGE);

  const { leaves, loading, error, fetchLeaves, approveLeave, rejectLeave } = useTeacherLeaves();

  const [statusFilter, setStatusFilter] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleApprove = async (leave: TeacherLeave) => {
    try {
      await approveLeave(leave.id);
      toast.success("Leave approved", `${leave.teacher_name ?? "Teacher"}'s leave has been approved.`);
    } catch (e: any) {
      toast.error("Error", e.message || "Failed to approve leave");
    }
  };

  const handleReject = async (leave: TeacherLeave) => {
    try {
      await rejectLeave(leave.id);
      toast.warning("Leave rejected", `${leave.teacher_name ?? "Teacher"}'s leave has been rejected.`);
    } catch (e: any) {
      toast.error("Error", e.message || "Failed to reject leave");
    }
  };

  if (loading && leaves.length === 0) {
    return (
      <ScreenContainer>
        <Header title="Leave Requests" onBack={() => router.back()} compact />
        <LoadingState message="Loading leave requests..." />
      </ScreenContainer>
    );
  }

  const renderLeave = ({ item }: { item: TeacherLeave }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.teacherRow}>
          <Avatar name={item.teacher_name ?? "T"} size={40} />
          <View style={styles.teacherInfo}>
            <Text style={styles.teacherName}>{item.teacher_name ?? "—"}</Text>
            {item.teacher_employee_id ? (
              <Text style={styles.teacherEmpId}>#{item.teacher_employee_id}</Text>
            ) : null}
          </View>
        </View>
        <StatusBadge status={leaveStatusType(item.status)} label={item.status} />
      </View>

      <View style={styles.detailGrid}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Type</Text>
          <Text style={styles.detailValue}>{item.leave_type.toUpperCase()}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Duration</Text>
          <Text style={styles.detailValue}>{item.start_date} → {item.end_date}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Applied</Text>
          <Text style={styles.detailValue}>{item.created_at.slice(0, 10)}</Text>
        </View>
      </View>

      {item.reason ? (
        <View style={styles.reasonBox}>
          <Icons.FileText size={13} color={theme.colors.text[500]} />
          <Text style={styles.reasonText}>{item.reason}</Text>
        </View>
      ) : null}

      {canManage && item.status === "pending" && (
        <View style={styles.cardActions}>
          <PrimaryButton
            title="Approve"
            size="sm"
            onPress={() => handleApprove(item)}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            title="Reject"
            size="sm"
            variant="outline"
            onPress={() => handleReject(item)}
            style={{ flex: 1 }}
          />
        </View>
      )}
    </View>
  );

  return (
    <ScreenContainer>
      <Header
        title="Leave Requests"
        onBack={() => router.back()}
        compact
        rightAction={
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => load(statusFilter)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icons.Refresh size={20} color={theme.colors.primary[500]} />
          </TouchableOpacity>
        }
      />

      <View style={styles.searchWrap}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by teacher name or ID..."
        />
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
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, statusFilter === f.value && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {!loading && !error && (
        <View style={styles.countBar}>
          <Text style={styles.countText}>
            {filteredLeaves.length} {filteredLeaves.length === 1 ? "request" : "requests"}
            {searchQuery ? " matching search" : ""}
          </Text>
        </View>
      )}

      <FlatList
        data={filteredLeaves}
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
              description={searchQuery ? "No results matching your search." : "No leave requests found."}
            />
          )
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    paddingHorizontal: theme.spacing.m,
    paddingTop: theme.spacing.s,
    paddingBottom: theme.spacing.xs,
  },
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
  countBar: {
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  countText: {
    ...theme.typography.caption,
    color: theme.colors.text[500],
  },
  listContent: {
    padding: theme.spacing.m,
    paddingBottom: theme.spacing.xxl,
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
    alignItems: "flex-start",
    marginBottom: theme.spacing.m,
  },
  teacherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    flex: 1,
  },
  teacherInfo: { flex: 1 },
  teacherName: {
    ...theme.typography.body,
    fontWeight: "600",
    color: theme.colors.text[900],
  },
  teacherEmpId: {
    ...theme.typography.caption,
    color: theme.colors.text[500],
    marginTop: 2,
  },
  detailGrid: {
    flexDirection: "row",
    gap: theme.spacing.m,
    marginBottom: theme.spacing.s,
  },
  detailItem: { flex: 1 },
  detailLabel: {
    ...theme.typography.caption,
    color: theme.colors.text[500],
    marginBottom: 2,
  },
  detailValue: {
    ...theme.typography.bodySmall,
    fontWeight: "500",
    color: theme.colors.text[900],
  },
  reasonBox: {
    flexDirection: "row",
    gap: theme.spacing.xs,
    alignItems: "flex-start",
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.radius.m,
    padding: theme.spacing.s,
    marginBottom: theme.spacing.s,
  },
  reasonText: {
    ...theme.typography.bodySmall,
    color: theme.colors.text[500],
    flex: 1,
    fontStyle: "italic",
  },
  cardActions: {
    flexDirection: "row",
    gap: theme.spacing.s,
    marginTop: theme.spacing.s,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.m,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
});
