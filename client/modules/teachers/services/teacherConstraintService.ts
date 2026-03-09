import { apiDelete, apiGet, apiPost, apiPut } from '@/common/services/api';
import {
  TeacherSubject,
  TeacherAvailability,
  CreateAvailabilityDTO,
  TeacherLeave,
  CreateLeaveDTO,
  TeacherWorkload,
  WorkloadDTO,
} from '../types';

// ---------------------------------------------------------------------------
// Teacher Subject Expertise
// ---------------------------------------------------------------------------

export const teacherSubjectService = {
  getSubjects: (teacherId: string) =>
    apiGet<TeacherSubject[]>(`/api/teachers/${teacherId}/subjects`),

  addSubject: (teacherId: string, subjectId: string) =>
    apiPost<TeacherSubject>(`/api/teachers/${teacherId}/subjects`, { subject_id: subjectId }),

  removeSubject: (teacherId: string, subjectId: string) =>
    apiDelete<void>(`/api/teachers/${teacherId}/subjects/${subjectId}`),
};

// ---------------------------------------------------------------------------
// Teacher Availability
// ---------------------------------------------------------------------------

export const teacherAvailabilityService = {
  getAvailability: (teacherId: string) =>
    apiGet<TeacherAvailability[]>(`/api/teachers/${teacherId}/availability`),

  createAvailability: (teacherId: string, data: CreateAvailabilityDTO) =>
    apiPost<TeacherAvailability>(`/api/teachers/${teacherId}/availability`, data),

  updateAvailability: (teacherId: string, availabilityId: string, available: boolean) =>
    apiPut<TeacherAvailability>(`/api/teachers/${teacherId}/availability/${availabilityId}`, { available }),

  deleteAvailability: (teacherId: string, availabilityId: string) =>
    apiDelete<void>(`/api/teachers/${teacherId}/availability/${availabilityId}`),
};

// ---------------------------------------------------------------------------
// Teacher Leaves
// ---------------------------------------------------------------------------

export const teacherLeaveService = {
  createLeave: (data: CreateLeaveDTO) =>
    apiPost<TeacherLeave>('/api/teachers/leaves', data),

  getMyLeaves: (params?: { status?: string }) => {
    let url = '/api/teachers/leaves/my';
    if (params?.status) url += `?status=${encodeURIComponent(params.status)}`;
    return apiGet<TeacherLeave[]>(url);
  },

  listLeaves: (params?: { teacher_id?: string; status?: string }) => {
    let url = '/api/teachers/leaves';
    if (params) {
      const qs = new URLSearchParams();
      if (params.teacher_id) qs.append('teacher_id', params.teacher_id);
      if (params.status) qs.append('status', params.status);
      const s = qs.toString();
      if (s) url += `?${s}`;
    }
    return apiGet<TeacherLeave[]>(url);
  },

  cancelLeave: (leaveId: string) =>
    apiPut<TeacherLeave>(`/api/teachers/leaves/${leaveId}/cancel`, {}),

  approveLeave: (leaveId: string) =>
    apiPut<TeacherLeave>(`/api/teachers/leaves/${leaveId}/approve`, {}),

  rejectLeave: (leaveId: string) =>
    apiPut<TeacherLeave>(`/api/teachers/leaves/${leaveId}/reject`, {}),
};

// ---------------------------------------------------------------------------
// Teacher Workload Rules
// ---------------------------------------------------------------------------

export const teacherWorkloadService = {
  getWorkload: (teacherId: string) =>
    apiGet<TeacherWorkload>(`/api/teachers/${teacherId}/workload`),

  createWorkload: (teacherId: string, data: WorkloadDTO) =>
    apiPost<TeacherWorkload>(`/api/teachers/${teacherId}/workload`, data),

  updateWorkload: (teacherId: string, data: Partial<WorkloadDTO>) =>
    apiPut<TeacherWorkload>(`/api/teachers/${teacherId}/workload`, data),
};
