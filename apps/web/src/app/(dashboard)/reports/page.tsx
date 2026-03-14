'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/ui/page-header'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { FileText, Download, Trash2, Plus, Loader2, BarChart3, PieChart, TrendingUp, CalendarDays } from 'lucide-react'
import { format, startOfMonth, endOfMonth, startOfYear, subMonths } from 'date-fns'
import { ru } from 'date-fns/locale'
import { cn } from '@/lib/utils'

const REPORT_TYPES = [
  { value: 'monthly_summary', label: 'Ежемесячный отчёт', icon: CalendarDays, desc: 'Доходы, расходы и баланс за период' },
  { value: 'category_breakdown', label: 'По категориям', icon: PieChart, desc: 'Разбивка расходов по категориям' },
  { value: 'cashflow', label: 'Денежный поток', icon: TrendingUp, desc: 'Движение средств по месяцам' },
  { value: 'pnl', label: 'Прибыль и убытки', icon: BarChart3, desc: 'P&L за выбранный период' },
] as const

const PERIODS = [
  { value: 'this_month', label: 'Этот месяц' },
  { value: 'last_month', label: 'Прошлый месяц' },
  { value: 'last_3_months', label: 'Последние 3 месяца' },
  { value: 'last_6_months', label: 'Последние 6 месяцев' },
  { value: 'this_year', label: 'Этот год' },
  { value: 'custom', label: 'Произвольный период' },
]

function getPeriodDates(period: string) {
  const now = new Date()
  switch (period) {
    case 'this_month':    return { from: startOfMonth(now), to: endOfMonth(now) }
    case 'last_month':    return { from: startOfMonth(subMonths(now, 1)), to: endOfMonth(subMonths(now, 1)) }
    case 'last_3_months': return { from: startOfMonth(subMonths(now, 2)), to: endOfMonth(now) }
    case 'last_6_months': return { from: startOfMonth(subMonths(now, 5)), to: endOfMonth(now) }
    case 'this_year':     return { from: startOfYear(now), to: now }
    default:              return { from: startOfMonth(now), to: endOfMonth(now) }
  }
}

export default function ReportsPage() {
  const [selectedType, setSelectedType] = useState<typeof REPORT_TYPES[number]['value']>('monthly_summary')
  const [period, setPeriod] = useState('this_month')
  const [customFrom, setCustomFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [customTo, setCustomTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)

  const reportsQuery = trpc.reports.list.useQuery()
  const createReport = trpc.reports.create.useMutation({ onSuccess: () => reportsQuery.refetch() })
  const deleteReport = trpc.reports.delete.useMutation({ onSuccess: () => reportsQuery.refetch() })

  function getDates() {
    if (period === 'custom') {
      return { from: new Date(customFrom).toISOString(), to: new Date(customTo + 'T23:59:59').toISOString() }
    }
    const d = getPeriodDates(period)
    return { from: d.from.toISOString(), to: d.to.toISOString() }
  }

  async function handleGenerate() {
    setGenerating(true)
    try {
      const { from, to } = getDates()
      const params = new URLSearchParams({ type: selectedType, from, to })
      const res = await fetch(`/api/reports/generate?${params}`)
      if (!res.ok) throw new Error('Ошибка генерации')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dreamwallet-${selectedType}-${format(new Date(), 'yyyy-MM-dd')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF скачан!')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    const typeLabel = REPORT_TYPES.find(t => t.value === selectedType)?.label ?? selectedType
    const periodLabel = PERIODS.find(p => p.value === period)?.label ?? period
    setSaving(true)
    try {
      await createReport.mutateAsync({
        name: `${typeLabel} · ${periodLabel}`,
        type: selectedType,
        filters: getDates(),
      })
      toast.success('Отчёт сохранён')
    } finally {
      setSaving(false)
    }
  }

  async function handleDownloadSaved(report: { type: string; filters: unknown }) {
    const filters = report.filters as { from?: string; to?: string } ?? {}
    const from = filters.from ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const to = filters.to ?? new Date().toISOString()
    const params = new URLSearchParams({ type: report.type, from, to })
    const res = await fetch(`/api/reports/generate?${params}`)
    if (!res.ok) { toast.error('Ошибка'); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dreamwallet-${report.type}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title="Отчёты"
        description="Генерация PDF отчётов по вашим финансам"
      />

      {/* Generator */}
      <div className="glass-card card-default rounded-2xl">
        <div className="p-6 pb-4">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <FileText className="h-5 w-5 text-primary" />
            Новый отчёт
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Выберите тип и период — скачайте готовый PDF</p>
        </div>
        <div className="p-6 pt-2 space-y-5">
          {/* Report type */}
          <div className="space-y-2">
            <Label>Тип отчёта</Label>
            <div className="grid grid-cols-2 gap-2">
              {REPORT_TYPES.map(t => {
                const Icon = t.icon
                return (
                  <button
                    key={t.value}
                    onClick={() => setSelectedType(t.value)}
                    className={cn(
                      'flex items-start gap-3 rounded-xl border p-3 text-left transition-all',
                      selectedType === t.value
                        ? 'border-primary bg-primary/5 dark:bg-primary/10'
                        : 'border-border hover:border-primary/30 bg-card'
                    )}
                  >
                    <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', selectedType === t.value ? 'text-primary' : 'text-muted-foreground')} />
                    <div>
                      <p className={cn('text-sm font-medium', selectedType === t.value ? 'text-primary' : '')}>{t.label}</p>
                      <p className="text-xs text-muted-foreground leading-tight mt-0.5">{t.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Period */}
          <div className="space-y-2">
            <Label>Период</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {period === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>С</Label>
                <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>По</Label>
                <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              className="flex-1 gradient-hero text-white hover:opacity-90"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              Скачать PDF
            </Button>
            <Button variant="outline" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Saved reports */}
      {(reportsQuery.data?.length ?? 0) > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Сохранённые</h2>
          {reportsQuery.data?.map(report => (
            <div key={report.id} className="glass-card card-interactive rounded-2xl flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{report.name}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(report.createdAt), 'd MMM yyyy', { locale: ru })}
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => handleDownloadSaved(report)}>
                <Download className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteReport.mutate({ id: report.id })}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
