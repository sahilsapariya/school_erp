import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
} from "@/common/services/api";
import { getApiUrl } from "@/common/constants/api";
import {
  getAccessToken,
  getRefreshToken,
  getTenantId,
} from "@/common/utils/storage";
import type {
  FeeStructure,
  StudentFee,
  CreateStructureInput,
  UpdateStructureInput,
  RecordPaymentInput,
} from "../types";

export const financeService = {
  // Fee structures
  getStructures: async (params?: {
    academic_year_id?: string;
    class_id?: string;
  }) => {
    let url = "/api/finance/structures";
    if (params) {
      const q = new URLSearchParams();
      if (params.academic_year_id) q.append("academic_year_id", params.academic_year_id);
      if (params.class_id) q.append("class_id", params.class_id);
      const qs = q.toString();
      if (qs) url += `?${qs}`;
    }
    const res = await apiGet<{ fee_structures: FeeStructure[] }>(url);
    return res.fee_structures ?? [];
  },

  getStructure: async (id: string) => {
    const res = await apiGet<FeeStructure>(`/api/finance/structures/${id}`);
    return res;
  },

  getAvailableClassesForStructure: async (
    academicYearId: string,
    excludeStructureId?: string | null
  ) => {
    let url = `/api/finance/structures/available-classes?academic_year_id=${academicYearId}`;
    if (excludeStructureId) {
      url += `&exclude_structure_id=${excludeStructureId}`;
    }
    const res = await apiGet<{ classes: { id: string; name: string; section?: string }[] }>(url);
    return res.classes ?? [];
  },

  createStructure: async (data: CreateStructureInput) => {
    const res = await apiPost<{ fee_structure: FeeStructure }>("/api/finance/structures", {
      name: data.name,
      academic_year_id: data.academic_year_id,
      due_date: data.due_date,
      components: data.components,
      class_ids: data.class_ids,
    });
    return res.fee_structure;
  },

  updateStructure: async (id: string, data: UpdateStructureInput) => {
    const res = await apiPut<{ fee_structure: FeeStructure }>(
      `/api/finance/structures/${id}`,
      {
        name: data.name,
        due_date: data.due_date,
        class_ids: data.class_ids,
        components: data.components,
      }
    );
    return res.fee_structure;
  },

  deleteStructure: async (id: string) => {
    await apiDelete(`/api/finance/structures/${id}`);
  },

  // Summary (dashboard - single lightweight request)
  // Pass include_recent_payments=N to get summary + recent payments in one call
  getSummary: async (params?: {
    academic_year_id?: string;
    class_id?: string;
    include_recent_payments?: number;
  }) => {
    let url = "/api/finance/summary";
    if (params) {
      const q = new URLSearchParams();
      if (params.academic_year_id) q.append("academic_year_id", params.academic_year_id);
      if (params.class_id) q.append("class_id", params.class_id);
      if (params.include_recent_payments != null && params.include_recent_payments > 0) {
        q.append("include_recent_payments", String(params.include_recent_payments));
      }
      const qs = q.toString();
      if (qs) url += `?${qs}`;
    }
    return await apiGet<{
      total_expected: number;
      total_collected: number;
      total_outstanding: number;
      overdue_count: number;
      recent_payments?: Array<{ id: string; amount: number; student_name?: string; created_at: string }>;
    }>(url);
  },

  // Student fees
  getStudentFees: async (params?: {
    student_id?: string;
    fee_structure_id?: string;
    status?: string;
    academic_year_id?: string;
    class_id?: string;
    search?: string;
    include_items?: boolean;
  }) => {
    let url = "/api/finance/student-fees";
    if (params) {
      const q = new URLSearchParams();
      if (params.student_id) q.append("student_id", params.student_id);
      if (params.fee_structure_id) q.append("fee_structure_id", params.fee_structure_id);
      if (params.status) q.append("status", params.status);
      if (params.academic_year_id) q.append("academic_year_id", params.academic_year_id);
      if (params.class_id) q.append("class_id", params.class_id);
      if (params.search) q.append("search", params.search);
      if (params.include_items === false) q.append("include_items", "false");
      const qs = q.toString();
      if (qs) url += `?${qs}`;
    }
    const res = await apiGet<{ student_fees: StudentFee[] }>(url);
    return res.student_fees ?? [];
  },

  getStudentFee: async (id: string) => {
    return await apiGet<StudentFee>(`/api/finance/student-fees/${id}`);
  },

  deleteStudentFee: async (id: string) => {
    await apiDelete(`/api/finance/student-fees/${id}`);
  },

  getRecentPayments: async (limit = 10) => {
    const res = await apiGet<{ recent_payments: Array<{ id: string; amount: number; student_name?: string; created_at: string }> }>(
      `/api/finance/recent-payments?limit=${limit}`
    );
    return res.recent_payments ?? [];
  },

  // Payments
  recordPayment: async (data: RecordPaymentInput) => {
    const body: Record<string, unknown> = {
      student_fee_id: data.student_fee_id,
      amount: data.amount,
      method: data.method || "cash",
      reference_number: data.reference_number || null,
      notes: data.notes || null,
    };
    if (data.allocations && data.allocations.length > 0) {
      body.allocations = data.allocations.map((a) => ({ item_id: a.item_id, amount: a.amount }));
    }
    const res = await apiPost<{ payment: { id: string }; student_fee: StudentFee }>(
      "/api/finance/payments",
      body
    );
    return res;
  },

  refundPayment: async (paymentId: string, notes?: string) => {
    await apiPost(`/api/finance/payments/${paymentId}/refund`, { notes: notes || null });
  },

  /** Download invoice PDF for a student fee. Returns blob for save/print. */
  downloadInvoicePdf: async (studentFeeId: string): Promise<Blob> => {
    const url = getApiUrl(`/api/finance/student-fees/${studentFeeId}/download-invoice`);
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

  /** Download receipt PDF for a payment. Returns blob for save/print. */
  downloadReceiptPdf: async (paymentId: string): Promise<Blob> => {
    const url = getApiUrl(`/api/finance/payments/${paymentId}/download-receipt`);
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

  /** Get the print-ready HTML URL for a student fee invoice (dual-copy, no auto-note). */
  getPrintInvoiceUrl: (studentFeeId: string): string =>
    getApiUrl(`/api/finance/student-fees/${studentFeeId}/print-invoice?autoprint=1`),

  /** Get the print-ready HTML URL for a payment receipt (dual-copy, no auto-note). */
  getPrintReceiptUrl: (paymentId: string): string =>
    getApiUrl(`/api/finance/payments/${paymentId}/print-receipt?autoprint=1`),

  /** Open invoice print page in a new window. Handles auth headers via blob fetch. */
  printInvoice: async (studentFeeId: string): Promise<void> => {
    const url = getApiUrl(`/api/finance/student-fees/${studentFeeId}/print-invoice?autoprint=1`);
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
    if (!res.ok) throw new Error("Failed to load invoice for print");
    const html = await res.text();
    const blob = new Blob([html], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);
    const w = window.open(blobUrl, "_blank");
    if (w) w.onload = () => { w.print(); setTimeout(() => URL.revokeObjectURL(blobUrl), 2000); };
    else { window.open(blobUrl); setTimeout(() => URL.revokeObjectURL(blobUrl), 5000); }
  },

  /** Open receipt print page in a new window. Handles auth headers via blob fetch. */
  printReceipt: async (paymentId: string): Promise<void> => {
    const url = getApiUrl(`/api/finance/payments/${paymentId}/print-receipt?autoprint=1`);
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
    if (!res.ok) throw new Error("Failed to load receipt for print");
    const html = await res.text();
    const blob = new Blob([html], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);
    const w = window.open(blobUrl, "_blank");
    if (w) w.onload = () => { w.print(); setTimeout(() => URL.revokeObjectURL(blobUrl), 2000); };
    else { window.open(blobUrl); setTimeout(() => URL.revokeObjectURL(blobUrl), 5000); }
  },
};
