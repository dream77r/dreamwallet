'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
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
} from 'lucide-react'
import { trpc } from '@/lib/trpc/client'

type Step = 1 | 2 | 3 | 4

const steps = [
  { id: 1, label: 'Загрузка' },
  { id: 2, label: 'Предпросмотр' },
  { id: 3, label: 'Маппинг колонок' },
  { id: 4, label: 'Подтверждение' },
]

const templates = [
  { value: 'tinkoff', label: 'Тинькофф Банк' },
  { value: 'sber', label: 'Сбербанк' },
  { value: 'alfa', label: 'Альфа-Банк' },
  { value: 'vtb', label: 'ВТБ' },
  { value: 'raiffeisen', label: 'Райффайзен' },
  { value: 'custom', label: 'Произвольный CSV' },
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

export default function ImportPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [template, setTemplate] = useState('tinkoff')
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    imported: number; skipped: number; errors: number; totalRows: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch user accounts for target selection
  const { data: accounts } = trpc.account.listAll.useQuery()
  const importMutation = trpc.import.start.useMutation()

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
      setMapping(result.suggestedMapping)

      // Auto-select first account
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
    setError(null)
  }

  const canProceed = step === 1
    ? !!parseResult
    : step === 3
      ? Object.values(mapping).includes('date') && Object.values(mapping).includes('amount')
      : true

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Импорт данных</h1>
          <p className="text-muted-foreground text-sm">Загрузите выписку из банка в формате CSV или Excel</p>
        </div>
        <Button variant="outline" size="sm" disabled>
          <Download className="h-4 w-4" />
          Скачать шаблон
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4 pb-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
            <Button variant="ghost" size="icon" className="ml-auto h-6 w-6" onClick={() => setError(null)}>
              <X className="h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step indicator */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    step > s.id
                      ? 'bg-green-500 text-white'
                      : step === s.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                  }`}>
                    {step > s.id ? <CheckCircle2 className="h-4 w-4" /> : s.id}
                  </div>
                  <span className={`text-sm font-medium ${step === s.id ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 mx-3 h-px ${step > s.id ? 'bg-green-500' : 'bg-muted'}`} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Шаблон банка</CardTitle>
              <CardDescription>Выберите ваш банк для автоматического определения формата</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger className="w-full sm:w-[280px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Загрузка файла</CardTitle>
              <CardDescription>Поддерживаемые форматы: CSV, XLSX, XLS</CardDescription>
            </CardHeader>
            <CardContent>
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
                  className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-12 cursor-pointer transition-colors ${
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
            </CardContent>
          </Card>

          {parseResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Целевой счёт</CardTitle>
                <CardDescription>Выберите счёт, на который будут импортированы транзакции</CardDescription>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 2 && parseResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Предпросмотр данных</CardTitle>
                <CardDescription>{parseResult.totalRows} строк · файл: {parseResult.fileName}</CardDescription>
              </div>
              <Badge variant="secondary">{templates.find(t => t.value === template)?.label}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
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
          </CardContent>
        </Card>
      )}

      {/* Step 3: Column mapping */}
      {step === 3 && parseResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Маппинг колонок</CardTitle>
            <CardDescription>Укажите, какие колонки файла соответствуют полям системы</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
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

            <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                Обязательные поля: <strong>Дата</strong> и <strong>Сумма</strong>. Остальные поля опциональны.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Confirm */}
      {step === 4 && (
        <div className="space-y-4">
          {importResult ? (
            <Card>
              <CardContent className="pt-10 pb-10 flex flex-col items-center text-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold">Импорт завершён</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Загружено: {importResult.imported} · Пропущено: {importResult.skipped} · Ошибок: {importResult.errors}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetImport}>
                    Новый импорт
                  </Button>
                  <Button onClick={() => router.push('/dashboard/transactions')}>
                    Перейти к транзакциям
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Подтверждение импорта</CardTitle>
                <CardDescription>Проверьте параметры перед загрузкой</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {[
                    { label: 'Файл', value: parseResult?.fileName },
                    { label: 'Шаблон', value: templates.find(t => t.value === template)?.label },
                    { label: 'Строк', value: `${parseResult?.totalRows} строк` },
                    { label: 'Счёт', value: accounts?.find(a => a.id === selectedAccountId)?.name },
                    {
                      label: 'Маппинг',
                      value: Object.entries(mapping)
                        .filter(([, v]) => v !== 'skip')
                        .map(([k, v]) => `${k} → ${targetFields.find(f => f.value === v)?.label}`)
                        .join(', '),
                    },
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
              </CardContent>
            </Card>
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
    </div>
  )
}
