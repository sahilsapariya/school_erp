import { useState, useCallback, useEffect } from "react";
import { timetableService, GenerateResult, TimetableConfig } from "../services/timetableService";
import { TimetableSlot, CreateSlotDTO, UpdateSlotDTO, MoveSlotResult, SwapSlotsResult } from "../types";

export function useTimetable(classId: string | undefined) {
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [config, setConfig] = useState<TimetableConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const data = await timetableService.getConfig();
      setConfig(data);
    } catch {
      setConfig(null);
    }
  }, []);

  const updateConfig = useCallback(async (cfg: Partial<TimetableConfig>) => {
    const updated = await timetableService.updateConfig(cfg);
    setConfig(updated);
    return updated;
  }, []);

  const fetchSlots = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await timetableService.getSlotsByClass(classId);
      setSlots(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Failed to load timetable");
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const createSlot = useCallback(
    async (data: CreateSlotDTO) => {
      const slot = await timetableService.createSlot(data);
      setSlots((prev) => [...prev, slot].sort((a, b) => a.day_of_week - b.day_of_week || a.period_number - b.period_number));
      return slot;
    },
    []
  );

  const updateSlot = useCallback(
    async (slotId: string, data: UpdateSlotDTO) => {
      const slot = await timetableService.updateSlot(slotId, data);
      setSlots((prev) =>
        prev
          .map((s) => (s.id === slotId ? slot : s))
          .sort((a, b) => a.day_of_week - b.day_of_week || a.period_number - b.period_number)
      );
      return slot;
    },
    []
  );

  const deleteSlot = useCallback(async (slotId: string) => {
    await timetableService.deleteSlot(slotId);
    setSlots((prev) => prev.filter((s) => s.id !== slotId));
  }, []);

  const moveSlot = useCallback(
    async (slotId: string, day: number, period: number): Promise<MoveSlotResult> => {
      const result: any = await timetableService.moveSlot(slotId, day, period);

      if (result.conflicts) {
        return { success: false, conflicts: result.conflicts };
      }

      // On success, handleResponse unwraps the backend envelope so
      // `result` is the slot dict directly (with a merged `message` prop).
      const updatedSlot = result as TimetableSlot;
      setSlots((prev) =>
        prev
          .map((s) => (s.id === slotId ? updatedSlot : s))
          .sort((a, b) => a.day_of_week - b.day_of_week || a.period_number - b.period_number)
      );
      return { success: true, slot: updatedSlot };
    },
    []
  );

  const swapSlots = useCallback(
    async (slotAId: string, slotBId: string): Promise<SwapSlotsResult> => {
      const result: any = await timetableService.swapSlots(slotAId, slotBId);

      if (result.conflicts) {
        return { success: false, conflicts: result.conflicts };
      }

      // On success, result = {slot_a: {...}, slot_b: {...}, message: "..."}
      const { slot_a: slotA, slot_b: slotB } = result;
      if (slotA && slotB) {
        setSlots((prev) =>
          prev
            .map((s) => {
              if (s.id === slotAId) return slotA;
              if (s.id === slotBId) return slotB;
              return s;
            })
            .sort((a, b) => a.day_of_week - b.day_of_week || a.period_number - b.period_number)
        );
      }
      return { success: true, slot_a: slotA, slot_b: slotB };
    },
    []
  );

  const generateTimetable = useCallback(
    async (overwriteExisting: boolean): Promise<GenerateResult> => {
      if (!classId) throw new Error("No class selected");
      setLoading(true);
      setError(null);
      try {
        const result = await timetableService.generateTimetable(classId, overwriteExisting);
        // Reload slots after generation
        const fresh = await timetableService.getSlotsByClass(classId);
        setSlots(Array.isArray(fresh) ? fresh : []);
        return result;
      } catch (err: any) {
        setError(err.message || "Generation failed");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [classId]
  );

  return {
    slots,
    config,
    loading,
    error,
    fetchSlots,
    fetchConfig,
    updateConfig,
    createSlot,
    updateSlot,
    deleteSlot,
    moveSlot,
    swapSlots,
    generateTimetable,
  };
}
