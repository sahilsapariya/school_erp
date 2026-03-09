export interface TimetableSlot {
  id: string;
  class_id: string;
  subject_id: string;
  subject_name: string | null;
  teacher_id: string;
  teacher_name: string | null;
  day_of_week: number; // 0=Monday, 6=Sunday
  period_number: number;
  start_time: string;
  end_time: string;
  room?: string | null;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSlotDTO {
  class_id: string;
  subject_id: string;
  teacher_id: string;
  day_of_week: number;
  period_number: number;
  start_time: string;
  end_time: string;
  room?: string;
}

export interface UpdateSlotDTO {
  subject_id?: string;
  teacher_id?: string;
  day_of_week?: number;
  period_number?: number;
  start_time?: string;
  end_time?: string;
  room?: string;
}

export interface SlotConflict {
  type: string;
  message: string;
  day?: number;
  period?: number;
  class_id?: string;
  slot?: string;
}

export interface MoveSlotResult {
  success: boolean;
  slot?: TimetableSlot;
  conflicts?: SlotConflict[];
}

export interface SwapSlotsResult {
  success: boolean;
  slot_a?: TimetableSlot;
  slot_b?: TimetableSlot;
  conflicts?: SlotConflict[];
}
