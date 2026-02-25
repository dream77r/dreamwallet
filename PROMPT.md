# DreamWallet — Промпт для разработки

## Описание продукта

DreamWallet — SaaS-платформа для управления личными финансами и финансами бизнес-проектов. Сервис позволяет вести учёт доходов и расходов, подключать банковские счета, загружать выписки, создавать отдельные проекты для бизнесов и анализировать финансовые данные в едином интерфейсе.

**Целевая аудитория:** предприниматели с несколькими бизнесами, фрилансеры, инвесторы — те, кому нужно видеть полную картину: личные деньги + деньги каждого проекта в одном месте.

**Ключевое отличие от конкурентов (YNAB, CoinKeeper, Дзен-Мани):** DreamWallet объединяет личный кошелёк и бизнес-проекты. Не нужно держать отдельно банковское приложение, Excel для бизнеса и ещё одно приложение для личных расходов. Всё в одном дашборде.

---

## Стек технологий

| Компонент | Технология | Обоснование |
|-----------|-----------|-------------|
| **Фреймворк** | Next.js 15+ (App Router) | Fullstack: SSR + Server Actions + API Routes. Один деплой |
| **API** | tRPC v11 | End-to-end type safety без кодогенерации. Идеально для CRUD-heavy финансов |
| **ORM** | Prisma 6 | Type-safe, миграции, отличная DX |
| **БД** | PostgreSQL 16 | Надёжность, JSONB для метаданных, оконные функции для аналитики |
| **Кэш/очереди** | Redis 7 + BullMQ | Фоновые задачи: банковский sync, CSV-импорт, уведомления |
| **Auth** | Better Auth | Self-hosted, OAuth2, magic links, 2FA. Без vendor lock-in |
| **Платежи** | Stripe (или ЮKassa для РФ) | Подписки, recurring billing, webhook-и |
| **UI** | shadcn/ui + Tailwind CSS 4 | Минималистичный дизайн, полная кастомизация, accessibility |
| **Графики** | Recharts (или Tremor) | Линейные, bar, pie — всё что нужно для финансовой аналитики |
| **Валидация** | Zod | Shared-схемы между клиентом и сервером через tRPC |
| **Деплой** | Railway (или Vercel + Supabase) | Auto-deploy from GitHub, managed PostgreSQL + Redis |
| **Монорепо** | pnpm + Turborepo | Разделение пакетов: web, worker, db, shared |
| **PWA** | next-pwa / Serwist | Installable, offline read, push-уведомления |

### Структура монорепо

```
dreamwallet/
├── apps/
│   ├── web/                  # Next.js 15 — UI + API (tRPC)
│   └── worker/               # BullMQ worker — фоновые задачи
├── packages/
│   ├── db/                   # Prisma schema + client + migrations
│   ├── shared/               # Типы, Zod-схемы, утилиты, константы
│   └── bank-integrations/    # Адаптеры банковских API (Tochka, etc.)
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## Архитектура данных

### Ключевые сущности

```
User (пользователь)
├── personalWallet: Wallet         # Личный кошелёк (создаётся автоматически)
├── projects: Project[]            # Бизнес-проекты
├── subscription: Subscription     # Тарифный план
└── settings: UserSettings         # Валюта, таймзона, уведомления

Wallet (кошелёк — личный или проектный)
├── accounts: Account[]            # Счета (банковский, наличные, крипто...)
├── categories: Category[]         # Категории расходов/доходов
├── budgets: Budget[]              # Бюджеты по категориям
└── currency: Currency             # Основная валюта

Account (счёт)
├── type: bank | cash | crypto | investment | custom
├── provider: BankConnection?      # Привязка к банку (если есть)
├── balance: Decimal               # Текущий баланс
├── transactions: Transaction[]    # Операции
└── currency: Currency

Transaction (операция)
├── type: income | expense | transfer
├── amount: Decimal
├── category: Category?
├── account: Account
├── counterparty: string?          # Контрагент
├── description: string?
├── date: DateTime
├── tags: Tag[]
├── attachments: Attachment[]      # Чеки, фото, документы
├── isRecurring: boolean           # Регулярный платёж
└── source: manual | csv_import | bank_sync | api

