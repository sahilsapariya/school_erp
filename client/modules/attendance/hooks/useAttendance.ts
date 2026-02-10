import { useState, useCallback } from "react";
import { attendanceService } from "../services/attendanceService";
import {
  ClassAttendanceData,
  StudentAttendanceData,
  MyClassItem,
  MarkAttendanceDTO,
} from "../types";

export const useAttendance = () => {
  const [myClasses, setMyClasses] = useState<MyClassItem[]>([]);
  const [classAttendance, setClassAttendance] = useState<ClassAttendanceData | null>(null);
  const [studentAttendance, setStudentAttendance] = useState<StudentAttendanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMyClasses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await attendanceService.getMyClasses();
      setMyClasses(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch classes");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClassAttendance = useCallback(async (classId: string, date: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await attendanceService.getClassAttendance(classId, date);
      setClassAttendance(data);
      return data;
    } catch (err: any) {
      setError(err.message || "Failed to fetch attendance");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const markAttendance = useCallback(async (data: MarkAttendanceDTO) => {
    setLoading(true);
    setError(null);
    try {
      const result = await attendanceService.markAttendance(data);
      return result;
    } catch (err: any) {
      setError(err.message || "Failed to mark attendance");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStudentAttendance = useCallback(async (studentId: string, month?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await attendanceService.getStudentAttendance(studentId, month);
      setStudentAttendance(data);
      return data;
    } catch (err: any) {
      setError(err.message || "Failed to fetch student attendance");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyAttendance = useCallback(async (month?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await attendanceService.getMyAttendance(month);
      setStudentAttendance(data);
      return data;
    } catch (err: any) {
      setError(err.message || "Failed to fetch attendance");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    myClasses,
    classAttendance,
    studentAttendance,
    loading,
    error,
    fetchMyClasses,
    fetchClassAttendance,
    markAttendance,
    fetchStudentAttendance,
    fetchMyAttendance,
  };
};
