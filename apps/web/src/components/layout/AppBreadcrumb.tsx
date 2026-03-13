'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Fragment } from 'react'
import { ChevronRight } from 'lucide-react'

const ROUTE_NAMES: Record<string, string> = {
  dashboard:                 'Обзор',
  transactions:              'Транзакции',
  accounts:                  'Счета',
  analytics:                 'Аналитика',
  budgets:                   'Бюджеты',
  goals:                     'Цели',
  recurring:                 'Регулярные',
  debts:                     'Долги',
  'subscriptions-tracker':   'Подписки',
  'auto-rules':              'Авто-правила',
  forecast:                  'Прогноз',
  'net-worth':               'Активы',
  crypto:                    'Крипто',
  'ai-chat':                 'AI Советник',
  import:                    'Импорт',
  categories:                'Категории',
  tags:                      'Теги',
  projects:                  'Проекты',
  settings:                  'Настройки',
  'csv-templates':           'CSV шаблоны',
  pricing:                   'Тарифы',
}

export function AppBreadcrumb() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  // Показываем только если глубина > 1 (не на /dashboard)
  if (segments.length <= 1) return null

  const items = segments.map((seg, i) => ({
    label: ROUTE_NAMES[seg] ?? seg,
    href: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }))

  return (
    <nav className="hidden md:flex items-center gap-1 text-sm" aria-label="Хлебные крошки">
      {items.map((item, i) => (
        <Fragment key={item.href}>
          {i > 0 && (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
          )}
          {item.isLast ? (
            <span className="font-medium text-foreground truncate max-w-[160px]">{item.label}</span>
          ) : (
            <Link
              href={item.href}
              className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[120px]"
            >
              {item.label}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  )
}
