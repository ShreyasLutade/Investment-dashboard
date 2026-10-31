import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, animate, useMotionValue, useTransform, useScroll, useAnimationFrame } from 'framer-motion'
import Wizard from './Wizard'
import SyncSheet from './SyncSheet'
import { Cfg, loadCfg, saveCfg, connect, remoteSet, remoteDel } from './sync'
import { Cursor, Splash, Progress, Spotlight, Particles, Tilt, Reveal } from './fx'
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts'
import { Inv, Kind, Owner, calc, sum, inr, debits } from './calc'

const KINDS: Kind[] = ['FD', 'RD', 'SIP', 'Gold', 'Stock']
const COLORS: Record<Kind, string> = { FD: '#D7FF3F', RD: '#8B6BFF', SIP: '#FF6A4D', Gold: '#ffc83d', Stock: '#4DD8FF' }
const VIEWS = ['Together', 'Shreyas', 'Divya'] as const
const KEY = 'wealth-v1'

function Count({ to }: { to: number }) {
  const mv = useMotionValue(0)
  const txt = useTransform(mv, v => inr(v))
  useEffect(() => { const c = animate(mv, to, { duration: 1.4, ease: [.16, 1, .3, 1] }); return () => c.stop() }, [to])
  return <motion.span>{txt}</motion.span>
}

