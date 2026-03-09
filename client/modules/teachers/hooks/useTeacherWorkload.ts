import { useState, useCallback } from 'react';
import { TeacherWorkload, WorkloadDTO } from '../types';
import { teacherWorkloadService } from '../services/teacherConstraintService';

export function useTeacherWorkload(teacherId: string) {
  const [workload, setWorkload] = useState<TeacherWorkload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await teacherWorkloadService.getWorkload(teacherId);
      setWorkload(data);
    } catch (e: any) {
      if (e?.status === 404 || e?.message?.includes('not found')) {
        setWorkload(null);
      } else {
        setError(e.message || 'Failed to load workload rule');
      }
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  const saveWorkload = useCallback(async (dto: WorkloadDTO) => {
    if (workload) {
      const updated = await teacherWorkloadService.updateWorkload(teacherId, dto);
      setWorkload(updated);
    } else {
      const created = await teacherWorkloadService.createWorkload(teacherId, dto);
      setWorkload(created);
    }
  }, [teacherId, workload]);

  return { workload, loading, error, fetchWorkload, saveWorkload };
}
