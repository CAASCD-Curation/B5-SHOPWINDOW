/* 橱窗档案 · Window Archive —— 纯静态版（无构建依赖）
   四大板块：A 经典艺术档案 / B 文学意象 / C 社会素材 / D 形式灵感
   数据来自 data-art.js / data-literature.js / data-social.js / data-form.js */
'use strict'

const SECTIONS = [
  ['01', 'View', 'start'],
  ['02', 'Display', 'garden'],
  ['03', 'Index Work', 'work'],
]

const socialSrc = (file) => 'materials/' + encodeURIComponent(file)
const artSrc = (file) => 'materials-a/' + encodeURIComponent(file)
const litSrc = (file) => 'materials-b/' + encodeURIComponent(file)
const formSrc = (file) => 'materials-d/' + encodeURIComponent(file)

/* 四大板块注册表（Work 区平行板块 + study 跨板块跳转用） */
const ARCHIVE = {
  art: { label: '艺术档案', items: gardenItems, src: artSrc },
  lit: { label: '文学意象', items: litItems, src: litSrc },
  soc: { label: '社会素材', items: items, src: socialSrc },
  form: { label: '形式灵感', items: formItems, src: formSrc },
}
Object.entries(ARCHIVE).forEach(([sec, A]) =>
  A.items.forEach((it, i) => { it.__sec = sec; it.__idx = i })
)

/* 板块 key ↔ 十维分类表的分区字母 */
const SEC_LETTER = { art: 'A', lit: 'B', soc: 'C', form: 'D' }

function el(tag, cls, html) {
  const n = document.createElement(tag)
  if (cls) n.className = cls
  if (html != null) n.innerHTML = html
  return n
}

/* 手动缓动滚动：定时器驱动 + 每步显式定位（behavior:'instant' 绕过 CSS 平滑），
   避免原生平滑滚动在 sticky 区块/多调用场景下被中途取消；
   用 setInterval 而非 rAF，保证在后台标签/省电模式下也能完成滚动 */
let scrollAnimTimer = 0
function smoothScrollTo(y) {
  clearInterval(scrollAnimTimer)
  const startY = window.scrollY
  const dist = y - startY
  if (Math.abs(dist) < 2) return
  const dur = Math.min(1000, 320 + Math.abs(dist) * 0.22)
  const t0 = performance.now()
  const ease = (t) => 1 - Math.pow(1 - t, 3)
  scrollAnimTimer = setInterval(() => {
    const t = Math.min((performance.now() - t0) / dur, 1)
    window.scrollTo({ top: startY + dist * ease(t), behavior: 'instant' })
    if (t >= 1) clearInterval(scrollAnimTimer)
  }, 16)
}

/* sticky 区块的 offsetTop 会随吸附位置变化（等于当前 scrollY），
   改用「前面兄弟 section 高度累加」计算区块在文档中的绝对位置
   （跳过 fixed 定位的导航/跑马灯等非流内元素） */
function sectionY(id) {
  const sec = document.getElementById(id)
  if (!sec || !sec.parentElement) return 0
  let y = 0
  for (let n = sec.parentElement.firstElementChild; n && n !== sec; n = n.nextElementSibling) {
    if (n.tagName === 'SECTION') y += n.offsetHeight
  }
  return y
}

/* 关键词拆分（数据库分隔符：/ ｜ | 、 ， ,） */
function kwList(it) {
  const seen = new Set()
  return (it.kw || '')
    .split(/[/｜|、，,]/)
    .map((s) => s.trim())
    .filter((s) => s && !seen.has(s) && seen.add(s))
}

/* 全库关键词索引：规范词 -> [{sec, i}] */
const kwIndex = {}
Object.entries(ARCHIVE).forEach(([sec, A]) =>
  A.items.forEach((it, i) =>
    kwList(it).forEach((k) => {
      ;(kwIndex[k] = kwIndex[k] || []).push({ sec, i })
    })
  )
)

/* 相关词条：共享关键词越多越靠前，最多 12 条 */
function relatedEntries(it) {
  const scores = new Map()
  kwList(it).forEach((k) =>
    (kwIndex[k] || []).forEach((r) => {
      if (r.sec === it.__sec && r.i === it.__idx) return
      const key = r.sec + ':' + r.i
      scores.set(key, (scores.get(key) || 0) + 1)
    })
  )
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([key, score]) => {
      const [sec, i] = key.split(':')
      return { sec, i: Number(i), score }
    })
}

/* 年份短标签（文学板块年份较长，取首个四位年份） */
function yearTag(it) {
  const y = (it.year || '').trim()
  if (!y) return ''
  if (y.length <= 12) return y
  const m = y.match(/(1[0-9]{3}|20[0-9]{2})/)
  return m ? m[1] : y.slice(0, 10)
}

/* 氛围灯光色（每个板块固定一种）：sec -> [RGB, HEX] */
const SECTION_GLOW = {
  art: ['222,145,248', '#de91f8'],  // 艺术档案 · 紫
  lit: ['115,229,252', '#73e5fc'],  // 文学意象 · 青蓝
  soc: ['255,150,40', '#ff9628'],   // 社会素材 · 荧光橙
  form: ['235,255,96', '#ebff60'],  // 形式灵感 · 荧光黄
}

/* ---------- 左侧章节导航（3 大类 + 子索引） ---------- */
let navRenderCustoms = null /* 聚类自定义组改名时刷新导航 */
let workSetDim = null /* buildWork 注册的十维筛选切换函数 */

function navFocusCluster(gid) {
  if (clusterOpen && clusterFocusFn) {
    clusterFocusFn(gid)
  } else {
    pendingFocusGid = gid
    openCluster()
  }
}

function navToggleDim(i, g) {
  const go = () => {
    smoothScrollTo(sectionY('work'))
    if (workSetDim) workSetDim(i, g)
  }
  if (clusterCloseFn) {
    /* 聚类锁住了页面滚动：先退出聚类，锁解除后再跳转 */
    clusterCloseFn()
    setTimeout(go, 520)
  } else {
    go()
  }
}