Project (бизнес-проект)
├── name: string
├── wallet: Wallet                 # Кошелёк проекта
├── members: ProjectMember[]       # Участники (owner, viewer, editor)
├── reports: Report[]              # Сохранённые отчёты
└── settings: ProjectSettings

BankConnection (подключение к банку)
├── provider: tochka | sber | tbank | custom
├── credentials: encrypted         # OAuth tokens, зашифрованные
├── accounts: Account[]            # Привязанные счета
├── lastSyncAt: DateTime
├── syncSchedule: cron?            # Расписание автосинка
└── status: active | expired | error

Category (категория)
├── name: string
├── type: income | expense
├── icon: string
├── color: string
├── parent: Category?              # Иерархия (Еда → Рестораны)
├── isDefault: boolean             # Системная категория
└── rules: AutoCategoryRule[]      # Правила автокатегоризации

Budget (бюджет)
├── category: Category
├── amount: Decimal
├── period: monthly | weekly | yearly
├── alertThreshold: number         # % при котором уведомлять (80%, 100%)
└── spent: Decimal                 # Computed: сумма транзакций за период
```

### Multi-tenancy

- **Изоляция на уровне строк (RLS-like):** каждая запись содержит `userId` / `projectId`. Все запросы фильтруются через middleware
- **Проекты с участниками:** владелец может пригласить других пользователей с ролями (viewer, editor, admin)
- **Данные шифруются:** банковские credentials — AES-256, хранятся в отдельной таблице

---

## Функциональные модули

### 1. Личный кошелёк (Personal Wallet)

**Основной экран** — обзор всех личных счетов:
- Общий баланс (сумма всех счетов в основной валюте)
- Список счетов: банковские карты, наличные, накопительные, инвестиции
- Быстрое добавление расхода/дохода (FAB-кнопка)
- Лента последних транзакций

**Вкладки:**
- **Обзор** — баланс, графики, бюджеты
- **Транзакции** — полный список с фильтрами (дата, категория, счёт, сумма, тег)
- **Бюджеты** — месячные лимиты по категориям, прогресс-бары
- **Аналитика** — расходы по категориям (pie chart), тренды (line chart), сравнение месяцев
- **Счета** — управление счетами, подключение банков

### 2. Бизнес-проекты (Projects)

**Список проектов** — карточки с ключевыми метриками:
- Выручка / Расходы / Прибыль за текущий месяц
- Баланс на счетах проекта
- Статус (активный, архив)

**Внутри проекта:**
- **Дашборд** — P&L за период, cash flow, ключевые метрики
- **Доходы** — выручка, инвестиции, займы (с источниками)
- **Расходы** — зарплаты, аренда, налоги, расходники (с категориями)
- **Транзакции** — общая лента (доходы + расходы)
- **Отчёты** — P&L, cash flow statement, баланс за период
- **Счета** — банковские счета проекта
- **Участники** — приглашение партнёров/бухгалтеров

### 3. Импорт данных

**Ручной ввод:**
- Форма добавления транзакции (сумма, дата, категория, описание, теги)
- Quick-add: сумма + описание → AI подскажет категорию

**CSV / Excel импорт:**
- Загрузка файла → предпросмотр данных
- Маппинг колонок (дата, сумма, описание, категория)
- Шаблоны маппинга (сохранить для повторного использования)
- Поддержка: Тинькофф, Сбер, Альфа, Тochка, произвольный CSV

**Банковские интеграции:**
- Подключение через OAuth2 (Tochka Bank — первая интеграция)
- Автоматическая синхронизация (расписание: каждые 4/12/24 часа)
- Ручная синхронизация по кнопке
- Дедупликация транзакций (по reference / date+amount+description)
- Автокатегоризация на основе правил и ML

### 4. Аналитика и отчёты

**Глобальный дашборд (Homepage):**
- Net Worth: сумма всех балансов (личные + проекты)
- Доход / Расход за месяц (личные + бизнес — раздельно)
- Топ-5 расходных категорий
- Cash flow за 12 месяцев (bar chart)
- Бюджеты: прогресс по категориям
- Уведомления: превышения бюджетов, крупные транзакции

**Аналитика по кошельку/проекту:**
- P&L (доходы - расходы) по периодам
- Расходы по категориям (treemap / pie)
- Тренд: расходы month-over-month
- Cash flow forecast (на основе recurring транзакций)
- Сравнение: этот месяц vs предыдущий, этот год vs прошлый

**Кастомные отчёты:**
- Выбор метрик, фильтров, группировок
- Экспорт: PDF, Excel, CSV
- Сохранение отчётов как шаблонов

### 5. Автокатегоризация (AI)

- **Rule-based:** если описание содержит "Яндекс.Еда" → категория "Еда → Доставка"
- **ML-based (будущее):** на основе истории пользователя, подсказки категорий
- **Пользовательские правила:** регулярные выражения, ключевые слова → категория
- **Обучение:** пользователь поправляет категорию → система запоминает

### 6. Уведомления

- **Email:** еженедельный отчёт, превышение бюджета
- **Push (PWA):** крупные транзакции, приближение к лимиту бюджета
- **Telegram-бот (будущее):** отчёты, quick-add транзакций через бота

---

## Тарифные планы (Freemium)

| Фича | Free | Pro ($9/мес) | Business ($29/мес) |
|------|------|-------------|-------------------|
| Личный кошелёк | ✅ | ✅ | ✅ |
| Ручной ввод | ✅ | ✅ | ✅ |
| Бизнес-проекты | 1 | Unlimited | Unlimited |
| Счета | 3 | 20 | Unlimited |
| CSV-импорт | ✅ | ✅ | ✅ |
| Банковские интеграции | ❌ | 2 банка | Unlimited |
| Автокатегоризация AI | ❌ | ✅ | ✅ |
| Участники в проекте | ❌ | 3 | Unlimited |
| Кастомные отчёты | ❌ | ✅ | ✅ |
| API доступ | ❌ | ❌ | ✅ |
| Экспорт (PDF/Excel) | ❌ | ✅ | ✅ |
| Приоритетная поддержка | ❌ | ❌ | ✅ |
| История транзакций | 6 мес | 3 года | Unlimited |

---

## Дизайн и UX

**Стиль:** минималистичный дашборд в духе Linear / Notion / Vercel. Чистый, строгий, информативный.

**Цветовая палитра:**
- Фон: `#FAFAFA` (light), `#09090B` (dark)
- Primary: `#18181B` (нейтральный, акценты цветом через графики)
- Income: `#22C55E` (зелёный)
- Expense: `#EF4444` (красный)
- Accent: `#6366F1` (индиго — кнопки, ссылки)

