import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useFinanceDashboard } from "@/modules/finance/hooks/useFinance";
import { ScreenContainer } from "@/src/components/ui/ScreenContainer";
import { Header } from "@/src/components/ui/Header";
import { SurfaceCard } from "@/src/components/ui/SurfaceCard";
import { LoadingState } from "@/src/components/ui/LoadingState";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { Avatar } from "@/src/components/ui/Avatar";
import { theme } from "@/src/design-system/theme";
import { Icons } from "@/src/design-system/icons";

function formatCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

interface StatCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  accent?: string;
}

function StatCard({ icon, value, label, accent }: StatCardProps) {
  return (
    <View style={[styles.statCard, accent ? { borderLeftWidth: 3, borderLeftColor: accent } : undefined]}>
      <View style={styles.statIcon}>{icon}</View>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function FinanceDashboardPage() {
  const router = useRouter();
  const { data: dashboardData, isLoading, error, refetch, isRefetching } = useFinanceDashboard(10);

  const stats = {
    totalExpected: dashboardData?.total_expected ?? 0,
    totalCollected: dashboardData?.total_collected ?? 0,
    totalOutstanding: dashboardData?.total_outstanding ?? 0,
    overdueCount: dashboardData?.overdue_count ?? 0,
  };
  const recentPayments = dashboardData?.recent_payments ?? [];

  if (error) {
    return (
      <ScreenContainer>
        <Header title="Finance" subtitle="Track fees and collect payments" />
        <EmptyState
          icon={<Icons.AlertCircle size={36} color={theme.colors.danger} />}
          title="Failed to load"
          description={error instanceof Error ? error.message : "Could not load finance data."}
          action={{ label: "Try again", onPress: () => refetch() }}
        />
      </ScreenContainer>
    );
  }

  if (isLoading && !dashboardData) {
    return (
      <ScreenContainer>
        <Header title="Finance" subtitle="Track fees and collect payments" />
        <LoadingState message="Loading finance data…" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Header title="Finance" subtitle="Track fees and collect payments" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.colors.primary[500]} />
        }
      >
        {/* Stats */}
        <Text style={styles.sectionTitle}>Summary</Text>
        <Text style={styles.sectionHint}>Fee collection overview this term</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon={<Icons.FileText size={22} color={theme.colors.primary[500]} />}
            value={formatCurrency(stats.totalExpected)}
            label="Total Expected"
          />
          <StatCard
            icon={<Icons.CheckMark size={22} color={theme.colors.success} />}
            value={formatCurrency(stats.totalCollected)}
            label="Collected"
            accent={theme.colors.success}
          />
        </View>
        <View style={styles.statsGrid}>
          <StatCard
            icon={<Icons.Clock size={22} color={theme.colors.warning} />}
            value={formatCurrency(stats.totalOutstanding)}
            label="Outstanding"
            accent={theme.colors.warning}
          />
          <StatCard
            icon={<Icons.AlertCircle size={22} color={theme.colors.danger} />}
            value={String(stats.overdueCount)}
            label="Overdue"
            accent={stats.overdueCount > 0 ? theme.colors.danger : undefined}
          />
        </View>

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { marginTop: theme.spacing.l }]}>Quick Actions</Text>
        <Text style={styles.sectionHint}>Jump to common tasks</Text>

        <TouchableOpacity
          style={styles.linkCard}
          onPress={() => router.push("/(protected)/finance/structures" as any)}
          activeOpacity={0.75}
        >
          <View style={styles.linkCardIcon}>
            <Icons.Class size={24} color={theme.colors.primary[500]} />
          </View>
          <View style={styles.linkText}>
            <Text style={styles.linkTitle}>Fee Structures</Text>
            <Text style={styles.linkSubtitle}>Create and manage fee structures</Text>
          </View>
          <Icons.ChevronRight size={20} color={theme.colors.text[400]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkCard}
          onPress={() => router.push("/(protected)/finance/student-fees/index" as any)}
          activeOpacity={0.75}
        >
          <View style={styles.linkCardIcon}>
            <Icons.Student size={24} color={theme.colors.primary[500]} />
          </View>
          <View style={styles.linkText}>
            <Text style={styles.linkTitle}>Student Fees</Text>
            <Text style={styles.linkSubtitle}>View fees and record payments</Text>
          </View>
          <Icons.ChevronRight size={20} color={theme.colors.text[400]} />
        </TouchableOpacity>

        {/* Recent Payments */}
        <View style={styles.recentHeader}>
          <View>
            <Text style={styles.sectionTitle}>Recent Payments</Text>
            <Text style={styles.sectionHint}>Latest collections</Text>
          </View>
          {recentPayments.length > 0 && (
            <TouchableOpacity
              onPress={() => router.push("/(protected)/finance/student-fees/index" as any)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.viewAll}>View all</Text>
            </TouchableOpacity>
          )}
        </View>

        {recentPayments.length === 0 ? (
          <SurfaceCard style={styles.emptyCard}>
            <EmptyState
              icon={<Icons.Finance size={32} color={theme.colors.text[300]} />}
              title="No recent payments"
              description="Payments you record will appear here"
              action={{ label: "Go to Student Fees", onPress: () => router.push("/(protected)/finance/student-fees/index" as any) }}
            />
          </SurfaceCard>
        ) : (
          <SurfaceCard padded={false} style={styles.paymentsCard}>
            {recentPayments.map((p: any, i: number) => (
              <View
                key={p.id}
                style={[styles.paymentRow, i === recentPayments.length - 1 && styles.paymentRowLast]}
              >
                <Avatar name={p.student_name ?? "?"} size={36} />
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentStudent}>{p.student_name ?? "Unknown"}</Text>
                  <Text style={styles.paymentDate}>
                    {new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </Text>
                </View>
                <Text style={styles.paymentAmount}>{formatCurrency(p.amount)}</Text>
              </View>
            ))}
          </SurfaceCard>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: theme.spacing.m, paddingBottom: theme.spacing.xxl },
  sectionTitle: { ...theme.typography.h3, color: theme.colors.text[900] },
  sectionHint: { ...theme.typography.bodySmall, color: theme.colors.text[500], marginTop: 2, marginBottom: theme.spacing.m },
  statsGrid: { flexDirection: "row", gap: theme.spacing.m, marginBottom: theme.spacing.m },
  statCard: {
    flex: 1, backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl,
    padding: theme.spacing.m, alignItems: "center",
    borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.sm,
  },
  statIcon: {
    width: 44, height: 44, borderRadius: theme.radius.l,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: "center", justifyContent: "center", marginBottom: theme.spacing.s,
  },
  statValue: { ...theme.typography.h3, color: theme.colors.text[900], textAlign: "center" },
  statLabel: { ...theme.typography.caption, color: theme.colors.text[500], marginTop: 2, textAlign: "center" },
  linkCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl,
    padding: theme.spacing.m, marginBottom: theme.spacing.m,
    borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.sm,
  },
  linkCardIcon: {
    width: 48, height: 48, borderRadius: theme.radius.l,
    backgroundColor: theme.colors.primary[50],
    alignItems: "center", justifyContent: "center", marginRight: theme.spacing.m,
  },
  linkText: { flex: 1 },
  linkTitle: { ...theme.typography.body, fontWeight: "600", color: theme.colors.text[900] },
  linkSubtitle: { ...theme.typography.caption, color: theme.colors.text[500], marginTop: 2 },
  recentHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    marginTop: theme.spacing.l, marginBottom: theme.spacing.s,
  },
  viewAll: { ...theme.typography.label, fontWeight: "600", color: theme.colors.primary[500] },
  emptyCard: { marginTop: theme.spacing.s },
  paymentsCard: { overflow: "hidden" },
  paymentRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: theme.spacing.m, paddingHorizontal: theme.spacing.m,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: theme.spacing.m,
  },
  paymentRowLast: { borderBottomWidth: 0 },
  paymentInfo: { flex: 1 },
  paymentStudent: { ...theme.typography.body, fontWeight: "500", color: theme.colors.text[900] },
  paymentDate: { ...theme.typography.caption, color: theme.colors.text[500], marginTop: 2 },
  paymentAmount: { ...theme.typography.body, fontWeight: "600", color: theme.colors.success },
});
