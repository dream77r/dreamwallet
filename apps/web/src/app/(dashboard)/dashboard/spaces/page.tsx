'use client'

import { FolderOpen } from 'lucide-react'

export default function SpacesPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 animate-fade-up">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl gradient-hero text-white">
        <FolderOpen className="h-8 w-8" />
      </div>
      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold">Пространства</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Совместные бюджеты, семейные счета и бизнес-проекты — всё в одном месте.
          Скоро здесь появятся ваши пространства.
        </p>
      </div>
    </div>
  )
}
