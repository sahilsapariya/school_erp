import { apiGet, apiPost } from "@/common/services/api";
import {
  ClassAttendanceData,
  StudentAttendanceData,
  MyClassItem,
  MarkAttendanceDTO,
} from "../types";

export const attendanceService = {
  getMyClasses: async () => {
    return await apiGet<MyClassItem[]>("/api/attendance/my-classes");
  },

  markAttendance: async (data: MarkAttendanceDTO) => {
    return await apiPost<any>("/api/attendance/mark", data);
  },

  getClassAttendance: async (classId: string, date: string) => {
    return await apiGet<ClassAttendanceData>(
      `/api/attendance/class/${classId}?date=${date}`
    );
  },

  getStudentAttendance: async (studentId: string, month?: string) => {
    let url = `/api/attendance/student/${studentId}`;
    if (month) url += `?month=${month}`;
    return await apiGet<StudentAttendanceData>(url);
  },

  getMyAttendance: async (month?: string) => {
    let url = "/api/attendance/me";
    if (month) url += `?month=${month}`;
    return await apiGet<StudentAttendanceData>(url);
  },
};
