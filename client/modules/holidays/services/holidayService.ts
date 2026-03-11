import { apiGet, apiPost, apiPut, apiDelete } from '@/common/services/api';
import { Holiday, CreateHolidayDTO } from '../types';

interface ListHolidaysParams {
  academic_year_id?: string;
  holiday_type?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  include_recurring?: boolean;
  limit?: number;
  offset?: number;
}

interface ListHolidaysResponse {
  data: Holiday[];
  total: number;
  limit: number;
  offset: number;
}

export const holidayService = {
  getHolidays: async (params: ListHolidaysParams = {}): Promise<Holiday[]> => {
    const qs = new URLSearchParams();
    if (params.academic_year_id) qs.set('academic_year_id', params.academic_year_id);
    if (params.holiday_type) qs.set('holiday_type', params.holiday_type);
    if (params.start_date) qs.set('start_date', params.start_date);
    if (params.end_date) qs.set('end_date', params.end_date);
    if (params.search) qs.set('search', params.search);
    if (params.include_recurring === false) qs.set('include_recurring', 'false');
    if (params.limit !== undefined) qs.set('limit', String(params.limit));
    if (params.offset !== undefined) qs.set('offset', String(params.offset));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    const res = await apiGet<ListHolidaysResponse>(`/api/holidays/${query}`);
    return (res as any).data ?? [];
  },

  getUpcoming: async (limit = 10): Promise<Holiday[]> => {
    const res = await apiGet<Holiday[]>(`/api/holidays/upcoming?limit=${limit}`);
    return (res as any).data ?? [];
  },

  getRecurring: async (): Promise<Holiday[]> => {
    const res = await apiGet<Holiday[]>('/api/holidays/recurring');
    return (res as any).data ?? [];
  },

  getHoliday: async (id: string): Promise<Holiday> => {
    const res = await apiGet<Holiday>(`/api/holidays/${id}`);
    return (res as any).data;
  },

  createHoliday: async (data: CreateHolidayDTO): Promise<Holiday> => {
    const res = await apiPost<Holiday>('/api/holidays/', data);
    return (res as any).data;
  },

  updateHoliday: async (id: string, data: Partial<CreateHolidayDTO>): Promise<Holiday> => {
    const res = await apiPut<Holiday>(`/api/holidays/${id}`, data);
    return (res as any).data;
  },

  deleteHoliday: async (id: string): Promise<void> => {
    await apiDelete(`/api/holidays/${id}`);
  },
};
