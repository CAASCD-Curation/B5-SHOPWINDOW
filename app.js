/* 橱窗档案 · Window Archive —— 纯静态版（无构建依赖）
   数据来自 data-social.js（items / eras）与 data-art.js（gardenItems） */
'use strict'

const SECTIONS = [
  ['01', 'Story', null],
  ['02', 'Garden', 'garden'],
  ['03', 'Work', 'work'],
  ['04', 'Contact', null],
  ['05', 'Shop', null],
]

const socialSrc = (file) => 'materials/' + encodeURIComponent(file)
const artSrc = (file) => 'materials-a/' + encodeURIComponent(file)

function el(tag, cls, html) {
  const n = document.createElement(tag)
  if (cls) n.className = cls
  if (html != null) n.innerHTML = html
  return n
}

/* 郁金香图标（右侧竖条装饰） */
const TULIP_SVG =
  '<svg class="pinkstrip__tulip" viewBox="0 0 40 56" aria-hidden="true">' +
  '<path d="M20 22 C12 22 8 14 8 6 C12 10 14 10 16 4 C18 9 22 9 24 4 C26 10 28 10 32 6 C32 14 28 22 20 22 Z" fill="#e8392a"/>' +
  '<rect x="18.4" y="22" width="3.2" height="26" fill="#e8392a"/>' +
  '<path d="M18 34 C10 32 8 26 8 24 C14 24 18 28 18 34 Z" fill="#e8392a"/>' +
  '<path d="M22 40 C30 38 32 32 32 30 C26 30 22 34 22 40 Z" fill="#e8392a"/>' +
  '</svg>'

/* ---------- 左侧章节导航 ---------- */
function buildSidenav(root) {
  const nav = el('nav', 'sidenav')
  SECTIONS.forEach(([num, name, id]) => {
    const item = el(
      'div',
      'sidenav__item' + (id ? ' is-link' : ''),
      `<span class="sidenav__num">${num}</span><span class="sidenav__name">${name}</span>`
    )
    if (id) {
      item.dataset.target = id
      item.addEventListener('click', () =>
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
      )
    }
    nav.appendChild(item)
  })
  root.appendChild(nav)
}

/* ---------- 右侧竖条跑马灯 ---------- */
function buildStrip(root) {
  const aside = el('aside', 'pinkstrip')
  const track = el('div', 'pinkstrip__track')
  for (let k = 0; k < 2; k++) {
    const chunk = el('div', 'pinkstrip__chunk')
    chunk.innerHTML =
      TULIP_SVG +
      '<p>我们是一座关于橱窗的社会档案 · 凝视、消费与城市生活的视觉史 · </p>' +
      TULIP_SVG +
      '<p>Window Archive — a social archive of shop windows, gaze and display · </p>'
    track.appendChild(chunk)
  }
  aside.appendChild(track)
  root.appendChild(aside)
}

/* ---------- 中央自转玻璃方体橱窗 ---------- */
function cubeHTML(size) {
  const half = size / 2
  const faces = [
    `rotateY(0deg) translateZ(${half}px)`,
    `rotateY(90deg) translateZ(${half}px)`,
    `rotateY(180deg) translateZ(${half}px)`,
    `rotateY(-90deg) translateZ(${half}px)`,
    `rotateX(90deg) translateZ(${half}px)`,
    `rotateX(-90deg) translateZ(${half}px)`,
  ]
  const faceHTML = faces
    .map(
      (t, i) =>
        `<div class="cube__face cube__face--${i}" style="transform:${t}">` +
        '<span class="cube__mullion cube__mullion--v"></span>' +
        '<span class="cube__mullion cube__mullion--h"></span>' +
        (i === 0 ? '<span class="cube__awning"></span>' : '') +
        '</div>'
    )
    .join('')
  return (
    `<div class="cube-scene" style="width:${size}px;height:${size}px">` +
    `<div class="cube">${faceHTML}</div><div class="cube__shadow"></div></div>`
  )
}

