/**
 * Fees Invoice + Receipt API Service
 *
 * Invoices, payments, receipts, PDF downloads.
 */

import {
  apiGet,
  apiPost,
} from "@/common/services/api";
import { getApiUrl } from "@/common/constants/api";
import {
  getAccessToken,
  getRefreshToken,
  getTenantId,
} from "@/common/utils/storage";

export interface FeeInvoiceItem {
  id: string;
  invoice_id: string;
  fee_head: string;
  period: string | null;
  amount: number;
  discount: number;
  fine: number;
  net_amount: number;
}

export interface FeePayment {
  id: string;
  invoice_id: string;
  student_id: string;
  payment_reference: string | null;
  amount: number;
  payment_method: string;
  payment_gateway: string | null;
  transaction_id: string | null;
  payment_date: string;
  collected_by: string | null;
  created_at: string;
  receipt?: {
    id: string;
    payment_id: string;
    receipt_number: string;
    generated_at: string;
    pdf_url: string | null;
  };
}

export interface FeeInvoice {
  id: string;
  student_id: string;
  invoice_number: string;
  academic_year: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  total_discount: number;
  total_fine: number;
  total_amount: number;
  status: "draft" | "unpaid" | "partial" | "paid" | "cancelled";
  notes: string | null;
  amount_paid: number;
  remaining_balance: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  items?: FeeInvoiceItem[];
  payments?: FeePayment[];
}

export interface CreateInvoiceInput {
  student_id: string;
  academic_year: string;
  issue_date: string;
  due_date: string;
  items: {
    fee_head: string;
    period?: string;
    amount: number;
    discount?: number;
    fine?: number;
  }[];
  notes?: string;
}

export interface RecordPaymentInput {
  invoice_id: string;
  amount: number;
  payment_method?: "cash" | "bank" | "upi" | "online";
  payment_date?: string;
  payment_reference?: string;
  payment_gateway?: string;
  transaction_id?: string;
}

export const feesService = {
  getInvoices: async (params?: {
    student_id?: string;
    status?: string;
    academic_year?: string;
  }) => {
    let url = "/api/fees/invoices";
    if (params) {
      const q = new URLSearchParams();
      if (params.student_id) q.append("student_id", params.student_id);
      if (params.status) q.append("status", params.status);
      if (params.academic_year) q.append("academic_year", params.academic_year);
      const qs = q.toString();
      if (qs) url += `?${qs}`;
    }
    const res = await apiGet<{ invoices: FeeInvoice[] }>(url);
    return res.invoices ?? [];
  },

  getInvoice: async (id: string) => {
    return await apiGet<FeeInvoice>(`/api/fees/invoices/${id}`);
  },

  createInvoice: async (data: CreateInvoiceInput) => {
    const res = await apiPost<{ invoice: FeeInvoice }>("/api/fees/invoices", data);
    return res.invoice;
  },

  sendReminder: async (invoiceId: string) => {
    return await apiPost<{ channels_sent: string[]; message: string }>(
      `/api/fees/invoices/${invoiceId}/send-reminder`,
      {}
    );
  },

  recordPayment: async (data: RecordPaymentInput) => {
    const res = await apiPost<{
      payment: FeePayment;
      receipt: { receipt_number: string };
      invoice: FeeInvoice;
    }>("/api/fees/payments", {
      invoice_id: data.invoice_id,
      amount: data.amount,
      payment_method: data.payment_method ?? "cash",
      payment_date: data.payment_date ?? undefined,
      payment_reference: data.payment_reference ?? undefined,
      payment_gateway: data.payment_gateway ?? undefined,
      transaction_id: data.transaction_id ?? undefined,
    });
    return res;
  },

  getPayment: async (id: string) => {
    return await apiGet<FeePayment & { invoice?: FeeInvoice }>(
      `/api/fees/payments/${id}`
    );
  },

  /** Download invoice PDF - returns blob for mobile sharing/save */
  downloadInvoicePdf: async (invoiceId: string): Promise<Blob> => {
    const url = getApiUrl(`/api/fees/invoices/${invoiceId}/download`);
    const [accessToken, refreshToken, tenantId] = await Promise.all([
      getAccessToken(),
      getRefreshToken(),
      getTenantId(),
    ]);
    const headers: Record<string, string> = {};
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
    if (refreshToken) headers["X-Refresh-Token"] = refreshToken;
    if (tenantId) headers["X-Tenant-ID"] = tenantId;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error("Failed to download invoice PDF");
    return await res.blob();
  },

  /** Download receipt PDF - returns blob for mobile sharing/save */
  downloadReceiptPdf: async (paymentId: string): Promise<Blob> => {
    const url = getApiUrl(`/api/fees/receipts/${paymentId}/download`);
    const [accessToken, refreshToken, tenantId] = await Promise.all([
      getAccessToken(),
      getRefreshToken(),
      getTenantId(),
    ]);
    const headers: Record<string, string> = {};
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
    if (refreshToken) headers["X-Refresh-Token"] = refreshToken;
    if (tenantId) headers["X-Tenant-ID"] = tenantId;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error("Failed to download receipt PDF");
    return await res.blob();
  },
};
