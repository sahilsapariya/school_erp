import { useState, useCallback } from 'react';
import { Holiday, CreateHolidayDTO } from '../types';
import { holidayService } from '../services/holidayService';

export function useHolidays() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [recurringHolidays, setRecurringHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHolidays = useCallback(async (params: Parameters<typeof holidayService.getHolidays>[0] = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await holidayService.getHolidays({ ...params, include_recurring: false });
      setHolidays(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load holidays');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRecurring = useCallback(async () => {
    try {
      const data = await holidayService.getRecurring();
      setRecurringHolidays(data);
    } catch {
      // Non-critical; silently fail
    }
  }, []);

  const createHoliday = useCallback(async (data: CreateHolidayDTO): Promise<Holiday> => {
    const created = await holidayService.createHoliday(data);
    if (data.is_recurring) {
      setRecurringHolidays((prev) => [...prev, created].sort(
        (a, b) => (a.recurring_day_of_week ?? 0) - (b.recurring_day_of_week ?? 0)
      ));
    } else {
      setHolidays((prev) =>
        [...prev, created].sort((a, b) =>
          (a.start_date ?? '').localeCompare(b.start_date ?? '')
        )
      );
    }
    return created;
  }, []);

  const updateHoliday = useCallback(async (id: string, data: Partial<CreateHolidayDTO>): Promise<Holiday> => {
    const updated = await holidayService.updateHoliday(id, data);
    setHolidays((prev) => prev.map((h) => (h.id === id ? updated : h)));
    setRecurringHolidays((prev) => prev.map((h) => (h.id === id ? updated : h)));
    return updated;
  }, []);

  const deleteHoliday = useCallback(async (id: string, isRecurring: boolean) => {
    await holidayService.deleteHoliday(id);
    if (isRecurring) {
      setRecurringHolidays((prev) => prev.filter((h) => h.id !== id));
    } else {
      setHolidays((prev) => prev.filter((h) => h.id !== id));
    }
  }, []);

  return {
    holidays,
    recurringHolidays,
    loading,
    error,
    fetchHolidays,
    fetchRecurring,
    createHoliday,
    updateHoliday,
    deleteHoliday,
  };
}
