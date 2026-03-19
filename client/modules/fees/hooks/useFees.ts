/**
 * Fees Invoice + Receipt React Query hooks
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { feesService } from "../services/feesService";
import type { CreateInvoiceInput, RecordPaymentInput } from "../services/feesService";

const KEYS = {
  invoices: ["fees", "invoices"] as const,
  invoicesList: (params?: object) =>
    ["fees", "invoices", params ?? {}] as const,
  invoice: (id: string) => ["fees", "invoice", id] as const,
  payment: (id: string) => ["fees", "payment", id] as const,
};

export function useInvoices(params?: {
  student_id?: string;
  status?: string;
  academic_year?: string;
}) {
  return useQuery({
    queryKey: KEYS.invoicesList(params),
    queryFn: () => feesService.getInvoices(params),
  });
}

export function useInvoice(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: KEYS.invoice(id ?? ""),
    queryFn: () => feesService.getInvoice(id!),
    enabled: !!id && enabled,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInvoiceInput) => feesService.createInvoice(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.invoices });
    },
  });
}

export function useSendReminder(invoiceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => feesService.sendReminder(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: KEYS.invoice(id) });
      qc.invalidateQueries({ queryKey: KEYS.invoices });
    },
  });
}

export function useRecordPayment(invoiceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RecordPaymentInput) => feesService.recordPayment(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.invoice(vars.invoice_id) });
      qc.invalidateQueries({ queryKey: KEYS.invoices });
    },
  });
}

export function usePayment(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: KEYS.payment(id ?? ""),
    queryFn: () => feesService.getPayment(id!),
    enabled: !!id && enabled,
  });
}
