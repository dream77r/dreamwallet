'use client'

import { useEffect, useState } from 'react'

interface BudgetProgressRingProps {
  percentage: number
  size?: number
  strokeWidth?: number
  className?: string
}

function getColor(pct: number) {
  if (pct < 60) return '#34C759'
  if (pct < 85) return '#FF9500'
  return '#FF3B30'
}

export function BudgetProgressRing({
  percentage,
  size = 48,
  strokeWidth = 4,
  className,
}: BudgetProgressRingProps) {
  const [animatedPct, setAnimatedPct] = useState(0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (animatedPct / 100) * circumference
  const color = getColor(percentage)

  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      setAnimatedPct(Math.min(percentage, 100))
    })
    return () => cancelAnimationFrame(timer)
  }, [percentage])

  return (
    <svg width={size} height={size} className={className}>
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        className="text-muted"
        strokeWidth={strokeWidth}
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.8s ease-out, stroke 0.3s ease' }}
      />
      {/* Center text */}
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        className="text-[10px] font-bold fill-foreground"
      >
        {Math.round(percentage)}%
      </text>
    </svg>
  )
}
