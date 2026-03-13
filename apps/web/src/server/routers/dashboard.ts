import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'

export const widgetIdSchema = z.enum([
  'balance',
  'recent-transactions',
  'budgets',
  'cashflow',
  'score',
  'forecast',
  'networth',
  'goals',
  'currency',
])

export type WidgetId = z.infer<typeof widgetIdSchema>

export const widgetConfigSchema = z.object({
  id: widgetIdSchema,
  enabled: z.boolean(),
  order: z.number().int().min(0),
})

export type WidgetConfig = z.infer<typeof widgetConfigSchema>

const DEFAULT_LAYOUT: WidgetConfig[] = [
  { id: 'balance', enabled: true, order: 0 },
  { id: 'recent-transactions', enabled: true, order: 1 },
  { id: 'budgets', enabled: true, order: 2 },
  { id: 'cashflow', enabled: true, order: 3 },
  { id: 'score', enabled: true, order: 4 },
  { id: 'forecast', enabled: true, order: 5 },
  { id: 'networth', enabled: true, order: 6 },
  { id: 'goals', enabled: true, order: 7 },
]

export const dashboardRouter = router({
  getLayout: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { dashboardLayout: true },
    })

    if (!user?.dashboardLayout) {
      return DEFAULT_LAYOUT
    }

    const parsed = z.array(widgetConfigSchema).safeParse(user.dashboardLayout)
    if (!parsed.success) {
      return DEFAULT_LAYOUT
    }

    const stored = parsed.data
    const storedIds = new Set(stored.map((w) => w.id))

    const missing = DEFAULT_LAYOUT.filter((w) => !storedIds.has(w.id)).map(
      (w, i) => ({ ...w, order: stored.length + i }),
    )

    return [...stored, ...missing].sort((a, b) => a.order - b.order)
  }),

  saveLayout: protectedProcedure
    .input(z.array(widgetConfigSchema))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { dashboardLayout: input },
      })
      return { success: true }
    }),
})
