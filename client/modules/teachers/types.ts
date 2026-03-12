export interface TeacherSubjectItem {
  id: string;
  name: string;
  code?: string;
}

export interface Teacher {
  id: string;
  user_id: string;
  name: string;
  email: string;
  profile_picture?: string;
  employee_id: string;
  designation?: string;
  department?: string;
  qualification?: string;
  specialization?: string;
  experience_years?: number;
  phone?: string;
  address?: string;
  date_of_joining?: string;
  status: string;
  created_at: string;
  subjects?: TeacherSubjectItem[];
}

// --- Teacher Subject Expertise ---
export interface TeacherSubject {
  id: string;
  teacher_id: string;
  subject_id: string;
  subject_name?: string;
  subject_code?: string;
  created_at: string;
}

// --- Teacher Availability ---
export interface TeacherAvailability {
  id: string;
  teacher_id: string;
  day_of_week: number;
  period_number: number;
  available: boolean;
  created_at: string;
}

export interface CreateAvailabilityDTO {
  day_of_week: number;
  period_number: number;
  available: boolean;
}

// --- Teacher Leaves ---
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type LeaveType = 'casual' | 'sick' | 'emergency' | 'unpaid' | 'other';

export const LEAVE_TYPES: LeaveType[] = ['casual', 'sick', 'emergency', 'unpaid', 'other'];

export interface TeacherLeave {
  id: string;
  teacher_id: string;
  teacher_name?: string;
  teacher_employee_id?: string;
  start_date: string;
  end_date: string;
  leave_type: string;
  reason?: string;
  status: LeaveStatus;
  working_days?: number;
  academic_year?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateLeaveDTO {
  start_date: string;
  end_date: string;
  leave_type: string;
  reason?: string;
}

// --- Leave Policy ---
export interface LeavePolicy {
  id: string;
  leave_type: string;
  total_days: number;
  is_unlimited: boolean;
  is_carry_forward_allowed: boolean;
  max_carry_forward_days: number;
  allow_negative: boolean;
  requires_reason: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateLeavePolicyDTO {
  total_days?: number;
  is_unlimited?: boolean;
  is_carry_forward_allowed?: boolean;
  max_carry_forward_days?: number;
  allow_negative?: boolean;
  requires_reason?: boolean;
}

// --- Leave Balance ---
export interface LeaveBalance {
  id: string;
  teacher_id: string;
  leave_type: string;
  academic_year: string;
  allocated_days: number;
  used_days: number;
  pending_days: number;
  carried_forward_days: number;
  available_days: number;
  is_unlimited: boolean;
  allow_negative: boolean;
  requires_reason: boolean;
  notes?: string;
  last_adjusted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AdjustLeaveBalanceDTO {
  allocated_days: number;
  notes?: string;
  academic_year?: string;
}

// --- Teacher Workload ---
export interface TeacherWorkload {
  id: string;
  teacher_id: string;
  max_periods_per_day: number;
  max_periods_per_week: number;
  created_at: string;
  updated_at: string;
}

export interface WorkloadDTO {
  max_periods_per_day: number;
  max_periods_per_week: number;
}

export interface CreateTeacherDTO {
  name: string;
  email?: string;
  phone?: string;
  designation?: string;
  department?: string;
  qualification?: string;
  specialization?: string;
  experience_years?: number;
  address?: string;
  date_of_joining?: string;
}

export interface UpdateTeacherDTO extends Partial<CreateTeacherDTO> {
  status?: string;
}

export interface TeacherCredentials {
  email: string;
  employee_id: string;
  password: string;
  must_reset: boolean;
}

export interface CreateTeacherResponse {
  teacher: Teacher;
  credentials?: TeacherCredentials;
}
