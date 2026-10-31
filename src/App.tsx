import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence, animate, useMotionValue, useTransform } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Inv, Kind, Owner, calc, sum, inr, debits } from './calc'

const KINDS: Kind[] = ['FD', 'RD', 'SIP', 'Gold', 'Stock']
const COLORS: Record<Kind, string> = { FD: '#c6ff3d', RD: '#7c5cff', SIP: '#ff5c8a', Gold: '#ffc83d', Stock: '#3dd6ff' }
const VIEWS = ['Together', 'Shreyas', 'Divya'] as const
const KEY = 'wealth-v1'

function Count({ to }: { to: number }) {
  const mv = useMotionValue(0)
  const txt = useTransform(mv, v => inr(v))
  useEffect(() => { const c = animate(mv, to, { duration: 1.4, ease: [.16, 1, .3, 1] }); return () => c.stop() }, [to])
  return <motion.span>{txt}</motion.span>
}

const blank = (owner: Owner): Inv => ({ id: '', owner, kind: 'FD', name: '', start: new Date().toISOString().slice(0, 10), amount: 0, qty: 1, rate: 7, months: 12, day: new Date().getDate(), price: 0 })

export default function App() {
  const [list, setList] = useState<Inv[]>(() => JSON.parse(localStorage.getItem(KEY) || '[]'))
  const [view, setView] = useState<typeof VIEWS[number]>('Together')
  const [form, setForm] = useState<Inv | null>(null)
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(list)), [list])

  const shown = useMemo(() => view === 'Together' ? list : list.filter(i => i.owner === view), [list, view])
  const t = sum(shown), gain = t.value - t.invested
  const byKind = KINDS.map(k => ({ k, v: sum(shown.filter(i => i.kind === k)).value })).filter(x => x.v > 0)
  const people = (['Shreyas', 'Divya'] as Owner[]).map(o => ({ o, ...sum(list.filter(i => i.owner === o)) }))

  const save = () => { if (!form || !form.name || !form.amount) return
    setList(l => form.id ? l.map(i => i.id === form.id ? form : i) : [...l, { ...form, id: crypto.randomUUID() }]); setForm(null) }
  const num = (k: keyof Inv) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => f && { ...f, [k]: +e.target.value })
  const txt = (k: keyof Inv) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => f && { ...f, [k]: e.target.value })
  const sip = form && (form.kind === 'RD' || form.kind === 'SIP'), mkt = form && (form.kind === 'Gold' || form.kind === 'Stock')

  const backup = () => { navigator.clipboard.writeText(JSON.stringify(list)); alert('Copied! Paste it in the other phone using Restore.') }
  const restore = () => { const s = prompt('Paste backup'); if (s) try { setList(JSON.parse(s)) } catch { alert('Invalid') } }

  return <>
    <div className="glow"><motion.i style={{ background: '#7c5cff', top: '-20%', left: '-20%' }} animate={{ x: [0, 80, 0], y: [0, 60, 0] }} transition={{ duration: 18, repeat: Infinity }} />
      <motion.i style={{ background: '#c6ff3d', bottom: '-30%', right: '-20%', opacity: .15 }} animate={{ x: [0, -80, 0] }} transition={{ duration: 22, repeat: Infinity }} /></div>
    <div className="wrap">
      <motion.div className="top" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div className="logo">Shreyas <b>&</b> Divya</div>
        <div><button className="ghost" onClick={backup}>Backup</button> <button className="ghost" onClick={restore}>Restore</button></div>
      </motion.div>

      <div className="hero">
        <motion.small initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{view === 'Together' ? 'Our net worth' : `${view}'s net worth`}</motion.small>
        <div className="big"><Count to={t.value} /></div>
        <span className={'gain' + (gain < 0 ? ' neg' : '')}>{gain >= 0 ? '▲' : '▼'} {inr(Math.abs(gain))} · {t.invested ? ((gain / t.invested) * 100).toFixed(1) : '0.0'}%</span>
        <div className="s">Invested {inr(t.invested)}</div>
      </div>

      <div className="tabs">{VIEWS.map(v => <button key={v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>
        {view === v && <motion.span layoutId="pill" className="pill" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}<span style={{ position: 'relative' }}>{v}</span></button>)}</div>

      <div className="two">
        <motion.div className="card" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ marginBottom: 14 }}>
          <div className="k">Allocation</div>
          <div style={{ height: 220 }}><ResponsiveContainer><PieChart><Pie data={byKind} dataKey="v" innerRadius={62} outerRadius={92} paddingAngle={4} stroke="none" cornerRadius={8}>
            {byKind.map(d => <Cell key={d.k} fill={COLORS[d.k]} />)}</Pie></PieChart></ResponsiveContainer></div>
          {byKind.map(d => <div key={d.k} className="row" style={{ padding: '5px 0' }}><span><b style={{ color: COLORS[d.k] }}>●</b> {d.k}</span><span>{inr(d.v)}</span></div>)}
          {!byKind.length && <div className="s">Add your first investment 👇</div>}
        </motion.div>
        <div className="grid" style={{ alignContent: 'start' }}>
          {view === 'Together' && people.map((p, n) => <motion.div key={p.o} className="card" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: n * .1 }}>
            <div className="k">{p.o}</div><div className="v"><Count to={p.value} /></div>
            <div className="bar"><motion.i initial={{ width: 0 }} animate={{ width: `${t.value ? p.value / t.value * 100 : 0}%` }} transition={{ duration: 1.2 }} /></div>
            <div className="s">{t.value ? Math.round(p.value / t.value * 100) : 0}% of our wealth</div></motion.div>)}
        </div>
      </div>

      <h2 className="sec">Investments</h2>
      <div className="grid">
        <AnimatePresence>{shown.map((i, n) => { const c = calc(i), g = c.value - c.invested, d = i.kind === 'RD' || i.kind === 'SIP' ? debits(i) : null
          return <motion.div key={i.id} className="card" layout initial={{ opacity: 0, y: 50, scale: .95 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true }} exit={{ opacity: 0, scale: .9 }} transition={{ delay: (n % 4) * .06 }} whileHover={{ y: -4 }}>
            <div className="row"><span className="tag" style={{ color: COLORS[i.kind], borderColor: COLORS[i.kind] + '55' }}>{i.kind}</span><span className="tag">{i.owner}</span></div>
            <h3 style={{ margin: '14px 0 4px', fontSize: 22 }}>{i.name}</h3>
            <div className="v">{inr(c.value)}</div>
            <div className="s">Invested {inr(c.invested)} · <span style={{ color: g >= 0 ? 'var(--a)' : 'var(--c)' }}>{g >= 0 ? '+' : '-'}{inr(Math.abs(g))}</span></div>
            {d && <div className="s">{c.installments} auto-debits done{d.next ? ` · next ${d.next.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ' · completed'}</div>}
            <div className="row" style={{ marginTop: 14 }}><button className="x" onClick={() => setForm(i)}>Edit</button><button className="x" onClick={() => confirm('Delete?') && setList(l => l.filter(x => x.id !== i.id))}>Delete</button></div>
          </motion.div> })}</AnimatePresence>
      </div>

      <div className="marquee"><div>{Array(8).fill('FD • RD • SIP • GOLD • STOCKS • ').join('')}</div></div>
    </div>

    <motion.button className="fab" whileTap={{ scale: .92 }} initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={() => setForm(blank(view === 'Divya' ? 'Divya' : 'Shreyas'))}>+ Add</motion.button>

    <AnimatePresence>{form && <>
      <motion.div className="veil" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setForm(null)} />
      <motion.div className="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}>
        <h2>{form.id ? 'Edit' : 'New'} investment</h2>
        <label>Whose</label><div className="seg">{(['Shreyas', 'Divya'] as Owner[]).map(o => <button key={o} className={form.owner === o ? 'on' : ''} onClick={() => setForm({ ...form, owner: o })}>{o}</button>)}</div>
        <label>Type</label><div className="seg">{KINDS.map(k => <button key={k} className={form.kind === k ? 'on' : ''} onClick={() => setForm({ ...form, kind: k })}>{k}</button>)}</div>
        <label>Name</label><input value={form.name} onChange={txt('name')} placeholder="e.g. SBI RD, Nifty 50 SIP, Reliance" />
        <label>{form.kind === 'FD' ? 'Deposit amount (₹)' : sip ? 'Monthly amount (₹)' : form.kind === 'Gold' ? 'Buy price per gram (₹)' : 'Buy price per share (₹)'}</label>
        <input type="number" inputMode="decimal" value={form.amount || ''} onChange={num('amount')} />
        {mkt && <><label>{form.kind === 'Gold' ? 'Grams' : 'Shares'}</label><input type="number" inputMode="decimal" value={form.qty || ''} onChange={num('qty')} />
          <label>Current price per unit (₹)</label><input type="number" inputMode="decimal" value={form.price || ''} onChange={num('price')} /></>}
        {!mkt && <><label>{form.kind === 'SIP' ? 'Expected return % p.a.' : 'Interest % p.a.'}</label><input type="number" inputMode="decimal" value={form.rate} onChange={num('rate')} />
          <label>Duration (months){form.kind === 'SIP' ? ' – 0 = ongoing' : ''}</label><input type="number" inputMode="numeric" value={form.months} onChange={num('months')} /></>}
        {sip && <><label>Auto-debit day of month</label><input type="number" min={1} max={31} value={form.day} onChange={num('day')} /></>}
        <label>Start date</label><input type="date" value={form.start} onChange={txt('start')} />
        <button className="go" onClick={save}>Save</button>
      </motion.div></>}</AnimatePresence>
  </>
}