function buildSidenav(root) {
  const nav = el('nav', 'sidenav')

  /* 02 Display 子索引容器（挂在 02 与 03 之间：关键词 + 自定义组实时列表） */
  const sub2 = el('div', 'sidenav__sub sidenav__sub--kw')
  CLUSTER_KWS.forEach((kw, i) => {
    const cnt = Object.values(ARCHIVE).reduce(
      (n, A) => n + A.items.filter((it) => it.file && kwList(it).includes(kw)).length,
      0
    )
    const b = el('button', 'sidenav__kw', kw + ' ')
    b.appendChild(el('i', '', String(cnt)))
    b.title = kw
    b.addEventListener('click', () => navFocusCluster('k' + i))
    sub2.appendChild(b)
  })
  const customBox = el('div', 'sidenav__custom')
  sub2.appendChild(customBox)
  navRenderCustoms = () => {
    customBox.innerHTML = ''
    Object.entries(clusterCustoms).forEach(([gid, name]) => {
      const b = el('button', 'sidenav__kw sidenav__kw--custom', '✦ ' + escapeHtml(name))
      b.title = name
      b.addEventListener('click', () => navFocusCluster(gid))
      customBox.appendChild(b)
    })
  }

  /* 03 Index Work 子索引容器：十维分类（与顶部板块索引构成坐标轴），
     格式与 02 关键词索引一致：斜体 + 词条数；
     每个维度可展开其细分组（数据来源：十维分类结果表内的 ■ 分组） */
  const sub3 = el('div', 'sidenav__sub sidenav__sub--dim')
  TAXONOMY.forEach((d, i) => {
    const cnt = d.groups.reduce((n, g) => n + Object.values(g.sec).reduce((m, a) => m + a.length, 0), 0)
    const wrap = el('div', 'sidenav__dimWrap')
    wrap.dataset.dim = String(i)
    const b = el('button', 'sidenav__dim', d.name + ' ')
    b.appendChild(el('i', '', String(cnt)))
    b.dataset.dim = String(i)
    b.title = d.name
    b.addEventListener('click', () => navToggleDim(i, null))
    wrap.appendChild(b)
    const grps = el('div', 'sidenav__dimGrps')
    d.groups.forEach((g, gi) => {
      const gcnt = Object.values(g.sec).reduce((n, a) => n + a.length, 0)
      const gb = el('button', 'sidenav__dimGrp', g.name + ' ')
      gb.appendChild(el('i', '', String(gcnt)))
      gb.dataset.dim = String(i)
      gb.dataset.grp = String(gi)
      gb.title = g.name
      gb.addEventListener('click', () => navToggleDim(i, gi))
      grps.appendChild(gb)
    })
    wrap.appendChild(grps)
    sub3.appendChild(wrap)
  })

  SECTIONS.forEach(([num, name, id]) => {
    const item = el(
      'div',
      'sidenav__item' + (id ? ' is-link' : ''),
      `<span class="sidenav__num">${num}</span><span class="sidenav__name">${name}</span>`
    )
    if (id) {
      item.dataset.target = id
      item.addEventListener('click', () => {
        const go = () => smoothScrollTo(sectionY(id))
        if (clusterCloseFn) {
          /* 聚类锁住了页面滚动：先退出聚类，锁解除后再跳转 */
          clusterCloseFn()
          setTimeout(go, 520)
        } else {
          go()
        }
      })
    }
    nav.appendChild(item)
    if (num === '02') nav.appendChild(sub2)
    if (num === '03') nav.appendChild(sub3)
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
      WINDOW_SVG +
      '<p>我们是一座关于橱窗的社会档案 · 凝视、消费与城市生活的视觉史 · </p>' +
      WINDOW_SVG +
      '<p>Window Archive — a social archive of shop windows, gaze and display · </p>'
    track.appendChild(chunk)
  }
  aside.appendChild(track)
  root.appendChild(aside)
}

/* ---------- 中央自转 2×2×1 闭合长方体小橱窗（材质与原立方体一致） ---------- */
function cuboidHTML(w, h, d) {
  const faces = [
    { t: `rotateY(0deg) translateZ(${d / 2}px)`, w: w, h: h, front: true },
    { t: `rotateY(90deg) translateZ(${w / 2}px)`, w: d, h: h },
    { t: `rotateY(180deg) translateZ(${d / 2}px)`, w: w, h: h },
    { t: `rotateY(-90deg) translateZ(${w / 2}px)`, w: d, h: h },
    { t: `rotateX(90deg) translateZ(${h / 2}px)`, w: w, h: d },
    { t: `rotateX(-90deg) translateZ(${h / 2}px)`, w: w, h: d },
  ]
  const faceHTML = faces
    .map(
      (f, i) =>
        `<div class="cube__face cube__face--${i}${f.front ? '' : ' cube__face--side'}" style="width:${f.w}px;height:${f.h}px;transform:${f.t}">` +
        '<span class="cube__mullion cube__mullion--v"></span>' +
        '<span class="cube__mullion cube__mullion--h"></span>' +
        (f.front ? '<span class="cube__awning"></span>' : '') +
        '</div>'
    )
    .join('')
  return (
    `<div class="cube-scene" style="width:${w}px;height:${h}px">` +
    `<div class="cube">${faceHTML}` +
    /* 腔内展示画：让盒子读起来像闭合的小橱窗 */
    `<div class="cube__display" style="width:${(w * 0.68).toFixed(0)}px;height:${(h * 0.68).toFixed(0)}px;transform:rotateY(180deg) translateZ(${(d / 2 - 8).toFixed(0)}px)"><img alt=""></div>` +
    `</div><div class="cube__shadow"></div></div>`
  )
}

/* 郁金香图标（study 缩略图空图占位） */
const TULIP_SVG =
  '<svg class="pinkstrip__tulip" viewBox="0 0 40 56" aria-hidden="true">' +
  '<path d="M20 22 C12 22 8 14 8 6 C12 10 14 10 16 4 C18 9 22 9 24 4 C26 10 28 10 32 6 C32 14 28 22 20 22 Z" fill="#e8392a"/>' +
  '<rect x="18.4" y="22" width="3.2" height="26" fill="#e8392a"/>' +
  '<path d="M18 34 C10 32 8 26 8 24 C14 24 18 28 18 34 Z" fill="#e8392a"/>' +
  '<path d="M22 40 C30 38 32 32 32 30 C26 30 22 34 22 40 Z" fill="#e8392a"/>' +
  '</svg>'

/* 橱窗图标（右侧竖条装饰）：雨棚 + 双扇橱窗 + 窗台底座，单色剪影风格 */
const WINDOW_SVG =
  '<svg class="pinkstrip__win" viewBox="0 0 40 56" aria-hidden="true">' +
  '<path d="M7 3 H33 L36 11 Q32 14.5 28 11 Q24 14.5 20 11 Q16 14.5 12 11 Q8 14.5 4 11 L7 3 Z" fill="#e8392a"/>' +
  '<rect x="7" y="16" width="26" height="3" fill="#e8392a"/>' +
  '<rect x="7" y="16" width="3" height="30" fill="#e8392a"/>' +
  '<rect x="30" y="16" width="3" height="30" fill="#e8392a"/>' +
  '<rect x="10" y="19" width="9" height="27" fill="#e8392a"/>' +
  '<rect x="21" y="19" width="9" height="27" fill="#e8392a"/>' +
  '<rect x="5" y="46" width="30" height="3.5" fill="#e8392a"/>' +
  '<rect x="9" y="49.5" width="22" height="4" fill="#e8392a"/>' +
  '</svg>'

/* ---------- 图片平移带（Garden 与 页面1 橱窗共用） ---------- */
function makeBand(list, dir, opts) {
  opts = opts || {}
  const b = el('div', 'band ' + (dir < 0 ? 'band--rtl' : 'band--ltr') + (opts.small ? ' band--small' : ''))
  const track = el('div', 'band__track')
  for (let k = 0; k < 2; k++) {
    const chunk = el('div', 'band__chunk')
    list.forEach((it) => {
      const img = document.createElement('img')
      img.src = artSrc(it.file)
      img.alt = it.title
      img.loading = 'lazy'
      img.style.rotate = (it.rot || 0) + 'deg'
      if (opts.onPick) {
        img.addEventListener('click', (e) => {
          e.stopPropagation()
          opts.onPick(gardenItems.indexOf(it))
        })
      }
      chunk.appendChild(img)
    })
    track.appendChild(chunk)
  }
  b.appendChild(track)
  return b
}

/* ---------- Garden 区块（页面2） ---------- */
function buildGarden(root, onPick) {
  const sec = el('section', 'garden')
  sec.id = 'garden'

  const hero = el('header', 'garden__hero')
  hero.innerHTML =
    '<div class="garden__heroLeft"><h2 class="garden__title"><span class="garden__titleCn">橱窗</span><span class="garden__titleEn">Windowshop</span></h2></div>' +
    '<div class="garden__intro"><p class="garden__introCn">从水晶宫到白立方：艺术如何一次又一次把「橱窗」变成观念。漂浮的作品可点击放大，右侧阅读它们的故事。</p>' +
    '<p class="garden__introEn">From the Crystal Palace to the White Cube: how art keeps turning the “shop window” into an idea. Click the drifting works to enlarge, and read their stories on the right.</p></div>'
  sec.appendChild(hero)

  const topItems = gardenItems.filter((_, i) => i % 2 === 0)
  const bottomItems = gardenItems.filter((_, i) => i % 2 === 1)

  sec.appendChild(makeBand(topItems, -1, { onPick }))
  const cubeWrap = el('div', 'garden__cube')
  cubeWrap.innerHTML = cuboidHTML(250, 250, 125)
  const displayImg = cubeWrap.querySelector('.cube__display img')
  if (displayImg) displayImg.src = artSrc(gardenItems[5].file)
  cubeWrap.title = '点击按关键词分组'
  cubeWrap.addEventListener('click', () => openCluster())
  sec.appendChild(cubeWrap)
  sec.appendChild(makeBand(bottomItems, 1, { onPick }))

  root.appendChild(sec)
}

/* ---------- 页面1：开始页（Hermès 式奶油橱窗：顶灯 + 渐变内壁 + 漂浮商品） ---------- */
function buildStart(root) {
  const sec = el('section', 'start')
  sec.id = 'start'

  /* 标题与注释（保留） */
  const hero = el('header', 'garden__hero')
  hero.innerHTML =
    '<div class="garden__heroLeft"><h2 class="garden__title"><span class="garden__titleCn">橱窗</span><span class="garden__titleEn">Windowshop</span></h2></div>' +
    '<div class="garden__intro"><p class="garden__introCn">从水晶宫到白立方：艺术如何一次又一次把「橱窗」变成观念。漂浮的作品可点击放大，右侧阅读它们的故事。</p>' +
    '<p class="garden__introEn">From the Crystal Palace to the White Cube: how art keeps turning the “shop window” into an idea. Click the drifting works to enlarge, and read their stories on the right.</p></div>'
  sec.appendChild(hero)

  /* 凹陷橱窗：奶油外框 → 开口裁剪层 → 3D 内腔（奶油天花板 + 一排射灯 +
     蓝绿渐变后壁 + 有机色块）+ 悬挂 WINDOWSHOP 字 + 玻璃反光层 */
  const win = el('div', 'win')
  win.innerHTML =
    '<div class="win__frame"></div>' +
    '<div class="win__clip">' +
    '<div class="win__scene">' +
    '<div class="win__room">' +
    '<div class="win__wall win__wall--t"><div class="win__spots">' +
    '<span></span><span></span><span></span><span></span><span></span>' +
    '<span></span><span></span><span></span><span></span>' +
    '</div></div>' +
    '<div class="win__wall win__wall--b"></div>' +
    '<div class="win__wall win__wall--l"></div>' +
    '<div class="win__wall win__wall--r"></div>' +
    '<div class="win__back">' +
    '<i class="win__blob win__blob--g"></i>' +
    '<i class="win__blob win__blob--y"></i>' +
    '<i class="win__blob win__blob--b"></i>' +
    '</div>' +
    '</div></div>' +
    '<div class="win__goods"></div>' +
    '<div class="win__brand">' +
    '<i class="win__wire win__wire--l"></i><i class="win__wire win__wire--r"></i>' +
    '<span>Windowshop</span></div>' +
    '<div class="win__glass"></div>' +
    '<div class="win__cta"><span>Windowshop</span><span>Start</span></div>' +
    '</div>'

  /* 商品陈列：指定 17 件词条（存图二号图包），原比例、放大、错落堆叠 */
  const goods = win.querySelector('.win__goods')
  /* [匹配词, left%, top%, 高度px, 是否泡泡罩, 旋转deg] */
  const CURATED = [
    ['女神游乐厅', 10.5, 42.8, 90, false, -1],
    ['shanghart', 34.5, 33.0, 70, false, 1],
    ['维纳斯之梦', 51.5, 35.0, 95, true, -1],
    ['greenwashing', 80.3, 58.5, 85, false, 1],
    ['夜鹰', 18.7, 32.1, 128, false, -1],
    ['25windows', 18.2, 59.5, 76, false, -1],
    ['糖果店', 32.6, 57.2, 83, false, 1],
    ['舔橱窗', 38.1, 48.0, 98, true, -1],
    ['thestore', 77.5, 30.0, 90, false, 1],
    ['塑料女孩', 62.1, 31.2, 80, false, -1],
    ['沃霍尔', 66.1, 45.3, 70, false, 1],
    ['dewallen', 72.1, 63.7, 88, false, -1],
    ['ondriatanner', 54.6, 64.2, 116, false, 1],
    ['主题叙事', 27.3, 73.9, 80, false, -1],
    ['selfridgeschristmas', 46.1, 75.4, 80, false, 1],
    ['voteworldpeace', 59.9, 76.1, 88, false, -1],
    ['pradamarfa', 75.2, 76.1, 90, false, 1],
    ['apple', 12, 77, 75, false, -1],
  ]
  const normT = (s) =>
    String(s)
      .replace(/^\[(主|次)\]\s*/, '')
      .replace(/[\s《》“”"'·:：,，.。()（）\[\]\-—_「」&×]/g, '')
      .toLowerCase()
  const picks = []
  CURATED.forEach(([q, L, T, H, bub, R]) => {
    const qq = normT(q)
    for (const [secKey, A] of Object.entries(ARCHIVE)) {
      const it = A.items.find((x) => x.file && normT(x.title).includes(qq))
      if (it) {
        picks.push({ sec: secKey, it, L, T, H, bub, R })
        break
      }
    }
  })
  picks.forEach((p, i) => {
    const holder = el('div', 'win__good' + (p.bub ? ' win__good--bubble' : ''))
    holder.style.left = p.L + '%'
    holder.style.top = p.T + '%'
    holder.style.setProperty('--gh', p.H + 'px')
    holder.style.setProperty('--rot', p.R + 'deg')
    holder.style.animationDuration = (5.2 + (i % 4) * 1.15) + 's'
    holder.style.animationDelay = (-(i * 0.83)) + 's'
    holder.title = p.it.title
    const img = document.createElement('img')
    img.src = ARCHIVE[p.sec].src(p.it.file)
    img.alt = p.it.title
    img.loading = 'lazy'
    holder.appendChild(img)
    goods.appendChild(holder)
  })

  /* 点击橱窗 → 镜头推进（橱窗放大）进入页面2；滚轮下滑仍为常规切换 */
  let zooming = false
  win.addEventListener('click', () => {
    if (zooming) return
    zooming = true
    sec.classList.add('start--zoom')
    setTimeout(
      () => document.getElementById('garden').scrollIntoView({ behavior: 'smooth' }),
      260
    )
    setTimeout(() => {
      sec.classList.remove('start--zoom')
      zooming = false
    }, 1450)
  })

  sec.appendChild(win)
  root.appendChild(sec)
}

/* ---------- 页面2 聚类模式：点击长方体 → 平移图片按关键词分组（关键词表 sheet2，词条数≥5） ---------- */
const CLUSTER_KWS = [
  '欲望', '观看', '身体', '商品', '玻璃', '反射', '消费', '凝视', '阶级', '幻象',
  '占有', '人体模型', '透明', '收藏', '身份', '橱窗', '可见性', '不可及', '权力',
  '展示机制', '选择', '界面', '幻想', '观看者', '公共空间', '街道', '时间',
]

let clusterOpen = false
let clusterCloseFn = null
let lightboxRef = null
let clusterFocusFn = null /* 打开时提供：飞到指定 gid 的堆 */
let clusterPiles = {} /* gid → {x,y} 画布中心坐标 */
let clusterCustoms = {} /* gid → 自定义组名（实时同步到导航） */
let pendingFocusGid = null

function openCluster() {
  if (clusterOpen) return
  clusterOpen = true

  /* 分组数据：全库中命中关键词且带图的词条 */
  const groups = []
  CLUSTER_KWS.forEach((kw) => {
    const imgs = []
    Object.entries(ARCHIVE).forEach(([sec, A]) =>
      A.items.forEach((it) => {
        if (it.file && kwList(it).includes(kw)) imgs.push({ sec, it })
      })
    )
    if (imgs.length) groups.push({ kw, imgs })
  })

  /* 覆盖层：固定全屏白底（蓝色褪去），左侧让出导航栏 */
  const ov = el('div', 'clu')
  const back = el('button', 'clu__back')
  back.innerHTML = WINDOW_SVG
  back.title = '返回'
  const hint = el('p', 'clu__hint', '左键拖拽 · 中键上下拖动缩放 · 双击图片查看详情')
  const vp = el('div', 'clu__vp')
  const cv = el('div', 'clu__cv')
  vp.appendChild(cv)
  ov.appendChild(vp)
  ov.appendChild(back)
  ov.appendChild(hint)
  document.body.appendChild(ov)
  document.body.style.overflow = 'hidden'
  document.body.classList.add('is-cluster')

  /* 画布：随机分布（dvein 式 —— 图组小、不对齐、留白巨大，一屏约 5 组，其余拖出来） */
  const CW = 4200, CH = 3500
  cv.style.width = CW + 'px'
  cv.style.height = CH + 'px'
  const PILE_W = 280, PILE_H = 250 /* 自定义新堆的基准尺寸 */
  const placed = []
  function randPos() {
    for (let t = 0; t < 120; t++) {
      const x = 320 + Math.random() * (CW - 640)
      const y = 300 + Math.random() * (CH - 600)
      if (!placed.some((p) => Math.hypot(p.x - x, p.y - y) < 700)) {
        placed.push({ x, y })
        return { x, y }
      }
    }
    const x = 320 + Math.random() * (CW - 640)
    const y = 300 + Math.random() * (CH - 600)
    placed.push({ x, y })
    return { x, y }
  }

  let zTop = 100 /* 拖拽置顶层级高于堆心图(60) */
  let customSeq = 0
  const customNames = {}
  let nameDlg = null
  const allImgs = []
  const detailList = []

  function closeNameDlg() {
    if (nameDlg) { nameDlg.remove(); nameDlg = null }
  }

  function refreshCustomLabel(gid, pile) {
    if (!pile._label) {
      pile._label = el('div', 'clu__label clu__label--custom', '')
      pile._label.addEventListener('click', (e) => {
        e.stopPropagation()
        openNameDlg(gid, pile, parseFloat(pile.style.left), parseFloat(pile.style.top))
      })
      cv.appendChild(pile._label)
    }
    pile._label.innerHTML = '<b>' + escapeHtml(customNames[gid] || '自定义分组') + '</b><i>' + pile.children.length + ' 张</i>'
    pile._label.style.left = pile.style.left
    pile._label.style.top = parseFloat(pile.style.top) - 30 + 'px'
    /* 实时同步到左侧导航 */
    clusterCustoms[gid] = customNames[gid] || '自定义分组'
    if (navRenderCustoms) navRenderCustoms()
  }

  function openNameDlg(gid, pile, x, y) {
    closeNameDlg()
    nameDlg = el('div', 'clu__dlg')
    nameDlg.innerHTML =
      '<input type="text" maxlength="12" value="' + escapeHtml(customNames[gid] || '自定义分组') + '">' +
      '<button type="button">确定</button>'
    nameDlg.style.left = Math.max(20, x) + 'px'
    nameDlg.style.top = Math.max(20, y - 74) + 'px'
    nameDlg.addEventListener('pointerdown', (e) => e.stopPropagation())
    cv.appendChild(nameDlg)
    const input = nameDlg.querySelector('input')
    setTimeout(() => { input.focus(); input.select() }, 60)
    const ok = () => {
      customNames[gid] = input.value.trim() || '自定义分组'
      refreshCustomLabel(gid, pile)
      closeNameDlg()
    }
    nameDlg.querySelector('button').addEventListener('click', ok)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') ok()
      if (e.key === 'Escape') closeNameDlg()
    })
  }

  function moveToPile(im, pile) {
    /* 图片当前画布坐标 → 转为相对 pile 的坐标 */
    const srcPile = im.closest('.clu__pile')
    let px = parseFloat(im.style.left), py = parseFloat(im.style.top)
    if (srcPile) { px += parseFloat(srcPile.style.left); py += parseFloat(srcPile.style.top) }
    const nx = px - parseFloat(pile.style.left)
    const ny = py - parseFloat(pile.style.top)
    pile.appendChild(im)
    im.style.left = nx + 'px'
    im.style.top = ny + 'px'
  }

  function canvasPos(im) {
    const pile = im.closest('.clu__pile')
    let x = parseFloat(im.style.left), y = parseFloat(im.style.top)
    if (pile) { x += parseFloat(pile.style.left); y += parseFloat(pile.style.top) }
    return { x: x + im.offsetWidth / 2, y: y + im.offsetHeight / 2 }
  }

  /* 拖放重组：落到另一张图片附近时，两者组成全新一堆并弹出组名 */
  function regroup(im) {
    const myPile = im.closest('.clu__pile')
    const myGid = myPile ? myPile.dataset.gid : null
    const p = canvasPos(im)
    let best = null, bestD = 110
    allImgs.forEach((o) => {
      if (o === im) return
      const q = canvasPos(o)
      const d = Math.hypot(q.x - p.x, q.y - p.y)
      if (d < bestD) { bestD = d; best = o }
    })
    if (!best) return
    const bestPile = best.closest('.clu__pile')
    const bestGid = bestPile ? bestPile.dataset.gid : null
    if (bestGid && bestGid === myGid) return
    if (bestGid && bestGid.charAt(0) === 'c') {
      moveToPile(im, bestPile)
      refreshCustomLabel(bestGid, bestPile)
      return
    }
    /* 全新的一堆 */
    const gid = 'c' + (++customSeq)
    const pile = el('div', 'clu__pile')
    pile.dataset.gid = gid
    const bp = canvasPos(best)
    pile.style.left = bp.x - PILE_W / 2 + 'px'
    pile.style.top = bp.y - PILE_H / 2 + 'px'
    cv.appendChild(pile)
    clusterPiles[gid] = { x: bp.x, y: bp.y }
    moveToPile(best, pile)
    moveToPile(im, pile)
    refreshCustomLabel(gid, pile)
    openNameDlg(gid, pile, bp.x - PILE_W / 2, bp.y - PILE_H / 2)
  }

  function bindImgDrag(im) {
    im.addEventListener('pointerdown', (e) => {
      e.stopPropagation()
      if (e.button !== 0) return
      im.setPointerCapture(e.pointerId)
      const sx = e.clientX, sy = e.clientY
      const ox = parseFloat(im.style.left), oy = parseFloat(im.style.top)
      im.style.zIndex = String(++zTop)
      im.classList.add('is-held')
      let raf = 0
      const mv = (ev) => {
        if (raf) return
        const dx = ev.clientX - sx, dy = ev.clientY - sy
        raf = requestAnimationFrame(() => {
          raf = 0
          im.style.left = ox + dx + 'px'
          im.style.top = oy + dy + 'px'
        })
      }
      const up = (ev) => {
        if (raf) { cancelAnimationFrame(raf); raf = 0 }
        im.removeEventListener('pointermove', mv)
        im.removeEventListener('pointerup', up)
        im.removeEventListener('pointercancel', up)
        try { im.releasePointerCapture(ev.pointerId) } catch (_) {}
        im.classList.remove('is-held')
        regroup(im)
      }
      im.addEventListener('pointermove', mv)
      im.addEventListener('pointerup', up)
      im.addEventListener('pointercancel', up)
    })
  }

  /* 生成各组图片堆 + 关键词标签 + 飞入动效（随机位置，不对齐；词条越多堆越大） */
  groups.forEach((g, gi) => {
    const pos = randPos()
    const cx = pos.x, cy = pos.y
    const n = g.imgs.length
    /* 组尺寸系数：5 词条≈0.91，21 词条≈1.6（图与文字同步放大） */
    const s = Math.min(1.6, 0.7 + (n / 21) * 0.9)
    const pw = PILE_W * s, ph = PILE_H * s
    const pile = el('div', 'clu__pile')
    pile.dataset.gid = 'k' + gi
    pile.style.left = cx - pw / 2 + 'px'
    pile.style.top = cy - ph / 2 + 'px'
    cv.appendChild(pile)
    clusterPiles['k' + gi] = { x: cx, y: cy }

    const label = el('div', 'clu__label', '<b>' + escapeHtml(g.kw) + '</b><i>' + n + ' 词条</i>')
    label.style.left = pile.style.left
    label.style.top = cy - ph / 2 - 34 * s + 'px'
    label.style.fontSize = (13 * s).toFixed(1) + 'px'
    cv.appendChild(label)

    g.imgs.forEach(({ sec, it }, ii) => {
      const im = document.createElement('img')
      im.src = ARCHIVE[sec].src(it.file)
      im.alt = it.title
      im.title = it.title
      im.className = 'clu__img'
      let w, x, y, z, rot
      if (ii === 0) {
        /* 堆心：一张最大的图压在正中间最上层 */
        w = (135 + Math.random() * 35) * s
        x = pw / 2 - w / 2 + (Math.random() * 16 - 8)
        y = ph / 2 - w * 0.45 + (Math.random() * 16 - 8)
        z = 60
        rot = Math.random() * 6 - 3
      } else {
        /* 其余围成一圈交叠垫在下面 */
        const ring = n - 1
        const idx = ii - 1
        const ang = (idx / ring) * Math.PI * 2 + (Math.random() * 0.5 - 0.25)
        const rx = (95 + Math.random() * 30) * s
        const ry = (78 + Math.random() * 24) * s
        w = (62 + Math.random() * 46) * s
        x = pw / 2 + Math.cos(ang) * rx - w / 2
        y = ph / 2 + Math.sin(ang) * ry * 0.82 - w * 0.4
        z = 1 + Math.floor(Math.random() * Math.min(ring, 20))
        rot = Math.random() * 20 - 10
      }
      im.style.width = w.toFixed(0) + 'px'
      im.style.left = x.toFixed(0) + 'px'
      im.style.top = y.toFixed(0) + 'px'
      im.style.rotate = rot.toFixed(1) + 'deg'
      im.style.zIndex = String(z)
      /* 入场：从画布各处飞入堆中（模拟平移带图片汇聚） */
      const dx = (Math.random() * 2 - 1) * 1300
      const dy = (Math.random() * 2 - 1) * 850
      im.style.transform = 'translate(' + dx.toFixed(0) + 'px,' + dy.toFixed(0) + 'px) scale(.45)'
      im.style.opacity = '0'
      im.style.transitionDelay = (gi * 25 + ii * 30) + 'ms'
      pile.appendChild(im)
      allImgs.push(im)
      detailList.push({ it, src: ARCHIVE[sec].src })
      bindImgDrag(im)
      /* 双击查看词条详情 */
      im.addEventListener('dblclick', (e) => {
        e.stopPropagation()
        const idx = allImgs.indexOf(im)
        if (lightboxRef && idx >= 0) lightboxRef.open(detailList, idx, { pink: false })
      })
    })
  })

  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      ov.classList.add('is-in')
      allImgs.forEach((im) => {
        im.style.transform = 'translate(0,0) scale(1)'
        im.style.opacity = '1'
      })
      setTimeout(() => allImgs.forEach((im) => { im.style.transitionDelay = '0ms' }), 3200)
      /* 导航跳转：等图片落位后飞到目标堆 */
      setTimeout(() => {
        if (pendingFocusGid) {
          const g = pendingFocusGid
          pendingFocusGid = null
          focusPile(g)
        }
      }, 1150)
    })
  )

  /* 平滑飞到指定堆（居中、中等大小） */
  let flyRaf = 0
  function flyTo(tx2, ty2, k2) {
    cancelAnimationFrame(flyRaf)
    const step = () => {
      tx += (tx2 - tx) * 0.14
      ty += (ty2 - ty) * 0.14
      k += (k2 - k) * 0.14
      kTarget = k
      applyPan()
      if (Math.abs(tx2 - tx) > 0.5 || Math.abs(ty2 - ty) > 0.5 || Math.abs(k2 - k) > 0.003) {
        flyRaf = requestAnimationFrame(step)
      } else {
        tx = tx2; ty = ty2; k = k2; kTarget = k2
        applyPan()
        flyRaf = 0
      }
    }
    flyRaf = requestAnimationFrame(step)
  }
  function focusPile(gid) {
    const p = clusterPiles[gid]
    if (!p) return
    const k2 = 1 /* 中等大小 */
    flyTo(vp.clientWidth / 2 - p.x * k2, vp.clientHeight / 2 - p.y * k2, k2)
  }
  clusterFocusFn = focusPile

  /* 平移画布（左键拖空白处） + 中键上下拖动缩放 + 滚轮平滑缩放 */
  let tx = 0, ty = 0, k = 1
  let panning = false
  let kTarget = 1, zoomMX = 0, zoomMY = 0, zoomRaf = 0
  function applyPan() { cv.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + k + ')' }
  function zoomAt(mx, my, f) {
    const k2 = Math.min(2.5, Math.max(0.35, k * f))
    const r = k2 / k
    tx = mx - (mx - tx) * r
    ty = my - (my - ty) * r
    k = k2
    kTarget = k2
    applyPan()
  }
  /* 滚轮平滑缩放：指数缓动逼近目标倍率 */
  function zoomStep() {
    const k2 = k + (kTarget - k) * 0.16
    const r = k2 / k
    tx = zoomMX - (zoomMX - tx) * r
    ty = zoomMY - (zoomMY - ty) * r
    k = k2
    applyPan()
    if (Math.abs(kTarget - k) > 0.002) zoomRaf = requestAnimationFrame(zoomStep)
    else { k = kTarget; applyPan(); zoomRaf = 0 }
  }
  function centerCanvas() {
    /* 画布超出视口时从左上区域开始展示，拖动探索其余分组 */
    tx = Math.min(40, (vp.clientWidth - cv.offsetWidth) / 2)
    ty = Math.min(20, (vp.clientHeight - cv.offsetHeight) / 2)
    applyPan()
  }
  vp.addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault() }) /* 禁中键自动滚动 */
  vp.addEventListener('pointerdown', (e) => {
    /* 鼠标中键：上下拖动缩放画布（以光标为锚点） */
    if (e.button === 1) {
      e.preventDefault()
      vp.setPointerCapture(e.pointerId)
      vp.classList.add('is-zooming')
      let lastY = e.clientY
      const rect = vp.getBoundingClientRect()
      const mv = (ev) => {
        const dy = ev.clientY - lastY
        lastY = ev.clientY
        zoomAt(ev.clientX - rect.left, ev.clientY - rect.top, Math.exp(-dy * 0.0042))
      }
      const up = (ev) => {
        vp.classList.remove('is-zooming')
        vp.removeEventListener('pointermove', mv)
        vp.removeEventListener('pointerup', up)
        vp.removeEventListener('pointercancel', up)
        try { vp.releasePointerCapture(ev.pointerId) } catch (_) {}
      }
      vp.addEventListener('pointermove', mv)
      vp.addEventListener('pointerup', up)
      vp.addEventListener('pointercancel', up)
      return
    }
    if (e.target.closest('.clu__img') || e.target.closest('.clu__dlg')) return
    panning = true
    vp.classList.add('is-panning')
    vp.setPointerCapture(e.pointerId)
    const sx = e.clientX, sy = e.clientY, ox = tx, oy = ty
    const mv = (ev) => { tx = ox + (ev.clientX - sx); ty = oy + (ev.clientY - sy); applyPan() }
    const up = (ev) => {
      panning = false
      vp.classList.remove('is-panning')
      vp.removeEventListener('pointermove', mv)
      vp.removeEventListener('pointerup', up)
      try { vp.releasePointerCapture(ev.pointerId) } catch (_) {}
    }
    vp.addEventListener('pointermove', mv)
    vp.addEventListener('pointerup', up)
  })
  vp.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault()
      const rect = vp.getBoundingClientRect()
      zoomMX = e.clientX - rect.left
      zoomMY = e.clientY - rect.top
      kTarget = Math.min(2.5, Math.max(0.35, kTarget * Math.exp(-e.deltaY * 0.0016)))
      if (!zoomRaf) zoomRaf = requestAnimationFrame(zoomStep)
    },
    { passive: false }
  )

  let closing = false
  function close() {
    if (closing) return
    closing = true
    closeNameDlg()
    ov.classList.remove('is-in')
    setTimeout(() => {
      ov.remove()
      document.body.style.overflow = ''
      document.body.classList.remove('is-cluster')
      clusterOpen = false
      clusterCloseFn = null
      clusterFocusFn = null
      clusterPiles = {}
      clusterCustoms = {}
      pendingFocusGid = null
      if (navRenderCustoms) navRenderCustoms()
    }, 480)
  }
  clusterCloseFn = close
  back.addEventListener('click', close)
  const onKey = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey) } }
  document.addEventListener('keydown', onKey)

  window.addEventListener('resize', centerCanvas)
  centerCanvas()
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  )
}

