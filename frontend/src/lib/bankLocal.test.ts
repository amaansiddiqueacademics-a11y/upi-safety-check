import { describe, expect, it } from 'vitest'
import { isUtr, parseBankCsv, parseBankDate, splitCsvLine } from './bankLocal'

describe('splitCsvLine', () => {
  it('splits plain fields and trims them', () => {
    expect(splitCsvLine('a, b ,c')).toEqual(['a', 'b', 'c'])
  })
  it('keeps a quoted amount with commas as one field', () => {
    expect(splitCsvLine('600003580770,"1,23,456.50",05/03/2024')).toEqual(['600003580770', '1,23,456.50', '05/03/2024'])
  })
  it('reads doubled quotes inside quotes as one quote', () => {
    expect(splitCsvLine('"Ravi ""RK"" Kumar",10')).toEqual(['Ravi "RK" Kumar', '10'])
  })
  it('keeps empty fields', () => {
    expect(splitCsvLine('a,,c,')).toEqual(['a', '', 'c', ''])
  })
})

describe('parseBankDate', () => {
  it('reads ISO dates', () => {
    expect(parseBankDate('2024-03-05')).toBe('2024-03-05')
    expect(parseBankDate('2024-03-05 23:59:00')).toBe('2024-03-05')
  })
  it('reads Indian dates day first', () => {
    expect(parseBankDate('05/03/2024')).toBe('2024-03-05')
    expect(parseBankDate('25-03-2024')).toBe('2024-03-25')
    expect(parseBankDate('5.3.24')).toBe('2024-03-05')
    expect(parseBankDate('05 Mar 2024')).toBe('2024-03-05')
    expect(parseBankDate('5-March-2024')).toBe('2024-03-05')
  })
  it('never moves an early-morning payment to the day before', () => {
    expect(parseBankDate('05/03/2024 01:15')).toBe('2024-03-05')
    expect(parseBankDate('2024-03-05T00:30:00')).toBe('2024-03-05')
  })
  it('rejects dates that do not exist or cannot be read', () => {
    expect(parseBankDate('31/02/2024')).toBeNull()
    expect(parseBankDate('2024-13-01')).toBeNull()
    expect(parseBankDate('yesterday')).toBeNull()
    expect(parseBankDate('')).toBeNull()
  })
})

describe('parseBankCsv', () => {
  it('reads a typical bank export and counts the rows it skips', () => {
    const csv = [
      '﻿UTR,Amount (₹),Date,Customer name',
      '600003580770,"1,250.00",05/03/2024 10:15,Asha',
      '600003580771,₹499,2024-03-06,Vikram',
      '12345,100,05/03/2024,Too short reference',
      '600003580772,-50,05/03/2024,Negative',
      '600003580773,200,not a date,Bad date',
    ].join('\r\n')
    const { rows, skipped } = parseBankCsv(csv)
    expect(rows).toEqual([
      { utr: '600003580770', amount: 1250, date: '2024-03-05', customer: 'Asha' },
      { utr: '600003580771', amount: 499, date: '2024-03-06', customer: 'Vikram' },
    ])
    expect(skipped).toBe(3)
  })
  it('returns nothing for a file with only a header', () => {
    expect(parseBankCsv('utr,amount,date\n')).toEqual({ rows: [], skipped: 0 })
  })
})

describe('isUtr', () => {
  it('accepts exactly 12 digits', () => {
    expect(isUtr('600003580770')).toBe(true)
    expect(isUtr(' 600003580770 ')).toBe(true)
    expect(isUtr('60000358077')).toBe(false)
    expect(isUtr('60000358077a')).toBe(false)
  })
})
