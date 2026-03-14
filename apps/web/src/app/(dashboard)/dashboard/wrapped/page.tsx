'use client'

import { trpc } from '@/lib/trpc/client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Download, Share2, ChevronLeft, ChevronRight } from 'lucide-react'

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

const SLIDE_COUNT = 8

const fmtAmount = (n: number) =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(n)

const fmtDate = (iso: string) => {
  if (!iso) return '---'
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function WrappedPage() {
  const now = new Date()
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [currentSlide, setCurrentSlide] = useState(0)
  const touchStartX = useRef(0)
  const shareCardRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = trpc.wrapped.getData.useQuery({
    period,
    month: period === 'monthly' ? month : undefined,
    year,
  })

  const goNext = useCallback(() => {
    setCurrentSlide((s) => Math.min(s + 1, SLIDE_COUNT - 1))
  }, [])

  const goPrev = useCallback(() => {
    setCurrentSlide((s) => Math.max(s - 1, 0))
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goNext()
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goPrev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goNext, goPrev])

  // Touch swipe
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const diff = touchStartX.current - e.changedTouches[0].clientX
      if (Math.abs(diff) > 50) {
        if (diff > 0) goNext()
        else goPrev()
      }
    },
    [goNext, goPrev],
  )

  const handleShare = useCallback(async () => {
    if (!shareCardRef.current) return
    try {
      const html2canvas = await import('html2canvas').then((m) => m.default)
      const canvas = await html2canvas(shareCardRef.current, { scale: 2 })
      canvas.toBlob(async (blob) => {
        if (!blob) return
        const file = new File([blob], 'wrapped.png', { type: 'image/png' })
        if (
          typeof navigator.share === 'function' &&
          navigator.canShare?.({ files: [file] })
        ) {
          try {
            await navigator.share({ files: [file] })
            return
          } catch {
            // fallback below
          }
        }
        // Download fallback
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'wrapped.png'
        a.click()
        URL.revokeObjectURL(url)
      }, 'image/png')
    } catch {
      // html2canvas not available
    }
  }, [])

  const isEmpty =
    data && data.totalExpense === 0 && data.totalIncome === 0

  const yearOptions: number[] = []
  for (let y = now.getFullYear(); y >= 2020; y--) {
    yearOptions.push(y)
  }

  // Slide definitions
  const slides = data
    ? [
        {
          gradient: 'from-[#667eea] to-[#764ba2]',
          title: 'Ваш финансовый итог',
          content: (
            <>
              <p className="text-lg opacity-80 mb-6">{data.period.label}</p>
              <div className="space-y-3">
                <div>
                  <p className="text-sm uppercase tracking-wider opacity-70">
                    Доход
                  </p>
                  <p className="text-4xl font-bold">
                    {fmtAmount(data.totalIncome)}
                  </p>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-wider opacity-70">
                    Расход
                  </p>
                  <p className="text-4xl font-bold">
                    {fmtAmount(data.totalExpense)}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm opacity-60">
                {data.transactionCount} операций
              </p>
            </>
          ),
        },
        {
          gradient: 'from-[#f093fb] to-[#f5576c]',
          title: 'Самый дорогой день',
          content: data.topSpendingDay ? (
            <>
              <p className="text-5xl font-bold mb-4">
                {fmtAmount(data.topSpendingDay.amount)}
              </p>
              <p className="text-lg opacity-80">
                {fmtDate(data.topSpendingDay.date)}
              </p>
            </>
          ) : (
            <p className="text-lg opacity-70">Нет данных о расходах</p>
          ),
        },
        {
          gradient: 'from-[#7b2ff7] to-[#4c3fa0]',
          title: 'Топ категория',
          content: data.topCategory ? (
            <>
              {data.topCategory.icon && (
                <p className="text-5xl mb-3">{data.topCategory.icon}</p>
              )}
              <p className="text-2xl font-bold mb-2">
                {data.topCategory.name}
              </p>
              <p className="text-4xl font-bold">
                {fmtAmount(data.topCategory.amount)}
              </p>
            </>
          ) : (
            <p className="text-lg opacity-70">Нет категорий</p>
          ),
        },
        {
          gradient: 'from-[#11998e] to-[#38ef7d]',
          title: 'Любимый магазин',
          content: data.favoriteMerchant ? (
            <>
              <p className="text-3xl font-bold mb-3">
                {data.favoriteMerchant.name}
              </p>
              <p className="text-lg opacity-80">
                {data.favoriteMerchant.visits}{' '}
                {pluralVisits(data.favoriteMerchant.visits)}
              </p>
            </>
          ) : (
            <p className="text-lg opacity-70">Нет данных о контрагентах</p>
          ),
        },
        {
          gradient: 'from-[#f2994a] to-[#f2c94c]',
          title: 'Бюджетная дисциплина',
          content: (
            <>
              <p className="text-5xl font-bold mb-3">
                {data.budgetDiscipline.respected} из{' '}
                {data.budgetDiscipline.total}
              </p>
              <p className="text-lg opacity-80 mb-2">бюджетов соблюдено</p>
              {data.budgetDiscipline.savedAmount > 0 && (
                <p className="text-sm opacity-70">
                  Сэкономлено: {fmtAmount(data.budgetDiscipline.savedAmount)}
                </p>
              )}
            </>
          ),
        },
        {
          gradient: 'from-[#4facfe] to-[#00f2fe]',
          title: 'Норма сбережений',
          content: (
            <>
              <div className="relative w-40 h-40 mx-auto mb-4">
                <svg viewBox="0 0 120 120" className="w-full h-full">
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="10"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="white"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${Math.max(0, Math.min(100, data.savingsRate)) * 3.267} 326.7`}
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl font-bold">
                    {data.savingsRate}%
                  </span>
                </div>
              </div>
              <p className="text-sm opacity-70">от дохода сохранено</p>
            </>
          ),
        },
        {
          gradient: 'from-[#ff6b6b] to-[#ee5a24]',
          title: 'Серия дней',
          content: (
            <>
              <p className="text-6xl font-bold mb-2">
                {data.longestStreak}
              </p>
              <p className="text-4xl mb-2">
                {'\uD83D\uDD25'}
              </p>
              <p className="text-lg opacity-80">
                {pluralDays(data.longestStreak)} подряд с записями
              </p>
            </>
          ),
        },
        {
          gradient: 'from-[#667eea] to-[#764ba2]',
          title: 'Финансовый скоринг',
          content: (
            <>
              <p className="text-7xl font-bold mb-3">
                {data.financialScore}
              </p>
              <p className="text-lg opacity-80 mb-6">
                {scoreEmoji(data.financialScore)} из 100
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleShare()
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-white/20 backdrop-blur px-6 py-3 text-white font-medium hover:bg-white/30 transition-colors"
              >
                <Share2 className="w-5 h-5" />
                Поделиться
              </button>
            </>
          ),
        },
      ]
    : []

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Period selector */}
      <div className="mb-6 space-y-3">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setPeriod('monthly')
              setCurrentSlide(0)
            }}
            className={`flex-1 py-2.5 rounded-2xl font-medium text-sm transition-colors ${
              period === 'monthly'
                ? 'gradient-hero text-white'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            Месяц
          </button>
          <button
            onClick={() => {
              setPeriod('yearly')
              setCurrentSlide(0)
            }}
            className={`flex-1 py-2.5 rounded-2xl font-medium text-sm transition-colors ${
              period === 'yearly'
                ? 'gradient-hero text-white'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            Год
          </button>
        </div>

        <div className="flex gap-2">
          {period === 'monthly' && (
            <select
              value={month}
              onChange={(e) => {
                setMonth(Number(e.target.value))
                setCurrentSlide(0)
              }}
              className="flex-1 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm"
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          )}
          <select
            value={year}
            onChange={(e) => {
              setYear(Number(e.target.value))
              setCurrentSlide(0)
            }}
            className={`${period === 'monthly' ? 'w-28' : 'flex-1'} rounded-2xl border border-border bg-card px-4 py-2.5 text-sm`}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="min-h-[400px] rounded-3xl bg-gradient-to-br from-muted to-muted/50 animate-pulse" />
      )}

      {/* Empty state */}
      {!isLoading && isEmpty && (
        <div className="min-h-[400px] rounded-3xl glass-card card-default flex flex-col items-center justify-center text-center p-8">
          <div className="text-6xl mb-4 opacity-30">
            {'\uD83D\uDCCA'}
          </div>
          <p className="text-lg font-medium text-muted-foreground">
            Нет данных за выбранный период
          </p>
          <p className="text-sm text-muted-foreground/70 mt-2">
            Добавьте транзакции, чтобы увидеть свой финансовый итог
          </p>
        </div>
      )}

      {/* Slides */}
      {!isLoading && data && !isEmpty && (
        <>
          <div
            className="relative"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {/* Nav arrows */}
            {currentSlide > 0 && (
              <button
                onClick={goPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/20 backdrop-blur flex items-center justify-center text-white hover:bg-black/30 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {currentSlide < SLIDE_COUNT - 1 && (
              <button
                onClick={goNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/20 backdrop-blur flex items-center justify-center text-white hover:bg-black/30 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {/* Current slide */}
            <div
              key={currentSlide}
              onClick={
                currentSlide < SLIDE_COUNT - 1 ? goNext : undefined
              }
              className={`min-h-[400px] rounded-3xl p-8 flex flex-col items-center justify-center text-center text-white bg-gradient-to-br ${slides[currentSlide]?.gradient} cursor-pointer select-none animate-fade-up`}
            >
              <h2 className="text-sm uppercase tracking-wider opacity-70 mb-4">
                {slides[currentSlide]?.title}
              </h2>
              {slides[currentSlide]?.content}
            </div>
          </div>

          {/* Dot indicators */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  i === currentSlide ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>

          {/* Slide counter */}
          <p className="text-center text-xs text-muted-foreground mt-2">
            {currentSlide + 1} / {SLIDE_COUNT}
          </p>
        </>
      )}

      {/* Hidden share card */}
      {data && !isEmpty && (
        <div
          style={{
            position: 'absolute',
            left: '-9999px',
            top: 0,
            width: 400,
            height: 600,
          }}
        >
          <div
            ref={shareCardRef}
            style={{
              width: 400,
              height: 600,
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: '#ffffff',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              padding: 32,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 24,
            }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                }}
              >
                DreamWallet
              </div>
              <div style={{ fontSize: 14, opacity: 0.7, marginTop: 4 }}>
                {data.period.label}
              </div>
            </div>

            {/* Stats grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
                flex: 1,
              }}
            >
              <ShareStatCell
                label="Доход"
                value={fmtAmount(data.totalIncome)}
              />
              <ShareStatCell
                label="Расход"
                value={fmtAmount(data.totalExpense)}
              />
              <ShareStatCell
                label="Дорогой день"
                value={
                  data.topSpendingDay
                    ? fmtAmount(data.topSpendingDay.amount)
                    : '---'
                }
              />
              <ShareStatCell
                label="Топ категория"
                value={data.topCategory?.name ?? '---'}
              />
              <ShareStatCell
                label="Магазин"
                value={data.favoriteMerchant?.name ?? '---'}
              />
              <ShareStatCell
                label="Бюджеты"
                value={`${data.budgetDiscipline.respected}/${data.budgetDiscipline.total}`}
              />
              <ShareStatCell
                label="Сбережения"
                value={`${data.savingsRate}%`}
              />
              <ShareStatCell
                label="Скоринг"
                value={`${data.financialScore}/100`}
              />
            </div>

            {/* Footer */}
            <div
              style={{
                textAlign: 'center',
                fontSize: 11,
                opacity: 0.5,
                marginTop: 16,
              }}
            >
              dreamwallet.brewos.ru
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ShareStatCell({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.1)',
        borderRadius: 16,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700 }}>{value}</div>
    </div>
  )
}

function pluralVisits(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'визит'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'визита'
  return 'визитов'
}

function pluralDays(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} день`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} дня`
  return `${n} дней`
}

function scoreEmoji(score: number): string {
  if (score >= 85) return 'Отличное здоровье'
  if (score >= 70) return 'Хорошее здоровье'
  if (score >= 50) return 'Есть над чем работать'
  return 'Требует внимания'
}
