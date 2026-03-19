import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useInvoices } from "@/modules/fees/hooks/useFees";
import type { FeeInvoice } from "@/modules/fees/services/feesService";
import { Colors } from "@/common/constants/colors";
import { Spacing, Layout } from "@/common/constants/spacing";

function formatCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function formatDate(s: string) {
  try {
    return new Date(s).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return s;
  }
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: Colors.textSecondary,
    unpaid: Colors.error,
    partial: Colors.warning,
    paid: Colors.success,
    cancelled: Colors.textTertiary,
  };
  const color = colors[status] ?? Colors.textSecondary;
  return (
    <View style={[styles.statusBadge, { borderColor: color }]}>
      <Text style={[styles.statusText, { color }]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );
}

export default function InvoicesListPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const { data: invoices = [], isLoading, error, refetch, isRefetching } = useInvoices({
    status: statusFilter || undefined,
  });

  const renderItem = ({ item }: { item: FeeInvoice }) => (
    <TouchableOpacity
      style={styles.invoiceCard}
      onPress={() => router.push(`/(protected)/finance/invoices/${item.id}` as never)}
      activeOpacity={0.7}
    >
      <View style={styles.invoiceHeader}>
        <Text style={styles.invoiceNumber}>{item.invoice_number}</Text>
        <StatusBadge status={item.status} />
      </View>
      <Text style={styles.invoiceDetail}>
        Due {formatDate(item.due_date)} • {formatCurrency(item.total_amount)}
      </Text>
      <View style={styles.invoiceFooter}>
        <Text style={styles.balanceText}>
          Balance: {formatCurrency(item.remaining_balance)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fee Invoices</Text>
      </View>

      <View style={styles.filterRow}>
        {["", "unpaid", "partial", "paid"].map((s) => (
          <TouchableOpacity
            key={s || "all"}
            style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
            onPress={() => setStatusFilter(statusFilter === s ? "" : s)}
          >
            <Text
              style={[
                styles.filterChipText,
                statusFilter === s && styles.filterChipTextActive,
              ]}
            >
              {s || "All"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            {error instanceof Error ? error.message : "Failed to load"}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading && invoices.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>No invoices</Text>
              <Text style={styles.emptySubtext}>
                Invoices will appear here when created
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backBtn: { padding: Spacing.sm, marginRight: Spacing.sm },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: Colors.text },
  filterRow: {
    flexDirection: "row",
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.backgroundSecondary,
  },
  filterChipActive: { backgroundColor: Colors.primary },
  filterChipText: { fontSize: 14, color: Colors.text },
  filterChipTextActive: { fontSize: 14, color: Colors.background, fontWeight: "600" },
  listContent: { padding: Spacing.md },
  invoiceCard: {
    backgroundColor: Colors.background,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  invoiceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  invoiceNumber: { fontSize: 16, fontWeight: "600", color: Colors.text },
  statusBadge: {
    borderWidth: 1,
    borderRadius: Layout.borderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  statusText: { fontSize: 12, fontWeight: "500" },
  invoiceDetail: { fontSize: 14, color: Colors.textSecondary, marginTop: Spacing.xs },
  invoiceFooter: { marginTop: Spacing.sm },
  balanceText: { fontSize: 13, color: Colors.text, fontWeight: "500" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: Spacing.xl },
  errorBox: { padding: Spacing.lg, alignItems: "center" },
  errorText: { color: Colors.error, marginBottom: Spacing.sm },
  retryBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Layout.borderRadius.md,
  },
  retryBtnText: { color: "#fff", fontWeight: "600" },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xxl,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: Colors.text, marginTop: Spacing.md },
  emptySubtext: { fontSize: 14, color: Colors.textSecondary, marginTop: Spacing.xs },
});
