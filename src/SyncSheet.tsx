import { useState } from 'react'
import { motion } from 'framer-motion'
import { Cfg, decode, encode, parseCfg } from './sync'

export default function SyncSheet({ cfg, status, onSave, onOff, onClose }: { cfg: Cfg | null; status: string; onSave: (c: Cfg) => void; onOff: () => void; onClose: () => void }) {
  const [txt, setTxt] = useState(''), [err, setErr] = useState('')
  const [code, setCode] = useState(() => Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8))
  const go = () => { const t = txt.trim(); const c = decode(t)
    if (c) return onSave(c)
    const fb = parseCfg(t); if (!fb.projectId || !fb.apiKey) return setErr('Could not read the Firebase config. Paste the whole firebaseConfig block, or the setup code from the other phone.')
    if (code.trim().length < 8) return setErr('Vault code needs at least 8 characters.')
    onSave({ firebase: fb, code: code.trim() }) }
  return <>
    <motion.div className="veil" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
    <motion.div className="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: .5, ease: [.22, 1, .36, 1] }}>
      <h2 style={{ fontSize: 28 }}>Sync both phones</h2>
      {cfg ? <>
        <p className="note">Status: <b>{status === 'live' ? 'Live ✓' : status === 'error' ? 'Error — check Firestore rules' : 'Connecting…'}</b><br />Everything you add shows up instantly on every phone connected to this vault.</p>
        <button className="go" onClick={() => { navigator.clipboard.writeText(encode(cfg)); alert('Setup code copied. Send it to Divya and she pastes it in her Sync box.') }}>Copy setup code for the other phone</button>
        <button className="go" style={{ background: 'none', border: '1px solid var(--line)', color: 'var(--mut)' }} onClick={() => confirm('Stop syncing on this phone? Your data stays in the cloud.') && onOff()}>Disconnect this phone</button>
      </> : <>
        <p className="note">Paste either your Firebase <b>firebaseConfig</b> (first phone) or the <b>setup code</b> copied from the first phone (second phone).</p>
        <label>Firebase config or setup code</label>
        <textarea value={txt} onChange={e => { setTxt(e.target.value); setErr('') }} rows={5} placeholder={'const firebaseConfig = {\n  apiKey: "...", projectId: "..."\n}'} />
        {!decode(txt.trim()) && <><label>Vault code (your shared secret — keep it private)</label><input value={code} onChange={e => setCode(e.target.value)} /></>}
        {err && <p className="note" style={{ color: 'var(--c)' }}>{err}</p>}
        <button className="go" onClick={go}>Connect</button>
      </>}
    </motion.div></>
}
