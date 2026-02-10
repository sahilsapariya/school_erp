export interface AttendanceRecord {
  student_id: string;
  student_name: string;
  admission_number: string;
  roll_number?: number;
  status: string | null; // present / absent / late / null (not marked)
  remarks?: string;
  marked: boolean;
}

export interface ClassAttendanceData {
  class_id: string;
  class_name: string;
  date: string;
  total_students: number;
  marked_count: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  attendance: AttendanceRecord[];
}

export interface StudentAttendanceData {
  student_id: string;
  student_name: string;
  total_days: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
  records: {
    id: string;
    date: string;
    class_id: string;
    student_id: string;
    student_name: string;
    admission_number: string;
    status: string;
    remarks?: string;
    marked_by: string;
    marked_by_name: string;
    created_at: string;
  }[];
}

export interface MyClassItem {
  id: string;
  name: string;
  section: string;
  academic_year: string;
  student_count: number;
  teacher_id?: string;
  teacher_name?: string;
  created_at: string;
}

export interface MarkAttendanceDTO {
  class_id: string;
  date: string;
  records: {
    student_id: string;
    status: string;
    remarks?: string;
  }[];
}
