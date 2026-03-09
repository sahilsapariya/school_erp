import { apiDelete, apiGet, apiPost, apiPut } from '@/common/services/api';
import { SubjectLoad, CreateSubjectLoadDTO } from '../types';

export const subjectLoadService = {
  getSubjectLoads: (classId: string) =>
    apiGet<SubjectLoad[]>(`/api/classes/${classId}/subject-load`),

  createSubjectLoad: (classId: string, data: CreateSubjectLoadDTO) =>
    apiPost<SubjectLoad>(`/api/classes/${classId}/subject-load`, data),

  updateSubjectLoad: (classId: string, loadId: string, weeklyPeriods: number) =>
    apiPut<SubjectLoad>(`/api/classes/${classId}/subject-load/${loadId}`, { weekly_periods: weeklyPeriods }),

  deleteSubjectLoad: (classId: string, loadId: string) =>
    apiDelete<void>(`/api/classes/${classId}/subject-load/${loadId}`),
};
