// /api/merchant endpoints for the Business pages: dashboard, payments, missing money, risk alerts, data explorer, uploads, scam messages.
import type { BizMeta, Reconciliation } from './biz'

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api'

export interface TxnRow {
  tid: string
  ts: string
  amount_paise: number
  status: 'success' | 'failed' | 'pending' | 'reversed'
  outlet: string
  order_id: string | null
  payer: string | null
  refund_paise: number
  discrepancies: number
  is_duplicate_row: boolean
  risk_level: 'low' | 'medium' | 'high' | null
  risk_score: number | null
  risk_signal: string
}
export interface TxnPage {
  total: number
  page: number
  page_size: number
  rows: TxnRow[]
  sum_amount_paise: number
  sum_confirmed_paise: number
}
export interface Discrepancy {
  id: string
  type: string
  title: string
  severity: 'high' | 'medium' | 'low'
  expected_paise: number | null
  recorded_paise: number | null
  difference_paise: number | null
  amount_at_stake_paise: number
  evidence: string[]
  explanation: string | null
  next_step: string
  ts: string
  outlet: string | null
  tids: string[]
  order_ids: string[]
}
export interface ReconPage extends Reconciliation {
  page: number
  page_size: number
  items: Discrepancy[]
}
export interface FraudInputs {
  amount: number
  time: 'morning' | 'afternoon' | 'evening' | 'night'
  burst: number
  prior: number
  lastPaid: 'never' | 'hour' | 'today' | 'week' | 'older'
  usual: number | null
}
/** Link that opens Fraud check pre-filled with a saved payment and runs the check. */
export const fraudLink = (f: FraudInputs) => `/?${new URLSearchParams({ amount: String(f.amount), time: f.time, burst: String(f.burst), prior: String(f.prior), lastPaid: f.lastPaid, ...(f.usual ? { usual: String(f.usual) } : {}), auto: '1' })}`
export const branchName = (s: string | null | undefined) => (s ?? '').replace(/^Outlet\b/i, 'Branch')

export interface TxnDetail extends TxnRow {
  fraud_inputs: FraudInputs
  order: { order_id: string; amount_paise: number; ts: string } | null
  same_order_payments: { tid: string; amount_paise: number; status: string; ts: string }[]
  refunds: { refund_id: string; amount_paise: number; ts: string }[]
  discrepancy_items: Discrepancy[]
  risk: { level: string | null; score: number | null; risk_model: { percentile: number; modelled_chance: number; reasons: string[] } | null; unusual_activity: { percentile: number; reasons: string[] } | null } | null
  recommended_steps: string[]
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path)
  if (!res.ok) {
    let msg = `Request failed (${res.status})`
    try {
      msg = (await res.json()).detail ?? msg
    } catch {
      /* not JSON */
    }
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}

const qs = (o: Record<string, string | number | boolean | undefined | null>) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&')

export interface DashKpi {
  value: number
  change: number | null
}
export interface DashReport {
  from: string
  to: string
  data_start: string
  data_end: string
  branches_all: string[]
  has_orders: boolean
  has_settlements: boolean
  bank_basis: 'settlements' | 'payments'
  kpis: Record<'sales' | 'in_bank' | 'refunded' | 'not_received' | 'risky', DashKpi>
  needs_attention_paise: number
  needs_attention_count: number
  series: ({ date: string } & Record<'sales' | 'in_bank' | 'refunded' | 'not_received' | 'risky', number>)[]
  waterfall: { sales: number; refunded: number; not_received: number; other: number; in_bank: number }
  statuses: { id: 'success' | 'failed' | 'pending' | 'reversed'; count: number; amount_paise: number }[]
  branches: { id: string; amount_paise: number }[]
  heatmap: { dow: number; hour: number; count: number }[]
  zones: { safe: number; check: number; fraud: number }
  payments_in_view: number
  top_items: { id: string; title: string; summary: string; paise: number; severity: 'high' | 'medium' | 'low'; ts: string }[]
}

export interface RiskAlertItem {
  tid: string
  ts: string
  amount_paise: number
  status: string
  outlet: string
  level: 'high' | 'medium'
  score: number
  chance: number | null
  reasons: string[]
  fraud_inputs: FraudInputs
}
export interface RiskAlerts {
  total: number
  zones: { safe: number; check: number; fraud: number }
  page: number
  page_size: number
  items: RiskAlertItem[]
}

