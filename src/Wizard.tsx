import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Inv, Kind, Owner, calc, inr } from './calc'

const INFO: Record<Kind, { g: string; t: string }> = {
  FD: { g: '▣', t: 'Lump sum, fixed interest' }, RD: { g: '↻', t: 'Monthly deposit, fixed interest' },
  SIP: { g: '↗', t: 'Monthly into mutual funds' }, Gold: { g: '◉', t: 'Physical gold you own' }, Stock: { g: '▲', t: 'Shares & equity' } }
const HINT: Record<Kind, string[]> = { FD: ['SBI FD', 'HDFC FD', 'Post Office FD'], RD: ['SBI RD', 'Post Office RD'], SIP: ['Nifty 50 SIP', 'Flexi Cap SIP'], Gold: ['Jewellery', 'Gold coins'], Stock: ['Reliance', 'My portfolio'] }
const ord = (n: number) => n + (['th', 'st', 'nd', 'rd'][(n % 100 >> 3 ^ 1 && n % 10 < 4) ? n % 10 : 0])

export function Roll({ text }: { text: string }) {
  return <span className="roll">{[...text].map((c, i) => <span key={text.length - i} className="rc"><AnimatePresence mode="popLayout" initial={false}>
    <motion.span key={c} initial={{ y: '70%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '-70%', opacity: 0 }} transition={{ type: 'spring', damping: 20, stiffness: 320 }} style={{ display: 'inline-block' }}>{c}</motion.span></AnimatePresence></span>)}</span>
}

function Money({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const set = (n: number) => onChange(Math.min(Math.max(n, 0), 1e9))
  useEffect(() => { const k = (e: KeyboardEvent) => { if (/^\d$/.test(e.key)) set(value * 10 + +e.key); else if (e.key === 'Backspace') set(Math.floor(value / 10)) }
    addEventListener('keydown', k); return () => removeEventListener('keydown', k) })
  return <>
    <div className="money"><span className="rs">₹</span><Roll text={value.toLocaleString('en-IN')} /></div>
    <div className="chips">{[[1000, '+1K'], [10000, '+10K'], [100000, '+1L']].map(([n, l]) => <motion.button key={l} whileTap={{ scale: .9 }} onClick={() => set(value + (n as number))}>{l}</motion.button>)}</div>
    <div className="pad">{['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '⌫'].map(k => <motion.button key={k} whileTap={{ scale: .88, backgroundColor: '#D7FF3F33' }}
      onClick={() => k === '⌫' ? set(Math.floor(value / 10)) : set(k === '00' ? value * 100 : value * 10 + +k)}>{k}</motion.button>)}</div>
  </>
}

function Slider({ label, value, min, max, step, fmt, onChange }: { label: string; value: number; min: number; max: number; step: number; fmt: string; onChange: (n: number) => void }) {
  return <div className="sl"><div className="k">{label}</div><div className="slv"><Roll text={fmt} />{step < 1 && <span className="nudge"><button onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))}>−</button><button onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))}>+</button></span>}</div>
    <input type="range" min={min} max={max} step={step} value={value} style={{ ['--p' as any]: `${(value - min) / (max - min) * 100}%` }} onChange={e => onChange(+e.target.value)} /></div>
}

const proj = (f: Inv) => { if (!f.months || f.kind === 'Gold' || f.kind === 'Stock') return null
  const e = new Date(f.start); e.setMonth(e.getMonth() + f.months); const c = calc(f, e); return { v: c.value, g: c.value - c.invested } }

