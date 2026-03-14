'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession } from '@/lib/auth-client'
import { Input } from '@/components/ui/input'
import {
  ChevronRight, User, Repeat2, HandCoins, CalendarClock, PercentCircle,
  Target, Flag, Zap, PieChart, TrendingUp, Activity, GitBranch,
  BrainCircuit, Upload, Tag, Hash, Trophy, Users, Banknote,
  FolderKanban, Settings, Sparkles, CreditCard, Receipt, Search,
  Landmark, LineChart, Bitcoin, Link2, BarChart3, FileText, Scissors,
  ArrowLeftRight,
} from 'lucide-react'

type ProfileItem = { title: string; desc: string; href: string; icon: React.ElementType; color: string }
type ProfileSection = { label: string; items: ProfileItem[] }

const sections: ProfileSection[] = [
  {
    label: 'Учёт',
    items: [
      { title: 'Счета', desc: 'Банковские и наличные', href: '/dashboard/accounts', icon: CreditCard, color: '#764ba2' },
      { title: 'Транзакции', desc: 'Все операции', href: '/dashboard/transactions', icon: ArrowLeftRight, color: '#34C759' },
      { title: 'Регулярные', desc: 'Повторяющиеся платежи', href: '/dashboard/recurring', icon: Repeat2, color: '#FF9500' },
      { title: 'Долги', desc: 'Кто кому должен', href: '/dashboard/debts', icon: HandCoins, color: '#FF3B30' },
      { title: 'Подписки', desc: 'Отслеживание подписок', href: '/dashboard/subscriptions-tracker', icon: CalendarClock, color: '#FF2D55' },
      { title: 'Кэшбэк', desc: 'Начисления и правила', href: '/dashboard/cashback', icon: PercentCircle, color: '#30D158' },
      { title: 'Деление', desc: 'Разделение расходов', href: '/dashboard/splits', icon: Scissors, color: '#FF6B35' },
    ],
  },
  {
    label: 'Планирование',
    items: [
      { title: 'Бюджеты', desc: 'Лимиты по категориям', href: '/dashboard/budgets', icon: Target, color: '#FF9500' },
      { title: 'Цели', desc: 'Накопления на мечту', href: '/dashboard/goals', icon: Flag, color: '#764ba2' },
      { title: 'Авто-правила', desc: 'Автоматизация', href: '/dashboard/auto-rules', icon: Zap, color: '#34C759' },
    ],
  },
  {
    label: 'Аналитика',
    items: [
      { title: 'Аналитика', desc: 'Графики и тренды', href: '/dashboard/analytics', icon: PieChart, color: '#667eea' },
      { title: 'Прогноз', desc: 'Финансовый прогноз', href: '/dashboard/forecast', icon: TrendingUp, color: '#5AC8FA' },
      { title: 'Привычки', desc: 'Анализ привычек', href: '/dashboard/habits', icon: Activity, color: '#FF2D55' },
      { title: 'Что если', desc: 'Сценарии', href: '/dashboard/whatif', icon: GitBranch, color: '#AF52DE' },
      { title: 'Активы', desc: 'Чистая стоимость', href: '/dashboard/net-worth', icon: Landmark, color: '#30D158' },
      { title: 'Инвестиции', desc: 'Портфель', href: '/dashboard/investments', icon: LineChart, color: '#667eea' },
      { title: 'Крипто', desc: 'Криптовалюты', href: '/dashboard/crypto', icon: Bitcoin, color: '#FF9F0A' },
      { title: 'Отчёты', desc: 'Финансовые отчёты', href: '/dashboard/reports', icon: FileText, color: '#30D158' },
      { title: 'Санкей', desc: 'Потоки денег', href: '/dashboard/reports/sankey', icon: BarChart3, color: '#764ba2' },
      { title: 'Налоги', desc: 'Налоговый учёт', href: '/dashboard/reports/tax', icon: Receipt, color: '#64748B' },
      { title: 'Итоги', desc: 'Финансовые итоги', href: '/dashboard/wrapped', icon: Sparkles, color: '#AF52DE' },
    ],
  },
  {
    label: 'Инструменты',
    items: [
      { title: 'AI Советник', desc: 'Умные рекомендации', href: '/dashboard/ai-chat', icon: BrainCircuit, color: '#764ba2' },
      { title: 'Импорт', desc: 'Загрузка выписок', href: '/dashboard/import', icon: Upload, color: '#636366' },
      { title: 'Категории', desc: 'Управление категориями', href: '/dashboard/categories', icon: Tag, color: '#FF6B35' },
      { title: 'Теги', desc: 'Метки транзакций', href: '/dashboard/tags', icon: Hash, color: '#32ADE6' },
      { title: 'Достижения', desc: 'Геймификация', href: '/dashboard/achievements', icon: Trophy, color: '#FFD60A' },
      { title: 'Семья', desc: 'Совместный доступ', href: '/dashboard/family', icon: Users, color: '#FF2D55' },
      { title: 'Банки', desc: 'Подключение банков', href: '/dashboard/bank-connections', icon: Banknote, color: '#34C759' },
      { title: 'Интеграции', desc: 'Внешние сервисы', href: '/dashboard/integrations', icon: Link2, color: '#764ba2' },
    ],
  },
  {
    label: 'Настройки',
    items: [
      { title: 'Настройки', desc: 'Профиль и предпочтения', href: '/dashboard/settings', icon: Settings, color: '#636366' },
      { title: 'Тарифы', desc: 'Подписка и оплата', href: '/dashboard/pricing', icon: Sparkles, color: '#AF52DE' },
    ],
  },
]

export default function ProfilePage() {
  const { data: session } = useSession()
  const user = session?.user
  const [search, setSearch] = useState('')

  const filteredSections = search.trim()
    ? sections
        .map((section) => ({
          ...section,
          items: section.items.filter(
            (item) =>
              item.title.toLowerCase().includes(search.toLowerCase()) ||
              item.desc.toLowerCase().includes(search.toLowerCase()),
          ),
        }))
        .filter((section) => section.items.length > 0)
    : sections

  return (
    <div className="space-y-4 animate-fade-up max-w-lg mx-auto">
      {/* User card */}
      <div className="glass-card card-default rounded-3xl p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full gradient-hero">
            <User className="h-7 w-7 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold truncate">{user?.name ?? 'Пользователь'}</p>
            <p className="text-sm text-muted-foreground truncate">{user?.email ?? ''}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по разделам..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Sections */}
      {filteredSections.map((section) => (
        <div key={section.label}>
          <p className="text-caption text-muted-foreground px-4 mb-1.5">{section.label}</p>
          <div className="glass-card card-default rounded-2xl overflow-hidden divide-y divide-border">
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 active:scale-[0.98] transition-transform"
              >
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] text-white"
                  style={{ backgroundColor: item.color }}
                >
                  <item.icon className="h-4 w-4" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{item.title}</span>
                  <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
