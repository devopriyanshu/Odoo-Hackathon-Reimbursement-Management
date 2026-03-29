import { z } from 'zod';

const EXPENSE_CATEGORIES = [
  'TRAVEL',
  'MEALS',
  'ACCOMMODATION',
  'EQUIPMENT',
  'SOFTWARE',
  'TRAINING',
  'MARKETING',
  'UTILITIES',
  'OTHER',
] as const;

export const createExpenseSchema = z.object({
  amount: z.number().positive('Amount must be positive').multipleOf(0.01, 'Max 2 decimal places'),
  currency: z.string().length(3, 'Currency must be a valid ISO 4217 code').toUpperCase(),
  category: z.enum(EXPENSE_CATEGORIES, { errorMap: () => ({ message: 'Invalid expense category' }) }),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description cannot exceed 500 characters'),
  expenseDate: z
    .string()
    .refine((d) => !isNaN(Date.parse(d)), 'Invalid date')
    .refine((d) => new Date(d) <= new Date(), 'Expense date cannot be in the future'),
  receiptUrl: z.string().url().optional().nullable(),
  ocrData: z.record(z.any()).optional().nullable(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const expenseQuerySchema = z.object({
  status: z.string().optional(),
  category: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