export default function Wizard({ init, onClose, onSave }: { init: Inv; onClose: () => void; onSave: (f: Inv) => void }) {
  const [f, setF] = useState<Inv>(() => init.id && (init.kind === 'Gold' || init.kind === 'Stock') && init.qty !== 1 ? { ...init, amount: init.amount * init.qty, price: init.price * init.qty, qty: 1 } : init)
  const up = (p: Partial<Inv>) => setF(x => ({ ...x, ...p }))
  const mkt = f.kind === 'Gold' || f.kind === 'Stock', sip = f.kind === 'RD' || f.kind === 'SIP'
  const steps = useMemo(() => ['who', 'type', 'name', 'amount', mkt ? 'value' : 'terms', ...(sip ? ['day'] : []), 'review'], [mkt, sip])
  const [i, setI] = useState(init.id ? steps.length - 1 : 0), [dir, setDir] = useState(1), [done, setDone] = useState(false)
  const s = steps[i]
  const go = (n: number) => { setDir(n > i ? 1 : -1); setI(n) }
  const valid = s === 'name' ? !!f.name.trim() : s === 'amount' ? f.amount > 0 : true
  const next = () => { if (valid && i < steps.length - 1) go(i + 1) }
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Enter' && s !== 'review' && next(); addEventListener('keydown', k); return () => removeEventListener('keydown', k) })
  const confirm = () => { setDone(true); setTimeout(() => onSave(mkt && !f.price ? { ...f, price: f.amount } : f), 1700) }
  const p = proj(f), now = calc(mkt ? { ...f, price: f.price || f.amount } : f)

  const title: Record<string, string> = { who: 'Whose investment is this?', type: 'What are you investing in?', name: 'Give it a name', amount: mkt ? 'How much did you invest?' : f.kind === 'FD' ? 'How much are you depositing?' : 'How much every month?',
    value: 'What is it worth today?', terms: f.kind === 'SIP' ? 'Set the expected return' : 'Set interest & duration', day: 'Which day does the money leave your account?', review: 'Everything look right?' }
  const v = { enter: (d: number) => ({ x: d * 50, opacity: 0 }), center: { x: 0, opacity: 1 }, exit: (d: number) => ({ x: -d * 50, opacity: 0 }) }

  if (done) return <motion.div className="wz" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><div className="done">
    {Array.from({ length: 18 }, (_, n) => <motion.i key={n} initial={{ x: 0, y: 0, scale: 1, opacity: 1 }} animate={{ x: Math.cos(n / 18 * 6.283) * 170, y: Math.sin(n / 18 * 6.283) * 170, scale: 0, opacity: 0 }} transition={{ duration: 1.1, delay: .35, ease: 'easeOut' }} />)}
    <motion.svg width="110" height="110" viewBox="0 0 100 100" initial={{ scale: .4 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 10 }}>
      <motion.circle cx="50" cy="50" r="44" fill="none" stroke="#D7FF3F" strokeWidth="3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: .7 }} />
      <motion.path d="M30 52 L45 66 L72 36" fill="none" stroke="#D7FF3F" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: .5, duration: .5 }} /></motion.svg>
    <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: .9 }}>Added to your wealth</motion.h2></div></motion.div>

  return <motion.div className="wz" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: .65, ease: [.22, 1, .36, 1] }}>
    <AnimatePresence mode="wait"><motion.div key={i} className="ghostn" initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -60 }}>{String(i + 1).padStart(2, '0')}</motion.div></AnimatePresence>
    <div className="wtop"><button onClick={() => i ? go(i - 1) : onClose()}>{i ? '←' : '✕'}</button>
      <div className="segs">{steps.map((_, n) => <span key={n}><motion.i animate={{ scaleX: n <= i ? 1 : 0 }} transition={{ duration: .5 }} /></span>)}</div>
      <button onClick={onClose}>{i ? '✕' : ''}</button></div>

    <div className="wbody"><AnimatePresence mode="wait" custom={dir}>
      <motion.div key={s} custom={dir} variants={v} initial="enter" animate="center" exit="exit" transition={{ duration: .45, ease: [.16, 1, .3, 1] }}>
        <div className="k" style={{ color: '#9b9ba8' }}>Step {i + 1} of {steps.length}</div>
        <h1 className="wt">{title[s].split(' ').map((w, n) => <span key={n} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom', marginRight: '.25em' }}><motion.span style={{ display: 'inline-block' }} initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ delay: .08 + n * .05, duration: .6, ease: [.16, 1, .3, 1] }}>{w}</motion.span></span>)}</h1>

        {s === 'who' && <div className="tiles two">{(['Shreyas', 'Divya'] as Owner[]).map(o => <motion.button key={o} className={'tile xl' + (f.owner === o ? ' on' : '')} whileHover={{ y: -6 }} whileTap={{ scale: .96 }}
          onClick={() => { up({ owner: o }); setTimeout(() => go(i + 1), 280) }}><span className="av">{o[0]}</span>{o}</motion.button>)}</div>}

        {s === 'type' && <div className="tiles">{(Object.keys(INFO) as Kind[]).map((k, n) => <motion.button key={k} className={'tile' + (f.kind === k ? ' on' : '')} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: n * .07 }} whileHover={{ x: 6 }} whileTap={{ scale: .97 }}
          onClick={() => { up({ kind: k, rate: k === 'SIP' ? 12 : 7, months: k === 'SIP' ? 0 : 12, qty: 1 }); setTimeout(() => go(i + 1), 280) }}><span className="gl">{INFO[k].g}</span><span><b>{k === 'FD' ? 'Fixed Deposit' : k === 'RD' ? 'Recurring Deposit' : k === 'SIP' ? 'SIP' : k === 'Gold' ? 'Physical Gold' : 'Stocks'}</b><small>{INFO[k].t}</small></span></motion.button>)}</div>}

        {s === 'name' && <><input className="bigin" autoFocus value={f.name} onChange={e => up({ name: e.target.value })} placeholder="Type here…" />
          <div className="chips left">{HINT[f.kind].map(h => <motion.button key={h} whileTap={{ scale: .92 }} onClick={() => up({ name: h })}>{h}</motion.button>)}</div></>}

        {s === 'amount' && <Money value={f.amount} onChange={n => up({ amount: n })} />}
        {s === 'value' && <Money value={f.price || f.amount} onChange={n => up({ price: n })} />}

        {s === 'terms' && <><Slider label={f.kind === 'SIP' ? 'Expected return p.a.' : 'Interest rate p.a.'} value={f.rate} min={0} max={f.kind === 'SIP' ? 25 : 15} step={.01} fmt={f.rate.toFixed(2) + '%'} onChange={n => up({ rate: n })} />
          <Slider label="Duration" value={f.months} min={f.kind === 'SIP' ? 0 : 1} max={f.kind === 'SIP' ? 240 : 120} step={1} fmt={f.months === 0 ? 'Ongoing' : f.months >= 12 ? `${Math.floor(f.months / 12)}y ${f.months % 12 ? f.months % 12 + 'm' : ''}` : f.months + ' mo'} onChange={n => up({ months: n })} />
          <div className="sl"><div className="k">Started on</div><input className="date" type="date" value={f.start} onChange={e => up({ start: e.target.value })} /></div></>}

        {s === 'day' && <><div className="days">{Array.from({ length: 31 }, (_, n) => n + 1).map(d => <motion.button key={d} className={f.day === d ? 'on' : ''} whileTap={{ scale: .8 }} animate={{ scale: f.day === d ? 1.15 : 1 }} onClick={() => up({ day: d })}>{d}</motion.button>)}</div>
          <p className="note">₹{f.amount.toLocaleString('en-IN')} will be added on the <b>{ord(f.day)}</b> of every month — just like a real bank auto-debit.</p></>}

        {s === 'review' && <div className="ticket">
          <div className="row"><span className="tag">{f.kind}</span><span className="tag">{f.owner}</span></div>
          <h2>{f.name}</h2>
          {[['Amount', inr(mkt ? f.amount : f.amount) + (sip ? ' / month' : ''), 'amount'], ...(mkt ? [['Worth today', inr(f.price || f.amount), 'value']] : [['Rate', f.rate.toFixed(2) + '% p.a.', 'terms'], ['Duration', f.months ? f.months + ' months' : 'Ongoing', 'terms']]), ...(sip ? [['Debit day', ord(f.day), 'day']] : []), ['Name', f.name, 'name']].map(([a, b, st]) =>
            <motion.button key={a} className="rw" whileTap={{ scale: .98 }} onClick={() => go(steps.indexOf(st))}><span>{a}</span><b>{b}</b></motion.button>)}
          <div className="hl"><div className="k">{p ? 'You will have' : mkt ? 'Gain / loss' : 'Worth today'}</div>
            <div className="hv"><Roll text={inr(p ? p.v : mkt ? now.value - now.invested : now.value)} /></div>
            {p && <div className="s" style={{ color: '#D7FF3F' }}>+{inr(p.g)} earned over {f.months} months</div>}</div>
          <motion.button className="cta" whileTap={{ scale: .97 }} onClick={confirm}><span className="shine" />Confirm investment</motion.button></div>}
      </motion.div></AnimatePresence></div>

    {!['who', 'type', 'review'].includes(s) && <motion.div className="wfoot" initial={{ y: 80 }} animate={{ y: 0 }}><motion.button className="cta" disabled={!valid} animate={{ opacity: valid ? 1 : .35 }} whileTap={{ scale: .97 }} onClick={next}>Continue <span>→</span></motion.button></motion.div>}
  </motion.div>
}
