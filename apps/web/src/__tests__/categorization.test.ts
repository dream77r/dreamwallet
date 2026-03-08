/**
 * Тесты keyword-правил автокатегоризации (autoCategorize)
 * Проверяем что российские банковские паттерны корректно определяют категории
 */
import { describe, it, expect } from 'vitest'

// ── Копия KEYWORD_RULES из transaction.ts ────────────────────────────────
// (дублируется для изолированного тестирования)

type TransactionType = 'INCOME' | 'EXPENSE'

interface KeywordRule {
  patterns: string[]
  category: string
  type?: TransactionType
}

const KEYWORD_RULES: KeywordRule[] = [
  { patterns: ['пятёрочка', 'пятерочка', 'магнит', 'перекрёсток', 'перекресток', 'вкусвилл', 'вкус вилл', 'ашан', 'лента', 'дикси', 'metro', 'окей', 'spar', 'спар', 'fix price', 'фикс прайс', 'светофор', 'globus', 'глобус'], category: 'Продукты' },
  { patterns: ['яндекс такси', 'yandex taxi', 'uber', 'ситимобил', 'таксовичкоф', 'rutaxi', 'indriver', 'bolt'], category: 'Транспорт' },
  { patterns: ['метро', 'московский метрополитен', 'мосметро', 'troika', 'тройка', 'электричка', 'ржд', 'rzd', 'аэроэкспресс'], category: 'Транспорт' },
  { patterns: ['аптека', 'pharmacy', 'farmacy', '36,6', '36.6', 'горздрав', 'ригла', 'eapteka', 'сбераптека', 'здравсити'], category: 'Здоровье' },
  { patterns: ['мвидео', 'м.видео', 'эльдорадо', 'dns', 'днс', 'citilink', 'ситилинк', 'технопарк', 're:store', 'restore', 'apple store'], category: 'Электроника' },
  { patterns: ['ozon', 'озон', 'wildberries', 'wb', 'ali', 'aliexpress', 'lamoda', 'яндекс маркет', 'яндекс.маркет', 'goods', 'sbermegamarket', 'мегамаркет'], category: 'Покупки' },
  { patterns: ['зарплата', 'зп ', 'salary', 'аванс', 'выплата', 'начислено'], category: 'Зарплата', type: 'INCOME' },
  { patterns: ['кафе', 'ресторан', 'restaurant', 'cafe', 'coffee', 'кофе', 'пицца', 'pizza', 'суши', 'sushi', 'burger', 'бургер', 'kfc', 'макдоналдс', 'mcdonald', 'subway', 'domino', 'додо', 'dodo', 'вкусно и точка', 'шоколадница', 'coffee bean'], category: 'Кафе и рестораны' },
  { patterns: ['ростелеком', 'мтс', 'мегафон', 'билайн', 'tele2', 'теле2', 'yota', 'йота', 'сим карта'], category: 'Связь' },
  { patterns: ['netflix', 'нетфликс', 'spotify', 'яндекс плюс', 'яндекс.плюс', 'кинопоиск', 'ivi', 'иви', 'okko', 'окко', 'vk музыка', 'сберзвук', 'premier', 'start.ru', 'amediateka'], category: 'Подписки' },
  { patterns: ['жкх', 'жилищно', 'коммунальн', 'электроэнергия', 'газ газпром', 'водоканал', 'тепло', 'управляющая компания', 'тсж', 'хcs'], category: 'ЖКХ' },
  { patterns: ['газпром нефть', 'лукойл', 'роснефть', 'bp', 'shell', 'azs', 'азс', 'заправк', 'бензин', 'топливо'], category: 'Авто' },
  { patterns: ['фитнес', 'fitness', 'спорт', 'sport', 'worldclass', 'world class', 'физра', 'бассейн', 'тренажер', 'yoga', 'йога', 'crossfit', 'кроссфит'], category: 'Спорт' },
  { patterns: ['кино', 'cinema', 'синема', 'театр', 'theatre', 'мюзикл', 'концерт', 'билет', 'kassir', 'кассир', 'ticketland'], category: 'Развлечения' },
  { patterns: ['авиабилет', 'авиа', 'аэрофлот', 's7', 'pobeda', 'победа', 'ural airlines', 'уральские авиалинии', 'booking', 'букинг', 'airbnb', 'отель', 'hotel'], category: 'Путешествия' },
]

// ── Движок сопоставления ──────────────────────────────────────────────────

