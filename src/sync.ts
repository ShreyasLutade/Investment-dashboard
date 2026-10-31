import { initializeApp } from 'firebase/app'
import { initializeFirestore, persistentLocalCache, collection, doc, onSnapshot, setDoc, deleteDoc, Firestore } from 'firebase/firestore'
import type { Inv } from './calc'

export interface Cfg { firebase: Record<string, string>; code: string }
const CK = 'wealth-sync'
export const loadCfg = (): Cfg | null => { try { return JSON.parse(localStorage.getItem(CK) || 'null') } catch { return null } }
export const saveCfg = (c: Cfg | null) => c ? localStorage.setItem(CK, JSON.stringify(c)) : localStorage.removeItem(CK)
export const encode = (c: Cfg) => btoa(JSON.stringify(c))
export const decode = (t: string): Cfg | null => { try { const c = JSON.parse(atob(t)); return c.firebase?.projectId && c.code ? c : null } catch { return null } }
export const parseCfg = (t: string) => { const o: Record<string, string> = {}; for (const m of t.matchAll(/(\w+)\s*:\s*["']([^"']+)["']/g)) o[m[1]] = m[2]; return o }

let db: Firestore | null = null, vault = ''
const col = () => collection(db!, 'vaults', vault, 'items')

export function connect(cfg: Cfg, local: Inv[], onData: (l: Inv[]) => void, onStatus: (s: string) => void) {
  const app = initializeApp(cfg.firebase)
  db = initializeFirestore(app, { localCache: persistentLocalCache() }); vault = cfg.code
  return onSnapshot(col(), snap => {
    if (snap.empty && !snap.metadata.fromCache && local.length) local.forEach(remoteSet)
    onData(snap.docs.map(d => d.data() as Inv).sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id)))
    onStatus(snap.metadata.fromCache && !snap.metadata.hasPendingWrites ? 'connecting' : 'live')
  }, e => onStatus('error'))
}
export const remoteSet = (i: Inv) => { if (db) setDoc(doc(col(), i.id), i).catch(() => {}) }
export const remoteDel = (id: string) => { if (db) deleteDoc(doc(col(), id)).catch(() => {}) }
