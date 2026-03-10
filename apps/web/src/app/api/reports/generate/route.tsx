// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@dreamwallet/db'
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#111827', backgroundColor: '#fff' },
  header: { marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#4f46e5', marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#6b7280' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', marginBottom: 10, color: '#111827', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 4 },
  row: { flexDirection: 'row', marginBottom: 6 },
  col: { flex: 1 },
  label: { color: '#6b7280', fontSize: 9 },
  value: { fontSize: 12, fontWeight: 'bold' },
  valueGreen: { fontSize: 12, fontWeight: 'bold', color: '#16a34a' },
  valueRed: { fontSize: 12, fontWeight: 'bold', color: '#dc2626' },
  valueBlue: { fontSize: 12, fontWeight: 'bold', color: '#4f46e5' },
  summaryBox: { backgroundColor: '#f9fafb', borderRadius: 8, padding: 16, marginBottom: 16 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', padding: 8, marginBottom: 2, borderRadius: 4 },
  tableRow: { flexDirection: 'row', padding: '6 8', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tableCell: { flex: 1, fontSize: 9 },
  tableCellRight: { flex: 1, fontSize: 9, textAlign: 'right' },
  bar: { height: 8, borderRadius: 4, marginTop: 3 },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: '#9ca3af' },
  pill: { backgroundColor: '#ede9fe', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginRight: 4 },
  pillText: { color: '#4f46e5', fontSize: 8 },
})

function fmt(amount: number, currency = 'RUB') {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'monthly_summary'
  const from = searchParams.get('from') ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const to = searchParams.get('to') ?? new Date().toISOString()

  const wallet = await prisma.wallet.findFirst({ where: { userId: session.user.id } })
  if (!wallet) return NextResponse.json({ error: 'No wallet' }, { status: 404 })

  const accounts = await prisma.account.findMany({
    where: { walletId: wallet.id },
    select: { id: true, name: true, currency: true, balance: true },
  })
  const accountIds = accounts.map(a => a.id)

  const transactions = await prisma.transaction.findMany({
    where: { accountId: { in: accountIds }, date: { gte: new Date(from), lte: new Date(to) } },
    include: { category: { select: { name: true, icon: true } } },
    orderBy: { date: 'desc' },
  })

  const income = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0)
  const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0)
  const net = income - expense

  // Category breakdown
  const byCategory: Record<string, { name: string; icon: string; amount: number; count: number }> = {}
  for (const t of transactions.filter(t => t.type === 'EXPENSE')) {
    const key = t.category?.name ?? 'Без категории'
    if (!byCategory[key]) byCategory[key] = { name: key, icon: t.category?.icon ?? '', amount: 0, count: 0 }
    byCategory[key].amount += Number(t.amount)
    byCategory[key].count++
  }
  const categories = Object.values(byCategory).sort((a, b) => b.amount - a.amount).slice(0, 10)
  const maxCat = categories[0]?.amount ?? 1

  const userName = session.user.name ?? session.user.email ?? 'Пользователь'
  const generatedAt = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })
  const periodStr = `${formatDate(from)} — ${formatDate(to)}`

  const doc = (
    <Document title={`DreamWallet — Отчёт ${generatedAt}`} author="DreamWallet">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>💰 DreamWallet</Text>
          <Text style={styles.subtitle}>Финансовый отчёт · {periodStr}</Text>
          <Text style={[styles.subtitle, { marginTop: 2 }]}>{userName} · Сформирован {generatedAt}</Text>
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Сводка</Text>
          <View style={styles.summaryBox}>
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Доходы</Text>
                <Text style={styles.valueGreen}>{fmt(income)}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Расходы</Text>
                <Text style={styles.valueRed}>{fmt(expense)}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Баланс</Text>
                <Text style={net >= 0 ? styles.valueBlue : styles.valueRed}>{fmt(net)}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Транзакций</Text>
                <Text style={styles.value}>{transactions.length}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Category Breakdown */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Расходы по категориям</Text>
            {categories.map((cat, i) => (
              <View key={i} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 9 }}>{cat.icon} {cat.name} <Text style={{ color: '#9ca3af' }}>({cat.count} оп.)</Text></Text>
                  <Text style={{ fontSize: 9, fontWeight: 'bold' }}>{fmt(cat.amount)}</Text>
                </View>
                <View style={{ backgroundColor: '#e5e7eb', height: 6, borderRadius: 3, marginTop: 3 }}>
                  <View style={[styles.bar, { backgroundColor: '#6366f1', width: `${Math.round((cat.amount / maxCat) * 100)}%` }]} />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Accounts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Счета</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>Счёт</Text>
            <Text style={[styles.tableCellRight, { fontWeight: 'bold' }]}>Баланс</Text>
          </View>
          {accounts.map((acc, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.tableCell}>{acc.name}</Text>
              <Text style={styles.tableCellRight}>{fmt(Number(acc.balance), acc.currency)}</Text>
            </View>
          ))}
        </View>

        {/* Last transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Последние транзакции</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, { flex: 1 }]}>Дата</Text>
            <Text style={[styles.tableCell, { flex: 3 }]}>Описание</Text>
            <Text style={[styles.tableCell, { flex: 2 }]}>Категория</Text>
            <Text style={[styles.tableCellRight, { flex: 2 }]}>Сумма</Text>
          </View>
          {transactions.slice(0, 30).map((t, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1, color: '#6b7280' }]}>{t.date.toLocaleDateString('ru-RU')}</Text>
              <Text style={[styles.tableCell, { flex: 3 }]} numberOfLines={1}>{t.description?.slice(0, 35) ?? '—'}</Text>
              <Text style={[styles.tableCell, { flex: 2, color: '#6b7280' }]}>{t.category?.icon ?? ''} {t.category?.name ?? '—'}</Text>
              <Text style={[styles.tableCellRight, { flex: 2, color: t.type === 'INCOME' ? '#16a34a' : '#dc2626' }]}>
                {t.type === 'INCOME' ? '+' : '-'}{fmt(Number(t.amount), t.currency)}
              </Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>DreamWallet · dreamwallet.brewos.ru</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )

  const buffer = await renderToBuffer(doc)

  const filename = `dreamwallet-report-${new Date().toISOString().slice(0, 10)}.pdf`
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.byteLength.toString(),
    },
  })
}
