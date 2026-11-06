import { describe, expect, it } from 'vitest'
import { rupees0, rupeesCompact } from './biz'
import { branchName, fraudLink } from './bizApi'
import { INR_PER_USD, inr } from './fraudApi'

describe('rupee formatting', () => {
  it('groups digits the Indian way, from paise', () => {
    expect(rupees0(733407335)).toBe('₹73,34,073')
    expect(rupees0(0)).toBe('₹0')
    expect(rupees0(149)).toBe('₹1')
  })
  it('shortens to k, lakh and crore', () => {
    expect(rupeesCompact(50_000)).toBe('₹500')
    expect(rupeesCompact(12_500_00)).toBe('₹12.5k')
    expect(rupeesCompact(46_70_000_00)).toBe('₹46.7 L')
    expect(rupeesCompact(24_20_00_000_00)).toBe('₹24.2 Cr')
  })
  it('converts the model dollars back to rupees at the fixed rate', () => {
    expect(inr(1)).toBe(`₹${INR_PER_USD}`)
    expect(inr(1234)).toBe('₹1,08,592')
  })
})

describe('links and labels', () => {
  it('opens Fraud check pre-filled and ready to run', () => {
    const url = new URL(fraudLink({ amount: 1500, time: 'night', burst: 2, prior: 4, lastPaid: 'today', usual: 800 }), 'http://x')
    expect(url.pathname).toBe('/')
    expect(Object.fromEntries(url.searchParams)).toEqual({ amount: '1500', time: 'night', burst: '2', prior: '4', lastPaid: 'today', usual: '800', auto: '1' })
  })
  it('leaves out an unknown usual amount', () => {
    expect(fraudLink({ amount: 10, time: 'morning', burst: 0, prior: 0, lastPaid: 'never', usual: null })).not.toContain('usual')
  })
  it('calls outlets branches', () => {
    expect(branchName('Outlet 07')).toBe('Branch 07')
    expect(branchName('Main')).toBe('Main')
    expect(branchName(null)).toBe('')
  })
})
