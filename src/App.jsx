import React, { useEffect, useMemo, useRef, useState } from 'react'
import { items, eras } from './data.js'
import Garden from './Garden.jsx'

const SECTIONS = [
  ['01', 'Story', null],
  ['02', 'Garden', 'garden'],
  ['03', 'Work', 'work'],
  ['04', 'Contact', null],
  ['05', 'Shop', null],
]

function src(file) {
  return '/materials/' + encodeURIComponent(file)
}

/* 郁金香图标（右侧粉条装饰） */
function Tulip({ className }) {
  return (
    <svg className={className} viewBox="0 0 40 56" aria-hidden="true">
      <path d="M20 22 C12 22 8 14 8 6 C12 10 14 10 16 4 C18 9 22 9 24 4 C26 10 28 10 32 6 C32 14 28 22 20 22 Z" fill="#e8392a" />
      <rect x="18.4" y="22" width="3.2" height="26" fill="#e8392a" />
      <path d="M18 34 C10 32 8 26 8 24 C14 24 18 28 18 34 Z" fill="#e8392a" />
      <path d="M22 40 C30 38 32 32 32 30 C26 30 22 34 22 40 Z" fill="#e8392a" />
    </svg>
  )
}

function Row({ item, open, onToggle }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && (setShown(true), io.disconnect()),
      { threshold: 0.12 }
    )
    io.observe(el)
    const t = setTimeout(() => setShown(true), 1400)
    return () => { io.disconnect(); clearTimeout(t) }
  }, [])

  return (
    <div ref={ref} className={`row ${shown ? 'row--shown' : ''} ${open ? 'row--open' : ''}`}>
      <button className="row__head" onClick={onToggle} aria-expanded={open}>
        <span className="row__title">{item.title}</span>
        <span className="row__tag">{item.year}</span>
      </button>

      <div className="row__body">
        <div className="row__bodyInner">
          <div className="row__media">
            <img src={src(item.file)} alt={item.title} />
          </div>
          <div className="row__text">
            {(item.author || item.year) && (
              <p className="row__meta">{[item.author, item.year].filter(Boolean).join(' · ')}</p>
            )}
            <p className="row__desc">{item.desc}</p>
            {item.note && <p className="row__note">{item.note}</p>}
          </div>
          <div className="row__cta">
            <span>See</span>
            <span>full</span>
            <span>case</span>
            <span>study</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [era, setEra] = useState('all')
  const [openIds, setOpenIds] = useState(() => new Set())
  const [active, setActive] = useState('garden')

  const list = useMemo(
    () => (era === 'all' ? items : items.filter((i) => i.era === era)),
    [era]
  )

  const toggle = (id) =>
    setOpenIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  /* 页面显现关系 + 页面1→2 渐隐渐显转场：
     Garden 钉住并随 Work 覆盖而淡出；区块状态按滚动位置直接判定 */
  useEffect(() => {
    const garden = document.getElementById('garden')
    const work = document.getElementById('work')
    if (!garden || !work) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const top = work.getBoundingClientRect().top
        const p = Math.min(Math.max(1 - top / window.innerHeight, 0), 1)
        garden.style.opacity = String(Math.max(1 - p * 1.25, 0))
        setActive(top > window.innerHeight * 0.5 ? 'garden' : 'work')
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [])

  const go = (id) => id && document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className={`page page--${active}`}>
      {/* 左侧章节导航 */}
      <nav className="sidenav">
        {SECTIONS.map(([num, name, id]) => (
          <div
            key={num}
            className={`sidenav__item ${id && active === id ? 'is-active' : ''} ${id ? 'is-link' : ''}`}
            onClick={() => go(id)}
          >
            <span className="sidenav__num">{num}</span>
            <span className="sidenav__name">{name}</span>
          </div>
        ))}
      </nav>

      {/* 右侧竖条跑马灯（颜色随区块切换） */}
      <aside className="pinkstrip">
        <div className="pinkstrip__track">
          {[0, 1].map((k) => (
            <div className="pinkstrip__chunk" key={k}>
              <Tulip className="pinkstrip__tulip" />
              <p>我们是一座关于橱窗的社会档案 · 凝视、消费与城市生活的视觉史 · </p>
              <Tulip className="pinkstrip__tulip" />
              <p>Window Archive — a social archive of shop windows, gaze and display · </p>
            </div>
          ))}
        </div>
      </aside>

      {/* 02 Garden：经典艺术档案 */}
      <Garden />

      {/* 03 Work：社会素材 */}
      <section id="work" className="work">
        <header className="hero">
          <div className="hero__sort">
            <span className="hero__sortLabel">sort-by</span>
            {eras.map((f) => (
              <button
                key={f}
                className={`hero__filter ${era === f ? 'is-active' : ''}`}
                onClick={() => setEra(f)}
              >
                {f}.
              </button>
            ))}
          </div>
          <div className="hero__right">
            <p className="hero__intro">
              一部关于橱窗的社会档案：从百货商店的玻璃剧场到算法时代的数字橱窗，
              记录凝视、消费与城市生活如何互相塑造。Based on 课程社会素材库。
            </p>
            <div className="hero__meta">
              <span>Curated&nbsp;Archive</span>
              <span>2026</span>
            </div>
          </div>
        </header>

        <main className="list">
          {list.map((item) => (
            <Row
              key={item.id}
              item={item}
              open={openIds.has(item.id)}
              onToggle={() => toggle(item.id)}
            />
          ))}
        </main>

        <footer className="foot">
          <span className="foot__count">Archive&nbsp;(&nbsp;{list.length}&nbsp;)</span>
        </footer>
      </section>

    </div>
  )
}
