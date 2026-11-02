export type Owner = 'Shreyas' | 'Divya'
export type Kind = 'FD' | 'RD' | 'SIP' | 'Gold' | 'Stock'
export interface Inv {
  id: string; owner: Owner; kind: Kind; name: string
  start: string            // yyyy-mm-dd
  amount: number           // FD principal / RD,SIP monthly / Gold,Stock buy price per unit
  qty: number              // Gold grams / Stock shares
  rate: number             // % p.a. (FD,RD interest; SIP expected return)
  months: number           // tenure (FD,RD,SIP) 0 = open ended for SIP
  day: number              // auto-debit day of month (RD,SIP)
  price: number            // current price per unit (Gold,Stock)
}
export interface Result { invested: number; value: number; installments: number; next?: Date }

const clamp = (y: number, m: number, d: number) => new Date(y, m, Math.min(d, new Date(y, m + 1, 0).getDate()))
const monthsBetween = (a: Date, b: Date) => (b.getTime() - a.getTime()) / (30.4375 * 864e5)

/** Debit dates that have already happened (like a real bank standing instruction). */
export function debits(i: Inv, today = new Date()): { dates: Date[]; next?: Date } {
  const s = new Date(i.start), dates: Date[] = []
  let y = s.getFullYear(), m = s.getMonth(), next: Date | undefined
  for (let n = 0; n < 1200; n++) {
    let d = clamp(y, m, i.day)
    m++; if (m > 11) { m = 0; y++ }
    if (d < s) { if (n === 0) d = s; else continue }  // debit day already passed in start month: first debit happens on the start date
    if (i.months && dates.length >= i.months) break
    if (d <= today) dates.push(d); else { next = d; break }
  }
  return { dates, next }
}

export function calc(i: Inv, today = new Date()): Result {
  const r = i.rate / 100
  if (i.kind === 'FD') {
    const t = Math.min(Math.max(monthsBetween(new Date(i.start), today), 0), i.months) / 12
    return { invested: i.amount, value: i.amount * Math.pow(1 + r / 4, 4 * t), installments: 1 }
  }
  if (i.kind === 'RD' || i.kind === 'SIP') {
    const { dates, next } = debits(i, today)
    const f = (mo: number) => i.kind === 'RD' ? Math.pow(1 + r / 4, mo / 3) : Math.pow(1 + r / 12, mo)
    const end = i.months && dates.length >= i.months && i.kind === 'RD'
      ? new Date(new Date(i.start).setMonth(new Date(i.start).getMonth() + i.months)) : today
    const value = dates.reduce((s, d) => s + i.amount * f(Math.max(monthsBetween(d, end), 0)), 0)
    return { invested: i.amount * dates.length, value, installments: dates.length, next }
  }
  return { invested: i.amount * i.qty, value: (i.price || i.amount) * i.qty, installments: 1 }
}

export const sum = (l: Inv[]) => l.reduce((a, i) => { const c = calc(i); a.invested += c.invested; a.value += c.value; return a }, { invested: 0, value: 0 })
export const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')
