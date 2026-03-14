'use client'

import { useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Upload,
  FileText,
  CheckCircle2,
  ChevronRight,
  X,
  AlertCircle,
  Download,
  ArrowRight,
  File,
  Loader2,
  History,
  Inbox,
  BookmarkPlus,
  BookmarkCheck,
  Layers,
  Sparkles,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/page-header'

type Step = 1 | 2 | 3 | 4

const steps = [
  { id: 1, label: 'Загрузка' },
  { id: 2, label: 'Предпросмотр' },
  { id: 3, label: 'Колонки' },
  { id: 4, label: 'Подтверждение' },
]

const bankTemplates = [
  // Banks
  { value: 'tinkoff', label: 'Тинькофф Банк', group: 'bank' },
  { value: 'sber', label: 'Сбербанк', group: 'bank' },
  { value: 'alfa', label: 'Альфа-Банк', group: 'bank' },
  { value: 'vtb', label: 'ВТБ', group: 'bank' },
  { value: 'raiffeisen', label: 'Райффайзен', group: 'bank' },
  { value: 'gazprom', label: 'Газпромбанк', group: 'bank' },
  { value: 'ozon', label: 'Ozon Банк', group: 'bank' },
  { value: 'pochtabank', label: 'Почта Банк', group: 'bank' },
  { value: 'mts', label: 'МТС Банк', group: 'bank' },
  // Payment systems
  { value: 'yoomoney', label: 'ЮMoney (Яндекс.Деньги)', group: 'payment' },
  { value: 'paypal', label: 'PayPal', group: 'payment' },
  { value: 'stripe', label: 'Stripe', group: 'payment' },
  // Crypto exchanges
  { value: 'binance', label: 'Binance', group: 'crypto' },
  { value: 'bybit', label: 'Bybit', group: 'crypto' },
  // Custom
  { value: 'custom', label: 'Произвольный CSV', group: 'custom' },
]

const targetFields = [
  { value: 'date', label: 'Дата' },
  { value: 'description', label: 'Описание' },
  { value: 'amount', label: 'Сумма' },
  { value: 'category', label: 'Категория' },
  { value: 'counterparty', label: 'Контрагент' },
  { value: 'skip', label: '— Пропустить —' },
]

interface ParseResult {
  fileName: string
  fileSize: number
  headers: string[]
  previewRows: string[][]
  totalRows: number
  suggestedMapping: Record<string, string>
  fileContent: string
}

// ─── Save Template Modal ─────────────────────────────────────────────────────

interface SaveTemplateModalProps {
  open: boolean
  onClose: () => void
  mapping: Record<string, string>
  delimiter: string
  dateFormat: string
  skipRows: number
  existingTemplateId: string | null
  existingTemplateName: string
}

function SaveTemplateModal({
  open,
  onClose,
  mapping,
  delimiter,
  dateFormat,
  skipRows,
  existingTemplateId,
  existingTemplateName,
}: SaveTemplateModalProps) {
  const utils = trpc.useUtils()
  const [name, setName] = useState(existingTemplateName || '')
  const [mode, setMode] = useState<'new' | 'overwrite'>('new')

  const createMutation = trpc.csvTemplates.create.useMutation({
    onSuccess: ({ duplicateName }) => {
      utils.csvTemplates.list.invalidate()
      toast.success('Шаблон сохранён')
      if (duplicateName) toast.warning('Шаблон с таким названием уже существует — создан дубликат')
      onClose()
    },
    onError: (e) => toast.error(e.message),
  })

  const updateMutation = trpc.csvTemplates.update.useMutation({
    onSuccess: () => {
      utils.csvTemplates.list.invalidate()
      toast.success('Шаблон обновлён')
      onClose()
    },
    onError: (e) => toast.error(e.message),
  })

  function handleSave() {
    const payload = {
      name: name.trim(),
      columnMap: mapping,
      dateFormat,
      delimiter,
      skipRows,
    }

    if (mode === 'overwrite' && existingTemplateId) {
      updateMutation.mutate({ id: existingTemplateId, ...payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Сохранить шаблон маппинга</DialogTitle>
          <DialogDescription>
            Шаблон позволит быстро настроить маппинг при следующем импорте из того же источника.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {existingTemplateId && (
            <div className="flex gap-2">
              <Button
                variant={mode === 'overwrite' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setMode('overwrite'); setName(existingTemplateName) }}
              >
                Перезаписать «{existingTemplateName}»
              </Button>
              <Button
                variant={mode === 'new' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setMode('new'); setName('') }}
              >
                Сохранить как новый
              </Button>
            </div>
          )}

          {(mode === 'new' || !existingTemplateId) && (
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name">Название шаблона</Label>
              <Input
                id="tpl-name"
                placeholder="Например: Тинькофф основной"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                autoFocus
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button onClick={handleSave} disabled={!name.trim() || isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ImportPage() {
  return (
    <Suspense>
      <ImportPageInner />
    </Suspense>
  )
}

function ImportPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<Step>(1)
  const [template, setTemplate] = useState(searchParams.get('template') || 'tinkoff')
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    imported: number; skipped: number; duplicates: number; errors: number; totalRows: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // CSV Template state
  const [selectedCsvTemplateId, setSelectedCsvTemplateId] = useState<string>('none')
  const [showSaveModal, setShowSaveModal] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [aiCatResult, setAiCatResult] = useState<{ categorized: number; skipped: number } | null>(null)
  const [isAiCategorizing, setIsAiCategorizing] = useState(false)

  const { data: accounts } = trpc.account.listAll.useQuery()
  const importMutation = trpc.import.start.useMutation()
  const autoCategorize = trpc.transaction.autoCategorize.useMutation()
  const { data: importHistory, isLoading: historyLoading } = trpc.import.history.useQuery()
  const { data: csvTemplates } = trpc.csvTemplates.list.useQuery()

  const selectedCsvTemplate = csvTemplates?.find((t) => t.id === selectedCsvTemplateId)

  function applyTemplate(templateId: string) {
    setSelectedCsvTemplateId(templateId)
    const tpl = csvTemplates?.find((t) => t.id === templateId)
    if (tpl && parseResult) {
      setMapping(tpl.columnMap as Record<string, string>)
    }
  }

  async function handleFileUpload(selectedFile: File) {
    setFile(selectedFile)
    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('template', template)

      const response = await fetch('/api/import/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Upload failed')
      }

      const result: ParseResult = await response.json()
      setParseResult(result)

      // If a CSV template is selected — apply it, otherwise use suggested mapping
      if (selectedCsvTemplateId && selectedCsvTemplateId !== 'none') {
        const tpl = csvTemplates?.find((t) => t.id === selectedCsvTemplateId)
        setMapping(tpl ? (tpl.columnMap as Record<string, string>) : result.suggestedMapping)
      } else {
        setMapping(result.suggestedMapping)
      }

      if (accounts && accounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accounts[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file')
      setFile(null)
    } finally {
      setIsUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) handleFileUpload(droppedFile)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (selected) handleFileUpload(selected)
  }

  async function handleImport() {
    if (!parseResult || !selectedAccountId) return

    setIsImporting(true)
    setError(null)

    try {
      const result = await importMutation.mutateAsync({
        accountId: selectedAccountId,
        fileContent: parseResult.fileContent,
        fileName: parseResult.fileName,
        columnMap: mapping,
        dateFormat: 'DD.MM.YYYY',
        delimiter: ';',
        template,
      })

      setImportResult(result)
      // Auto-run keyword categorization on newly imported transactions
      if (result.imported > 0) {
        try {
          const catResult = await autoCategorize.mutateAsync({ useAI: false })
          setAiCatResult({ categorized: catResult.categorized, skipped: catResult.skipped })
        } catch {
          // ignore categorization errors
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  function resetImport() {
    setStep(1)
    setFile(null)
    setParseResult(null)
    setMapping({})
    setImportResult(null)
    setAiCatResult(null)
    setError(null)
    setSelectedCsvTemplateId('none')
  }

  const canProceed = step === 1
    ? !!parseResult
    : step === 3
      ? Object.values(mapping).includes('date') && Object.values(mapping).includes('amount')
      : true

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Импорт данных"
        description="Загрузите выписку из банка в формате CSV или Excel"
        actions={
          <Button variant="outline" size="sm" disabled>
            <Download className="h-4 w-4" />
            Скачать шаблон
          </Button>
        }
      />

      {error && (
        <div className="glass-card card-default rounded-2xl border-expense/30 bg-expense/5">
          <div className="px-4 py-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-expense flex-shrink-0" />
            <p className="text-sm text-expense">{error}</p>
            <Button variant="ghost" size="icon" className="ml-auto h-6 w-6" onClick={() => setError(null)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Step indicator */}
      <div className="glass-card card-default rounded-2xl p-5">
        <div className="flex items-center">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  step > s.id
                    ? 'bg-income text-white'
                    : step === s.id
                      ? 'gradient-hero text-white'
                      : 'bg-muted text-muted-foreground'
                }`}>
                  {step > s.id ? <CheckCircle2 className="h-4 w-4" /> : s.id}
                </div>
                <span className={`text-sm font-medium ${step === s.id ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 mx-3 h-px ${step > s.id ? 'bg-income' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="space-y-4">
          {/* CSV Template selector */}
          {csvTemplates && csvTemplates.length > 0 && (
            <div className="glass-card card-default rounded-2xl">
              <div className="px-5 pt-5 pb-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <p className="text-base font-semibold">Шаблон маппинга</p>
                </div>
                <p className="text-sm text-muted-foreground">Выберите сохранённый шаблон для автозаполнения маппинга колонок</p>
              </div>
              <div className="px-5 pb-5">
                <Select value={selectedCsvTemplateId} onValueChange={applyTemplate}>
                  <SelectTrigger className="w-full sm:w-[320px]">
                    <SelectValue placeholder="Без шаблона" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Без шаблона —</SelectItem>
                    {csvTemplates.map((tpl) => (
                      <SelectItem key={tpl.id} value={tpl.id}>
                        {tpl.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCsvTemplate && (
                  <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                    <BookmarkCheck className="h-3.5 w-3.5 text-income" />
                    Маппинг из шаблона «{selectedCsvTemplate.name}» будет применён автоматически
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="glass-card card-default rounded-2xl">
            <div className="px-5 pt-5 pb-3">
              <p className="text-base font-semibold">Источник данных</p>
              <p className="text-sm text-muted-foreground">Выберите банк, платёжную систему или биржу для автоопределения формата</p>
            </div>
            <div className="px-5 pb-5">
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger className="w-full sm:w-[320px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Банки</SelectLabel>
                    {bankTemplates.filter(t => t.group === 'bank').map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Платёжные системы</SelectLabel>
                    {bankTemplates.filter(t => t.group === 'payment').map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Криптобиржи</SelectLabel>
                    {bankTemplates.filter(t => t.group === 'crypto').map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Прочее</SelectLabel>
                    {bankTemplates.filter(t => t.group === 'custom').map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="glass-card card-default rounded-2xl">
            <div className="px-5 pt-5 pb-3">
              <p className="text-base font-semibold">Загрузка файла</p>
              <p className="text-sm text-muted-foreground">Поддерживаемые форматы: CSV, XLSX, XLS</p>
            </div>
            <div className="px-5 pb-5">
              {isUploading ? (
                <div className="flex flex-col items-center gap-3 p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Анализ файла...</p>
                </div>
              ) : parseResult ? (
                <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{parseResult.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {(parseResult.fileSize / 1024).toFixed(1)} KB · {parseResult.totalRows} строк · {parseResult.headers.length} колонок
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={resetImport}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onClick={() => fileInputRef.current?.click()}
                  className={`glass-card flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-12 cursor-pointer transition-colors ${
                    isDragging ? 'border-primary bg-primary/5' : 'hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Перетащите файл сюда</p>
                    <p className="text-xs text-muted-foreground mt-0.5">или нажмите для выбора</p>
                  </div>
                  <p className="text-xs text-muted-foreground">CSV, XLSX до 10 MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          </div>

          {parseResult && (
            <div className="glass-card card-default rounded-2xl">
              <div className="px-5 pt-5 pb-3">
                <p className="text-base font-semibold">Целевой счёт</p>
                <p className="text-sm text-muted-foreground">Выберите счёт, на который будут импортированы транзакции</p>
              </div>
              <div className="px-5 pb-5">
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger className="w-full sm:w-[320px]">
                    <SelectValue placeholder="Выберите счёт" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts?.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.icon} {acc.name} ({acc.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 2 && parseResult && (
        <div className="glass-card card-default rounded-2xl">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div>
              <p className="text-base font-semibold">Предпросмотр данных</p>
              <p className="text-sm text-muted-foreground">{parseResult.totalRows} строк · файл: {parseResult.fileName}</p>
            </div>
            <Badge variant="secondary">{bankTemplates.find(t => t.value === template)?.label}</Badge>
          </div>
          <div className="p-0">
            <ScrollArea className="h-[360px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    {parseResult.headers.map(col => (
                      <TableHead key={col} className="first:pl-6 last:pr-6 whitespace-nowrap text-xs">
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parseResult.previewRows.map((row, i) => (
                    <TableRow key={i} className="hover:bg-muted/50">
                      {row.map((cell, j) => (
                        <TableCell key={j} className={`text-xs ${j === 0 ? 'pl-6' : ''} ${j === row.length - 1 ? 'pr-6' : ''}`}>
                          {cell || '—'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Step 3: Column mapping */}
      {step === 3 && parseResult && (
        <div className="glass-card card-default rounded-2xl">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div>
              <p className="text-base font-semibold">Колонки</p>
              <p className="text-sm text-muted-foreground">Укажите, какие колонки файла соответствуют полям системы</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaveModal(true)}
              className="gap-1.5"
            >
              <BookmarkPlus className="h-4 w-4" />
              Сохранить шаблон
            </Button>
          </div>
          <div className="px-5 pb-5 space-y-3">
            {/* Template quick-apply on mapping step */}
            {csvTemplates && csvTemplates.length > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                <Layers className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Select
                  value={selectedCsvTemplateId}
                  onValueChange={(v) => {
                    setSelectedCsvTemplateId(v)
                    if (v !== 'none') {
                      const tpl = csvTemplates.find((t) => t.id === v)
                      if (tpl) setMapping(tpl.columnMap as Record<string, string>)
                    }
                  }}
                >
                  <SelectTrigger className="h-8 border-none bg-transparent shadow-none p-0 focus:ring-0 w-auto min-w-[180px]">
                    <SelectValue placeholder="Применить шаблон..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Без шаблона —</SelectItem>
                    {csvTemplates.map((tpl) => (
                      <SelectItem key={tpl.id} value={tpl.id}>{tpl.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {parseResult.headers.map((col) => (
              <div key={col} className="flex items-center gap-4">
                <div className="flex-1 flex items-center gap-2 p-3 rounded-lg bg-muted text-sm">
                  <File className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium truncate">{col}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <Select
                    value={mapping[col] || 'skip'}
                    onValueChange={(v) => setMapping(prev => ({ ...prev, [col]: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {targetFields.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}

            <div className="mt-4 p-3 rounded-lg gradient-card border border-primary/20 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-foreground">
                Обязательные поля: <strong>Дата</strong> и <strong>Сумма</strong>. Остальные поля опциональны.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Confirm */}
      {step === 4 && (
        <div className="space-y-4">
          {importResult ? (
            <div className="glass-card card-default rounded-2xl">
              <div className="px-5 py-10 flex flex-col items-center text-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-income/10">
                  <CheckCircle2 className="h-8 w-8 text-income" />
                </div>
                <div>
                  <p className="text-lg font-semibold">Импорт завершён</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Загружено: {importResult.imported}{importResult.duplicates > 0 && ` · Дубликатов пропущено: ${importResult.duplicates}`}{importResult.skipped > 0 && ` · Пропущено: ${importResult.skipped}`}{importResult.errors > 0 && ` · Ошибок: ${importResult.errors}`}
                  </p>
                  {aiCatResult !== null && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Категоризировано: {aiCatResult.categorized}
                      {aiCatResult.skipped > 0 && ` · Без категории: ${aiCatResult.skipped}`}
                    </p>
                  )}
                </div>

                {/* AI categorization for remaining uncategorized */}
                {aiCatResult !== null && aiCatResult.skipped > 0 && (
                  <div className="w-full max-w-xs space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {aiCatResult.skipped} транзакций без категории — попробуй AI
                    </p>
                    <Button
                      className="w-full gap-2"
                      variant="outline"
                      disabled={isAiCategorizing}
                      onClick={async () => {
                        setIsAiCategorizing(true)
                        try {
                          const r = await autoCategorize.mutateAsync({ useAI: true })
                          setAiCatResult(prev => prev ? {
                            categorized: (prev.categorized) + r.categorized,
                            skipped: r.skipped,
                          } : r)
                          toast.success(`AI категоризировал ещё ${r.categorized} транзакций`)
                        } catch {
                          toast.error('Ошибка категоризации')
                        } finally {
                          setIsAiCategorizing(false)
                        }
                      }}
                    >
                      {isAiCategorizing ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Категоризирую...</>
                      ) : (
                        <><Sparkles className="h-4 w-4 text-indigo-500" /> AI категоризация</>
                      )}
                    </Button>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetImport}>
                    Новый импорт
                  </Button>
                  <Button onClick={() => router.push('/dashboard/transactions')}>
                    Перейти к транзакциям
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card card-default rounded-2xl">
              <div className="px-5 pt-5 pb-3">
                <p className="text-base font-semibold">Подтверждение импорта</p>
                <p className="text-sm text-muted-foreground">Проверьте параметры перед загрузкой</p>
              </div>
              <div className="px-5 pb-5 space-y-4">
                <div className="space-y-2">
                  {[
                    { label: 'Файл', value: parseResult?.fileName },
                    { label: 'Шаблон', value: bankTemplates.find(t => t.value === template)?.label },
                    { label: 'Строк', value: `${parseResult?.totalRows} строк` },
                    { label: 'Счёт', value: accounts?.find(a => a.id === selectedAccountId)?.name },
                    {
                      label: 'Маппинг',
                      value: Object.entries(mapping)
                        .filter(([, v]) => v !== 'skip')
                        .map(([k, v]) => `${k} → ${targetFields.find(f => f.value === v)?.label}`)
                        .join(', '),
                    },
                    ...(selectedCsvTemplate
                      ? [{ label: 'CSV шаблон', value: selectedCsvTemplate.name }]
                      : []),
                  ].map(({ label, value }) => (
                    <div key={label} className="flex gap-2 text-sm">
                      <span className="text-muted-foreground w-28 flex-shrink-0">{label}:</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>

                {isImporting && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm text-muted-foreground">Импортируем транзакции...</span>
                  </div>
                )}

                {!isImporting && !importResult && (
                  <Button onClick={handleImport} className="w-full" disabled={!selectedAccountId}>
                    <Upload className="h-4 w-4" />
                    Импортировать {parseResult?.totalRows} транзакций
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      {!importResult && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            disabled={step === 1}
            onClick={() => setStep(prev => (prev - 1) as Step)}
          >
            Назад
          </Button>
          <div className="flex items-center gap-1.5">
            {steps.map((s) => (
              <div
                key={s.id}
                className={`h-1.5 rounded-full transition-all ${
                  s.id === step ? 'w-6 bg-primary' : s.id < step ? 'w-3 bg-primary/60' : 'w-3 bg-muted'
                }`}
              />
            ))}
          </div>
          {step < 4 ? (
            <Button
              disabled={!canProceed}
              onClick={() => setStep(prev => (prev + 1) as Step)}
            >
              Далее
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <div className="w-[80px]" />
          )}
        </div>
      )}

      {/* Import History */}
      <div className="glass-card card-default rounded-2xl">
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <p className="text-base font-semibold">История импортов</p>
          </div>
          <p className="text-sm text-muted-foreground">Последние 20 импортов</p>
        </div>
        <div className="px-5 pb-5">
          {historyLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !importHistory || importHistory.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <Inbox className="h-8 w-8" />
              <p className="text-sm">Нет импортов</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Файл</TableHead>
                  <TableHead className="text-right">Импортировано</TableHead>
                  <TableHead className="text-right">Пропущено</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importHistory.map((entry) => {
                  const changes = entry.changes as Record<string, unknown> | null
                  const fileName = (changes?.fileName as string) ?? '—'
                  const imported = (changes?.imported as number) ?? 0
                  const skipped = ((changes?.skipped as number) ?? 0) + ((changes?.errors as number) ?? 0)
                  const dateLabel = new Date(entry.createdAt).toLocaleDateString('ru-RU', {
                    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
                  })
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm text-muted-foreground">{dateLabel}</TableCell>
                      <TableCell className="text-sm font-medium truncate max-w-[200px]">{fileName}</TableCell>
                      <TableCell className="text-right text-sm text-income font-medium">{imported}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{skipped}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Save Template Modal */}
      {showSaveModal && (
        <SaveTemplateModal
          open={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          mapping={mapping}
          delimiter=";"
          dateFormat="DD.MM.YYYY"
          skipRows={0}
          existingTemplateId={selectedCsvTemplateId !== 'none' ? selectedCsvTemplateId : null}
          existingTemplateName={selectedCsvTemplate?.name ?? ''}
        />
      )}
    </div>
  )
}
