'use client'

import Link from 'next/link'
import { useSession } from '@/lib/auth-client'
import {
  ChevronRight, User, Repeat2, HandCoins, CalendarClock, PercentCircle,
  Target, Flag, Zap, PieChart, TrendingUp, Activity, GitBranch,
  BrainCircuit, Upload, Tag, Hash, Trophy, Users, Banknote,
  FolderKanban, Settings, Sparkles, CreditCard, Receipt,
  Landmark, LineChart, Bitcoin, Link2, BarChart3, FileText, Scissors,
} from 'lucide-react'

type ProfileItem = { title: string; href: string; icon: React.ElementType; color: string }
type ProfileSection = { label: string; items: ProfileItem[] }

const sections: ProfileSection[] = [
  {
    label: 'Учёт',
    items: [
      { title: 'Счета', href: '/dashboard/accounts', icon: CreditCard, color: '#764ba2' },
      { title: 'Регулярные', href: '/dashboard/recurring', icon: Repeat2, color: '#FF9500' },
      { title: 'Долги', href: '/dashboard/debts', icon: HandCoins, color: '#FF3B30' },
      { title: 'Подписки', href: '/dashboard/subscriptions-tracker', icon: CalendarClock, color: '#FF2D55' },
      { title: 'Кэшбэк', href: '/dashboard/cashback', icon: PercentCircle, color: '#30D158' },
      { title: 'Деление', href: '/dashboard/splits', icon: Scissors, color: '#FF6B35' },
    ],
  },
  {
    label: 'Планирование',
    items: [
      { title: 'Бюджеты', href: '/dashboard/budgets', icon: Target, color: '#FF9500' },
      { title: 'Цели', href: '/dashboard/goals', icon: Flag, color: '#764ba2' },
      { title: 'Авто-правила', href: '/dashboard/auto-rules', icon: Zap, color: '#34C759' },
    ],
  },
  {
    label: 'Анализ',
    items: [
      { title: 'Аналитика', href: '/dashboard/analytics', icon: PieChart, color: '#667eea' },
      { title: 'Прогноз', href: '/dashboard/forecast', icon: TrendingUp, color: '#5AC8FA' },
      { title: 'Привычки', href: '/dashboard/habits', icon: Activity, color: '#FF2D55' },
      { title: 'Что если', href: '/dashboard/whatif', icon: GitBranch, color: '#AF52DE' },
      { title: 'Активы', href: '/dashboard/net-worth', icon: Landmark, color: '#30D158' },
      { title: 'Инвестиции', href: '/dashboard/investments', icon: LineChart, color: '#667eea' },
      { title: 'Крипто', href: '/dashboard/crypto', icon: Bitcoin, color: '#FF9F0A' },
      { title: 'Отчёты', href: '/dashboard/reports', icon: FileText, color: '#30D158' },
      { title: 'Санкей', href: '/dashboard/reports/sankey', icon: BarChart3, color: '#764ba2' },
      { title: 'Налоги', href: '/dashboard/reports/tax', icon: Receipt, color: '#64748B' },
      { title: 'Итоги', href: '/dashboard/wrapped', icon: Sparkles, color: '#AF52DE' },
    ],
  },
  {
    label: 'Инструменты',
    items: [
      { title: 'AI Советник', href: '/dashboard/ai-chat', icon: BrainCircuit, color: '#764ba2' },
      { title: 'Импорт', href: '/dashboard/import', icon: Upload, color: '#636366' },
      { title: 'Категории', href: '/dashboard/categories', icon: Tag, color: '#FF6B35' },
      { title: 'Теги', href: '/dashboard/tags', icon: Hash, color: '#32ADE6' },
      { title: 'Достижения', href: '/dashboard/achievements', icon: Trophy, color: '#FFD60A' },
    ],
  },
  {
    label: 'Совместно',
    items: [
      { title: 'Семья', href: '/dashboard/family', icon: Users, color: '#FF2D55' },
      { title: 'Банки', href: '/dashboard/bank-connections', icon: Banknote, color: '#34C759' },
      { title: 'Интеграции', href: '/dashboard/integrations', icon: Link2, color: '#764ba2' },
    ],
  },
  {
    label: 'Бизнес',
    items: [
      { title: 'Проекты', href: '/dashboard/projects', icon: FolderKanban, color: '#667eea' },
    ],
  },
  {
    label: 'Настройки',
    items: [
      { title: 'Настройки', href: '/dashboard/settings', icon: Settings, color: '#636366' },
      { title: 'Тарифы', href: '/dashboard/pricing', icon: Sparkles, color: '#AF52DE' },
    ],
  },
]

export default function ProfilePage() {
  const { data: session } = useSession()
  const user = session?.user

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

      {/* Sections */}
      {sections.map((section) => (
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
                <span className="text-sm font-medium flex-1">{item.title}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
