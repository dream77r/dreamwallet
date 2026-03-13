// Salt Edge Open Banking API Client
// https://docs.saltedge.com/account_information/v5/

// ─── Salt Edge API Types ────────────────────────────────────────────

export interface SaltEdgeConfig {
  appId: string
  secret: string
  baseUrl?: string // default: 'https://www.saltedge.com/api/v5'
}

export interface SaltEdgeCustomer {
  id: string
  identifier: string
  secret: string
  created_at: string
  updated_at: string
}

export interface SaltEdgeConnection {
  id: string
  secret: string
  provider_id: string
  provider_code: string
  provider_name: string
  customer_id: string
  status: 'active' | 'inactive' | 'disabled'
  categorization: string
  daily_refresh: boolean
  created_at: string
  updated_at: string
  last_success_at: string | null
  next_refresh_possible_at: string | null
  country_code: string
  show_consent_confirmation: boolean
  last_attempt: SaltEdgeAttempt | null
}

export interface SaltEdgeAttempt {
  id: string
  api_mode: string
  api_version: string
  automatic_fetch: boolean
  categorize: boolean
  created_at: string
  custom_fields: Record<string, unknown>
  daily_refresh: boolean
  device_type: string
  remote_ip: string
  exclude_accounts: string[]
  fail_at: string | null
  fail_error_class: string | null
  fail_message: string | null
  fetch_scopes: string[]
  finished: boolean
  finished_recent: boolean
  from_date: string | null
  interactive: boolean
  locale: string
  partial: boolean
  store_credentials: boolean
  success_at: string | null
  to_date: string | null
  updated_at: string
  show_consent_confirmation: boolean
  consent_id: string | null
  include_natures: string[] | null
  last_stage: SaltEdgeStage | null
}

export interface SaltEdgeStage {
  created_at: string
  id: string
  interactive_fields_names: string[] | null
  interactive_html: string | null
  name: string
  updated_at: string
}

export interface SaltEdgeAccount {
  id: string
  connection_id: string
  name: string
  nature: 'account' | 'bonus' | 'card' | 'checking' | 'credit' | 'credit_card' | 'debit_card' | 'ewallet' | 'insurance' | 'investment' | 'loan' | 'mortgage' | 'savings'
  balance: number
  currency_code: string
  extra: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface SaltEdgeTransaction {
  id: string
  account_id: string
  duplicated: boolean
  mode: 'normal' | 'fee' | 'transfer'
  status: 'posted' | 'pending'
  made_on: string
  amount: number
  currency_code: string
  description: string
  category: string
  extra: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface SaltEdgeConnectSession {
  connect_url: string
  expires_at: string
}

// ─── Error Handling ─────────────────────────────────────────────────

export class SaltEdgeError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errorClass: string,
    public readonly requestId?: string,
  ) {
    super(message)
    this.name = 'SaltEdgeError'
  }
}

interface SaltEdgeErrorResponse {
  error: {
    class: string
    message: string
    documentation_url?: string
  }
  request?: {
    id?: string
  }
}

// ─── Client Factory ─────────────────────────────────────────────────

export function createSaltEdgeClient(config: SaltEdgeConfig) {
  const baseUrl = (config.baseUrl ?? 'https://www.saltedge.com/api/v5').replace(/\/$/, '')

  async function request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
    params?: Record<string, string>,
  ): Promise<T> {
    let url = `${baseUrl}${path}`

    if (params) {
      const searchParams = new URLSearchParams()
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) searchParams.set(key, value)
      }
      const qs = searchParams.toString()
      if (qs) url += `?${qs}`
    }

    const headers: Record<string, string> = {
      'App-id': config.appId,
      'Secret': config.secret,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      let errorClass = 'UnknownError'
      let errorMessage = `Salt Edge API error: ${response.status} ${response.statusText}`
      let requestId: string | undefined

      try {
        const errorBody = (await response.json()) as SaltEdgeErrorResponse
        if (errorBody.error) {
          errorClass = errorBody.error.class
          errorMessage = errorBody.error.message
        }
        requestId = errorBody.request?.id
      } catch {
        // Failed to parse error body — use defaults
      }

      throw new SaltEdgeError(errorMessage, response.status, errorClass, requestId)
    }

    const json = (await response.json()) as { data: T }
    return json.data
  }

  return {
    /**
     * Create a customer (end-user) in Salt Edge.
     * The identifier should be unique per customer in your system.
     */
    async createCustomer(identifier: string): Promise<{ id: string }> {
      const customer = await request<SaltEdgeCustomer>('POST', '/customers', {
        data: { identifier },
      })
      return { id: customer.id }
    },

    /**
     * Create a Connect Session — returns a URL to redirect the user
     * to the Salt Edge Connect widget for bank authorization.
     */
    async createConnectSession(
      customerId: string,
      returnUrl: string,
    ): Promise<{ connectUrl: string; expiresAt: string }> {
      const session = await request<SaltEdgeConnectSession>('POST', '/connect_sessions/create', {
        data: {
          customer_id: customerId,
          consent: {
            scopes: ['account_details', 'transactions_details'],
            from_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
          },
          attempt: {
            return_to: returnUrl,
            fetch_scopes: ['accounts', 'transactions'],
          },
        },
      })
      return {
        connectUrl: session.connect_url,
        expiresAt: session.expires_at,
      }
    },

    /**
     * List all connections for a given customer.
     */
    async listConnections(customerId: string): Promise<SaltEdgeConnection[]> {
      return request<SaltEdgeConnection[]>('GET', '/connections', undefined, {
        customer_id: customerId,
      })
    },

    /**
     * Get a single connection by ID.
     */
    async getConnection(connectionId: string): Promise<SaltEdgeConnection> {
      return request<SaltEdgeConnection>('GET', `/connections/${connectionId}`)
    },

    /**
     * List all accounts for a connection.
     */
    async listAccounts(connectionId: string): Promise<SaltEdgeAccount[]> {
      return request<SaltEdgeAccount[]>('GET', '/accounts', undefined, {
        connection_id: connectionId,
      })
    },

    /**
     * List transactions for a connection, optionally filtered by date range and account.
     */
    async listTransactions(
      connectionId: string,
      opts?: { fromDate?: string; toDate?: string; accountId?: string },
    ): Promise<SaltEdgeTransaction[]> {
      const params: Record<string, string> = {
        connection_id: connectionId,
      }
      if (opts?.accountId) params.account_id = opts.accountId
      if (opts?.fromDate) params.from_date = opts.fromDate
      if (opts?.toDate) params.to_date = opts.toDate

      return request<SaltEdgeTransaction[]>('GET', '/transactions', undefined, params)
    },

    /**
     * Remove (revoke) a connection.
     */
    async removeConnection(connectionId: string): Promise<void> {
      await request<unknown>('DELETE', `/connections/${connectionId}`)
    },

    /**
     * Trigger a refresh for an existing connection to fetch latest data.
     */
    async refreshConnection(connectionId: string): Promise<void> {
      await request<unknown>('PUT', `/connections/${connectionId}/refresh`, {
        data: {
          attempt: {
            fetch_scopes: ['accounts', 'transactions'],
          },
        },
      })
    },
  }
}
