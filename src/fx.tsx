import { useEffect, useRef, useState, ReactNode } from 'react'
import { motion, useMotionValue, useSpring, useTransform, useScroll, AnimatePresence } from 'framer-motion'

export function Splash() {
  const [show, setShow] = useState(true)
  useEffect(() => { const t = setTimeout(() => setShow(false), 2600); return () => clearTimeout(t) }, [])
  const word = 'SHREYAS & DIVYA'.split('')
  return <AnimatePresence>{show && <motion.div className="splash" exit={{ y: '-100%' }} transition={{ duration: .9, ease: [.76, 0, .24, 1] }}>
    <div className="sp-t">{word.map((c, i) => <motion.span key={i} initial={{ y: 120, rotate: 12, opacity: 0 }} animate={{ y: 0, rotate: 0, opacity: 1 }} transition={{ delay: .1 + i * .06, type: 'spring', damping: 14 }}>{c === ' ' ? ' ' : c}</motion.span>)}</div>
    <motion.div className="sp-l" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 2, ease: 'easeInOut' }} />
    <motion.small initial={{ opacity: 0 }} animate={{ opacity: .6 }} transition={{ delay: 1.2 }}>building our wealth, together</motion.small>
  </motion.div>}</AnimatePresence>
}

export function Progress() {
  const { scrollYProgress } = useScroll()
  return <motion.div className="prog" style={{ scaleX: useSpring(scrollYProgress, { stiffness: 120, damping: 25 }) }} />
}

export function Spotlight() {
  const x = useMotionValue(-500), y = useMotionValue(-500)
  useEffect(() => { const m = (e: PointerEvent) => { x.set(e.clientX); y.set(e.clientY) }; addEventListener('pointermove', m); return () => removeEventListener('pointermove', m) }, [])
  const bg = useTransform([x, y], ([a, b]) => `radial-gradient(420px circle at ${a}px ${b}px,#c6ff3d22,transparent 70%)`)
  return <motion.div className="spot" style={{ background: bg }} />
}

export function Particles() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current!, g = c.getContext('2d')!; let w = 0, h = 0, id = 0
    const rs = () => { w = c.width = innerWidth; h = c.height = innerHeight }; rs(); addEventListener('resize', rs)
    const P = Array.from({ length: 55 }, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 2 + .5, v: Math.random() * .4 + .1, a: Math.random() }))
    const loop = () => { g.clearRect(0, 0, w, h); P.forEach(p => { p.y -= p.v; p.a += .01; if (p.y < -5) { p.y = h + 5; p.x = Math.random() * w }
      g.fillStyle = `rgba(198,255,61,${.15 + Math.sin(p.a) * .15})`; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill() }); id = requestAnimationFrame(loop) }
    loop(); return () => { cancelAnimationFrame(id); removeEventListener('resize', rs) }
  }, [])
  return <canvas ref={ref} className="parts" />
}

export function Tilt({ children, className, ...rest }: { children: ReactNode; className?: string; [k: string]: any }) {
  const rx = useMotionValue(0), ry = useMotionValue(0)
  const sx = useSpring(rx, { stiffness: 200, damping: 18 }), sy = useSpring(ry, { stiffness: 200, damping: 18 })
  return <motion.div className={className} {...rest} style={{ rotateX: sx, rotateY: sy, transformPerspective: 900 }}
    onPointerMove={e => { const r = e.currentTarget.getBoundingClientRect(); ry.set(((e.clientX - r.left) / r.width - .5) * 14); rx.set(-((e.clientY - r.top) / r.height - .5) * 14) }}
    onPointerLeave={() => { rx.set(0); ry.set(0) }}>{children}</motion.div>
}

export function Reveal({ text, className }: { text: string; className?: string }) {
  return <h2 className={className}>{text.split(' ').map((w, i) => <span key={i} style={{ display: 'inline-block', overflow: 'hidden', marginRight: '.25em' }}>
    <motion.span style={{ display: 'inline-block' }} initial={{ y: '110%' }} whileInView={{ y: 0 }} viewport={{ once: true }} transition={{ delay: i * .08, duration: .7, ease: [.16, 1, .3, 1] }}>{w}</motion.span></span>)}</h2>
}
