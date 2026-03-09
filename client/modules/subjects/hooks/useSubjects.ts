import { useState, useCallback } from "react";
import { subjectService } from "../services/subjectService";
import {
  Subject,
  CreateSubjectDTO,
  UpdateSubjectDTO,
} from "../types";

export const useSubjects = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await subjectService.getSubjects();
      setSubjects(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch subjects");
    } finally {
      setLoading(false);
    }
  }, []);

  const createSubject = useCallback(async (data: CreateSubjectDTO): Promise<Subject> => {
    setLoading(true);
    setError(null);
    try {
      const created = await subjectService.createSubject(data);
      setSubjects((prev) => [...prev, created]);
      return created;
    } catch (err: any) {
      setError(err.message || "Failed to create subject");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSubject = useCallback(async (id: string, data: UpdateSubjectDTO): Promise<Subject> => {
    setLoading(true);
    setError(null);
    try {
      const updated = await subjectService.updateSubject(id, data);
      setSubjects((prev) => prev.map((s) => (s.id === id ? updated : s)));
      return updated;
    } catch (err: any) {
      setError(err.message || "Failed to update subject");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSubject = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await subjectService.deleteSubject(id);
      setSubjects((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to delete subject");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    subjects,
    loading,
    error,
    fetchSubjects,
    createSubject,
    updateSubject,
    deleteSubject,
  };
};
