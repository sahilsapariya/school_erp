export interface ScheduleOverride {
  id: string;
  slot_id: string;
  override_date: string;
  override_type: "substitute" | "activity" | "cancelled";
  substitute_teacher_id: string | null;
  substitute_teacher_name: string | null;
  activity_label: string | null;
  note: string | null;
  created_by: string;
  created_at: string;
}

export interface ScheduleSlot {
  slot_id: string;
  class_id: string | null;
  class_name: string | null;
  subject_id: string | null;
  subject_name: string | null;
  teacher_id: string | null;
  teacher_name: string | null;
  period_number: number;
  start_time: string | null;
  end_time: string | null;
  teacher_on_leave: boolean;
  teacher_unavailable: boolean;
  needs_coverage: boolean;
  override: ScheduleOverride | null;
}
