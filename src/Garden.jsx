import React, { useEffect, useState } from 'react'
import { gardenItems } from './data-a.js'
import Cube from './Cube.jsx'

function src(file) {
  return '/materials-a/' + encodeURIComponent(file)
}

/* 详情放大态（复刻附图1：左图右文 + X 关闭 + 底部左右箭头） */
function Lightbox({ index, onClose, onNav }) {
  const item = gardenItems[index]
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onNav(-1)
      if (e.key === 'ArrowRight') onNav(1)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose, onNav])

  return (
    <div className="lightbox" onClick={onClose}>
      <div className="lightbox__frame" onClick={(e) => e.stopPropagation()}>
        <button className="lightbox__close" onClick={onClose} aria-label="关闭">×</button>
        <div className="lightbox__media">
          <img src={src(item.file)} alt={item.title} />
        </div>
        <div className="lightbox__text">
          <h3>{item.title}</h3>
          {(item.author || item.year) && (
            <p className="lightbox__meta">{[item.author, item.year].filter(Boolean).join(' · ')}</p>
          )}
          <p className="lightbox__desc">{item.desc}</p>
          {item.note && <p className="lightbox__note">{item.note}</p>}
        </div>
        <button className="lightbox__arrow lightbox__arrow--l" onClick={() => onNav(-1)} aria-label="上一个">←</button>
        <button className="lightbox__arrow lightbox__arrow--r" onClick={() => onNav(1)} aria-label="下一个">→</button>
      </div>
    </div>
  )
}

/* 单条平移图片带：dir = -1 右→左，1 左→右 */
function Band({ items, dir, onPick, offset }) {
  return (
    <div className={`band ${dir < 0 ? 'band--rtl' : 'band--ltr'}`}>
      <div className="band__track">
        {[0, 1].map((k) => (
          <div className="band__chunk" key={k}>
            {items.map((it) => {
              const idx = gardenItems.indexOf(it)
              return (
                <img
                  key={`${k}-${it.id}`}
                  src={src(it.file)}
                  alt={it.title}
                  loading="lazy"
                  style={{ rotate: it.rot + 'deg' }}
                  onClick={() => onPick(idx)}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Garden() {
  const [open, setOpen] = useState(null)

  const topItems = gardenItems.filter((_, i) => i % 2 === 0)
  const bottomItems = gardenItems.filter((_, i) => i % 2 === 1)

  const nav = (d) =>
    setOpen((i) => (i + d + gardenItems.length) % gardenItems.length)

  return (
    <section id="garden" className="garden">
      <header className="garden__hero">
        <div className="garden__heroLeft">
          <h2 className="garden__title">Windowshop Archive</h2>
        </div>
        <p className="garden__intro">
          从水晶宫到白立方：艺术如何一次又一次把「橱窗」变成观念。
          漂浮的作品可点击放大，右侧阅读它们的故事。
        </p>
      </header>

      {/* 上带：从右至左 */}
      <Band items={topItems} dir={-1} onPick={setOpen} />

      {/* 中央自转玻璃方体橱窗 */}
      <div className="garden__cube">
        <Cube size={220} />
      </div>

      {/* 下带：从左至右 */}
      <Band items={bottomItems} dir={1} onPick={setOpen} />

      {open !== null && (
        <Lightbox index={open} onClose={() => setOpen(null)} onNav={nav} />
      )}
    </section>
  )
}
