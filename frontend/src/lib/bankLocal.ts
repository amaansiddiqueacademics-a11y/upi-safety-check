// Payments the merchant added by hand or imported (kept in this browser only, per dataset).
import { useCallback, useEffect, useState } from 'react'

export interface AddedPayment {
  utr: string
  amount: number // rupees
  date: string // YYYY-MM-DD
  customer: string
}
const MAX = 5000
const key = (ds: string) => `bank-added:${ds}`
const read = (ds: string): AddedPayment[] => {
  try {
    return JSON.parse(localStorage.getItem(key(ds)) ?? '[]')
  } catch {
    return []
  }
}

export function useAddedPayments(ds: string) {
  const [items, setItems] = useState<AddedPayment[]>(() => read(ds))
  // oxlint-disable-next-line react/set-state-in-effect -- syncing from localStorage, an outside store
  useEffect(() => setItems(read(ds)), [ds])
  const save = useCallback((next: AddedPayment[]) => {
    const n = next.slice(0, MAX)
    setItems(n)
    try {
      localStorage.setItem(key(ds), JSON.stringify(n))
    } catch {
      /* storage can be blocked */
    }
  }, [ds])
  return {
    items,
    add: (p: AddedPayment[]) => save([...p, ...items.filter((o) => !p.some((x) => x.utr === o.utr))]),
    remove: (utr: string) => save(items.filter((x) => x.utr !== utr)),
  }
}

export const isUtr = (s: string) => /^\d{12}$/.test(s.trim())

/** Split one CSV line, honouring quotes: "1,234.50" stays one field, and "" inside quotes is a literal quote. */
export function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') quoted = false
      else cur += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      out.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  out.push(cur.trim())
  return out
}

const pad = (n: number) => String(n).padStart(2, '0')
const valid = (y: number, m: number, d: number) => {
  const t = new Date(y, m - 1, d)
  return t.getFullYear() === y && t.getMonth() === m - 1 && t.getDate() === d
}
/**
 * A calendar date (YYYY-MM-DD) from what bank statements in India contain: 2024-03-05, 05/03/2024, 05-03-2024 or 05.03.24
 * (day first), each optionally followed by a time. The time is ignored, so a payment at 1 am never moves to the day before.
 */
export function parseBankDate(text: string): string | null {
  const s = text.trim()
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s)
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
    return valid(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null
  }
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})(?!\d)/.exec(s)
  if (m) {
    const [d, mo] = [Number(m[1]), Number(m[2])]
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
    return valid(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null
  }
  m = /^(\d{1,2})[ -]([A-Za-z]{3})[A-Za-z]*[\s,-]+(\d{4})/.exec(s) // 05 Mar 2024, 5-Mar-2024
  if (m) {
    const mo = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(m[2].toLowerCase()) + 1
    const [d, y] = [Number(m[1]), Number(m[3])]
    return mo > 0 && valid(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null
  }
  return null
}

/** Read a small CSV (utr, amount, date, customer; header names are matched loosely). Returns the usable rows and how many were skipped. */
export function parseBankCsv(text: string): { rows: AddedPayment[]; skipped: number } {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return { rows: [], skipped: 0 }
  const head = splitCsvLine(lines[0]).map((h) => h.toLowerCase())
  const at = (names: string[]) => head.findIndex((h) => names.some((n) => h.includes(n)))
  const iU = at(['utr', 'ref', 'txn']), iA = at(['amount', 'amt']), iD = at(['date', 'time']), iC = at(['customer', 'payer', 'name'])
  const rows: AddedPayment[] = []
  let skipped = 0
  for (const l of lines.slice(1)) {
    const c = splitCsvLine(l)
    const utr = (c[iU] ?? '').replace(/\D/g, '')
    const amount = Number((c[iA] ?? '').replace(/[₹,\s]|rs\.?|inr/gi, ''))
    const date = parseBankDate(c[iD] ?? '')
    if (isUtr(utr) && amount > 0 && Number.isFinite(amount) && date) rows.push({ utr, amount, date, customer: c[iC] ?? '' })
    else skipped++
  }
  return { rows, skipped }
}