/* ---------- 详情放大态（Lightbox，Garden 淡紫 / Work 淡粉） ---------- */
function createLightbox() {
  let list = []
  let index = null
  let pink = false
  const lb = el('div', 'lightbox')
  lb.style.display = 'none'
  lb.innerHTML =
    '<div class="lightbox__frame">' +
    '<button class="lightbox__close" aria-label="关闭">×</button>' +
    '<div class="lightbox__media"><img alt=""></div>' +
    '<div class="lightbox__text"><h3></h3><p class="lightbox__meta"></p>' +
    '<p class="lightbox__desc"></p><p class="lightbox__note"></p>' +
    '<p class="lightbox__orig"></p></div>' +
    '<button class="lightbox__arrow lightbox__arrow--l" aria-label="上一个">←</button>' +
    '<button class="lightbox__arrow lightbox__arrow--r" aria-label="下一个">→</button>' +
    '</div>'

  const frame = lb.querySelector('.lightbox__frame')
  const media = lb.querySelector('.lightbox__media')
  const img = lb.querySelector('.lightbox__media img')
  const h3 = lb.querySelector('h3')
  const meta = lb.querySelector('.lightbox__meta')
  const desc = lb.querySelector('.lightbox__desc')
  const note = lb.querySelector('.lightbox__note')
  const orig = lb.querySelector('.lightbox__orig')

  function render() {
    const cur = list[index]
    const it = cur.it
    lb.classList.toggle('lightbox--pink', pink)
    frame.classList.toggle('lightbox__frame--text', !it.file)
    if (it.file) {
      media.style.display = ''
      img.src = cur.src(it.file)
      img.alt = it.title
    } else {
      media.style.display = 'none'
    }
    h3.textContent = it.title
    const m = [it.author, it.year, it.form].filter(Boolean).join(' · ')
    meta.textContent = m
    meta.style.display = m ? '' : 'none'
    desc.textContent = it.desc || ''
    note.textContent = it.note || ''
    note.style.display = it.note ? '' : 'none'
    orig.textContent = it.orig || ''
    orig.style.display = it.orig ? '' : 'none'
  }
  function open(l, i, opts) {
    list = l
    pink = !!(opts && opts.pink)
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
    index = (index + d + list.length) % list.length
    render()
  }

  lb.addEventListener('click', close)
  frame.addEventListener('click', (e) => e.stopPropagation())
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

/* ---------- Work 区块（平行四板块） ---------- */
function buildWork(root, lb) {
  const sec = el('section', 'work')
  sec.id = 'work'

  const state = { sec: 'soc', era: 'all', dim: null, grp: null }
  let pendingJump = null
  let currentList = []

  /* --- 头部：板块切换 + 年代筛选 --- */
  const hero = el('header', 'hero')
  const filters = el('div', 'hero__filters')
  const secSort = el('div', 'hero__sort hero__sort--sec')
  secSort.appendChild(el('span', 'hero__sortLabel', 'sections'))
  Object.entries(ARCHIVE).forEach(([key, A]) => {
    const btn = el('button', 'hero__filter hero__filter--sec' + (key === state.sec ? ' is-active' : ''), A.label + '.')
    btn.dataset.sec = key
    secSort.appendChild(btn)
  })
  filters.appendChild(secSort)

  const sort = el('div', 'hero__sort')
  sort.appendChild(el('span', 'hero__sortLabel', 'sort-by'))
  eras.forEach((f) => {
    const btn = el('button', 'hero__filter' + (f === 'all' ? ' is-active' : ''), f + '.')
    btn.dataset.era = f
    sort.appendChild(btn)
  })
  filters.appendChild(sort)
  /* 十维筛选状态条：点击左侧维度索引后出现，可点击清除 */
  const dimChip = el('button', 'hero__dimChip', '')
  dimChip.type = 'button'
  dimChip.style.display = 'none'
  dimChip.addEventListener('click', () => { if (state.dim !== null) workSetDim(state.dim) })
  filters.appendChild(dimChip)
  hero.appendChild(filters)

  const right = el('div', 'hero__right')
  right.innerHTML =
    '<p class="hero__intro">一部关于橱窗的档案：经典艺术、文学意象、社会素材与形式灵感四个板块。从百货商店的玻璃剧场到算法时代的数字橱窗，记录凝视、消费与城市生活如何互相塑造。Based on 课程素材数据库。</p>' +
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

  /* --- 行内按钮：see / full / case / study --- */
  function bindCta(row, it, A) {
    const media = row.querySelector('.row__media')
    const btnSee = row.querySelector('.row__ctaBtn--see')
    const btnFull = row.querySelector('.row__ctaBtn--full')
    const btnCase = row.querySelector('.row__ctaBtn--case')
    const btnStudy = row.querySelector('.row__ctaBtn--study')

    /* ① See：氛围灯开关——点击开灯（板块固定光色），再点关灯 */
    if (btnSee) {
      btnSee.title = '氛围灯：点击开灯，再点击关闭'
      btnSee.addEventListener('click', () => {
        const on = media.classList.toggle('is-dark')
        if (!on) {
          btnSee.classList.remove('is-on')
          btnSee.style.removeProperty('--glowBtn')
          ;['--glow', '--glow2', '--glowA'].forEach((v) => media.style.removeProperty(v))
        } else {
          const [rgb, hex] = SECTION_GLOW[it.__sec] || SECTION_GLOW.soc
          btnSee.classList.add('is-on')
          media.style.setProperty('--glow', `rgba(${rgb},.7)`)
          media.style.setProperty('--glow2', `rgba(${rgb},.4)`)
          media.style.setProperty('--glowA', `rgba(${rgb},.42)`)
          btnSee.style.setProperty('--glowBtn', hex)
        }
      })
    }

    /* ② full：淡粉色 Lightbox 详情页 */
    btnFull.addEventListener('click', () => {
      const idx = currentList.indexOf(it)
      lb.open(
        currentList.map((x) => ({ it: x, src: ARCHIVE[x.__sec].src })),
        idx < 0 ? 0 : idx,
        { pink: true }
      )
    })

    /* ③ case：原文（文学）+ 关键词 # 气泡 */
    btnCase.addEventListener('click', () => {
      const on = row.classList.toggle('row--case')
      btnCase.classList.toggle('is-on', on)
    })

    /* ④ study：相似关键词词条 1:1 缩略图 */
    btnStudy.addEventListener('click', () => {
      const on = row.classList.toggle('row--study')
      btnStudy.classList.toggle('is-on', on)
      if (on && !row.querySelector('.row__rel').dataset.built) {
        buildRel(row, it)
        row.querySelector('.row__rel').dataset.built = '1'
      }
    })
  }

  function buildRel(row, it) {
    const box = row.querySelector('.row__rel')
    const rel = relatedEntries(it)
    if (!rel.length) {
      box.appendChild(el('p', 'row__relEmpty', '暂无共享关键词的词条'))
      return
    }
    box.appendChild(el('p', 'row__relTitle', 'related · 共享关键词的词条'))
    const grid = el('div', 'rel-grid')
    rel.forEach((r) => {
      const A = ARCHIVE[r.sec]
      const target = A.items[r.i]
      const fig = el('figure', 'rel-item')
      fig.title = A.label + ' · ' + target.title
      const thumb = el('div', 'rel-thumb')
      if (target.file) {
        const im = document.createElement('img')
        im.src = A.src(target.file)
        im.alt = target.title
        im.loading = 'lazy'
        thumb.appendChild(im)
      } else {
        thumb.classList.add('rel-thumb--empty')
        thumb.innerHTML = TULIP_SVG
      }
      const cap = el('figcaption', '', '')
      cap.textContent = target.title
      fig.appendChild(thumb)
      fig.appendChild(cap)
      fig.addEventListener('click', () => jumpTo(r.sec, r.i))
      grid.appendChild(fig)
    })
    box.appendChild(grid)
  }

  /* study 缩略图跳转：切板块 + 展开 + 滚动 */
  function jumpTo(secKey, i) {
    if (state.sec !== secKey) {
      state.sec = secKey
      secSort.querySelectorAll('.hero__filter--sec').forEach((b) =>
        b.classList.toggle('is-active', b.dataset.sec === secKey)
      )
    }
    if (state.era !== 'all') {
      state.era = 'all'
      sort.querySelectorAll('.hero__filter').forEach((b) =>
        b.classList.toggle('is-active', b.dataset.era === 'all')
      )
    }
    pendingJump = { sec: secKey, i }
    render()
  }

  function render() {
    const A = ARCHIVE[state.sec]
    currentList =
      state.era === 'all' ? A.items.slice() : A.items.filter((i) => i.era === state.era)
    /* 十维分类筛选：与顶部板块索引构成坐标轴（取交集）；
       选中细分组时按组过滤，否则按整个维度过滤 */
    if (state.dim !== null && TAXONOMY[state.dim]) {
      const dim = TAXONOMY[state.dim]
      const node = state.grp !== null && dim.groups[state.grp] ? dim.groups[state.grp] : dim
      const ids = node.sec[SEC_LETTER[state.sec]] || []
      currentList = currentList.filter((it) => ids.includes(it.id))
    }
    list.innerHTML = ''
    currentList.forEach((it) => {
      const row = el('div', 'row')
      row.dataset.uid = it.__sec + ':' + it.__idx

      const head = el('button', 'row__head')
      head.setAttribute('aria-expanded', 'false')
      head.innerHTML = '<span class="row__title"></span><span class="row__tag"></span>'
      head.querySelector('.row__title').textContent = it.title
      head.querySelector('.row__tag').textContent = yearTag(it)
      head.addEventListener('click', () => {
        const open = row.classList.toggle('row--open')
        head.setAttribute('aria-expanded', String(open))
      })
      row.appendChild(head)

      const body = el('div', 'row__body')
      const inner = el('div', 'row__bodyInner' + (it.file ? '' : ' row__bodyInner--text'))

      /* 图片（打灯效果，See 可开关） */
      if (it.file) {
        const media = el('div', 'row__media')
        const img = document.createElement('img')
        img.src = A.src(it.file)
        img.alt = it.title
        img.loading = 'lazy'
        media.appendChild(img)
        inner.appendChild(media)
      }

      /* 文字 */
      const text = el('div', 'row__text')
      const m = [it.author, it.year, it.form].filter(Boolean).join(' · ')
      if (m) text.appendChild(el('p', 'row__meta', '')).textContent = m
      text.appendChild(el('p', 'row__desc', '')).textContent = it.desc || ''
      if (it.note) text.appendChild(el('p', 'row__note', '')).textContent = it.note

      /* 原文（case 时出现，先有原文再有关键词） */
      if (it.orig) {
        const orig = el('div', 'row__orig')
        orig.appendChild(el('span', 'row__origLabel', '原文 · '))
        const p = el('p', 'row__origText', '')
        p.textContent = it.orig
        orig.appendChild(p)
        text.appendChild(orig)
      }

      /* 关键词气泡（case 时出现） */
      const kws = kwList(it)
      if (kws.length) {
        const box = el('div', 'row__kws')
        kws.forEach((k) => box.appendChild(el('span', 'kw-bubble', '#' + k)))
        text.appendChild(box)
      }
      inner.appendChild(text)

      /* 四个按键 */
      const cta = el('div', 'row__cta')
      const btnSee = it.file ? el('button', 'row__ctaBtn row__ctaBtn--see', 'See') : null
      const btnFull = el('button', 'row__ctaBtn row__ctaBtn--full', 'full')
      const btnCase = el('button', 'row__ctaBtn row__ctaBtn--case', 'case')
      const btnStudy = el('button', 'row__ctaBtn row__ctaBtn--study', 'study')
      ;[btnSee, btnFull, btnCase, btnStudy].forEach((b) => b && cta.appendChild(b))
      inner.appendChild(cta)

      /* 关联词条容器（study 时填充） */
      inner.appendChild(el('div', 'row__rel'))

      body.appendChild(inner)
      row.appendChild(body)

      bindCta(row, it, A)

      io.observe(row)
      setTimeout(() => row.classList.add('row--shown'), 1400)
      list.appendChild(row)
    })
    count.innerHTML = 'Archive&nbsp;(&nbsp;' + currentList.length + '&nbsp;)'
    /* 维度筛选状态条跟随更新 */
    if (state.dim !== null && TAXONOMY[state.dim]) {
      const dim = TAXONOMY[state.dim]
      const grpName = state.grp !== null && dim.groups[state.grp] ? dim.groups[state.grp].name : null
      dimChip.style.display = ''
      dimChip.innerHTML =
        '维度 · ' + escapeHtml(dim.name) + (grpName ? ' — ' + escapeHtml(grpName) : '') +
        ' <b>' + currentList.length + '</b> 条 · 点击' + (grpName ? '返回该维度全量' : '清除') + ' ✕'
    } else {
      dimChip.style.display = 'none'
    }

    /* 跳转定位 */
    if (pendingJump) {
      const target = list.querySelector('[data-uid="' + pendingJump.sec + ':' + pendingJump.i + '"]')
      pendingJump = null
      if (target) {
        target.classList.add('row--open')
        target.querySelector('.row__head').setAttribute('aria-expanded', 'true')
        setTimeout(() => {
          const r = target.getBoundingClientRect()
          smoothScrollTo(window.scrollY + r.top + r.height / 2 - window.innerHeight / 2)
        }, 120)
      }
    }
  }

  secSort.addEventListener('click', (e) => {
    const btn = e.target.closest('.hero__filter--sec')
    if (!btn) return
    state.sec = btn.dataset.sec
    secSort.querySelectorAll('.hero__filter--sec').forEach((b) => b.classList.remove('is-active'))
    btn.classList.add('is-active')
    render()
  })

  sort.addEventListener('click', (e) => {
    const btn = e.target.closest('.hero__filter')
    if (!btn) return
    state.era = btn.dataset.era
    sort.querySelectorAll('.hero__filter').forEach((b) => b.classList.remove('is-active'))
    btn.classList.add('is-active')
    render()
  })

  /* 左侧导航「十维分类」索引：切换/取消该维或细分组筛选，并同步高亮 */
  function syncDimNav() {
    document.querySelectorAll('.sidenav__dim').forEach((b) =>
      b.classList.toggle('is-active', Number(b.dataset.dim) === state.dim && state.grp === null)
    )
    document.querySelectorAll('.sidenav__dimGrp').forEach((b) =>
      b.classList.toggle(
        'is-active',
        Number(b.dataset.dim) === state.dim && Number(b.dataset.grp) === state.grp
      )
    )
    document.querySelectorAll('.sidenav__dimWrap').forEach((w) =>
      w.classList.toggle('is-open', Number(w.dataset.dim) === state.dim)
    )
  }
  workSetDim = (i, g = null) => {
    if (state.dim === i && state.grp === g) {
      state.dim = null
      state.grp = null
    } else {
      state.dim = i
      state.grp = g
    }
    syncDimNav()
    render()
  }

  render()
  syncDimNav()
}

/* ---------- 滚动：页面1渐隐 + Garden 渐隐 + 区块状态切换 ---------- */
function bindScrollFX(root) {
  const start = document.getElementById('start')
  const garden = document.getElementById('garden')
  const work = document.getElementById('work')
  let raf = 0
  const onScroll = () => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => {
      const h = window.innerHeight
      const gardenTop = garden.getBoundingClientRect().top
      const workTop = work.getBoundingClientRect().top
      /* 页面1 随页面2（Garden）向上进入而渐隐 */
      const p1 = Math.min(Math.max(1 - gardenTop / h, 0), 1)
      start.style.opacity = String(Math.max(1 - p1 * 1.25, 0))
      /* 页面2（Garden）进入 Work 时渐隐 */
      const p2 = Math.min(Math.max(1 - workTop / h, 0), 1)
      garden.style.opacity = String(Math.max(1 - p2 * 1.25, 0))
      /* 当前所在区块 */
      const active =
        workTop < h * 0.5 ? 'work' : gardenTop < h * 0.5 ? 'garden' : 'start'
      root.classList.toggle('page--start', active === 'start')
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
  const root = el('div', 'page page--start')
  document.body.appendChild(root)
  buildSidenav(root)
  buildStrip(root)
  const lb = createLightbox()
  lightboxRef = lb
  buildStart(root)
  buildGarden(root, (i) =>
    lb.open(gardenItems.map((it) => ({ it, src: artSrc })), i, { pink: false })
  )
  buildWork(root, lb)
  bindScrollFX(root)
  // 直达入口：#cluster 直接打开聚类模式
  if (location.hash === '#cluster') setTimeout(openCluster, 600)
})
