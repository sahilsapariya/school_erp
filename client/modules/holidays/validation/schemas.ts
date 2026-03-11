import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createHolidaySchema = z.discriminatedUnion('is_recurring', [
  // Non-recurring (single day or range)
  z.object({
    is_recurring: z.literal(false),
    name: z.string().min(1, 'Name is required').max(120, 'Max 120 characters'),
    description: z.string().max(500, 'Max 500 characters').optional(),
    holiday_type: z.enum(['public', 'school', 'regional', 'optional', 'weekly_off'], {
      errorMap: () => ({ message: 'Select a valid holiday type' }),
    }),
    start_date: z
      .string()
      .regex(dateRegex, 'Start date must be YYYY-MM-DD'),
    end_date: z
      .string()
      .regex(dateRegex, 'End date must be YYYY-MM-DD')
      .optional(),
    academic_year_id: z.string().optional(),
    recurring_day_of_week: z.undefined().optional(),
  }).refine(
    (d) => {
      if (!d.end_date) return true;
      return d.end_date >= d.start_date;
    },
    { message: 'End date must be on or after start date', path: ['end_date'] }
  ),

  // Recurring (weekly off)
  z.object({
    is_recurring: z.literal(true),
    name: z.string().min(1, 'Name is required').max(120, 'Max 120 characters'),
    description: z.string().max(500, 'Max 500 characters').optional(),
    holiday_type: z.enum(['public', 'school', 'regional', 'optional', 'weekly_off'], {
      errorMap: () => ({ message: 'Select a valid holiday type' }),
    }),
    recurring_day_of_week: z
      .number({ required_error: 'Day of week is required' })
      .int()
      .min(0, 'Must be 0-6')
      .max(6, 'Must be 0-6'),
    academic_year_id: z.string().optional(),
    start_date: z.undefined().optional(),
    end_date: z.undefined().optional(),
  }),
]);

export type CreateHolidayInput = z.infer<typeof createHolidaySchema>;

export function validateHolidayData(data: unknown): {
  valid: boolean;
  errors: Record<string, string>;
  data: CreateHolidayInput | null;
} {
  const result = createHolidaySchema.safeParse(data);
  if (!result.success) {
    const errors: Record<string, string> = {};
    result.error.issues.forEach((issue) => {
      const key = issue.path.join('.') || 'form';
      if (!errors[key]) errors[key] = issue.message;
    });
    return { valid: false, errors, data: null };
  }
  return { valid: true, errors: {}, data: result.data };
}