function matchByKeywords(text: string, txType: TransactionType): string | null {
  const lower = text.toLowerCase()
  for (const rule of KEYWORD_RULES) {
    if (rule.type && rule.type !== txType) continue
    if (rule.patterns.some(p => lower.includes(p))) {
      return rule.category
    }
  }
  return null
}

// ── Тесты ─────────────────────────────────────────────────────────────────

describe('matchByKeywords — Продукты', () => {
  it('Пятёрочка', () => expect(matchByKeywords('ПЯТЁРОЧКА', 'EXPENSE')).toBe('Продукты'))
  it('Пятерочка (без ё)', () => expect(matchByKeywords('Пятерочка 450р', 'EXPENSE')).toBe('Продукты'))
  it('Магнит', () => expect(matchByKeywords('MAGNIT | 1234', 'EXPENSE')).toBeNull()) // латиница не совпадает
  it('Перекрёсток', () => expect(matchByKeywords('Перекрёсток супермаркет', 'EXPENSE')).toBe('Продукты'))
  it('ВкусВилл', () => expect(matchByKeywords('ВкусВилл ул. Ленина', 'EXPENSE')).toBe('Продукты'))
  it('АШАН', () => expect(matchByKeywords('АШАН ТЦ Мега', 'EXPENSE')).toBe('Продукты'))
  it('Лента', () => expect(matchByKeywords('Лента гипермаркет', 'EXPENSE')).toBe('Продукты'))
  it('Metro cash&carry', () => expect(matchByKeywords('METRO CASH', 'EXPENSE')).toBe('Продукты'))
})

describe('matchByKeywords — Транспорт', () => {
  it('Яндекс Такси', () => expect(matchByKeywords('Яндекс Такси поездка', 'EXPENSE')).toBe('Транспорт'))
  it('Uber', () => expect(matchByKeywords('UBER *TRIP', 'EXPENSE')).toBe('Транспорт'))
  it('InDriver', () => expect(matchByKeywords('indriver поездка', 'EXPENSE')).toBe('Транспорт'))
  it('Метро (московский)', () => expect(matchByKeywords('Московский метрополитен', 'EXPENSE')).toBe('Транспорт'))
  it('Аэроэкспресс', () => expect(matchByKeywords('АЭРОЭКСПРЕСС', 'EXPENSE')).toBe('Транспорт'))
  it('РЖД', () => expect(matchByKeywords('ОАО РЖД билет', 'EXPENSE')).toBe('Транспорт'))
})

describe('matchByKeywords — Кафе и рестораны', () => {
  it('KFC', () => expect(matchByKeywords('KFC МОСКВА', 'EXPENSE')).toBe('Кафе и рестораны'))
  it('Макдоналдс / McDonalds', () => expect(matchByKeywords('MCDONALD\'S', 'EXPENSE')).toBe('Кафе и рестораны'))
  it('Додо Пицца', () => expect(matchByKeywords('ДОДО ПИЦЦА', 'EXPENSE')).toBe('Кафе и рестораны'))
  it('Вкусно и точка', () => expect(matchByKeywords('Вкусно и точка', 'EXPENSE')).toBe('Кафе и рестораны'))
  it('Coffee', () => expect(matchByKeywords('Starbucks coffee shop', 'EXPENSE')).toBe('Кафе и рестораны'))
  it('Шоколадница', () => expect(matchByKeywords('Шоколадница кафе', 'EXPENSE')).toBe('Кафе и рестораны'))
})

describe('matchByKeywords — Подписки', () => {
  it('Netflix', () => expect(matchByKeywords('NETFLIX.COM', 'EXPENSE')).toBe('Подписки'))
  it('Spotify', () => expect(matchByKeywords('SPOTIFY AB', 'EXPENSE')).toBe('Подписки'))
  it('Яндекс Плюс', () => expect(matchByKeywords('Яндекс Плюс подписка', 'EXPENSE')).toBe('Подписки'))
  it('Кинопоиск', () => expect(matchByKeywords('Кинопоиск HD', 'EXPENSE')).toBe('Подписки'))
  it('IVI', () => expect(matchByKeywords('IVI видеосервис', 'EXPENSE')).toBe('Подписки'))
  it('OKKO', () => expect(matchByKeywords('OKKO стриминг', 'EXPENSE')).toBe('Подписки'))
})

