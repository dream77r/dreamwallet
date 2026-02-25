import type { BankProviderInterface, BankAccount, BankTransaction } from '../types'

const TOCHKA_BASE_URL = 'https://enter.tochka.com/uapi'
const TOCHKA_AUTH_URL = 'https://enter.tochka.com/connect/authorize'
const TOCHKA_TOKEN_URL = 'https://enter.tochka.com/connect/token'

export class TochkaProvider implements BankProviderInterface {
  name = 'Tochka Bank'

  private clientId: string
  private clientSecret: string

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId
    this.clientSecret = clientSecret
  }

  async authorize(redirectUrl: string): Promise<{ authUrl: string }> {
    // Step 1: Create consent
    const consentRes = await fetch(`${TOCHKA_BASE_URL}/open-banking/v1.0/consents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
      },
      body: JSON.stringify({
        Data: {
          permissions: [
            'ReadAccountsDetail',
            'ReadBalances',
            'ReadStatements',
            'ReadTransactionsBasic',
            'ReadTransactionsCredits',
            'ReadTransactionsDebits',
            'ReadTransactionsDetail',
          ],
        },
      }),
    })

    const consent = await consentRes.json()
    const consentId = consent.Data.consentId

    // Step 2: Build auth URL
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      scope: `accounts:${consentId}`,
      redirect_uri: redirectUrl,
    })

    return { authUrl: `${TOCHKA_AUTH_URL}?${params}` }
  }

  async handleCallback(code: string): Promise<{ accessToken: string; refreshToken: string }> {
    const res = await fetch(TOCHKA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    })

    const data = await res.json()
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    }
  }

  async getAccounts(accessToken: string): Promise<BankAccount[]> {
    const res = await fetch(`${TOCHKA_BASE_URL}/open-banking/v1.0/accounts`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    const data = await res.json()
    return data.Data.Account.map((acc: Record<string, unknown>) => ({
      externalId: acc.accountId as string,
      name: (acc.description as string) || 'Счёт',
      accountNumber: ((acc.accountDetails as Array<{ identification: string }>)?.[0]?.identification || '') as string,
      currency: acc.currency as string,
      balance: 0, // fetched separately via balances endpoint
    }))
  }

  async getTransactions(
    accessToken: string,
    accountId: string,
    from: Date,
    to: Date
  ): Promise<BankTransaction[]> {
    // Step 1: Create statement request
    const createRes = await fetch(
      `${TOCHKA_BASE_URL}/open-banking/v1.0/accounts/${accountId}/statements`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          Data: {
            Statement: {
              fromBookingDateTime: from.toISOString(),
              toBookingDateTime: to.toISOString(),
            },
          },
        }),
      }
    )

    const created = await createRes.json()
    const statementId = created.Data.Statement.statementId

    // Step 2: Poll for result
    let attempts = 0
    while (attempts < 10) {
      const res = await fetch(
        `${TOCHKA_BASE_URL}/open-banking/v1.0/accounts/${accountId}/statements/${statementId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )

      const data = await res.json()
      const statement = data.Data?.Statement

      if (statement?.Transaction) {
        return statement.Transaction.map((tx: Record<string, unknown>) => ({
          externalId: (tx.transactionId as string) || `${tx.bookingDateTime}:${(tx.Amount as { amount: string }).amount}`,
          date: new Date(tx.bookingDateTime as string),
          amount: parseFloat((tx.Amount as { amount: string }).amount),
          currency: (tx.Amount as { currency: string }).currency,
          description: (tx.transactionInformation as string) || '',
          counterparty:
            tx.creditDebitIndicator === 'credit'
              ? ((tx.DebtorAccount as { name?: string })?.name || undefined)
              : ((tx.CreditorAccount as { name?: string })?.name || undefined),
          reference: tx.transactionId as string | undefined,
          type: tx.creditDebitIndicator === 'credit' ? 'credit' as const : 'debit' as const,
        }))
      }

      attempts++
      await new Promise((r) => setTimeout(r, 2000))
    }

    throw new Error('Statement request timed out')
  }

  async refreshToken(refreshTokenValue: string): Promise<{ accessToken: string; refreshToken: string }> {
    const res = await fetch(TOCHKA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshTokenValue,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    })

    const data = await res.json()
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    }
  }
}