/* ---------- Garden 区块 ---------- */
function buildGarden(root, onPick) {
  const sec = el('section', 'garden')
  sec.id = 'garden'

  const hero = el('header', 'garden__hero')
  hero.innerHTML =
    '<div class="garden__heroLeft"><h2 class="garden__title">Windowshop Archive</h2></div>' +
    '<p class="garden__intro">从水晶宫到白立方：艺术如何一次又一次把「橱窗」变成观念。漂浮的作品可点击放大，右侧阅读它们的故事。</p>'
  sec.appendChild(hero)

  const topItems = gardenItems.filter((_, i) => i % 2 === 0)
  const bottomItems = gardenItems.filter((_, i) => i % 2 === 1)

  const band = (list, dir) => {
    const b = el('div', 'band ' + (dir < 0 ? 'band--rtl' : 'band--ltr'))
    const track = el('div', 'band__track')
    for (let k = 0; k < 2; k++) {
      const chunk = el('div', 'band__chunk')
      list.forEach((it) => {
        const img = document.createElement('img')
        img.src = artSrc(it.file)
        img.alt = it.title
        img.loading = 'lazy'
        img.style.rotate = (it.rot || 0) + 'deg'
        img.addEventListener('click', () => onPick(gardenItems.indexOf(it)))
        chunk.appendChild(img)
      })
      track.appendChild(chunk)
    }
    b.appendChild(track)
    return b
  }

  sec.appendChild(band(topItems, -1))
  const cubeWrap = el('div', 'garden__cube')
  cubeWrap.innerHTML = cubeHTML(220)
  sec.appendChild(cubeWrap)
  sec.appendChild(band(bottomItems, 1))

  root.appendChild(sec)
}

/* ---------- 详情放大态（Lightbox） ---------- */
function createLightbox() {
  let index = null
  const lb = el('div', 'lightbox')
  lb.style.display = 'none'
  lb.innerHTML =
    '<div class="lightbox__frame">' +
    '<button class="lightbox__close" aria-label="关闭">×</button>' +
    '<div class="lightbox__media"><img alt=""></div>' +
    '<div class="lightbox__text"><h3></h3><p class="lightbox__meta"></p>' +
    '<p class="lightbox__desc"></p><p class="lightbox__note"></p></div>' +
    '<button class="lightbox__arrow lightbox__arrow--l" aria-label="上一个">←</button>' +
    '<button class="lightbox__arrow lightbox__arrow--r" aria-label="下一个">→</button>' +
    '</div>'

  const img = lb.querySelector('.lightbox__media img')
  const h3 = lb.querySelector('h3')
  const meta = lb.querySelector('.lightbox__meta')
  const desc = lb.querySelector('.lightbox__desc')
  const note = lb.querySelector('.lightbox__note')

  function render() {
    const it = gardenItems[index]
    img.src = artSrc(it.file)
    img.alt = it.title
    h3.textContent = it.title
    const m = [it.author, it.year].filter(Boolean).join(' · ')
    meta.textContent = m
    meta.style.display = m ? '' : 'none'
    desc.textContent = it.desc || ''
    note.textContent = it.note || ''
    note.style.display = it.note ? '' : 'none'
  }
  function open(i) {
    index = i
    render()
    lb.style.display = ''
  }
  function close() {
    index = null
    lb.style.display = 'none'
  }
  function nav(d) {
    if (index === null) return
    index = (index + d + gardenItems.length) % gardenItems.length
    render()
  }

  lb.addEventListener('click', close)
  lb.querySelector('.lightbox__frame').addEventListener('click', (e) => e.stopPropagation())
  lb.querySelector('.lightbox__close').addEventListener('click', close)
  lb.querySelector('.lightbox__arrow--l').addEventListener('click', () => nav(-1))
  lb.querySelector('.lightbox__arrow--r').addEventListener('click', () => nav(1))
  window.addEventListener('keydown', (e) => {
    if (index === null) return
    if (e.key === 'Escape') close()
    if (e.key === 'ArrowLeft') nav(-1)
    if (e.key === 'ArrowRight') nav(1)
  })

  document.body.appendChild(lb)
  return { open, close }
}

