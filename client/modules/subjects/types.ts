export interface Subject {
  id: string;
  name: string;
  code?: string;
  description?: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSubjectDTO {
  name: string;
  code?: string;
  description?: string;
}

export interface UpdateSubjectDTO {
  name?: string;
  code?: string;
  description?: string;
}
