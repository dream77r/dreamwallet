import { z } from 'zod'

const TextBlock = z.object({
  type: z.literal('text'),
  content: z.string(),
})

const SummaryItem = z.object({
  label: z.string(),
  value: z.string(),
  trend: z.enum(['up', 'down', 'stable']).optional(),
})

const SummaryBlock = z.object({
  type: z.literal('summary'),
  title: z.string(),
  items: z.array(SummaryItem),
})

const ChartDataPoint = z.object({
  label: z.string(),
  value: z.number(),
})

const ChartBlock = z.object({
  type: z.literal('chart'),
  chartType: z.enum(['bar', 'pie']),
  data: z.array(ChartDataPoint),
})

const ActionBlock = z.object({
  type: z.literal('action'),
  label: z.string(),
  actionType: z.string(),
  payload: z.record(z.string(), z.unknown()),
})

const TransactionCreatedBlock = z.object({
  type: z.literal('transaction_created'),
  amount: z.number(),
  txType: z.enum(['INCOME', 'EXPENSE']),
  description: z.string(),
  category: z.string().optional(),
})

export const ChatBlock = z.discriminatedUnion('type', [
  TextBlock,
  SummaryBlock,
  ChartBlock,
  ActionBlock,
  TransactionCreatedBlock,
])
export type ChatBlock = z.infer<typeof ChatBlock>

export type TextBlock = z.infer<typeof TextBlock>
export type SummaryBlock = z.infer<typeof SummaryBlock>
export type SummaryItem = z.infer<typeof SummaryItem>
export type ChartBlock = z.infer<typeof ChartBlock>
export type ChartDataPoint = z.infer<typeof ChartDataPoint>
export type ActionBlock = z.infer<typeof ActionBlock>
export type TransactionCreatedBlock = z.infer<typeof TransactionCreatedBlock>