/* ---------- Work 区块 ---------- */
function buildWork(root) {
  const sec = el('section', 'work')
  sec.id = 'work'

  const hero = el('header', 'hero')
  const sort = el('div', 'hero__sort')
  sort.appendChild(el('span', 'hero__sortLabel', 'sort-by'))
  eras.forEach((f) => {
    const btn = el('button', 'hero__filter' + (f === 'all' ? ' is-active' : ''), f + '.')
    btn.dataset.era = f
    sort.appendChild(btn)
  })
  hero.appendChild(sort)
  const right = el('div', 'hero__right')
  right.innerHTML =
    '<p class="hero__intro">一部关于橱窗的社会档案：从百货商店的玻璃剧场到算法时代的数字橱窗，记录凝视、消费与城市生活如何互相塑造。Based on 课程社会素材库。</p>' +
    '<div class="hero__meta"><span>Curated&nbsp;Archive</span><span>2026</span></div>'
  hero.appendChild(right)
  sec.appendChild(hero)

  const list = el('main', 'list')
  sec.appendChild(list)
  const foot = el('footer', 'foot')
  const count = el('span', 'foot__count')
  foot.appendChild(count)
  sec.appendChild(foot)
  root.appendChild(sec)

  /* 行渐入观察器 */
  const io = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('row--shown')
          io.unobserve(e.target)
        }
      }),
    { threshold: 0.12 }
  )

  let currentList = []
  function render(era) {
    currentList = era === 'all' ? items : items.filter((i) => i.era === era)
    list.innerHTML = ''
    currentList.forEach((it) => {
      const row = el('div', 'row')
      const head = el('button', 'row__head')
      head.setAttribute('aria-expanded', 'false')
      head.innerHTML =
        `<span class="row__title"></span><span class="row__tag"></span>`
      head.querySelector('.row__title').textContent = it.title
      head.querySelector('.row__tag').textContent = it.year
      head.addEventListener('click', () => {
        const open = row.classList.toggle('row--open')
        head.setAttribute('aria-expanded', String(open))
      })
      row.appendChild(head)

      const body = el('div', 'row__body')
      const inner = el('div', 'row__bodyInner')
      const media = el('div', 'row__media')
      const img = document.createElement('img')
      img.src = socialSrc(it.file)
      img.alt = it.title
      img.loading = 'lazy'
      media.appendChild(img)
      inner.appendChild(media)

      const text = el('div', 'row__text')
      const m = [it.author, it.year].filter(Boolean).join(' · ')
      if (m) text.appendChild(el('p', 'row__meta', '')).textContent = m
      text.appendChild(el('p', 'row__desc', '')).textContent = it.desc || ''
      if (it.note) text.appendChild(el('p', 'row__note', '')).textContent = it.note
      inner.appendChild(text)

      const cta = el('div', 'row__cta', '<span>See</span><span>full</span><span>case</span><span>study</span>')
      inner.appendChild(cta)
      body.appendChild(inner)
      row.appendChild(body)

      io.observe(row)
      setTimeout(() => row.classList.add('row--shown'), 1400)
      list.appendChild(row)
    })
    count.innerHTML = 'Archive&nbsp;(&nbsp;' + currentList.length + '&nbsp;)'
  }

  sort.addEventListener('click', (e) => {
    const btn = e.target.closest('.hero__filter')
    if (!btn) return
    sort.querySelectorAll('.hero__filter').forEach((b) => b.classList.remove('is-active'))
    btn.classList.add('is-active')
    render(btn.dataset.era)
  })

  render('all')
}

/* ---------- 滚动：Garden 渐隐 + 区块状态切换 ---------- */
function bindScrollFX(root) {
  const garden = document.getElementById('garden')
  const work = document.getElementById('work')
  let raf = 0
  const onScroll = () => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => {
      const top = work.getBoundingClientRect().top
      const p = Math.min(Math.max(1 - top / window.innerHeight, 0), 1)
      garden.style.opacity = String(Math.max(1 - p * 1.25, 0))
      const active = top > window.innerHeight * 0.5 ? 'garden' : 'work'
      root.classList.toggle('page--garden', active === 'garden')
      root.classList.toggle('page--work', active === 'work')
      document.querySelectorAll('.sidenav__item.is-link').forEach((n) => {
        n.classList.toggle('is-active', n.dataset.target === active)
      })
    })
  }
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
}

/* ---------- 启动 ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const root = el('div', 'page page--garden')
  document.body.appendChild(root)
  buildSidenav(root)
  buildStrip(root)
  const lb = createLightbox()
  buildGarden(root, lb.open)
  buildWork(root)
  bindScrollFX(root)
})
