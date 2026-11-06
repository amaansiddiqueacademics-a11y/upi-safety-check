// Shared helpers for the Business pages: dataset info, a small data-loading hook, the loading bar and rupee formatting.
import { useEffect, useState, useSyncExternalStore } from 'react'

// How many requests are in flight right now: drives the thin loading bar across the top of the page.
let inflight = 0
const listeners = new Set<() => void>()
const bump = (d: number) => {
  inflight = Math.max(0, inflight + d)
  listeners.forEach((l) => l())
}
export const useBusy = () => useSyncExternalStore((cb) => (listeners.add(cb), () => listeners.delete(cb)), () => inflight > 0)

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api'

export interface BizMeta {
  id: string
  label: string
  source: 'sample' | 'upload'
  notes: string[]
  warnings: string[]
  data_start: string
  data_end: string
  counts: { transactions: number; orders: number; refunds: number; settlement_days: number; outlets: number; duplicate_rows: number }
  capabilities: { orders: boolean; settlements: boolean; risk_model: boolean; unusual_activity: boolean }
  discrepancy_counts: { total: number; by_type: Record<string, { count: number; title: string; default_severity: string }>; by_severity: Record<string, number> }
  retention: string
  outlets: string[]
}
export interface Reconciliation {
  total: number
  summary: Record<string, { count: number; title: string; amount_at_stake_paise: number }>
  matching: { orders_checked: number; payments_checked: number; refunds_checked: number; settlement_days_checked: number }
}

export const biz = {
  meta: (ds = 'sample') => get<BizMeta>(ds === 'sample' ? `/merchant/datasets/sample` : `/merchant/${ds}/meta`),
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

/** Tiny data hook: re-fetches when `key` changes; keeps the previous data on screen while loading. */
export function useBiz<T>(load: () => Promise<T>, key: string): { data: T | null; error: string | null; loading: boolean } {
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true })
  useEffect(() => {
    let live = true
    let open = true
    const done = () => {
      if (open) bump(-1)
      open = false
    }
    bump(1)
    setState((s) => ({ ...s, loading: true, error: null }))
    load()
      .then((data) => live && setState({ data, error: null, loading: false }))
      .catch((e: Error) => live && setState((s) => ({ ...s, error: e.message, loading: false })))
      .finally(done)
    return () => {
      live = false
      done()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return state
}

/** Whole rupees with Indian digit grouping, from paise. */
export const rupees0 = (paise: number) => '₹' + Math.round(paise / 100).toLocaleString('en-IN')
/** Compact: ₹12.4 L, ₹1.2 Cr (lakh / crore) for axes and tight spaces. */
export function rupeesCompact(paise: number): string {
  const r = paise / 100
  if (r >= 1e7) return `₹${(r / 1e7).toFixed(1)} Cr`
  if (r >= 1e5) return `₹${(r / 1e5).toFixed(1)} L`
  if (r >= 1e3) return `₹${(r / 1e3).toFixed(1)}k`
  return `₹${Math.round(r)}`
}
