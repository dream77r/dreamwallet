"use client"
import { trpc } from "@/lib/trpc/client"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/ui/page-header"
import { GradientHero } from "@/components/ui/gradient-hero"
import { TrendingUp, TrendingDown, Landmark, Banknote } from "lucide-react"

function formatAmount(n: number) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(n)
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  BANK_ACCOUNT: "Банковский счёт",
  CASH: "Наличные",
  INVESTMENT: "Инвестиции",
  CRYPTO: "Крипто",
  CREDIT_CARD: "Кредитная карта",
  SAVINGS: "Накопительный",
  OTHER: "Другое",
}

export default function NetWorthPage() {
  const { data, isLoading } = trpc.wallet.netWorth.useQuery()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-3xl" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="glass-card card-default rounded-2xl p-5 space-y-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="glass-card card-default rounded-2xl p-5 space-y-3">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Чистые активы" />
        <div className="glass-card card-default rounded-2xl flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
          <Landmark className="h-10 w-10" />
          <p className="text-sm">Нет данных для расчёта чистых активов</p>
        </div>
      </div>
    )
  }

  const assetsRatio = data.totalAssets + data.totalDebts > 0
    ? (data.totalAssets / (data.totalAssets + data.totalDebts)) * 100
    : 100

  return (
    <div className="space-y-6">
      <PageHeader title="Чистые активы" />

      {/* Main net worth hero */}
      <GradientHero variant={data.netWorth >= 0 ? "success" : "accent"}>
        <div className="text-center">
          <p className="text-sm opacity-80">Чистые активы</p>
          <p className="text-display mt-1">{formatAmount(data.netWorth)}</p>
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {data.monthDelta >= 0
              ? <TrendingUp className="h-4 w-4 opacity-90" />
              : <TrendingDown className="h-4 w-4 opacity-90" />
            }
            <span className="text-sm font-medium opacity-90">
              За этот месяц {data.monthDelta > 0 ? "+" : ""}{formatAmount(data.monthDelta)}
            </span>
          </div>

          {/* Assets vs Debts bar */}
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-xs opacity-75">
              <span>Активы: {formatAmount(data.totalAssets)}</span>
              <span>Обязательства: {formatAmount(data.totalDebts)}</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${assetsRatio}%` }}
              />
            </div>
          </div>
        </div>
      </GradientHero>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Assets */}
        <div className="glass-card card-default rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Landmark className="h-4 w-4 text-income" />
            <h2 className="text-base font-semibold">Активы</h2>
          </div>
          <div className="space-y-3">
            {data.assets.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Нет счетов с положительным балансом</p>
            ) : (
              <>
                {data.assets.map((asset: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{asset.name}</p>
                      <p className="text-xs text-muted-foreground">{ACCOUNT_TYPE_LABELS[asset.type] ?? asset.type}</p>
                    </div>
                    <p className="text-sm font-semibold text-income">
                      {formatAmount(asset.balance)}
                    </p>
                  </div>
                ))}
                <div className="border-t pt-3 flex justify-between">
                  <p className="text-sm font-medium">Итого активы</p>
                  <p className="text-sm font-bold text-income">{formatAmount(data.totalAssets)}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Debts */}
        <div className="glass-card card-default rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Banknote className="h-4 w-4 text-expense" />
            <h2 className="text-base font-semibold">Обязательства</h2>
          </div>
          <div className="space-y-3">
            {data.debts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Нет непогашенных долгов</p>
            ) : (
              <>
                {data.debts.map((debt: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <p className="text-sm font-medium">{debt.counterparty}</p>
                    <p className="text-sm font-semibold text-expense">
                      {formatAmount(debt.remaining)}
                    </p>
                  </div>
                ))}
                <div className="border-t pt-3 flex justify-between">
                  <p className="text-sm font-medium">Итого обязательства</p>
                  <p className="text-sm font-bold text-expense">{formatAmount(data.totalDebts)}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
