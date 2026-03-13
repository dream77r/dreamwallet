export interface RunwayResult {
  currentBalance: number
  dailyBurnRate: number
  daysUntilZero: number | null
  projectedZeroDate: string | null
  trend: 'safe' | 'warning' | 'danger'
}

export function calculateRunway(
  currentBalance: number,
  expenses30d: number,
  income30d: number,
): RunwayResult {
  const dailyBurnRate = (expenses30d - income30d) / 30

  if (dailyBurnRate <= 0) {
    return {
      currentBalance,
      dailyBurnRate,
      daysUntilZero: null,
      projectedZeroDate: null,
      trend: 'safe',
    }
  }

  if (currentBalance <= 0) {
    return {
      currentBalance,
      dailyBurnRate,
      daysUntilZero: 0,
      projectedZeroDate: new Date().toISOString().split('T')[0]!,
      trend: 'danger',
    }
  }

  const daysUntilZero = Math.ceil(currentBalance / dailyBurnRate)
  const projectedZeroDate = new Date(Date.now() + daysUntilZero * 86400000)
    .toISOString()
    .split('T')[0]!

  let trend: RunwayResult['trend']
  if (daysUntilZero > 180) {
    trend = 'safe'
  } else if (daysUntilZero >= 60) {
    trend = 'warning'
  } else {
    trend = 'danger'
  }

  return {
    currentBalance,
    dailyBurnRate,
    daysUntilZero,
    projectedZeroDate,
    trend,
  }
}
