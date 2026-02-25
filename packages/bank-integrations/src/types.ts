export interface BankAccount {
  externalId: string
  name: string
  accountNumber: string
  currency: string
  balance: number
}

export interface BankTransaction {
  externalId: string
  date: Date
  amount: number
  currency: string
  description: string
  counterparty?: string
  reference?: string
  type: 'credit' | 'debit'
}

export interface BankProviderInterface {
  name: string
  authorize(redirectUrl: string): Promise<{ authUrl: string }>
  handleCallback(code: string): Promise<{ accessToken: string; refreshToken: string }>
  getAccounts(accessToken: string): Promise<BankAccount[]>
  getTransactions(
    accessToken: string,
    accountId: string,
    from: Date,
    to: Date
  ): Promise<BankTransaction[]>
  refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }>
}