function Live({ base, perSec }: { base: number; perSec: number }) {
  const mv = useMotionValue(0), t0 = useRef(0), [ready, setReady] = useState(false)
  useEffect(() => { setReady(false); const c = animate(mv, base, { duration: 1.5, ease: [.16, 1, .3, 1], onComplete: () => { t0.current = performance.now(); setReady(true) } }); return () => c.stop() }, [base])
  useAnimationFrame(() => { if (ready) mv.set(base + perSec * (performance.now() - t0.current) / 1000) })
  const txt = useTransform(mv, v => '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
  return <motion.span>{txt}</motion.span>
}

const blank = (owner: Owner): Inv => ({ id: '', owner, kind: 'FD', name: '', start: new Date().toISOString().slice(0, 10), amount: 0, qty: 1, rate: 7, months: 12, day: new Date().getDate(), price: 0 })

export default function App() {
  const [list, setList] = useState<Inv[]>(() => JSON.parse(localStorage.getItem(KEY) || '[]'))
  const [view, setView] = useState<typeof VIEWS[number]>('Together')
  const [form, setForm] = useState<Inv | null>(null)
  const [cfg] = useState<Cfg | null>(loadCfg), [status, setStatus] = useState('connecting'), [syncOpen, setSyncOpen] = useState(false)
  useEffect(() => { if (!cfg) return; return connect(cfg, JSON.parse(localStorage.getItem(KEY) || '[]'), setList, setStatus) }, [])
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(list)), [list])

  const shown = useMemo(() => view === 'Together' ? list : list.filter(i => i.owner === view), [list, view])
  const t = sum(shown), gain = t.value - t.invested
  const byKind = KINDS.map(k => ({ k, v: sum(shown.filter(i => i.kind === k)).value })).filter(x => x.v > 0)
  const tl = useMemo(() => {
    if (!shown.length) return []
    const first = new Date(Math.min(...shown.map(i => +new Date(i.start)))), now = new Date(), out: any[] = []
    const months = (now.getFullYear() - first.getFullYear()) * 12 + now.getMonth() - first.getMonth()
    for (let n = 0; n <= months + 12; n++) {
      const d = new Date(first.getFullYear(), first.getMonth() + n, 28), fut = d > now
      let val = 0, inv = 0
      shown.forEach(i => { if (d < new Date(i.start)) return; const c = calc(i, d); val += c.value; inv += c.invested })
      out.push({ m: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }), value: fut ? null : Math.round(val), invested: fut ? null : Math.round(inv), proj: fut || n === months ? Math.round(val) : null })
    }
    return out
  }, [shown])
  const perDay = useMemo(() => { const n = Date.now(), a = new Date(n), b = new Date(n + 864e5)
    return shown.reduce((x, i) => { const c1 = calc(i, a), c2 = calc(i, b); return x + (c2.value - c2.invested) - (c1.value - c1.invested) }, 0) }, [shown])
  const { scrollY } = useScroll(); const hy = useTransform(scrollY, [0, 400], [0, -80]), ho = useTransform(scrollY, [0, 400], [1, .2])
  const people = (['Shreyas', 'Divya'] as Owner[]).map(o => ({ o, ...sum(list.filter(i => i.owner === o)) }))

  const save = (f: Inv) => { const it = f.id ? f : { ...f, id: crypto.randomUUID() }; setList(l => f.id ? l.map(i => i.id === f.id ? it : i) : [...l, it]); remoteSet(it); setForm(null) }


  return <>
    <Cursor /><Splash /><Progress /><Spotlight /><Particles />
    <div className="glow"><i className="orb o1" /><i className="orb o2" /><i className="orb o3" /></div>
    <div className="wrap">
      <motion.div className="top" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div className="logo">Shreyas <b>&</b> Divya</div>
        <button className="ghost syncb" onClick={() => setSyncOpen(true)}><i className={'dot ' + (cfg ? status : 'off')} />{cfg ? (status === 'live' ? 'Synced' : status === 'error' ? 'Sync error' : 'Connecting…') : 'Sync'}</button>
      </motion.div>

      <motion.div className="hero" style={{ y: hy, opacity: ho }}>
        <motion.small initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{view === 'Together' ? 'Our net worth' : `${view}'s net worth`}</motion.small>
        <div className="big"><Live base={t.value} perSec={perDay / 86400} /></div>
        <span className={'gain' + (gain < 0 ? ' neg' : '')}>{gain >= 0 ? '▲' : '▼'} {inr(Math.abs(gain))} · {t.invested ? ((gain / t.invested) * 100).toFixed(1) : '0.0'}%</span>
        <div className="s">Invested {inr(t.invested)}</div>
        {perDay > 0 && <div className="live"><i />earning {inr(perDay)} every day, right now</div>}
      </motion.div>

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

      <Reveal className="sec" text="Our wealth journey" />
      <motion.div className="card" initial={{ opacity: 0, y: 60 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <div className="row"><div className="k">Growth over time</div><div className="s" style={{ margin: 0 }}>dashed = next 12 months</div></div>
        {tl.length ? <div className="chart"><ResponsiveContainer><AreaChart data={tl} key={view + list.length}>
          <defs><linearGradient id="gv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#D7FF3F" stopOpacity={.5} /><stop offset="100%" stopColor="#D7FF3F" stopOpacity={0} /></linearGradient>
            <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9b9ba8" stopOpacity={.4} /><stop offset="100%" stopColor="#9b9ba8" stopOpacity={0} /></linearGradient></defs>
          <XAxis dataKey="m" tick={{ fill: '#8b8b95', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={30} />
          <YAxis hide domain={['dataMin', 'auto']} />
          <Tooltip contentStyle={{ background: '#16161c', border: '1px solid #25252d', borderRadius: 14 }} formatter={(v: any, n: any) => [inr(v), n === 'value' ? 'Worth' : n === 'invested' ? 'Invested' : 'Projected']} />
          <Area type="monotone" dataKey="invested" stroke="#9b9ba8" strokeWidth={2} fill="url(#gi)" animationDuration={2200} connectNulls />
          <Area type="monotone" dataKey="value" stroke="#D7FF3F" strokeWidth={3} fill="url(#gv)" animationDuration={2600} connectNulls />
          <Area type="monotone" dataKey="proj" stroke="#D7FF3F" strokeWidth={2} strokeDasharray="6 6" fill="none" animationBegin={2400} animationDuration={1500} connectNulls />
        </AreaChart></ResponsiveContainer></div> : <div className="s">Your growth curve appears once you add investments.</div>}
      </motion.div>

      <Reveal className="sec" text="Investments" />
      <div className="grid">
        <AnimatePresence>{shown.map((i, n) => { const c = calc(i), g = c.value - c.invested, d = i.kind === 'RD' || i.kind === 'SIP' ? debits(i) : null
          return <Tilt key={i.id} className="card" layout initial={{ opacity: 0, y: 50, scale: .95 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true }} exit={{ opacity: 0, scale: .9 }} transition={{ delay: (n % 4) * .06 }} whileHover={{ scale: 1.02 }}>
            <div className="row"><span className="tag" style={{ color: COLORS[i.kind], borderColor: COLORS[i.kind] + '55' }}>{i.kind}</span><span className="tag">{i.owner}</span></div>
            <h3 style={{ margin: '14px 0 4px', fontSize: 22 }}>{i.name}</h3>
            <div className="v">{inr(c.value)}</div>
            <div className="s">Invested {inr(c.invested)} · <span style={{ color: g >= 0 ? 'var(--a)' : 'var(--c)' }}>{g >= 0 ? '+' : '-'}{inr(Math.abs(g))}</span></div>
            {d && <div className="s">{c.installments} auto-debits done{d.next ? ` · next ${d.next.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ' · completed'}</div>}
            <div className="row" style={{ marginTop: 14 }}><button className="x" onClick={() => setForm(i)}>Edit</button><button className="x" onClick={() => confirm('Delete?') && (setList(l => l.filter(x => x.id !== i.id)), remoteDel(i.id))}>Delete</button></div>
          </Tilt> })}</AnimatePresence>
      </div>

      <div className="marquee"><div>{Array(8).fill("FIXED DEPOSIT ✦ RECURRING ✦ SIP ✦ GOLD ✦ STOCKS ✦ ").join("")}</div></div>
      <div className="marquee fill"><div className="rev">{Array(8).fill("BUILDING OUR FUTURE ✦ SHREYAS & DIVYA ✦ ").join("")}</div></div>
    </div>

    <motion.button className="fab" aria-label="Add investment" initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', damping: 12, delay: 2.8 }} whileHover={{ scale: 1.08 }} whileTap={{ scale: .9 }} onClick={() => setForm(blank(view === 'Divya' ? 'Divya' : 'Shreyas'))}>
      <svg viewBox="0 0 100 100" className="ring"><defs><path id="c" d="M50 50m-38 0a38 38 0 1 1 76 0a38 38 0 1 1-76 0" /></defs><text><textPath href="#c" textLength="232" lengthAdjust="spacing">ADD ✦ INVEST ✦ ADD ✦ INVEST ✦</textPath></text></svg><span className="plus">+</span></motion.button>

    <AnimatePresence>{syncOpen && <SyncSheet cfg={cfg} status={status} onClose={() => setSyncOpen(false)} onSave={c => { saveCfg(c); location.reload() }} onOff={() => { saveCfg(null); location.reload() }} />}</AnimatePresence>
    <AnimatePresence>{form && <Wizard key={form.id || 'new'} init={form} onClose={() => setForm(null)} onSave={save} />}</AnimatePresence>
  </>
}
