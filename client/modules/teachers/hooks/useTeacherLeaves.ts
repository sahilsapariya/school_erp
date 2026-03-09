import { useState, useCallback } from 'react';
import { TeacherLeave, CreateLeaveDTO } from '../types';
import { teacherLeaveService } from '../services/teacherConstraintService';

export function useTeacherLeaves() {
  const [leaves, setLeaves] = useState<TeacherLeave[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    return item;
  }, []);

  const cancelLeave = useCallback(async (leaveId: string) => {
    const item = await teacherLeaveService.cancelLeave(leaveId);
    setLeaves(prev => prev.map(l => l.id === leaveId ? item : l));
  }, []);

  const approveLeave = useCallback(async (leaveId: string) => {
    const item = await teacherLeaveService.approveLeave(leaveId);
    setLeaves(prev => prev.map(l => l.id === leaveId ? item : l));
  }, []);

  const rejectLeave = useCallback(async (leaveId: string) => {
    const item = await teacherLeaveService.rejectLeave(leaveId);
    setLeaves(prev => prev.map(l => l.id === leaveId ? item : l));
  }, []);

  return { leaves, loading, error, fetchLeaves, fetchMyLeaves, createLeave, cancelLeave, approveLeave, rejectLeave };
}
