import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { financeService } from "../services/financeService";
import { academicYearService } from "../services/academicYearService";
import { financeClassService } from "../services/classService";
import { studentService } from "@/modules/students/services/studentService";
import type {
  CreateStructureInput,
  UpdateStructureInput,
  RecordPaymentInput,
} from "../types";

const KEYS = {
  structures: ["finance", "structures"] as const,
  structure: (id: string) => ["finance", "structure", id] as const,
  summary: ["finance", "summary"] as const,
  dashboard: (limit: number) => ["finance", "dashboard", limit] as const,
  studentFees: ["finance", "studentFees"] as const,
  studentFee: (id: string) => ["finance", "studentFee", id] as const,
  academicYears: ["academics", "academicYears"] as const,
  classes: ["classes"] as const,
};

export function useStructures(params?: {
  academic_year_id?: string;
  class_id?: string;
}) {
  return useQuery({
    queryKey: [...KEYS.structures, params?.academic_year_id ?? "", params?.class_id ?? ""],
    queryFn: () => financeService.getStructures(params),
  });
}

export function useStructure(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: KEYS.structure(id ?? ""),
    queryFn: () => financeService.getStructure(id!),
    enabled: !!id && enabled,
  });
}

export function useAvailableClassesForStructure(
  academicYearId: string | undefined,
  excludeStructureId?: string | null,
  enabled = true
) {
  return useQuery({
    queryKey: [
      "finance",
      "availableClasses",
      academicYearId ?? "",
      excludeStructureId ?? "",
    ],
    queryFn: () =>
      financeService.getAvailableClassesForStructure(
        academicYearId!,
        excludeStructureId
      ),
    enabled: !!academicYearId && enabled,
  });
}

export function useCreateStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateStructureInput) => financeService.createStructure(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.structures });
      qc.invalidateQueries({ queryKey: ["finance", "availableClasses"] });
      qc.invalidateQueries({ queryKey: KEYS.summary });
      qc.invalidateQueries({ queryKey: KEYS.studentFees });
      qc.invalidateQueries({ queryKey: ["finance", "dashboard"] });
    },
  });
}

export function useUpdateStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStructureInput }) =>
      financeService.updateStructure(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.structures });
      qc.invalidateQueries({ queryKey: KEYS.structure(id) });
      qc.invalidateQueries({ queryKey: ["finance", "availableClasses"] });
      qc.invalidateQueries({ queryKey: KEYS.studentFees });
      qc.invalidateQueries({ queryKey: KEYS.summary });
      qc.invalidateQueries({ queryKey: ["finance", "dashboard"] });
    },
  });
}

export function useDeleteStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeService.deleteStructure(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.structures });
      qc.invalidateQueries({ queryKey: ["finance", "availableClasses"] });
      qc.invalidateQueries({ queryKey: KEYS.studentFees });
      qc.invalidateQueries({ queryKey: KEYS.summary });
      qc.invalidateQueries({ queryKey: ["finance", "dashboard"] });
    },
  });
}

export function useFinanceSummary(params?: {
  academic_year_id?: string;
  class_id?: string;
}) {
  return useQuery({
    queryKey: [
      ...KEYS.summary,
      params?.academic_year_id ?? "",
      params?.class_id ?? "",
    ],
    queryFn: () => financeService.getSummary(params),
  });
}

/** Dashboard: summary + recent payments in one API call. Use instead of useFinanceSummary + useRecentPayments. */
export function useFinanceDashboard(recentPaymentsLimit = 10) {
  return useQuery({
    queryKey: KEYS.dashboard(recentPaymentsLimit),
    queryFn: () =>
      financeService.getSummary({
        include_recent_payments: recentPaymentsLimit,
      }),
  });
}

export function useStudentFees(params?: {
  student_id?: string;
  fee_structure_id?: string;
  status?: string;
  academic_year_id?: string;
  class_id?: string;
  search?: string;
  include_items?: boolean;
}) {
  return useQuery({
    queryKey: [
      ...KEYS.studentFees,
      params?.student_id ?? "",
      params?.fee_structure_id ?? "",
      params?.status ?? "",
      params?.academic_year_id ?? "",
      params?.class_id ?? "",
      params?.search ?? "",
      params?.include_items ?? true,
    ],
    queryFn: () => financeService.getStudentFees(params),
  });
}

export function useStudentFee(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: KEYS.studentFee(id ?? ""),
    queryFn: () => financeService.getStudentFee(id!),
    enabled: !!id && enabled,
  });
}

export function useDeleteStudentFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeService.deleteStudentFee(id),
    onSuccess: async (_, id) => {
      await Promise.all([
        qc.invalidateQueries({
          queryKey: KEYS.studentFees,
          refetchType: "all",
        }),
        qc.invalidateQueries({ queryKey: KEYS.studentFee(id) }),
        qc.invalidateQueries({ queryKey: KEYS.summary }),
        qc.invalidateQueries({ queryKey: ["finance", "dashboard"] }),
        qc.invalidateQueries({
          queryKey: ["finance", "recentPayments"],
          refetchType: "all",
        }),
      ]);
    },
  });
}

export function useRecentPayments(limit = 10) {
  return useQuery({
    queryKey: ["finance", "recentPayments", limit],
    queryFn: () => financeService.getRecentPayments(limit),
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RecordPaymentInput) => financeService.recordPayment(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.studentFees });
      qc.invalidateQueries({ queryKey: KEYS.studentFee(vars.student_fee_id) });
      qc.invalidateQueries({ queryKey: KEYS.summary });
      qc.invalidateQueries({ queryKey: ["finance", "dashboard"] });
      qc.invalidateQueries({ queryKey: ["finance", "recentPayments"] });
    },
  });
}

export function useRefundPayment(studentFeeId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, notes }: { paymentId: string; notes?: string }) =>
      financeService.refundPayment(paymentId, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.studentFees });
      qc.invalidateQueries({ queryKey: ["finance", "recentPayments"] });
      qc.invalidateQueries({ queryKey: KEYS.summary });
      qc.invalidateQueries({ queryKey: ["finance", "dashboard"] });
      if (studentFeeId) {
        qc.invalidateQueries({ queryKey: KEYS.studentFee(studentFeeId) });
      }
    },
  });
}

export function useAcademicYears(activeOnly = false) {
  return useQuery({
    queryKey: [...KEYS.academicYears, activeOnly],
    queryFn: () => academicYearService.getAcademicYears(activeOnly),
  });
}

export function useClasses() {
  return useQuery({
    queryKey: KEYS.classes,
    queryFn: () => financeClassService.getClasses(),
  });
}

