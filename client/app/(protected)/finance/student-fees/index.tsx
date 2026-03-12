import React, { useState, useMemo, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import {
  useStudentFees, useAcademicYears, useClasses,
} from "@/modules/finance/hooks/useFinance";
import { useAcademicYearContext } from "@/modules/academics/context/AcademicYearContext";
import { ClassSelect } from "@/common/components/ClassSelect";
import { ScreenContainer } from "@/src/components/ui/ScreenContainer";
import { Header } from "@/src/components/ui/Header";
import { SearchBar } from "@/src/components/ui/SearchBar";
import { LoadingState } from "@/src/components/ui/LoadingState";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { Avatar } from "@/src/components/ui/Avatar";
import { theme } from "@/src/design-system/theme";
import { Icons } from "@/src/design-system/icons";

function formatCurrency(n: number) { return `₹${n.toLocaleString("en-IN")}`; }
function formatDate(s: string) { try { return new Date(s).toLocaleDateString("en-IN"); } catch { return s; } }

const FEE_STATUS_COLORS: Record<string, string> = {
  paid: theme.colors.success,
  partial: theme.colors.warning,
  unpaid: theme.colors.text[400],
  overdue: theme.colors.danger,
};

function FeeBadge({ status }: { status: string }) {
  const color = FEE_STATUS_COLORS[status] || theme.colors.text[400];
  return (
    <View style={[styles.badge, { backgroundColor: color + '20', borderColor: color + '50' }]}>
      <Text style={[styles.badgeText, { color }]}>{status}</Text>
    </View>
  );
}

function getStatusesToDisplay(items: Array<{ amount?: number; paid_amount?: number }> | undefined, feeStatus: string): string[] {
  if (!items?.length) return [feeStatus];
  const statuses = new Set<string>();
  for (const it of items) {
    const amt = it.amount ?? 0, paid = it.paid_amount ?? 0;
    if (paid >= amt) statuses.add("paid");
    else if (paid > 0) statuses.add("partial");
    else statuses.add("unpaid");
  }
  if (feeStatus === "overdue") statuses.add("overdue");
  return statuses.size > 0 ? Array.from(statuses) : [feeStatus];
}

const STATUS_OPTIONS = [
  { value: "", label: "All" }, { value: "overdue", label: "Overdue" },
  { value: "unpaid", label: "Unpaid" }, { value: "partial", label: "Partial" }, { value: "paid", label: "Paid" },
];

export default function StudentFeesPage() {
  const router = useRouter();
  const { selectedAcademicYearId: contextYearId } = useAcademicYearContext();
  const [academicYearId, setAcademicYearId] = useState<string>("");
  const [classId, setClassId] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");

  const { data: academicYears = [] } = useAcademicYears(false);
  const { data: classes = [] } = useClasses();

  useEffect(() => {
    if (contextYearId) setAcademicYearId((prev) => (prev === "" ? contextYearId : prev));
  }, [contextYearId]);

  const { data: studentFees = [], isLoading, error, refetch, isRefetching } = useStudentFees({
    academic_year_id: academicYearId || undefined,
    class_id: classId || undefined,
    status: status || undefined,
    search: search.trim() || undefined,
    include_items: true,
  });

  const classOptions = useMemo(() =>
    (classes as any[]).map((c) => ({ id: c.id, label: c.section ? `${c.name}-${c.section}` : c.name ?? c.id, name: c.name, section: c.section })),
    [classes]
  );

  if (error) {
    return (
      <ScreenContainer>
        <Header title="Student Fees" onBack={() => router.back()} compact />
        <EmptyState
          icon={<Icons.AlertCircle size={32} color={theme.colors.danger} />}
          title="Failed to load"
          description={error instanceof Error ? error.message : "Could not load student fees."}
          action={{ label: "Try again", onPress: () => refetch() }}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Header title="Student Fees" onBack={() => router.back()} compact />
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search by name or admission no…" style={styles.search} />

      {/* Filters */}
      <View style={styles.filterBar}>
        <Text style={styles.filterLabel}>Academic Year</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <TouchableOpacity style={[styles.chip, !academicYearId && styles.chipActive]} onPress={() => setAcademicYearId("")}>
            <Text style={[styles.chipText, !academicYearId && styles.chipTextActive]}>All</Text>
          </TouchableOpacity>
          {(academicYears as any[]).map((ay) => (
            <TouchableOpacity key={ay.id} style={[styles.chip, academicYearId === ay.id && styles.chipActive]} onPress={() => setAcademicYearId(academicYearId === ay.id ? "" : ay.id)}>
              <Text style={[styles.chipText, academicYearId === ay.id && styles.chipTextActive]}>{ay.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={styles.filterLabel}>Class</Text>
        <ClassSelect value={classId || null} onChange={(id) => setClassId(id ?? "")} options={classOptions} allowEmpty emptyLabel="All" />
        <Text style={styles.filterLabel}>Status</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {STATUS_OPTIONS.map((opt) => (
            <TouchableOpacity key={opt.value || "all"} style={[styles.chip, status === opt.value && styles.chipActive]} onPress={() => setStatus(opt.value)}>
              <Text style={[styles.chipText, status === opt.value && styles.chipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading && studentFees.length === 0 ? (
        <LoadingState message="Loading fees…" />
      ) : (
        <FlatList
          data={studentFees as any[]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.colors.primary[500]} />}
          renderItem={({ item: sf }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/(protected)/finance/student-fees/${sf.id}` as any)}
              activeOpacity={0.75}
            >
              <Avatar name={sf.student_name ?? "?"} size={40} />
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{sf.student_name ?? "—"}</Text>
                <Text style={styles.cardDetail}>{sf.fee_structure_name ?? "—"} • Due {formatDate(sf.due_date)}</Text>
                <View style={styles.amountRow}>
                  <Text style={styles.amountTotal}>{formatCurrency(sf.total_amount)}</Text>
                  <Text style={styles.amountPaid}>{formatCurrency(sf.paid_amount)} paid</Text>
                  <View style={styles.badges}>
                    {getStatusesToDisplay(sf.items, sf.status).map((s: string) => <FeeBadge key={s} status={s} />)}
                  </View>
                </View>
              </View>
              <Icons.ChevronRight size={18} color={theme.colors.text[400]} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <EmptyState
              icon={search ? <Icons.Search size={32} color={theme.colors.text[300]} /> : <Icons.Student size={32} color={theme.colors.primary[300]} />}
              title={search ? "No results found" : "No student fees yet"}
              description={search ? "Try a different search or clear filters" : "Assign fee structures to students to see them here"}
              action={!search ? { label: "Go to Fee Structures", onPress: () => router.push("/(protected)/finance/structures" as any) } : undefined}
            />
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  search: { marginHorizontal: theme.spacing.m, marginVertical: theme.spacing.s },
  filterBar: { paddingHorizontal: theme.spacing.m, paddingBottom: theme.spacing.m, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  filterLabel: { ...theme.typography.caption, color: theme.colors.text[500], marginBottom: theme.spacing.xs, marginTop: theme.spacing.s },
  filterRow: { marginBottom: theme.spacing.xs },
  chip: {
    paddingHorizontal: theme.spacing.m, paddingVertical: theme.spacing.xs + 2,
    borderRadius: theme.radius.full, backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1, borderColor: theme.colors.border, marginRight: theme.spacing.s,
  },
  chipActive: { backgroundColor: theme.colors.primary[500], borderColor: theme.colors.primary[500] },
  chipText: { ...theme.typography.caption, fontWeight: "500", color: theme.colors.text[700] },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  list: { padding: theme.spacing.m, paddingBottom: theme.spacing.xxl },
  card: {
    flexDirection: "row", alignItems: "center", gap: theme.spacing.m,
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl,
    padding: theme.spacing.m, marginBottom: theme.spacing.s,
    borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.sm,
  },
  cardInfo: { flex: 1 },
  cardName: { ...theme.typography.body, fontWeight: "600", color: theme.colors.text[900] },
  cardDetail: { ...theme.typography.caption, color: theme.colors.text[500], marginTop: 2 },
  amountRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.s, marginTop: theme.spacing.xs },
  amountTotal: { ...theme.typography.caption, fontWeight: "700", color: theme.colors.text[900] },
  amountPaid: { ...theme.typography.caption, color: theme.colors.success },
  badges: { flexDirection: "row", gap: 4, flex: 1, flexWrap: "wrap" },
  badge: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: theme.radius.full,
    borderWidth: 1,
  },
  badgeText: { ...theme.typography.caption, fontWeight: "600", fontSize: 10 },
});
