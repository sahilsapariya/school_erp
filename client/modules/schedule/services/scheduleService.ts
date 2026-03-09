import { apiDelete, apiGet, apiPost } from "@/common/services/api";
import { ScheduleSlot, ScheduleOverride } from "../types";

export const scheduleService = {
  getTodaysSchedule: async () => {
    return await apiGet<ScheduleSlot[]>("/api/schedule/today");
  },

  getAllSlotsToday: async () => {
    return await apiGet<ScheduleSlot[]>("/api/schedule/today/all");
  },

  upsertOverride: async (payload: {
    slot_id: string;
    override_type: "substitute" | "activity" | "cancelled";
    override_date?: string;
    substitute_teacher_id?: string;
    activity_label?: string;
    note?: string;
  }) => {
    return await apiPost<ScheduleOverride>("/api/schedule/override", payload);
  },

  deleteOverride: async (slot_id: string, override_date?: string) => {
    return await apiDelete<void>("/api/schedule/override", { slot_id, override_date });
  },
};