**Компоненты (shadcn/ui):**
- Sidebar navigation (как Linear)
- Command palette (⌘K) для быстрого поиска / навигации
- Data tables с сортировкой, фильтрами, пагинацией
- Sheet (slide panel) для деталей транзакции
- Charts: Recharts с кастомными тултипами

**PWA:**
- Installable на мобильных устройствах
- Offline: кэш последних данных (read-only)
- Push-уведомления для бюджетов и крупных операций
- Адаптивный дизайн: таблицы → карточки на мобилке

---

## API-дизайн (tRPC)

```
trpc/
├── auth/
│   ├── register
│   ├── login
│   └── me
├── wallet/
│   ├── get
│   ├── getAccounts
│   └── getStats
├── account/
│   ├── create
│   ├── update
│   ├── delete
│   └── getBalance
├── transaction/
│   ├── list (filterable, paginated)
│   ├── create
│   ├── update
│   ├── delete
│   ├── bulkCreate (CSV import)
│   └── categorize (AI)
├── project/
│   ├── list
│   ├── create
│   ├── update
│   ├── delete
│   ├── getDashboard
│   ├── invite
│   └── removeMember
├── category/
│   ├── list
│   ├── create
│   ├── update
│   └── reorder
├── budget/
│   ├── list
│   ├── create
│   ├── update
│   └── getProgress
├── bank/
│   ├── connect (OAuth flow)
│   ├── disconnect
│   ├── sync (manual trigger)
│   ├── getConnections
│   └── getSyncHistory
├── report/
│   ├── pnl
│   ├── cashFlow
│   ├── categoryBreakdown
│   ├── export (PDF/Excel)
│   └── saved (CRUD)
├── import/
│   ├── uploadCSV
│   ├── preview
│   ├── mapColumns
│   └── confirm
├── subscription/
│   ├── getCurrent
│   ├── upgrade
│   ├── cancel
│   └── getBillingHistory
└── settings/
    ├── get
    ├── update
    └── deleteAccount
```

