import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useInvoice,
  useRecordPayment,
  useSendReminder,
} from "@/modules/fees/hooks/useFees";
import { feesService } from "@/modules/fees/services/feesService";
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

export default function InvoiceDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank" | "upi" | "online">("cash");

  const { data: invoice, isLoading, error, refetch } = useInvoice(id);
  const recordMut = useRecordPayment(id);
  const sendReminderMut = useSendReminder(id);

  const handleDownloadInvoice = async () => {
    try {
      const blob = await feesService.downloadInvoicePdf(id!);
      if (Platform.OS === "web") {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `invoice_${invoice?.invoice_number ?? id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        Alert.alert(
          "Invoice PDF",
          "PDF downloaded. Install expo-sharing for share/save on device."
        );
      }
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to download");
    }
  };

  const handleDownloadReceipt = async (paymentId: string) => {
    try {
      const blob = await feesService.downloadReceiptPdf(paymentId);
      if (Platform.OS === "web") {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `receipt_${paymentId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        Alert.alert(
          "Receipt PDF",
          "PDF downloaded. Install expo-sharing for share/save on device."
        );
      }
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to download");
    }
  };

  const handleRecordPayment = async () => {
    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) {
      Alert.alert("Error", "Enter a valid amount");
      return;
    }
    try {
      await recordMut.mutateAsync({
        invoice_id: id!,
        amount: amt,
        payment_method: paymentMethod,
      });
      setShowRecordPayment(false);
      setPaymentAmount("");
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to record payment");
    }
  };

  const handleSendReminder = async () => {
    try {
      await sendReminderMut.mutateAsync(id!);
      Alert.alert("Reminder sent", "The parent/student will receive the reminder.");
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to send reminder");
    }
  };

  if (isLoading && !invoice) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !invoice) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Invoice not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const canRecordPayment = invoice.status !== "paid" && invoice.status !== "cancelled";
  const canSendReminder = invoice.status !== "paid" && invoice.status !== "cancelled";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{invoice.invoice_number}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.summaryRow}>
          <Text style={styles.label}>Total Invoice</Text>
          <Text style={styles.value}>{formatCurrency(invoice.total_amount)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.label}>Amount Paid</Text>
          <Text style={[styles.value, styles.valueSuccess]}>
            {formatCurrency(invoice.amount_paid)}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.label}>Remaining Balance</Text>
          <Text style={[styles.value, styles.valueBold]}>
            {formatCurrency(invoice.remaining_balance)}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.label}>Due Date</Text>
          <Text style={styles.value}>{formatDate(invoice.due_date)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>{invoice.status}</Text>
        </View>
      </View>

      {invoice.items && invoice.items.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fee Breakdown</Text>
          {invoice.items.map((it) => (
            <View key={it.id} style={styles.itemRow}>
              <Text style={styles.itemName}>{it.fee_head}</Text>
              <Text style={styles.itemAmount}>{formatCurrency(it.net_amount)}</Text>
            </View>
          ))}
        </View>
      )}

      {invoice.payments && invoice.payments.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment History</Text>
          {invoice.payments.map((p) => (
            <View key={p.id} style={styles.paymentRow}>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentDate}>{formatDate(p.payment_date || p.created_at)}</Text>
                <Text style={styles.paymentMethod}>{p.payment_method}</Text>
                {p.payment_reference && (
                  <Text style={styles.paymentRef}>Ref: {p.payment_reference}</Text>
                )}
              </View>
              <View style={styles.paymentActions}>
                <Text style={styles.paymentAmount}>{formatCurrency(p.amount)}</Text>
                <TouchableOpacity
                  style={styles.downloadReceiptBtn}
                  onPress={() => handleDownloadReceipt(p.id)}
                >
                  <Ionicons name="download-outline" size={18} color={Colors.primary} />
                  <Text style={styles.downloadReceiptText}>Receipt</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleDownloadInvoice}
        >
          <Ionicons name="document-text-outline" size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>Download Invoice</Text>
        </TouchableOpacity>

        {canRecordPayment && (
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => setShowRecordPayment(true)}
          >
            <Ionicons name="card-outline" size={20} color={Colors.primary} />
            <Text style={styles.secondaryBtnText}>Record Payment</Text>
          </TouchableOpacity>
        )}

        {canSendReminder && (
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={handleSendReminder}
            disabled={sendReminderMut.isPending}
          >
            <Ionicons name="notifications-outline" size={20} color={Colors.primary} />
            <Text style={styles.secondaryBtnText}>Send Reminder</Text>
          </TouchableOpacity>
        )}
      </View>

      {showRecordPayment && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Record Payment</Text>
            <Text style={styles.modalHint}>Remaining: {formatCurrency(invoice.remaining_balance)}</Text>
            <Text style={styles.inputLabel}>Amount</Text>
            <View style={styles.inputRow}>
              <Text style={styles.currencyPrefix}>₹</Text>
              <TextInput
                style={styles.amountInput}
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                placeholder="0"
                keyboardType="decimal-pad"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
            <Text style={styles.inputLabel}>Method</Text>
            <View style={styles.methodRow}>
              {(["cash", "bank", "upi", "online"] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.methodChip, paymentMethod === m && styles.methodChipActive]}
                  onPress={() => setPaymentMethod(m)}
                >
                  <Text
                    style={[
                      styles.methodChipText,
                      paymentMethod === m && styles.methodChipTextActive,
                    ]}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowRecordPayment(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, recordMut.isPending && styles.submitBtnDisabled]}
                onPress={handleRecordPayment}
                disabled={recordMut.isPending || !paymentAmount}
              >
                {recordMut.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Record</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: Spacing.xl },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  backIcon: { padding: Spacing.sm, marginRight: Spacing.sm },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: Colors.text },
  section: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: Colors.text, marginBottom: Spacing.md },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
  },
  label: { fontSize: 14, color: Colors.textSecondary },
  value: { fontSize: 14, fontWeight: "600", color: Colors.text },
  valueSuccess: { color: Colors.success },
  valueBold: { fontSize: 16, fontWeight: "700" },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.xs,
  },
  itemName: { fontSize: 14, color: Colors.text },
  itemAmount: { fontSize: 14, fontWeight: "500", color: Colors.text },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  paymentInfo: { flex: 1 },
  paymentDate: { fontSize: 14, fontWeight: "500", color: Colors.text },
  paymentMethod: { fontSize: 12, color: Colors.textSecondary },
  paymentRef: { fontSize: 12, color: Colors.textSecondary },
  paymentActions: { alignItems: "flex-end" },
  paymentAmount: { fontSize: 16, fontWeight: "600", color: Colors.success },
  downloadReceiptBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
    gap: 4,
  },
  downloadReceiptText: { fontSize: 12, color: Colors.primary },
  actions: { gap: Spacing.md },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.md,
  },
  primaryBtnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.backgroundSecondary,
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  secondaryBtnText: { color: Colors.primary, fontWeight: "600", fontSize: 16 },
  errorText: { color: Colors.error, marginBottom: Spacing.md },
  backBtn: { padding: Spacing.md },
  backBtnText: { color: Colors.primary, fontWeight: "600" },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: Spacing.lg,
  },
  modal: {
    backgroundColor: Colors.background,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  modalHint: { fontSize: 14, color: Colors.textSecondary, marginTop: Spacing.xs },
  inputLabel: { fontSize: 14, fontWeight: "600", color: Colors.text, marginTop: Spacing.md },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.md,
  },
  currencyPrefix: { fontSize: 18, color: Colors.textSecondary },
  amountInput: { flex: 1, fontSize: 18, color: Colors.text },
  methodRow: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.sm },
  methodChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.backgroundSecondary,
  },
  methodChipActive: { backgroundColor: Colors.primary },
  methodChipText: { fontSize: 14, color: Colors.text },
  methodChipTextActive: { fontSize: 14, color: "#fff", fontWeight: "600" },
  modalActions: { flexDirection: "row", gap: Spacing.md, marginTop: Spacing.xl },
  cancelBtn: { flex: 1, padding: Spacing.md, alignItems: "center" },
  cancelBtnText: { fontSize: 16, color: Colors.textSecondary },
  submitBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    alignItems: "center",
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
