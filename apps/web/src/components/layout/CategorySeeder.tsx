'use client'

import { useEffect } from 'react'
import { trpc } from '@/lib/trpc/client'

// Тихо добавляет недостающие дефолтные категории для существующих пользователей
export function CategorySeeder() {
  const seedMissing = trpc.category.seedMissing.useMutation()

  useEffect(() => {
    seedMissing.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
