import { useState, useCallback } from 'react';
import { SubjectLoad, CreateSubjectLoadDTO } from '../types';
import { subjectLoadService } from '../services/subjectLoadService';

export function useSubjectLoad(classId: string) {
  const [subjectLoads, setSubjectLoads] = useState<SubjectLoad[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubjectLoads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await subjectLoadService.getSubjectLoads(classId);
      setSubjectLoads(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load subject loads');
    } finally {
      setLoading(false);
    }
  }, [classId]);

  const createSubjectLoad = useCallback(async (dto: CreateSubjectLoadDTO) => {
    const item = await subjectLoadService.createSubjectLoad(classId, dto);
    setSubjectLoads(prev => [...prev, item]);
    return item;
  }, [classId]);

  const updateSubjectLoad = useCallback(async (loadId: string, weeklyPeriods: number) => {
    const item = await subjectLoadService.updateSubjectLoad(classId, loadId, weeklyPeriods);
    setSubjectLoads(prev => prev.map(l => l.id === loadId ? item : l));
  }, [classId]);

  const deleteSubjectLoad = useCallback(async (loadId: string) => {
    await subjectLoadService.deleteSubjectLoad(classId, loadId);
    setSubjectLoads(prev => prev.filter(l => l.id !== loadId));
  }, [classId]);

  return { subjectLoads, loading, error, fetchSubjectLoads, createSubjectLoad, updateSubjectLoad, deleteSubjectLoad };
}
