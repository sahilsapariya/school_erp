import { useState, useCallback } from 'react';
import { TeacherAvailability, CreateAvailabilityDTO } from '../types';
import { teacherAvailabilityService } from '../services/teacherConstraintService';

export function useTeacherAvailability(teacherId: string) {
  const [availability, setAvailability] = useState<TeacherAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailability = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await teacherAvailabilityService.getAvailability(teacherId);
      setAvailability(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load availability');
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  const createSlot = useCallback(async (dto: CreateAvailabilityDTO) => {
    const item = await teacherAvailabilityService.createAvailability(teacherId, dto);
    setAvailability(prev => [...prev, item]);
    return item;
  }, [teacherId]);

  const updateSlot = useCallback(async (availabilityId: string, available: boolean) => {
    const item = await teacherAvailabilityService.updateAvailability(teacherId, availabilityId, available);
    setAvailability(prev => prev.map(a => a.id === availabilityId ? item : a));
  }, [teacherId]);

  const deleteSlot = useCallback(async (availabilityId: string) => {
    await teacherAvailabilityService.deleteAvailability(teacherId, availabilityId);
    setAvailability(prev => prev.filter(a => a.id !== availabilityId));
  }, [teacherId]);

  return { availability, loading, error, fetchAvailability, createSlot, updateSlot, deleteSlot };
}
