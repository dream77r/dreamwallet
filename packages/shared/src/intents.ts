import { z } from 'zod';

export const IntentType = z.enum([
  'show_balance',
  'show_expenses',
  'show_category_spend',
  'create_budget',
  'create_transaction',
  'show_last',
  'show_goals',
  'show_budgets',
  'advice',
  'unknown',
]);
export type IntentType = z.infer<typeof IntentType>;

export const ParsedIntent = z.object({
  intent: IntentType,
  confidence: z.number().min(0).max(1),
  params: z.object({
    period: z.string().optional(),
    category: z.string().optional(),
    amount: z.number().optional(),
    description: z.string().optional(),
    type: z.enum(['INCOME', 'EXPENSE']).optional(),
  }),
  rawText: z.string(),
});
export type ParsedIntent = z.infer<typeof ParsedIntent>;
