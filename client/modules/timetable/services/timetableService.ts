import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/common/services/api";
import { TimetableSlot, CreateSlotDTO, UpdateSlotDTO, MoveSlotResult, SwapSlotsResult } from "../types";

export interface TimetableBreak {
  after_period: number;
  duration_minutes: number;
  label: string;
}

export interface TimetableConfig {
  id?: string;
  general_class_duration_minutes: number;
  first_class_duration_minutes: number;
  gap_between_classes_minutes: number;
  periods_per_day: number;
  school_start_time: string;
  breaks: TimetableBreak[];
}

export interface GenerateResult {
  slots_created: number;
  total_periods_needed: number;
  conflicts: Array<{ reason: string; subject_id?: string; day?: string; period?: number }>;
}

export const timetableService = {
  getSlotsByClass: async (classId: string) => {
    return await apiGet<TimetableSlot[]>(`/api/timetable/class/${classId}`);
  },

  getConfig: async () => {
    return await apiGet<TimetableConfig>("/api/timetable/config");
  },

  updateConfig: async (config: Partial<TimetableConfig>) => {
    return await apiPut<TimetableConfig>("/api/timetable/config", config);
  },

  generateTimetable: async (classId: string, overwriteExisting: boolean) => {
    return await apiPost<GenerateResult>("/api/timetable/generate", {
      class_id: classId,
      overwrite_existing: overwriteExisting,
    });
  },

  createSlot: async (data: CreateSlotDTO) => {
    return await apiPost<TimetableSlot>("/api/timetable/", data);
  },

  updateSlot: async (slotId: string, data: UpdateSlotDTO) => {
    return await apiPut<TimetableSlot>(`/api/timetable/${slotId}`, data);
  },

  deleteSlot: async (slotId: string) => {
    return await apiDelete<void>(`/api/timetable/${slotId}`);
  },

  moveSlot: async (slotId: string, day: number, period: number): Promise<MoveSlotResult> => {
    return await apiPatch<MoveSlotResult>(`/api/timetable/slots/${slotId}/move`, { day, period });
  },

  swapSlots: async (slotAId: string, slotBId: string): Promise<SwapSlotsResult> => {
    return await apiPost<SwapSlotsResult>("/api/timetable/slots/swap", {
      slot_a_id: slotAId,
      slot_b_id: slotBId,
    });
  },

  removeSlot: async (slotId: string) => {
    return await apiDelete<void>(`/api/timetable/slots/${slotId}`);
  },
};
