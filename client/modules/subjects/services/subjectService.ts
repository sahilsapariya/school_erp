import { apiDelete, apiGet, apiPost, apiPut } from "@/common/services/api";
import { Subject, CreateSubjectDTO, UpdateSubjectDTO } from "../types";

export const subjectService = {
  getSubjects: async () => {
    return await apiGet<Subject[]>("/api/subjects/");
  },

  getSubject: async (id: string) => {
    return await apiGet<Subject>(`/api/subjects/${id}`);
  },

  createSubject: async (data: CreateSubjectDTO) => {
    return await apiPost<Subject>("/api/subjects/", data);
  },

  updateSubject: async (id: string, data: UpdateSubjectDTO) => {
    return await apiPut<Subject>(`/api/subjects/${id}`, data);
  },

  deleteSubject: async (id: string) => {
    return await apiDelete<void>(`/api/subjects/${id}`);
  },
};
