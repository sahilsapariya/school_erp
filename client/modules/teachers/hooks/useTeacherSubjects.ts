import { useState, useCallback } from 'react';
import { TeacherSubject } from '../types';
import { teacherSubjectService } from '../services/teacherConstraintService';

export function useTeacherSubjects(teacherId: string) {
  const [subjects, setSubjects] = useState<TeacherSubject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await teacherSubjectService.getSubjects(teacherId);
      setSubjects(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load subjects');
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  const addSubject = useCallback(async (subjectId: string) => {
    const item = await teacherSubjectService.addSubject(teacherId, subjectId);
    setSubjects(prev => [...prev.filter(s => s.subject_id !== subjectId), item]);
  }, [teacherId]);

  const removeSubject = useCallback(async (subjectId: string) => {
    await teacherSubjectService.removeSubject(teacherId, subjectId);
    setSubjects(prev => prev.filter(s => s.subject_id !== subjectId));
  }, [teacherId]);

  return { subjects, loading, error, fetchSubjects, addSubject, removeSubject };
}
