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
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/common/constants/colors";
import { Spacing, Layout } from "@/common/constants/spacing";
import { useTeacherLeaves } from "@/modules/teachers/hooks/useTeacherLeaves";
import { usePermissions } from "@/modules/permissions/hooks/usePermissions";
import * as PERMS from "@/modules/permissions/constants/permissions";
import { TeacherLeave } from "@/modules/teachers/types";

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

export default function TeacherLeavesScreen() {
  const router = useRouter();
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

  const handleApprove = (leave: TeacherLeave) => {
    Alert.alert("Approve Leave", `Approve ${leave.teacher_name ?? "this teacher"}'s leave request?`, [
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
    ]);
  };

  const handleReject = (leave: TeacherLeave) => {
    Alert.alert("Reject Leave", `Reject ${leave.teacher_name ?? "this teacher"}'s leave request?`, [
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
    ]);
  };

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
          <Ionicons name="briefcase-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.detailText}>{item.leave_type.toUpperCase()}</Text>
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

      {canManage && item.status === "pending" && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item)}>
            <Ionicons name="checkmark-circle-outline" size={16} color={Colors.success} />
            <Text style={styles.approveBtnText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item)}>
            <Ionicons name="close-circle-outline" size={16} color={Colors.error} />
            <Text style={styles.rejectBtnText}>Reject</Text>
          </TouchableOpacity>
        </View>
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
        <Text style={styles.headerTitle}>Teacher Leaves</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => load(statusFilter)}>
          <Ionicons name="refresh-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>
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
          contentContainerStyle={filteredLeaves.length === 0 ? styles.emptyContainer : { padding: Spacing.md }}
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
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: Spacing.sm },
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

  actions: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.sm },
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
  },
  rejectBtnText: { color: Colors.error, fontWeight: "600", fontSize: 13 },

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
