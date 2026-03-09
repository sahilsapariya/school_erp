import { useState, useCallback, useEffect } from "react";
import { scheduleService } from "../services/scheduleService";
import { ScheduleSlot } from "../types";

export function useSchedule() {
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTodaysSchedule = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await scheduleService.getTodaysSchedule();
      setSlots(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Failed to load schedule");
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodaysSchedule();
  }, [fetchTodaysSchedule]);

  const upsertOverride = useCallback(
    async (payload: Parameters<typeof scheduleService.upsertOverride>[0]) => {
      const override = await scheduleService.upsertOverride(payload);
      // Update the affected slot in local state
      setSlots((prev) =>
        prev.map((s) =>
          s.slot_id === payload.slot_id
            ? { ...s, override }
            : s
        )
      );
      return override;
    },
    []
  );

  const removeOverride = useCallback(async (slotId: string, overrideDate?: string) => {
    await scheduleService.deleteOverride(slotId, overrideDate);
    setSlots((prev) =>
      prev.map((s) => (s.slot_id === slotId ? { ...s, override: null } : s))
    );
  }, []);

  return {
    slots,
    loading,
    error,
    fetchTodaysSchedule,
    upsertOverride,
    removeOverride,
  };
}
