import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Pressable, RefreshControl, TextInput, Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  useStudentFee, useRecordPayment, useRefundPayment, useDeleteStudentFee,
} from "@/modules/finance/hooks/useFinance";
import type { RecordPaymentInput } from "@/modules/finance/types";
import { ScreenContainer } from "@/src/components/ui/ScreenContainer";
import { Header } from "@/src/components/ui/Header";
import { SurfaceCard } from "@/src/components/ui/SurfaceCard";
import { DataRow } from "@/src/components/ui/DataRow";
import { LoadingState } from "@/src/components/ui/LoadingState";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { PrimaryButton } from "@/src/components/ui/PrimaryButton";
import { ConfirmationDialog } from "@/src/components/ui/ConfirmationDialog";
import { useToast } from "@/src/components/ui/Toast";
import { theme } from "@/src/design-system/theme";
import { Icons } from "@/src/design-system/icons";

function formatCurrency(n: number) { return `₹${n.toLocaleString("en-IN")}`; }
function formatDate(s: string) { try { return new Date(s).toLocaleDateString("en-IN"); } catch { return s; } }

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  success: theme.colors.success,
  refunded: theme.colors.text[400],
  failed: theme.colors.danger,
};

type AllocationState = Record<string, string>;

export default function StudentFeeDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [allocations, setAllocations] = useState<AllocationState>({});
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundPaymentId, setRefundPaymentId] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

  const { data, isLoading, error, refetch, isRefetching } = useStudentFee(id);
  const recordMut = useRecordPayment();
  const refundMut = useRefundPayment(id);
  const deleteFeeMut = useDeleteStudentFee();

  const remaining = (data?.total_amount ?? 0) - (data?.paid_amount ?? 0);
  const itemsWithRemaining = (data?.items ?? []).filter((item) => (item.amount ?? 0) - (item.paid_amount ?? 0) > 0);
  const amountNum = parseFloat(amount) || 0;
  const amountExceedsRemaining = amountNum > remaining && amount.trim() !== "";
  const allocationSum = itemsWithRemaining.reduce((sum, item) => sum + (parseFloat(allocations[item.id] ?? "0") || 0), 0);
  const useAllocations = allocationSum > 0;
  const allocationMismatch = useAllocations && Math.abs(allocationSum - amountNum) > 0.01;
  const canSubmitPayment = !recordMut.isPending && amountNum > 0 && amountNum <= remaining && (!useAllocations || !allocationMismatch);

  const handleQuickAmount = (ratio: number) => setAmount(String(Math.round(remaining * ratio)));

  const handlePayFullForItem = (item: { id: string; amount?: number; paid_amount?: number }) => {
    const itemRemaining = (item.amount ?? 0) - (item.paid_amount ?? 0);
    if (itemRemaining > 0) {
      setAllocations((prev) => {
        const next = { ...prev, [item.id]: String(itemRemaining) };
        const sum = Object.values(next).reduce((s, v) => s + (parseFloat(v) || 0), 0);
        setAmount(String(sum));
        return next;
      });
    }
  };

  const handleAutoAllocate = () => {
    if (!amountNum || amountNum <= 0 || amountNum > remaining) return;
    const newAllocations: AllocationState = {};
    let left = amountNum;
    for (const item of itemsWithRemaining) {
      if (left <= 0) break;
      const itemRemaining = (item.amount ?? 0) - (item.paid_amount ?? 0);
      if (itemRemaining <= 0) continue;
      const toApply = Math.min(left, itemRemaining);
      newAllocations[item.id] = String(toApply);
      left -= toApply;
    }
    setAllocations(newAllocations);
  };

  const handleRecordPayment = async () => {
    const amt = parseFloat(amount);
    if (!id || isNaN(amt) || amt <= 0) {
      toast.warning("Invalid amount", "Enter a valid payment amount.");
      return;
    }
    if (useAllocations && allocationMismatch) {
      toast.warning("Allocation mismatch", "Allocation amounts must sum to the total payment amount.");
      return;
    }
    try {
      const payload: RecordPaymentInput = {
        student_fee_id: id, amount: amt, method,
        reference_number: referenceNumber || undefined, notes: notes || undefined,
      };
      if (useAllocations) {
        payload.allocations = itemsWithRemaining
          .filter((item) => parseFloat(allocations[item.id] ?? "0") > 0)
          .map((item) => ({ item_id: item.id, amount: parseFloat(allocations[item.id] ?? "0") || 0 }));
      }
      await recordMut.mutateAsync(payload);
      setPaymentModalOpen(false);
      setAmount(""); setReferenceNumber(""); setNotes(""); setAllocations({});
      toast.success("Payment recorded", `${formatCurrency(amt)} recorded successfully.`);
    } catch (e: any) {
      toast.error("Error", e?.message ?? "Failed to record payment");
    }
  };

  const handleRefund = async () => {
    if (!refundPaymentId) return;
    try {
      await refundMut.mutateAsync({ paymentId: refundPaymentId, notes: refundReason.trim() || undefined });
      setRefundModalOpen(false); setRefundPaymentId(null); setRefundReason("");
      toast.success("Payment refunded");
    } catch (e: any) {
      toast.error("Error", e?.message ?? "Failed to refund");
    }
  };

  const handleRemoveConfirm = async () => {
    if (!id) return;
    try {
      await deleteFeeMut.mutateAsync(id);
      toast.success("Removed from fee structure");
      router.replace("/(protected)/finance/student-fees" as any);
    } catch (e: any) {
      toast.error("Error", e?.message ?? "Failed to remove student from fee structure");
    } finally {
      setRemoveDialogOpen(false);
    }
  };

  const statusColor = (s: string) => {
    if (s === "paid") return theme.colors.success;
    if (s === "overdue") return theme.colors.danger;
    if (s === "partial") return theme.colors.warning;
    return theme.colors.text[400];
  };
  const itemStatusColor = (s: "paid" | "partial" | "unpaid") => {
    if (s === "paid") return theme.colors.success;
    if (s === "partial") return theme.colors.warning;
    return theme.colors.text[400];
  };

  if (error) {
    return (
      <ScreenContainer>
        <Header title="Fee Detail" onBack={() => router.back()} compact />
        <EmptyState icon={<Icons.AlertCircle size={32} color={theme.colors.danger} />} title="Failed to load" description={error instanceof Error ? error.message : "Could not load fee detail."} action={{ label: "Try again", onPress: () => refetch() }} />
      </ScreenContainer>
    );
  }
  if (isLoading && !data) {
    return (<ScreenContainer><Header title="Fee Detail" onBack={() => router.back()} compact /><LoadingState message="Loading fee detail…" /></ScreenContainer>);
  }
  if (!data) {
    return (<ScreenContainer><Header title="Fee Detail" onBack={() => router.back()} compact /><EmptyState title="Not found" description="This fee record could not be found." action={{ label: "Go back", onPress: () => router.back() }} /></ScreenContainer>);
  }

  return (
    <ScreenContainer>
      <Header title="Fee Detail" onBack={() => router.back()} compact />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.colors.primary[500]} />}>

        {/* Summary */}
        <SurfaceCard
          title="Summary"
          rightAction={
            <TouchableOpacity style={styles.removeBtn} onPress={() => setRemoveDialogOpen(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icons.Delete size={15} color={theme.colors.danger} />
              <Text style={styles.removeBtnText}>Remove</Text>
            </TouchableOpacity>
          }
          style={styles.section}
        >
          <Text style={styles.summaryName}>{data.student_name ?? "—"}</Text>
          <Text style={styles.summaryStructure}>{data.fee_structure_name ?? "—"}</Text>
          <DataRow title="Total" subtitle={formatCurrency(data.total_amount)} noBorder />
          <DataRow title="Paid" subtitle={formatCurrency(data.paid_amount)} rightComponent={<Text style={[styles.amtVal, { color: theme.colors.success }]}>{formatCurrency(data.paid_amount)}</Text>} />
          <DataRow title="Remaining" subtitle={formatCurrency(remaining)} rightComponent={<Text style={[styles.amtVal, { color: theme.colors.warning }]}>{formatCurrency(remaining)}</Text>} />
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor(data.status) + '20', borderColor: statusColor(data.status) + '50' }]}>
              <Text style={[styles.statusText, { color: statusColor(data.status) }]}>{data.status}</Text>
            </View>
          </View>
          {remaining > 0 && (
            <PrimaryButton title="Record Payment" onPress={() => setPaymentModalOpen(true)} style={styles.recordBtn} leftIcon={<Icons.Finance size={18} color="#fff" />} />
          )}
        </SurfaceCard>

        {/* Fee Items */}
        <SurfaceCard title="Fee Items" style={styles.section} padded={false}>
          {(data.items ?? []).length === 0 ? (
            <View style={styles.emptySection}><Text style={styles.emptyText}>No fee items</Text></View>
          ) : (
            (data.items ?? []).map((item) => {
              const itemAmt = item.amount ?? 0, itemPaid = item.paid_amount ?? 0, itemRemaining = itemAmt - itemPaid;
              const itemStatus: "paid" | "partial" | "unpaid" = itemPaid >= itemAmt ? "paid" : itemPaid > 0 ? "partial" : "unpaid";
              return (
                <View key={item.id} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.component_name ?? "—"}</Text>
                    <Text style={styles.itemMeta}>{formatCurrency(item.amount)} • Paid {formatCurrency(item.paid_amount)}</Text>
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={[styles.itemRemaining, { color: itemRemaining > 0 ? theme.colors.warning : theme.colors.success }]}>{formatCurrency(itemRemaining)} left</Text>
                    <View style={[styles.itemBadge, { backgroundColor: itemStatusColor(itemStatus) }]}>
                      <Text style={styles.itemBadgeText}>{itemStatus}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </SurfaceCard>

        {/* Payment History */}
        <SurfaceCard title="Payment History" style={styles.section} padded={false}>
          {(data.payments ?? []).length === 0 ? (
            <View style={styles.emptySection}><Text style={styles.emptyText}>No payments yet</Text></View>
          ) : (
            (data.payments ?? []).map((p) => (
              <View key={p.id} style={styles.paymentRow}>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentAmount}>{formatCurrency(p.amount)}</Text>
                  <Text style={styles.paymentMeta}>{p.method} • {formatDate(p.created_at)}{p.reference_number ? ` • ${p.reference_number}` : ""}</Text>
                </View>
                <View style={styles.paymentRight}>
                  <View style={[styles.paymentBadge, { backgroundColor: PAYMENT_STATUS_COLORS[p.status] ?? theme.colors.text[400] }]}>
                    <Text style={styles.paymentBadgeText}>{p.status}</Text>
                  </View>
                  {p.status === "success" && (
                    <TouchableOpacity onPress={() => { setRefundPaymentId(p.id); setRefundReason(""); setRefundModalOpen(true); }} style={styles.refundChip}>
                      <Icons.Refresh size={13} color={theme.colors.danger} />
                      <Text style={styles.refundChipText}>Refund</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </SurfaceCard>
      </ScrollView>

      {/* Record Payment Modal */}
      <Modal visible={paymentModalOpen} animationType="slide" transparent onRequestClose={() => { setPaymentModalOpen(false); setAllocations({}); }}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Record Payment</Text>
              <TouchableOpacity style={styles.sheetClose} onPress={() => { setPaymentModalOpen(false); setAllocations({}); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icons.Close size={20} color={theme.colors.text[700]} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetForm} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>Remaining balance</Text>
                <Text style={styles.balanceAmount}>{formatCurrency(remaining)}</Text>
              </View>
              <Text style={styles.fieldLabel}>Quick Amount</Text>
              <View style={styles.quickRow}>
                {[{ label: "Full", ratio: 1 }, { label: "Half", ratio: 0.5 }, { label: "¼", ratio: 0.25 }].map((q) => (
                  <Pressable key={q.label} style={({ pressed }) => [styles.quickBtn, pressed && { opacity: 0.8 }]} onPress={() => handleQuickAmount(q.ratio)}>
                    <Text style={styles.quickBtnLabel}>{q.label}</Text>
                    <Text style={styles.quickBtnAmt}>{formatCurrency(Math.round(remaining * q.ratio))}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.fieldLabel}>Amount *</Text>
              <TextInput
                style={[styles.input, amountExceedsRemaining && styles.inputError]}
                value={amount} onChangeText={setAmount}
                placeholder={`Max ${formatCurrency(remaining)}`}
                placeholderTextColor={theme.colors.text[400]} keyboardType="decimal-pad"
              />
              {amountExceedsRemaining && <Text style={styles.fieldError}>Amount cannot exceed remaining balance</Text>}

              {itemsWithRemaining.length > 0 && amountNum > 0 && (
                <>
                  <View style={styles.allocHeader}>
                    <Text style={styles.fieldLabel}>Split by component (optional)</Text>
                    <View style={styles.allocActions}>
                      <TouchableOpacity style={styles.allocLink} onPress={handleAutoAllocate}>
                        <Icons.TrendingUp size={14} color={theme.colors.primary[500]} />
                        <Text style={styles.allocLinkText}>Auto-fill</Text>
                      </TouchableOpacity>
                      {Object.keys(allocations).length > 0 && (
                        <TouchableOpacity style={styles.allocLink} onPress={() => setAllocations({})}>
                          <Icons.Close size={14} color={theme.colors.text[500]} />
                          <Text style={[styles.allocLinkText, { color: theme.colors.text[500] }]}>Clear</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  {itemsWithRemaining.map((item) => {
                    const itemRemaining = (item.amount ?? 0) - (item.paid_amount ?? 0);
                    return (
                      <View key={item.id} style={styles.allocItemRow}>
                        <View style={styles.allocItemInfo}>
                          <Text style={styles.allocItemName} numberOfLines={1}>{item.component_name ?? "—"}</Text>
                          <Text style={styles.allocItemMeta}>{formatCurrency(itemRemaining)} left</Text>
                        </View>
                        <View style={styles.allocItemRight}>
                          <TextInput
                            style={styles.allocInput}
                            value={allocations[item.id] ?? ""}
                            onChangeText={(v) => setAllocations((prev) => ({ ...prev, [item.id]: v }))}
                            placeholder="0" placeholderTextColor={theme.colors.text[400]} keyboardType="decimal-pad"
                          />
                          <TouchableOpacity style={styles.payFullBtn} onPress={() => handlePayFullForItem(item)}>
                            <Text style={styles.payFullBtnText}>Full</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                  {useAllocations && allocationMismatch && (
                    <Text style={styles.fieldError}>Allocation sum ({formatCurrency(allocationSum)}) must equal total ({formatCurrency(amountNum)})</Text>
                  )}
                </>
              )}

              <Text style={styles.fieldLabel}>Payment Method</Text>
              <View style={styles.methodRow}>
                {[{ id: "cash", label: "Cash" }, { id: "online", label: "Online" }, { id: "bank_transfer", label: "Bank" }].map((m) => (
                  <TouchableOpacity key={m.id} style={[styles.methodChip, method === m.id && styles.methodChipActive]} onPress={() => setMethod(m.id)}>
                    <Text style={[styles.methodChipText, method === m.id && styles.methodChipTextActive]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Reference (optional)</Text>
              <TextInput style={styles.input} value={referenceNumber} onChangeText={setReferenceNumber} placeholder="Transaction ID or receipt number" placeholderTextColor={theme.colors.text[400]} />
              <Text style={styles.fieldLabel}>Notes (optional)</Text>
              <TextInput style={[styles.input, { minHeight: 60 }]} value={notes} onChangeText={setNotes} placeholder="Add a note for your records" placeholderTextColor={theme.colors.text[400]} multiline textAlignVertical="top" />
              <View style={{ height: theme.spacing.xxl }} />
            </ScrollView>
            <View style={styles.sheetFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setPaymentModalOpen(false); setAllocations({}); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <PrimaryButton title="Record" onPress={handleRecordPayment} loading={recordMut.isPending} style={[styles.submitBtn, !canSubmitPayment && { opacity: 0.5 }]} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Refund Modal */}
      <Modal visible={refundModalOpen} animationType="slide" transparent onRequestClose={() => { setRefundModalOpen(false); setRefundPaymentId(null); }}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Refund Payment</Text>
              <TouchableOpacity style={styles.sheetClose} onPress={() => { setRefundModalOpen(false); setRefundPaymentId(null); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icons.Close size={20} color={theme.colors.text[700]} />
              </TouchableOpacity>
            </View>
            <View style={styles.sheetForm}>
              <View style={styles.refundWarning}>
                <Icons.AlertCircle size={28} color={theme.colors.danger} />
                <Text style={styles.refundWarningText}>This action cannot be undone. The payment will be marked as refunded and the student fee balance will be adjusted.</Text>
              </View>
              <Text style={styles.fieldLabel}>Reason (optional)</Text>
              <TextInput style={[styles.input, { minHeight: 60 }]} value={refundReason} onChangeText={setRefundReason} placeholder="e.g. Duplicate payment, Wrong amount" placeholderTextColor={theme.colors.text[400]} multiline textAlignVertical="top" />
            </View>
            <View style={styles.sheetFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setRefundModalOpen(false); setRefundPaymentId(null); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <PrimaryButton title="Confirm Refund" onPress={handleRefund} loading={refundMut.isPending} style={[styles.submitBtn, styles.dangerBtn]} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Remove from structure */}
      <ConfirmationDialog
        visible={removeDialogOpen}
        title="Remove from Fee Structure"
        message="This will remove this student from the fee structure as long as there are no successful payments recorded. Continue?"
        confirmLabel="Remove"
        onConfirm={handleRemoveConfirm}
        onCancel={() => setRemoveDialogOpen(false)}
        loading={deleteFeeMut.isPending}
        destructive
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: theme.spacing.m, paddingBottom: theme.spacing.xxl },
  section: { marginBottom: theme.spacing.m },
  summaryName: { ...theme.typography.h2, color: theme.colors.text[900], marginBottom: 2 },
  summaryStructure: { ...theme.typography.body, color: theme.colors.text[500], marginBottom: theme.spacing.m },
  amtVal: { ...theme.typography.body, fontWeight: "600" },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: theme.spacing.s },
  statusLabel: { ...theme.typography.body, color: theme.colors.text[500] },
  statusBadge: { paddingHorizontal: theme.spacing.s, paddingVertical: 3, borderRadius: theme.radius.full, borderWidth: 1 },
  statusText: { ...theme.typography.caption, fontWeight: "700", textTransform: "capitalize" },
  recordBtn: { marginTop: theme.spacing.l },
  removeBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: theme.colors.dangerLight, paddingHorizontal: theme.spacing.s,
    paddingVertical: theme.spacing.xs, borderRadius: theme.radius.m,
    borderWidth: 1, borderColor: theme.colors.danger + '30',
  },
  removeBtnText: { ...theme.typography.caption, color: theme.colors.danger, fontWeight: "600" },
  emptySection: { padding: theme.spacing.m },
  emptyText: { ...theme.typography.body, color: theme.colors.text[400], fontStyle: "italic" },
  itemRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.m,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  itemInfo: { flex: 1 },
  itemName: { ...theme.typography.body, fontWeight: "500", color: theme.colors.text[900] },
  itemMeta: { ...theme.typography.caption, color: theme.colors.text[500] },
  itemRight: { alignItems: "flex-end", gap: 4 },
  itemRemaining: { ...theme.typography.caption, fontWeight: "600" },
  itemBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: theme.radius.full },
  itemBadgeText: { ...theme.typography.caption, fontWeight: "600", color: "#fff", fontSize: 10 },
  paymentRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: theme.spacing.m,
    paddingHorizontal: theme.spacing.m, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  paymentInfo: { flex: 1 },
  paymentAmount: { ...theme.typography.body, fontWeight: "600", color: theme.colors.text[900] },
  paymentMeta: { ...theme.typography.caption, color: theme.colors.text[500] },
  paymentRight: { alignItems: "flex-end", gap: theme.spacing.xs },
  paymentBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: theme.radius.full },
  paymentBadgeText: { ...theme.typography.caption, fontWeight: "600", color: "#fff", fontSize: 10 },
  refundChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: theme.colors.dangerLight, paddingHorizontal: theme.spacing.s,
    paddingVertical: 3, borderRadius: theme.radius.full,
    borderWidth: 1, borderColor: theme.colors.danger + '30',
  },
  refundChipText: { ...theme.typography.caption, color: theme.colors.danger, fontWeight: "500" },
  // Sheet modals
  overlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: "flex-end" },
  sheet: { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.xxl, borderTopRightRadius: theme.radius.xxl, maxHeight: "90%" },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: theme.spacing.l, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  sheetTitle: { ...theme.typography.h3, color: theme.colors.text[900] },
  sheetClose: { width: 32, height: 32, borderRadius: theme.radius.m, backgroundColor: theme.colors.backgroundSecondary, alignItems: "center", justifyContent: "center" },
  sheetForm: { padding: theme.spacing.l, maxHeight: 440 },
  sheetFooter: { flexDirection: "row", gap: theme.spacing.m, padding: theme.spacing.l, borderTopWidth: 1, borderTopColor: theme.colors.border, alignItems: "center" },
  cancelBtn: { paddingVertical: theme.spacing.m, paddingHorizontal: theme.spacing.m },
  cancelText: { ...theme.typography.body, color: theme.colors.text[500], fontWeight: "600" },
  submitBtn: { flex: 1 },
  dangerBtn: { backgroundColor: theme.colors.danger } as any,
  balanceCard: { backgroundColor: theme.colors.backgroundSecondary, borderRadius: theme.radius.l, padding: theme.spacing.m, marginBottom: theme.spacing.l },
  balanceLabel: { ...theme.typography.caption, color: theme.colors.text[500] },
  balanceAmount: { ...theme.typography.h2, color: theme.colors.warning, marginTop: 4 },
  quickRow: { flexDirection: "row", gap: theme.spacing.s, marginBottom: theme.spacing.m },
  quickBtn: {
    flex: 1, backgroundColor: theme.colors.backgroundSecondary, borderRadius: theme.radius.l,
    padding: theme.spacing.m, alignItems: "center", borderWidth: 1, borderColor: theme.colors.border,
  },
  quickBtnLabel: { ...theme.typography.label, fontWeight: "600", color: theme.colors.text[900] },
  quickBtnAmt: { ...theme.typography.caption, color: theme.colors.text[500], marginTop: 2 },
  fieldLabel: { ...theme.typography.label, color: theme.colors.text[700], marginBottom: theme.spacing.xs, marginTop: theme.spacing.m },
  fieldError: { ...theme.typography.caption, color: theme.colors.danger, marginBottom: theme.spacing.s },
  input: {
    borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: theme.radius.l,
    paddingHorizontal: theme.spacing.m, paddingVertical: theme.spacing.sm,
    ...theme.typography.body, color: theme.colors.text[900], backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.s,
  },
  inputError: { borderColor: theme.colors.danger },
  allocHeader: { marginTop: theme.spacing.s },
  allocActions: { flexDirection: "row", gap: theme.spacing.m, marginTop: theme.spacing.xs, marginBottom: theme.spacing.s },
  allocLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  allocLinkText: { ...theme.typography.caption, color: theme.colors.primary[500], fontWeight: "600" },
  allocItemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: theme.spacing.s },
  allocItemInfo: { flex: 1 },
  allocItemName: { ...theme.typography.body, fontWeight: "500", color: theme.colors.text[900] },
  allocItemMeta: { ...theme.typography.caption, color: theme.colors.text[500] },
  allocItemRight: { flexDirection: "row", alignItems: "center", gap: theme.spacing.s },
  allocInput: {
    width: 70, borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: theme.radius.m,
    paddingHorizontal: theme.spacing.s, paddingVertical: theme.spacing.xs,
    ...theme.typography.label, color: theme.colors.text[900], textAlign: "center",
  },
  payFullBtn: { paddingHorizontal: theme.spacing.s, paddingVertical: theme.spacing.xs, backgroundColor: theme.colors.primary[500], borderRadius: theme.radius.m },
  payFullBtnText: { ...theme.typography.caption, fontWeight: "600", color: "#fff" },
  methodRow: { flexDirection: "row", gap: theme.spacing.s, marginBottom: theme.spacing.s },
  methodChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: theme.spacing.m, paddingVertical: theme.spacing.s,
    borderRadius: theme.radius.l, borderWidth: 1.5, borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  methodChipActive: { borderColor: theme.colors.primary[500], backgroundColor: theme.colors.primary[500] },
  methodChipText: { ...theme.typography.caption, fontWeight: "600", color: theme.colors.text[700] },
  methodChipTextActive: { color: "#fff" },
  refundWarning: {
    flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.m,
    backgroundColor: theme.colors.dangerLight, padding: theme.spacing.m,
    borderRadius: theme.radius.l, marginBottom: theme.spacing.l,
  },
  refundWarningText: { ...theme.typography.body, color: theme.colors.text[900], flex: 1, lineHeight: 20 },
});
