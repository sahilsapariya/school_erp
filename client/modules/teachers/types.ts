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