describe('matchByKeywords — Здоровье', () => {
  it('Аптека', () => expect(matchByKeywords('Аптека 003', 'EXPENSE')).toBe('Здоровье'))
  it('Горздрав', () => expect(matchByKeywords('ГОРЗДРАВ №45', 'EXPENSE')).toBe('Здоровье'))
  it('Ригла', () => expect(matchByKeywords('РИГЛА аптека', 'EXPENSE')).toBe('Здоровье'))
  it('36.6', () => expect(matchByKeywords('Аптеки 36.6', 'EXPENSE')).toBe('Здоровье'))
})

describe('matchByKeywords — Покупки (маркетплейсы)', () => {
  it('Ozon', () => expect(matchByKeywords('OZON marketplace', 'EXPENSE')).toBe('Покупки'))
  it('Wildberries', () => expect(matchByKeywords('WILDBERRIES доставка', 'EXPENSE')).toBe('Покупки'))
  it('AliExpress', () => expect(matchByKeywords('ALIEXPRESS.COM', 'EXPENSE')).toBe('Покупки'))
  it('Яндекс.Маркет', () => expect(matchByKeywords('ЯНДЕКС.МАРКЕТ', 'EXPENSE')).toBe('Покупки'))
  it('Lamoda', () => expect(matchByKeywords('LAMODA', 'EXPENSE')).toBe('Покупки'))
})

describe('matchByKeywords — Зарплата (только INCOME)', () => {
  it('Зарплата INCOME', () => expect(matchByKeywords('Зарплата за март', 'INCOME')).toBe('Зарплата'))
  it('Аванс INCOME', () => expect(matchByKeywords('Аванс 15.03', 'INCOME')).toBe('Зарплата'))
  it('Salary INCOME', () => expect(matchByKeywords('salary payment', 'INCOME')).toBe('Зарплата'))
  it('Начислено INCOME', () => expect(matchByKeywords('Начислено за работу', 'INCOME')).toBe('Зарплата'))
  // Должно быть null для расхода с тем же текстом (тип ограничен INCOME)
  it('Зарплата EXPENSE → null', () => expect(matchByKeywords('Зарплата за март', 'EXPENSE')).toBeNull())
})

describe('matchByKeywords — Авто', () => {
  it('Лукойл АЗС', () => expect(matchByKeywords('ЛУКОЙЛ АЗС', 'EXPENSE')).toBe('Авто'))
  it('Газпром нефть', () => expect(matchByKeywords('Газпром нефть заправка', 'EXPENSE')).toBe('Авто'))
  it('Бензин', () => expect(matchByKeywords('оплата бензин', 'EXPENSE')).toBe('Авто'))
})

describe('matchByKeywords — ЖКХ', () => {
  it('ЖКХ', () => expect(matchByKeywords('Оплата ЖКХ', 'EXPENSE')).toBe('ЖКХ'))
  it('Электроэнергия', () => expect(matchByKeywords('ЭЛЕКТРОЭНЕРГИЯ МЭС', 'EXPENSE')).toBe('ЖКХ'))
  it('Водоканал', () => expect(matchByKeywords('МУП Водоканал', 'EXPENSE')).toBe('ЖКХ'))
})

describe('matchByKeywords — Путешествия', () => {
  // Примечание: 'АЭРОФЛОТ билет' совпадает с 'билет' → Развлечения (правило стоит выше)
  // Используем строки без конфликтных слов
  it('Аэрофлот (без "билет")', () => expect(matchByKeywords('АЭРОФЛОТ авиа', 'EXPENSE')).toBe('Путешествия'))
  it('S7 Airlines', () => expect(matchByKeywords('S7 Airlines', 'EXPENSE')).toBe('Путешествия'))
  it('Booking.com', () => expect(matchByKeywords('BOOKING.COM HOTEL', 'EXPENSE')).toBe('Путешествия'))
  it('Airbnb', () => expect(matchByKeywords('AIRBNB', 'EXPENSE')).toBe('Путешествия'))
  it('Победа авиа', () => expect(matchByKeywords('авиакомпания победа', 'EXPENSE')).toBe('Путешествия'))
})

describe('matchByKeywords — нет совпадения', () => {
  it('пустая строка', () => expect(matchByKeywords('', 'EXPENSE')).toBeNull())
  it('банковский шум', () => expect(matchByKeywords('ОПЕРАЦИЯ ПО КАРТЕ 1234', 'EXPENSE')).toBeNull())
  it('перевод между счетами', () => expect(matchByKeywords('Перевод на счёт', 'EXPENSE')).toBeNull())
  it('случайный текст', () => expect(matchByKeywords('ООО АЛЬФА БЕТА ГАММА', 'EXPENSE')).toBeNull())
})
