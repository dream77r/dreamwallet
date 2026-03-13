'use client'

import { useState } from 'react'
import { Settings, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { toast } from 'sonner'
import { trpc } from '@/lib/trpc/client'
import type { WidgetConfig } from '@/server/routers/dashboard'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const WIDGET_LABELS: Record<WidgetConfig['id'], string> = {
  balance: 'Общий баланс',
  'recent-transactions': 'Последние транзакции',
  budgets: 'Бюджеты',
  cashflow: 'Денежный поток',
  score: 'Финансовый скоринг',
  forecast: 'Прогноз',
  networth: 'Чистый капитал',
  goals: 'Финансовые цели',
  currency: 'Курсы валют',
}

interface SortableWidgetItemProps {
  widget: WidgetConfig
  onToggle: (id: WidgetConfig['id']) => void
}

function SortableWidgetItem({ widget, onToggle }: SortableWidgetItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: widget.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5"
    >
      <button
        {...listeners}
        {...attributes}
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label="Перетащить"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 text-sm font-medium">{WIDGET_LABELS[widget.id]}</span>
      <Switch
        checked={widget.enabled}
        onCheckedChange={() => onToggle(widget.id)}
        aria-label={`Переключить виджет ${WIDGET_LABELS[widget.id]}`}
      />
    </div>
  )
}

interface DashboardCustomizerProps {
  layout: WidgetConfig[]
  onLayoutChange: (layout: WidgetConfig[]) => void
}

export function DashboardCustomizer({ layout, onLayoutChange }: DashboardCustomizerProps) {
  const [open, setOpen] = useState(false)
  const [localLayout, setLocalLayout] = useState<WidgetConfig[]>(layout)

  // Sync when sheet opens
  const handleOpenChange = (v: boolean) => {
    if (v) setLocalLayout(layout)
    setOpen(v)
  }

  const utils = trpc.useUtils()
  const saveLayout = trpc.dashboard.saveLayout.useMutation({
    onSuccess: () => {
      toast.success('Настройки сохранены')
      onLayoutChange(localLayout)
      void utils.dashboard.getLayout.invalidate()
      setOpen(false)
    },
    onError: () => {
      toast.error('Не удалось сохранить настройки')
    },
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setLocalLayout((items) => {
      const oldIdx = items.findIndex((w) => w.id === active.id)
      const newIdx = items.findIndex((w) => w.id === over.id)
      const reordered = arrayMove(items, oldIdx, newIdx)
      return reordered.map((w, i) => ({ ...w, order: i }))
    })
  }

  const handleToggle = (id: WidgetConfig['id']) => {
    setLocalLayout((items) =>
      items.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w)),
    )
  }

  const handleSave = () => {
    saveLayout.mutate(localLayout)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Настроить</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col gap-4">
        <SheetHeader>
          <SheetTitle>Настройка дашборда</SheetTitle>
        </SheetHeader>
        <p className="text-sm text-muted-foreground">
          Включайте / отключайте виджеты и меняйте их порядок перетаскиванием.
        </p>
        <div className="flex-1 overflow-y-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localLayout.map((w) => w.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {localLayout.map((widget) => (
                  <SortableWidgetItem
                    key={widget.id}
                    widget={widget}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
        <Button onClick={handleSave} disabled={saveLayout.isPending} className="w-full">
          {saveLayout.isPending ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </SheetContent>
    </Sheet>
  )
}

export function DashboardCustomizerSkeleton() {
  return (
    <Button variant="outline" size="sm" disabled className="gap-1.5">
      <Settings className="h-4 w-4" />
      <span className="hidden sm:inline">Настроить</span>
    </Button>
  )
}