---

## Безопасность

- **Аутентификация:** Better Auth (email/password + OAuth + magic links + 2FA)
- **Авторизация:** RBAC — owner / admin / editor / viewer на уровне проектов
- **Шифрование:** банковские credentials — AES-256-GCM, ключ в ENV (не в БД)
- **Rate limiting:** на auth-эндпоинтах, на API (per-user limits по тарифу)
- **CSRF:** встроено в Next.js
- **CSP headers:** строгий Content-Security-Policy
- **Audit log:** все изменения финансовых данных логируются (кто, когда, что)
- **GDPR:** экспорт данных, удаление аккаунта, consent management

---

## Фоновые задачи (BullMQ Worker)

| Очередь | Описание | Расписание |
|---------|----------|-----------|
| `bank-sync` | Синхронизация банковских выписок | По расписанию пользователя (4/12/24ч) |
| `csv-import` | Парсинг и импорт CSV/Excel | По запросу |
| `categorize` | AI-категоризация новых транзакций | После импорта/синка |
| `reports` | Генерация тяжёлых отчётов (PDF) | По запросу |
| `notifications` | Email-дайджесты, push, alerts | По расписанию + события |
| `cleanup` | Удаление expired sessions, temp files | Ежедневно |

---

## MVP (Phase 1) — Minimum Viable Product

**Цель:** запустить за 2-4 недели рабочий продукт для личного использования + ранних пользователей.

**Scope:**
1. ✅ Регистрация / логин (email + password)
2. ✅ Личный кошелёк с ручным вводом транзакций
3. ✅ Категории расходов/доходов (дефолтный набор + кастомные)
4. ✅ Список транзакций с фильтрами
5. ✅ Дашборд: баланс, расходы/доходы за месяц, pie chart по категориям
6. ✅ Один бизнес-проект (Free tier)
7. ✅ CSV-импорт (базовый: дата, сумма, описание)
8. ✅ PWA (installable)
9. ✅ Адаптивный дизайн (mobile-ready)

**Отложено на Phase 2+:**
- Банковские интеграции (Tochka API)
- AI-категоризация
- Бюджеты и уведомления
- Участники проектов
- Биллинг (Stripe/ЮKassa)
- Отчёты и экспорт
- Telegram-бот

---

## Инструкции для разработки

1. **Начни с инициализации монорепо:** pnpm + Turborepo, настрой workspaces
2. **Prisma-schema first:** опиши все сущности, сгенерируй миграции
3. **Auth:** подключи Better Auth, настрой registration + login pages
4. **CRUD:** транзакции → категории → счета → проекты (в таком порядке)
5. **UI:** sidebar layout → dashboard → transactions list → forms
6. **CSV-импорт:** upload → preview → column mapping → confirm
7. **PWA:** manifest.json, service worker, offline fallback
8. **Deploy:** Railway (PostgreSQL + Redis + Web app)

**Код-стандарты:**
- TypeScript strict mode
- Zod для всех input-валидаций (shared между клиентом и сервером)
- Server Components по умолчанию, Client Components только где нужна интерактивность
- Optimistic updates для UX (transaction create/update/delete)
- Error boundaries на каждом роуте
- Логирование: structured JSON logs (pino)
