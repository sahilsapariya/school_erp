import { useState, useCallback } from 'react';
import { TeacherLeave, CreateLeaveDTO, LeaveBalance, LeavePolicy, AdjustLeaveBalanceDTO, UpdateLeavePolicyDTO } from '../types';
import {
  teacherLeaveService,
  teacherLeaveBalanceService,
  leavePolicyService,
} from '../services/teacherConstraintService';

export function useTeacherLeaves() {
  const [leaves, setLeaves] = useState<TeacherLeave[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(false);

  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [policiesLoading, setPoliciesLoading] = useState(false);

  // --- Leave list ---

  const fetchLeaves = useCallback(async (params?: { teacher_id?: string; status?: string }) => {
    try {
      setLoading(true);
      setError(null);
      const data = await teacherLeaveService.listLeaves(params);
      setLeaves(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load leaves');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyLeaves = useCallback(async (params?: { status?: string }) => {
    try {
      setLoading(true);
      setError(null);
      const data = await teacherLeaveService.getMyLeaves(params);
      setLeaves(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load leaves');
    } finally {
      setLoading(false);
    }
  }, []);

  const createLeave = useCallback(async (dto: CreateLeaveDTO) => {
    const item = await teacherLeaveService.createLeave(dto);
    setLeaves(prev => [item, ...prev]);
    // Optimistically mark balance as stale so it'll refresh
    setBalances([]);
    return item;
  }, []);

  const cancelLeave = useCallback(async (leaveId: string) => {
    const item = await teacherLeaveService.cancelLeave(leaveId);
    setLeaves(prev => prev.map(l => l.id === leaveId ? item : l));
    setBalances([]);
    return item;
  }, []);

  const approveLeave = useCallback(async (leaveId: string) => {
    const item = await teacherLeaveService.approveLeave(leaveId);
    setLeaves(prev => prev.map(l => l.id === leaveId ? item : l));
    return item;
  }, []);

  const rejectLeave = useCallback(async (leaveId: string) => {
    const item = await teacherLeaveService.rejectLeave(leaveId);
    setLeaves(prev => prev.map(l => l.id === leaveId ? item : l));
    return item;
  }, []);

  // --- Leave balances ---

  const fetchMyBalances = useCallback(async (academicYear?: string) => {
    try {
      setBalancesLoading(true);
      const data = await teacherLeaveBalanceService.getMyBalances(
        academicYear ? { academic_year: academicYear } : undefined
      );
      setBalances(data);
    } catch {
      // silently fail — balances are supplemental, not critical
    } finally {
      setBalancesLoading(false);
    }
  }, []);

  const fetchTeacherBalances = useCallback(async (teacherId: string, academicYear?: string) => {
    try {
      setBalancesLoading(true);
      const data = await teacherLeaveBalanceService.getTeacherBalances(
        teacherId,
        academicYear ? { academic_year: academicYear } : undefined
      );
      setBalances(data);
    } catch {
      setBalances([]);
    } finally {
      setBalancesLoading(false);
    }
  }, []);

  const adjustBalance = useCallback(
    async (teacherId: string, leaveType: string, dto: AdjustLeaveBalanceDTO) => {
      const updated = await teacherLeaveBalanceService.adjustBalance(teacherId, leaveType, dto);
      setBalances(prev =>
        prev.map(b => b.leave_type === leaveType ? { ...b, ...updated } : b)
      );
      return updated;
    },
    []
  );

  // --- Leave policies ---

  const fetchPolicies = useCallback(async () => {
    try {
      setPoliciesLoading(true);
      const data = await leavePolicyService.getPolicies();
      setPolicies(data);
    } catch {
      setPolicies([]);
    } finally {
      setPoliciesLoading(false);
    }
  }, []);

  const updatePolicy = useCallback(async (leaveType: string, dto: UpdateLeavePolicyDTO) => {
    const updated = await leavePolicyService.updatePolicy(leaveType, dto);
    setPolicies(prev =>
      prev.map(p => p.leave_type === leaveType ? { ...p, ...updated } : p)
    );
    return updated;
  }, []);

  return {
    // Leaves
    leaves,
    loading,
    error,
    fetchLeaves,
    fetchMyLeaves,
    createLeave,
    cancelLeave,
    approveLeave,
    rejectLeave,
    // Balances
    balances,
    balancesLoading,
    fetchMyBalances,
    fetchTeacherBalances,
    adjustBalance,
    // Policies
    policies,
    policiesLoading,
    fetchPolicies,
    updatePolicy,
  };
}