export interface ExploreTable {
  name: string
  total: number
  page: number
  page_size: number
  columns: { name: string; kind: 'text' | 'number' | 'date'; missing: number }[]
  rows: Record<string, string | number | null>[]
}
export interface Eda {
  payments: number
  amount: { band: string; count: number }[]
  by_hour: { hour: number; count: number }[]
  status: { status: string; count: number }[]
  missing: { column: string; missing: number }[]
  trend: { date: string; count: number; amount: number }[]
  corr: { labels: string[]; matrix: number[][] }
  factors: { factor: string; rate: number; count: number }[]
  base_rate: number
}

export const bizApi = {
  exploreTable: (ds: string, p: Record<string, string | number | boolean | undefined>) => get<ExploreTable>(`/merchant/${ds}/explore/table?${qs(p)}`),
  eda: (ds: string) => get<Eda>(`/merchant/${ds}/explore/eda`),
  riskAlerts: (ds: string, p: Record<string, string | number | undefined>) => get<RiskAlerts>(`/merchant/${ds}/risk?${qs(p)}`),
  labels: (ds: string) => get<Record<string, 'fraud' | 'fine'>>(`/merchant/${ds}/labels`),
  setLabel: (ds: string, tid: string, label: 'fraud' | 'fine' | null) => send<Record<string, 'fraud' | 'fine'>>(`/merchant/${ds}/labels`, 'POST', { tid, label }),
  dashboard: (ds: string, p: Record<string, string | number | undefined>) => get<DashReport>(`/merchant/${ds}/dashboard?${qs(p)}`),
  paymentsCsv: (ds: string, p: Record<string, string | number | undefined>) => `${BASE}/merchant/${ds}/transactions.csv?${qs(p)}`,
  transactions: (ds: string, p: Record<string, string | number | boolean | undefined>) => get<TxnPage>(`/merchant/${ds}/transactions?${qs(p)}`),
  transaction: (ds: string, tid: string) => get<TxnDetail>(`/merchant/${ds}/transactions/${encodeURIComponent(tid)}`),
  recon: (ds: string, p: Record<string, string | number | undefined>) => get<ReconPage>(`/merchant/${ds}/reconciliation?${qs(p)}`),
  async upload(files: { transactions: File; orders?: File | null; refunds?: File | null; settlements?: File | null }): Promise<BizMeta> {
    const fd = new FormData()
    fd.append('transactions', files.transactions)
    for (const k of ['orders', 'refunds', 'settlements'] as const) if (files[k]) fd.append(k, files[k]!)
    const res = await fetch(`${BASE}/merchant/datasets`, { method: 'POST', body: fd })
    if (!res.ok) {
      let msg = `Upload failed (${res.status})`
      try {
        msg = (await res.json()).detail ?? msg
      } catch {
        /* not JSON */
      }
      throw new Error(msg)
    }
    return res.json() as Promise<BizMeta>
  },
}
async function send<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
  if (!res.ok) {
    let msg = `Request failed (${res.status})`
    try {
      const j = await res.json()
      msg = typeof j.detail === 'string' ? j.detail : 'Please check the values you entered.'
    } catch {
      /* not JSON */
    }
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}
export const dtFmt = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })

export interface SpamResult {
  model: string
  model_name: string
  probability: number
  verdict: 'spam' | 'suspicious' | 'ok'
  all_models: { id: string; name: string; probability: number }[]
  agreement: number
  triggers: string[]
  flags: { id: string; text: string }[]
  next_steps: string[]
}
export interface SpamSummary {
  info: { messages: number; spam: number; spam_rate: number; train: number; test: number; test_spam: number; source: string; vocab: number; threshold: number; split: string; text_prep: string; caveats: string[] }
  models: { id: string; name: string; about: string; best: boolean; params: [string, string, string][]; top_words: { word: string; weight: number }[]; accuracy: number; precision: number; recall: number; f1: number; roc_auc: number; confusion: { tp: number; fp: number; fn: number; tn: number } }[]
  best: string
}
export const spamApi = {
  summary: () => get<SpamSummary>('/merchant/spam/models'),
  predict: (text: string, model?: string) => send<SpamResult>(`/merchant/spam/predict${model ? `?model=${model}` : ''}`, 'POST', { text }),
}
