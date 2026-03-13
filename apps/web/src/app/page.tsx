import Link from 'next/link'
import { ArrowRight, BarChart3, Bot, CreditCard, FileText, Globe, Lock, PieChart, RefreshCw, Shield, Smartphone, Sparkles, TrendingUp, Wallet, Zap } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-xl bg-[#0a0a0f]/80 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500">
            <Wallet className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-lg">DreamWallet</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm text-white/60">
          <a href="#features" className="hover:text-white transition-colors">Возможности</a>
          <a href="#how" className="hover:text-white transition-colors">Как работает</a>
          <a href="#pricing" className="hover:text-white transition-colors">Тарифы</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/sign-in" className="text-sm text-white/60 hover:text-white transition-colors hidden sm:block">Войти</Link>
          <Link href="/sign-up" className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold hover:bg-indigo-400 transition-colors">
            Начать бесплатно
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6 text-center overflow-hidden">
        {/* Glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-40 left-1/4 w-[300px] h-[300px] bg-violet-500/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs text-indigo-300 mb-8">
            <Sparkles className="h-3 w-3" />
            AI-категоризация · PWA · Telegram алёрты
          </div>

          <h1 className="text-5xl md:text-7xl font-black leading-tight tracking-tight mb-6">
            Финансы под{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              полным контролем
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            Умный кошелёк, который сам категоризирует расходы, строит прогнозы и присылает алёрты в Telegram. Всё в одном месте.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sign-up" className="flex items-center gap-2 rounded-2xl bg-indigo-500 px-8 py-4 text-base font-bold hover:bg-indigo-400 transition-all hover:scale-[1.02] active:scale-[0.98]">
              Попробовать бесплатно
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/sign-in" className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold hover:bg-white/10 transition-all">
              Войти в аккаунт
            </Link>
          </div>

          <p className="text-xs text-white/30 mt-6">Бесплатно · Без карты · Работает как PWA</p>
        </div>

        {/* Dashboard preview */}
        <div className="relative mt-20 max-w-5xl mx-auto">
          <div className="relative rounded-3xl border border-white/10 bg-[#111118] overflow-hidden shadow-2xl shadow-indigo-500/10">
            {/* Fake browser bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-[#0d0d14]">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500/60" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                <div className="h-3 w-3 rounded-full bg-green-500/60" />
              </div>
              <div className="flex-1 mx-4 h-6 rounded-md bg-white/5 flex items-center justify-center">
                <span className="text-xs text-white/20">dreamwallet.brewos.ru/dashboard</span>
              </div>
            </div>
            {/* Mock dashboard */}
            <div className="p-6 grid grid-cols-3 gap-4">
              {/* Balance card */}
              <div className="col-span-2 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 p-5">
                <p className="text-xs text-indigo-200 mb-1">Общий баланс</p>
                <p className="text-3xl font-black">₽ 284 500</p>
                <div className="flex gap-4 mt-3">
                  <div>
                    <p className="text-xs text-indigo-200">Доходы</p>
                    <p className="text-sm font-bold text-green-300">+₽ 95 000</p>
                  </div>
                  <div>
                    <p className="text-xs text-indigo-200">Расходы</p>
                    <p className="text-sm font-bold text-red-300">-₽ 42 300</p>
                  </div>
                </div>
              </div>
              {/* Score */}
              <div className="rounded-2xl bg-white/5 p-5 flex flex-col items-center justify-center">
                <p className="text-xs text-white/40 mb-2">Финансовый счёт</p>
                <p className="text-4xl font-black text-indigo-400">87</p>
                <p className="text-xs text-green-400 mt-1">↑ Отлично</p>
              </div>
              {/* Chart */}
              <div className="col-span-3 rounded-2xl bg-white/5 p-4">
                <p className="text-xs text-white/40 mb-3">Денежный поток</p>
                <div className="flex items-end gap-2 h-16">
                  {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 100].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col gap-1 items-center">
                      <div className="w-full rounded-sm bg-indigo-500/60" style={{ height: `${h * 0.6}px` }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Glow under */}
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-20 bg-indigo-500/20 blur-2xl rounded-full" />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black mb-4">Всё что нужно для финансового контроля</h2>
          <p className="text-white/40 text-lg max-w-2xl mx-auto">Никаких лишних функций — только то, что реально помогает управлять деньгами</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Bot,        iconBg: 'bg-indigo-500/15', iconColor: 'text-indigo-400', title: 'AI-категоризация', desc: 'Автоматически распределяет транзакции по категориям. Импортировал выписку — готово за секунды.' },
            { icon: TrendingUp, iconBg: 'bg-violet-500/15', iconColor: 'text-violet-400', title: 'Прогнозирование', desc: 'Анализирует паттерны трат и предсказывает расходы на следующий месяц.' },
            { icon: BarChart3,  iconBg: 'bg-blue-500/15',   iconColor: 'text-blue-400',   title: 'PDF Отчёты',       desc: 'Красивые отчёты по месяцам, категориям и денежным потокам. Скачать одним кликом.' },
            { icon: Zap,        iconBg: 'bg-amber-500/15',  iconColor: 'text-amber-400',  title: 'Telegram алёрты', desc: 'Уведомления о превышении бюджета, крупных транзакциях и автоплатежах.' },
            { icon: RefreshCw,  iconBg: 'bg-green-500/15',  iconColor: 'text-green-400',  title: 'Автоплатежи',     desc: 'Настройте повторяющиеся транзакции — аренда, подписки, кредиты. Система создаст их сама.' },
            { icon: PieChart,   iconBg: 'bg-rose-500/15',   iconColor: 'text-rose-400',   title: 'Бюджеты',         desc: 'Установите лимиты по категориям и получайте алёрты при приближении к порогу.' },
            { icon: FileText,   iconBg: 'bg-teal-500/15',   iconColor: 'text-teal-400',   title: 'Импорт CSV',      desc: 'Поддержка выписок Сбербанка, Альфа-Банка, Тинькофф и других. Умная маппинг колонок.' },
            { icon: Smartphone, iconBg: 'bg-purple-500/15', iconColor: 'text-purple-400', title: 'PWA приложение',  desc: 'Установи на телефон как обычное приложение. Работает оффлайн, нет App Store.' },
            { icon: Shield,     iconBg: 'bg-slate-500/15',  iconColor: 'text-slate-400',  title: 'Ваши данные',     desc: 'Данные хранятся на собственном сервере. Никакой передачи третьим лицам.' },
          ].map(({ icon: Icon, iconBg, iconColor, title, desc }) => (
            <div key={title} className="group rounded-2xl border border-white/5 bg-white/[0.03] p-6 hover:border-white/10 hover:bg-white/[0.06] transition-all">
              <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
                <Icon className={`h-5 w-5 ${iconColor}`} />
              </div>
              <h3 className="font-bold mb-2">{title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 px-6 bg-gradient-to-b from-transparent via-indigo-950/20 to-transparent">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black mb-4">Три шага до финансового порядка</h2>
        </div>
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            { step: '01', title: 'Зарегистрируйся', desc: 'Создай аккаунт за 30 секунд. Добавь счёт — наличные, карту или криптокошелёк.', icon: CreditCard },
            { step: '02', title: 'Импортируй данные', desc: 'Загрузи CSV-выписку из банка. AI автоматически разберёт и категоризирует транзакции.', icon: FileText },
            { step: '03', title: 'Анализируй и планируй', desc: 'Смотри аналитику, ставь бюджеты, получай прогнозы и управляй деньгами осознанно.', icon: BarChart3 },
          ].map(({ step, title, desc, icon: Icon }) => (
            <div key={step} className="text-center">
              <div className="relative inline-flex items-center justify-center mb-6">
                <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <Icon className="h-7 w-7 text-indigo-400" />
                </div>
                <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-black">
                  {step.slice(1)}
                </div>
              </div>
              <h3 className="text-lg font-bold mb-2">{title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black mb-4">Честные тарифы</h2>
          <p className="text-white/40">Начни бесплатно, расширь когда нужно</p>
        </div>
        <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-6">
          {/* Free */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
            <p className="text-sm text-white/40 font-medium mb-2">Базовый</p>
            <p className="text-4xl font-black mb-1">Бесплатно</p>
            <p className="text-sm text-white/30 mb-8">Навсегда</p>
            <ul className="space-y-3 mb-8">
              {['До 3 счетов', 'До 500 транзакций/мес', 'Базовая аналитика', 'Импорт CSV', 'PWA приложение'].map(f => (
                <li key={f} className="flex items-center gap-3 text-sm text-white/60">
                  <div className="h-4 w-4 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/sign-up" className="block text-center rounded-xl border border-white/10 py-3 text-sm font-semibold hover:bg-white/5 transition-colors">
              Начать бесплатно
            </Link>
          </div>

          {/* Pro */}
          <div className="relative rounded-3xl border border-indigo-500/50 bg-gradient-to-b from-indigo-500/10 to-transparent p-8">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="rounded-full bg-indigo-500 px-3 py-1 text-xs font-bold">PRO</span>
            </div>
            <p className="text-sm text-indigo-300 font-medium mb-2">Про</p>
            <p className="text-4xl font-black mb-1">₽ 299<span className="text-lg text-white/40 font-normal">/мес</span></p>
            <p className="text-sm text-white/30 mb-8">Или ₽ 2490/год (скидка 30%)</p>
            <ul className="space-y-3 mb-8">
              {['Неограниченные счета', 'Неограниченные транзакции', 'AI-категоризация', 'PDF отчёты', 'Telegram алёрты', 'Прогнозирование', 'Автоплатежи', 'Приоритетная поддержка'].map(f => (
                <li key={f} className="flex items-center gap-3 text-sm text-white/80">
                  <div className="h-4 w-4 rounded-full bg-indigo-500/30 flex items-center justify-center shrink-0">
                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/sign-up" className="block text-center rounded-xl bg-indigo-500 py-3 text-sm font-bold hover:bg-indigo-400 transition-colors">
              Попробовать 14 дней бесплатно
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-black mb-4">Возьми финансы под контроль сегодня</h2>
          <p className="text-white/40 mb-10">Присоединяйся к тем, кто уже управляет своими деньгами осознанно</p>
          <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-2xl bg-indigo-500 px-10 py-4 text-base font-bold hover:bg-indigo-400 transition-all hover:scale-[1.02]">
            Начать бесплатно
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500">
              <Wallet className="h-3 w-3 text-white" />
            </div>
            <span className="font-bold text-sm">DreamWallet</span>
          </div>
          <p className="text-xs text-white/20">© 2026 DreamWallet. Сделано с ❤️ для разумных финансов</p>
          <div className="flex gap-4 text-xs text-white/30">
            <Link href="/sign-in" className="hover:text-white transition-colors">Войти</Link>
            <Link href="/sign-up" className="hover:text-white transition-colors">Регистрация</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
