/* ===== fog.js ===== */
/**
 * fog.js — 01 HERO 雾气玻璃
 * 离屏累积层承载雾色；destination-out 软笔刷擦除；
 * 松手后低 alpha 回雾，上限 75%，永不完全复原；
 * 水珠随指针速度方向拖动变形，离开后弹性回位。
 */

const FOG_BASE = 'rgba(245, 240, 230, 0.9)';
const REFOG_ALPHA = 0.005;   // 每帧回雾强度（0.004 ~ 0.01）
const REFOG_CAP = 0.75;      // 回雾上限：最多恢复到 75%
const DPR_CAP = 2;

function rand(min, max) { return min + Math.random() * (max - min); }

/** 生成雾气纹理：暖白基底 + 大半径径向渐变的朦胧 + 柔和云斑（无噪点） */
function makeFogTexture(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');

  x.fillStyle = FOG_BASE;
  x.fillRect(0, 0, w, h);

  // 多层大半径径向渐变：不均匀的朦胧
  const blobs = 14;
  for (let i = 0; i < blobs; i++) {
    const bx = rand(0, w), by = rand(0, h);
    const br = rand(0.35, 0.75) * Math.min(w, h);
    const warm = Math.random() > 0.5;
    const g = x.createRadialGradient(bx, by, 0, bx, by, br);
    const col = warm ? '246, 236, 220' : '236, 234, 228';
    g.addColorStop(0, `rgba(${col}, ${rand(0.10, 0.22)})`);
    g.addColorStop(1, `rgba(${col}, 0)`);
    x.fillStyle = g;
    x.fillRect(bx - br, by - br, br * 2, br * 2);
  }

  // 少量柔和云状斑块（羽化椭圆）
  const clouds = 7;
  for (let i = 0; i < clouds; i++) {
    const bx = rand(0, w), by = rand(0, h);
    const br = rand(0.15, 0.3) * Math.min(w, h);
    const g = x.createRadialGradient(bx, by, 0, bx, by, br);
    g.addColorStop(0, 'rgba(250, 247, 240, 0.16)');
    g.addColorStop(0.6, 'rgba(250, 247, 240, 0.07)');
    g.addColorStop(1, 'rgba(250, 247, 240, 0)');
    x.save();
    x.translate(bx, by);
    x.scale(rand(1.4, 2.4), 1);
    x.translate(-bx, -by);
    x.fillStyle = g;
    x.beginPath();
    x.arc(bx, by, br, 0, Math.PI * 2);
    x.fill();
    x.restore();
  }

  // 边缘略厚（四角雾气更重）
  const vg = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(244, 238, 226, 0)');
  vg.addColorStop(1, 'rgba(244, 238, 226, 0.28)');
  x.fillStyle = vg;
  x.fillRect(0, 0, w, h);

  return c;
}

function initFog(canvas) {
  const ctx = canvas.getContext('2d');
  const accum = document.createElement('canvas');   // 雾累积层
  const actx = accum.getContext('2d');
  let texture = null;
  let W = 0, H = 0, dpr = 1;

  let droplets = [];
  let fogLevel = 1;          // 1 = 全雾；回雾只允许升到 REFOG_CAP
  let lastEraseAt = 0;
  let raf = null;
  let running = false;
  let inView = true;

  const pointer = {
    x: -9999, y: -9999,
    vx: 0, vy: 0,
    down: false,
    lastX: 0, lastY: 0, lastT: 0,
  };

  function buildDroplets() {
    const n = Math.round(rand(20, 40));
    droplets = [];
    for (let i = 0; i < n; i++) {
      droplets.push({
        x: rand(0.03, 0.97) * W,
        y: rand(0.03, 0.97) * H,
        r: rand(2.2, 6.5) * dpr,
        ox: 0, oy: 0,           // 当前拖移偏移
        seed: Math.random(),
      });
    }
  }

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    W = Math.max(1, Math.round(rect.width * dpr));
    H = Math.max(1, Math.round(rect.height * dpr));
    canvas.width = W; canvas.height = H;
    accum.width = W; accum.height = H;
    texture = makeFogTexture(W, H);
    actx.globalCompositeOperation = 'source-over';
    actx.globalAlpha = 1;
    actx.drawImage(texture, 0, 0);
    fogLevel = 1;
    buildDroplets();
  }

  /** 软笔刷擦除：径向渐变 destination-out，边缘羽化 */
  function erase(px, py, radius, strength) {
    const g = actx.createRadialGradient(px, py, 0, px, py, radius);
    g.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
    g.addColorStop(0.55, `rgba(0, 0, 0, ${strength * 0.55})`);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    actx.globalCompositeOperation = 'destination-out';
    actx.fillStyle = g;
    actx.beginPath();
    actx.arc(px, py, radius, 0, Math.PI * 2);
    actx.fill();
    actx.globalCompositeOperation = 'source-over';
    fogLevel = Math.max(0, fogLevel - strength * (radius * radius) / (W * H) * 6);
    lastEraseAt = performance.now();
  }

  /** 回雾：以极低 alpha 重绘雾纹理，受 REFOG_CAP 上限约束 */
  function refog() {
    if (fogLevel >= REFOG_CAP) return;
    actx.globalCompositeOperation = 'source-over';
    actx.globalAlpha = REFOG_ALPHA;
    actx.drawImage(texture, 0, 0);
    actx.globalAlpha = 1;
    fogLevel = Math.min(REFOG_CAP, fogLevel + REFOG_ALPHA);
  }

  function drawDroplet(d) {
    const x = d.x + d.ox, y = d.y + d.oy;
    const r = d.r;
    const stretch = Math.min(Math.hypot(d.ox, d.oy) / (14 * dpr), 0.32);
    const ang = Math.atan2(d.oy, d.ox);

    // 重力方向的极短凝结拖痕
    const tg = ctx.createLinearGradient(x, y - r * 2.6, x, y);
    tg.addColorStop(0, 'rgba(255, 255, 255, 0)');
    tg.addColorStop(1, 'rgba(255, 255, 255, 0.30)');
    ctx.strokeStyle = tg;
    ctx.lineWidth = r * 0.85;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y - r * 2.6);
    ctx.lineTo(x, y - r * 0.7);
    ctx.stroke();

    // 水珠本体：沿运动方向轻微拉伸
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.scale(1 + stretch, Math.max(0.6, 1 - stretch * 0.55));
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    g.addColorStop(0.45, 'rgba(244, 240, 232, 0.45)');
    g.addColorStop(0.8, 'rgba(206, 200, 188, 0.25)');
    g.addColorStop(1, 'rgba(170, 164, 152, 0.38)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    // 高光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(-r * 0.34, -r * 0.38, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function frame(now) {
    if (!running) return;

    // 指针速度衰减
    pointer.vx *= 0.88;
    pointer.vy *= 0.88;

    // 水珠拖动：靠近指针的水珠向速度方向偏移，离开后弹性回位
    const influence = 150 * dpr;
    for (const d of droplets) {
      const dist = Math.hypot(d.x - pointer.x, d.y - pointer.y);
      if (dist < influence) {
        const k = (1 - dist / influence) * 0.9;
        const tx = Math.max(-7 * dpr, Math.min(7 * dpr, pointer.vx * k));
        const ty = Math.max(-7 * dpr, Math.min(7 * dpr, pointer.vy * k));
        d.ox += (tx - d.ox) * 0.22;
        d.oy += (ty - d.oy) * 0.22;
      } else {
        d.ox *= 0.9;
        d.oy *= 0.9;
      }
    }

    // 松手且停止擦拭后缓慢回雾
    if (!pointer.down && now - lastEraseAt > 350) refog();

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(accum, 0, 0);
    for (const d of droplets) drawDroplet(d);

    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running || !inView || document.hidden) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf !== null) cancelAnimationFrame(raf);
    raf = null;
  }

  function toCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * dpr,
      y: (e.clientY - rect.top) * dpr,
    };
  }

  function onMove(e) {
    const p = toCanvasPos(e);
    const now = performance.now();
    const dt = Math.max(8, now - pointer.lastT);
    // 指针速度（px/帧量级），用于水珠拖动
    pointer.vx = pointer.vx * 0.5 + ((p.x - pointer.lastX) / dt) * 16 * 0.5;
    pointer.vy = pointer.vy * 0.5 + ((p.y - pointer.lastY) / dt) * 16 * 0.5;
    pointer.x = p.x; pointer.y = p.y;
    pointer.lastX = p.x; pointer.lastY = p.y; pointer.lastT = now;

    if (pointer.down) {
      erase(p.x, p.y, 96 * dpr, 0.55);            // 按下：大笔刷强擦除
    } else {
      erase(p.x, p.y, 58 * dpr, 0.10);            // 未按下：呵气般轻擦
    }
  }

  function onDown(e) {
    pointer.down = true;
    const p = toCanvasPos(e);
    pointer.x = p.x; pointer.y = p.y;
    pointer.lastX = p.x; pointer.lastY = p.y;
    pointer.lastT = performance.now();
    erase(p.x, p.y, 100 * dpr, 0.6);
  }
  function onUp() { pointer.down = false; }
  function onLeave() {
    pointer.down = false;
    pointer.x = -9999; pointer.y = -9999;
  }

  canvas.addEventListener('pointermove', onMove, { passive: true });
  canvas.addEventListener('pointerdown', onDown, { passive: true });
  canvas.addEventListener('pointerup', onUp, { passive: true });
  canvas.addEventListener('pointercancel', onUp, { passive: true });
  canvas.addEventListener('pointerleave', onLeave, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else start();
  });

  // 滚出视口时暂停
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      inView = entries[0].isIntersecting;
      if (inView) start(); else stop();
    }, { threshold: 0.02 }).observe(canvas.parentElement);
  }

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 180);
  });

  resize();
  start();
}


/* ===== corridor.js ===== */
/**
 * corridor.js — 02 长廊 · 3D 房间无限平移
 * 左墙 rotateY(58deg) / 右墙 rotateY(-58deg) / 后墙，
 * rAF 匀速推进 translateZ，越过相机的画框回收到最深处并换队列下一张图。
 */

const FRAME_COUNT = 20;        // 屏幕上保持的画框数（18~24 之间）
const SPACING = 260;           // 画框沿 Z 轴间距 px
const SPEED = 34;              // 前进速度 px/s（25~40 中速）
const RECYCLE_Z = 420;         // 越过此深度回收到最深处
const SLOW_FACTOR = 0.2;       // hover / 触摸时减速到 20%

function initCorridor(stage, works, navigate) {
  const pool = works.filter((w) => w.image);
  if (!stage || pool.length === 0) return;

  let imgCursor = 0;
  const nextWork = () => {
    const w = pool[imgCursor % pool.length];
    imgCursor += 1;
    return w;
  };

  const frames = [];
  let stageW = stage.clientWidth;
  let stageH = stage.clientHeight;

  // 墙面分配：L R B L R …（每 5 个一个后墙画框）
  function wallOf(i) {
    if (i % 5 === 2) return 'back';
    return i % 2 === 0 ? 'left' : 'right';
  }

  function buildFrame(i) {
    const el = document.createElement('div');
    el.className = 'frame';
    const matte = document.createElement('div');
    matte.className = 'frame__matte';
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.alt = '';
    img.draggable = false;
    matte.appendChild(img);
    el.appendChild(matte);
    stage.appendChild(el);

    const wall = wallOf(i);
    const f = {
      el, img, wall,
      z: 380 - i * SPACING,
      y: (Math.random() * 2 - 1) * stageH * (wall === 'back' ? 0.04 : 0.06),
      bx: (Math.random() * 2 - 1) * stageW * 0.13,   // 后墙画框的水平错落
      work: null,
    };
    f.work = nextWork();
    f.img.src = f.work.image;
    f.img.alt = f.work.name;

    // hover：减速 + 高亮
    el.addEventListener('pointerenter', () => { hoverCount += 1; });
    el.addEventListener('pointerleave', () => { hoverCount = Math.max(0, hoverCount - 1); });

    // 点击进详情（区分拖拽与点击）
    let downX = 0, downY = 0, downT = 0;
    el.addEventListener('pointerdown', (e) => {
      downX = e.clientX; downY = e.clientY; downT = performance.now();
    }, { passive: true });
    el.addEventListener('pointerup', (e) => {
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (moved < 10 && performance.now() - downT < 600 && f.work) {
        navigate(f.work.id);
      }
    }, { passive: true });

    frames.push(f);
  }

  let hoverCount = 0;
  let touching = false;
  let mult = 1;               // 当前速度倍率（向 target 缓动）
  let raf = null;
  let running = false;
  let inView = true;
  let lastT = 0;

  for (let i = 0; i < FRAME_COUNT; i++) buildFrame(i);

  function layout(f) {
    let x = 0, ry = 0;
    if (f.wall === 'left') { x = -stageW * 0.34; ry = 58; }
    else if (f.wall === 'right') { x = stageW * 0.34; ry = -58; }
    else { x = f.bx; ry = 0; }
    f.el.style.transform =
      `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${f.y.toFixed(1)}px, ${f.z.toFixed(1)}px) rotateY(${ry}deg)`;
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016);
    lastT = now;

    const target = (hoverCount > 0 || touching) ? SLOW_FACTOR : 1;
    mult += (target - mult) * 0.12;
    const dz = SPEED * mult * dt;

    for (const f of frames) {
      f.z += dz;
      if (f.z > RECYCLE_Z) {
        // 回收到最深处，换上队列下一张图
        f.z -= FRAME_COUNT * SPACING;
        f.work = nextWork();
        f.img.src = f.work.image;
        f.img.alt = f.work.name;
      }
      layout(f);
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running || !inView || document.hidden) return;
    running = true;
    lastT = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf !== null) cancelAnimationFrame(raf);
    raf = null;
  }

  // 触控：滑动时减速，轻点进详情（点击判定在各画框上）
  stage.addEventListener('touchstart', () => { touching = true; }, { passive: true });
  stage.addEventListener('touchend', () => { touching = false; }, { passive: true });
  stage.addEventListener('touchcancel', () => { touching = false; }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else start();
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      inView = entries[0].isIntersecting;
      if (inView) start(); else stop();
    }, { threshold: 0.02 }).observe(stage);
  }

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      stageW = stage.clientWidth;
      stageH = stage.clientHeight;
    }, 180);
  });

  start();
}


/* ===== shelf.js ===== */
/**
 * shelf.js — 03 索引 · 竖向色块货架
 * 8 个高窄竖条，底部齐平立于黑线上；悬停/点按抽出（translateY + 旋转），
 * 点击跳转档案区并应用该类别筛选。
 */

function initShelf(row, categories, works, onPick) {
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;
  const countOf = (id) => works.filter((w) => w.category === id).length;
  let lifted = null;

  for (const cat of categories) {
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.background = cat.color;
    bar.dataset.cat = cat.id;
    bar.setAttribute('role', 'button');
    bar.setAttribute('tabindex', '0');
    bar.setAttribute('aria-label', `${cat.name} ${cat.en}，${countOf(cat.id)} 个作品`);

    const inner = document.createElement('div');
    inner.className = 'bar__inner';
    inner.innerHTML =
      `<span>GUIDE</span>` +
      `<span class="bar__name">${cat.name}</span>` +
      `<span>${cat.en}</span>` +
      `<span class="bar__sep">—</span>` +
      `<span>UPDATE 2026</span>` +
      `<span class="bar__sep">—</span>` +
      `<span>ARTICLES</span>` +
      `<span class="bar__count">${countOf(cat.id)}</span>`;
    bar.appendChild(inner);
    row.appendChild(bar);

    const go = () => onPick(cat.id);

    bar.addEventListener('click', () => {
      if (isCoarse) {
        // 移动端：第一次 tap 抽出，第二次 tap 跳转
        if (lifted === bar) {
          lifted = null;
          bar.classList.remove('lifted');
          go();
        } else {
          if (lifted) lifted.classList.remove('lifted');
          lifted = bar;
          bar.classList.add('lifted');
        }
      } else {
        go();
      }
    });
    bar.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
    });
  }

  // 点别处收回抽出的条
  document.addEventListener('click', (e) => {
    if (lifted && !lifted.contains(e.target)) {
      lifted.classList.remove('lifted');
      lifted = null;
    }
  });
}


/* ===== archive.js ===== */
/**
 * archive.js — 04 档案 · 作品网格 + 筛选
 * 筛选行（sort-by / 全部. / 类别.）、响应式网格、错峰入场、占位色块。
 */

function initArchive(section, data) {
  const grid = section.querySelector('#grid');
  const filtersEl = section.querySelector('#filters');
  const countEl = section.querySelector('#archive-count');
  const { categories, works } = data;
  const catOf = (id) => categories.find((c) => c.id === id);

  let current = 'all';
  let fadeTimer = null;

  /* ---------- 筛选按钮 ---------- */
  const defs = [{ id: 'all', name: '全部' }, ...categories];
  const buttons = new Map();
  for (const d of defs) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'filter' + (d.id === 'all' ? ' is-active' : '');
    b.textContent = `${d.name}.`;
    b.dataset.cat = d.id;
    b.addEventListener('click', () => setFilter(d.id));
    filtersEl.appendChild(b);
    buttons.set(d.id, b);
  }

  /* ---------- 卡片 ---------- */
  const cards = [];
  works.forEach((w, i) => {
    const cat = catOf(w.category);
    const card = document.createElement('article');
    card.className = 'card reveal';
    card.dataset.cat = w.category;
    card.dataset.id = w.id;
    card.style.transitionDelay = `${(i % 8) * 60}ms`;

    const media = document.createElement('a');
    media.className = 'card__media';
    media.href = `#/work/${w.id}`;
    media.setAttribute('aria-label', `查看《${w.name}》档案`);

    if (w.image) {
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.src = w.image;
      img.alt = w.name;
      media.appendChild(img);
    } else {
      const ph = document.createElement('div');
      ph.className = 'card__placeholder';
      ph.style.background = cat.color;
      ph.textContent = w.name;
      media.appendChild(ph);
    }

    const cta = document.createElement('span');
    cta.className = 'card__cta';
    cta.textContent = '查看档案 →';
    media.appendChild(cta);

    const meta = document.createElement('div');
    meta.className = 'card__meta';
    const h3 = document.createElement('h3');
    h3.textContent = w.name;
    const sub = document.createElement('p');
    sub.className = 'mono';
    sub.textContent = `${w.author} · ${w.time}`;
    const tags = document.createElement('div');
    tags.className = 'card__tags';
    const form = document.createElement('span');
    form.className = 'card__form';
    form.textContent = w.form;
    const dot = document.createElement('span');
    dot.className = 'card__dot';
    dot.style.background = cat.color;
    dot.title = cat.name;
    tags.appendChild(form);
    tags.appendChild(dot);

    meta.appendChild(h3);
    meta.appendChild(sub);
    meta.appendChild(tags);
    card.appendChild(media);
    card.appendChild(meta);
    grid.appendChild(card);
    cards.push(card);
  });

  /* ---------- 错峰入场（JS 先加 reveal，IO 再加 is-in） ---------- */
  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        for (const en of entries) {
          if (en.isIntersecting) {
            en.target.classList.add('is-in');
            io.unobserve(en.target);
          }
        }
      }, { threshold: 0.08, rootMargin: '0px 0px -4% 0px' })
    : null;

  function observeVisible() {
    for (const c of cards) {
      if (c.classList.contains('is-hidden') || c.classList.contains('is-in')) continue;
      if (io) io.observe(c);
      else c.classList.add('is-in');
    }
  }
  observeVisible();

  /* ---------- 可见性：筛选 × 外部钩子（folders.js 注入） ---------- */
  let visibilityHook = null; // (workId) => true 表示强制隐藏（已收入文件夹）

  function applyVisibility() {
    let n = 0;
    for (const c of cards) {
      const matchFilter = current === 'all' || c.dataset.cat === current;
      const hiddenByHook = visibilityHook ? visibilityHook(c.dataset.id) : false;
      const show = matchFilter && !hiddenByHook;
      c.classList.toggle('is-hidden', !show);
      if (show) {
        n += 1;
        // 重新触发入场动画
        if (!c.classList.contains('is-in')) {
          if (io) io.observe(c);
          else c.classList.add('is-in');
        }
      }
    }
    countEl.textContent = `${n} 条目`;
  }

  /* ---------- 筛选（带淡入淡出过渡） ---------- */
  function setFilter(id) {
    if (id === current) return;
    current = id;
    for (const [k, b] of buttons) b.classList.toggle('is-active', k === id);

    clearTimeout(fadeTimer);
    grid.classList.add('is-fading');
    fadeTimer = setTimeout(() => {
      applyVisibility();
      grid.classList.remove('is-fading');
    }, 280);
  }

  return {
    setFilter,
    applyVisibility,
    setVisibilityHook(fn) { visibilityHook = fn; },
    grid,
    cards,
  };
}


/* ===== detail.js ===== */
/**
 * detail.js — 05 详情 · hash 路由整页覆盖视图
 * #/work/w001 ↔ 档案网格；Esc / ← 返回 关闭；浏览器前进后退可用。
 */

const SECTION_NAMES = {
  A: 'A · 经典艺术档案',
  B: 'B · 文学意象',
  C: 'C · 社会素材',
  D: 'D · 形式灵感',
};

function initDetail(data) {
  const { categories, works } = data;
  const catOf = (id) => categories.find((c) => c.id === id);

  const root = document.getElementById('detail');
  const el = {
    back: document.getElementById('detail-back'),
    idx: document.getElementById('detail-idx'),
    media: document.getElementById('detail-media'),
    cat: document.getElementById('detail-cat'),
    name: document.getElementById('detail-name'),
    meta: document.getElementById('detail-meta'),
    desc: document.getElementById('detail-desc'),
    meaning: document.getElementById('detail-meaning'),
    orig: document.getElementById('detail-orig'),
    origText: document.getElementById('detail-orig-text'),
    kw: document.getElementById('detail-kw'),
    prev: document.getElementById('detail-prev'),
    next: document.getElementById('detail-next'),
  };

  let isOpen = false;
  let hideTimer = null;
  let currentIndex = -1;

  function fill(work, index) {
    const cat = catOf(work.category);
    currentIndex = index;

    el.idx.textContent = `${String(index + 1).padStart(3, '0')} / ${works.length}`;
    el.cat.textContent = `${cat.name} · ${cat.en} · ${SECTION_NAMES[work.section] || work.section}`;
    el.cat.style.color = cat.color;
    el.name.textContent = work.name;

    const metaRows = [
      ['作者', work.author],
      ['年代', work.time],
      ['形式', work.form],
      ['板块', SECTION_NAMES[work.section] || work.section],
    ].filter(([, v]) => v && String(v).trim());
    el.meta.innerHTML = metaRows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');

    el.desc.textContent = work.desc || '';
    el.desc.closest('.detail__block').hidden = !(work.desc && work.desc.trim());
    el.meaning.textContent = work.meaning || '';
    el.meaning.closest('.detail__block').hidden = !(work.meaning && work.meaning.trim());

    if (work.orig && work.orig.trim()) {
      el.orig.hidden = false;
      el.origText.textContent = work.orig;
    } else {
      el.orig.hidden = true;
      el.origText.textContent = '';
    }

    el.kw.innerHTML = '';
    for (const k of work.keywords || []) {
      const li = document.createElement('li');
      li.textContent = k;
      el.kw.appendChild(li);
    }

    el.media.innerHTML = '';
    if (work.image) {
      const img = document.createElement('img');
      img.src = work.image;
      img.alt = work.name;
      el.media.appendChild(img);
    } else {
      const ph = document.createElement('div');
      ph.className = 'card__placeholder';
      ph.style.background = cat.color;
      ph.textContent = work.name;
      el.media.appendChild(ph);
    }

    root.scrollTop = 0;
  }

  function open(id) {
    const index = works.findIndex((w) => w.id === id);
    if (index === -1) { close(); return; }
    fill(works[index], index);
    if (!isOpen) {
      isOpen = true;
      clearTimeout(hideTimer);
      root.hidden = false;
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => root.classList.add('is-open'));
    }
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    currentIndex = -1;
    root.classList.remove('is-open');
    document.body.style.overflow = '';
    hideTimer = setTimeout(() => { root.hidden = true; }, 480);
  }

  function route() {
    const m = location.hash.match(/^#\/work\/([A-Za-z0-9_-]+)$/);
    if (m) open(m[1]);
    else close();
  }

  function go(delta) {
    if (currentIndex === -1) return;
    const n = works.length;
    const next = works[(currentIndex + delta + n) % n];
    location.hash = `#/work/${next.id}`;
  }

  el.back.addEventListener('click', () => { location.hash = '#/'; });
  el.prev.addEventListener('click', () => go(-1));
  el.next.addEventListener('click', () => go(1));

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) location.hash = '#/';
    if (!isOpen) return;
    if (e.key === 'ArrowLeft') go(-1);
    if (e.key === 'ArrowRight') go(1);
  });

  window.addEventListener('hashchange', route);
  route(); // 处理直接带 hash 进入的情况

  return { isOpen: () => isOpen };
}


/* ===== folders.js ===== */
/**
 * folders.js — 04 档案 · 拖拽创建自由文件夹
 *
 * 状态机：
 *   idle ──pointerdown on .card──▶ pending（记录起点，等待判定）
 *   pending ──位移 > 6px──▶ dragging（生成幻影、原卡半透明、允许落点高亮）
 *   pending ──pointerup（位移 ≤ 6px）──▶ idle（不拦截，<a> 原生点击进详情）
 *   dragging ──pointerup──▶ drop 判定 ──▶ idle（并拦截随后的 click，防止误进详情）
 *   任意 ──pointercancel（触屏滚动接管等）──▶ idle（清理幻影/高亮）
 *
 * 落点：.card → 与源卡合成新文件夹；.folder-card → 加入该文件夹。
 * 持久化：localStorage["windowshop-folders"] = [{id, name, workIds[]}]
 */

const LS_KEY = 'windowshop-folders';
const DRAG_THRESHOLD = 6; // px，小于此位移视为点击

function initFolders(archive, data) {
  const { grid } = archive;
  const worksById = new Map(data.works.map((w) => [w.id, w]));
  const catOf = (id) => data.categories.find((c) => c.id === id);

  /* ================= 数据层 ================= */

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_KEY));
      if (!Array.isArray(raw)) return [];
      return raw
        .filter((f) => f && typeof f.id === 'string' && Array.isArray(f.workIds))
        .map((f) => ({
          id: f.id,
          name: typeof f.name === 'string' && f.name.trim() ? f.name : '未命名档案夹',
          workIds: f.workIds.filter((id) => worksById.has(id)),
        }))
        .filter((f) => f.workIds.length > 0); // 空文件夹自动删除
    } catch {
      return [];
    }
  }

  let folders = load();

  function save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(folders));
    } catch (err) {
      console.warn('[windowshop] 文件夹持久化失败:', err);
    }
  }

  const folderedIds = () => new Set(folders.flatMap((f) => f.workIds));
  const folderById = (fid) => folders.find((f) => f.id === fid);

  // 注入可见性钩子：收入文件夹的作品从主网格隐藏（任何筛选下）
  archive.setVisibilityHook((id) => folderedIds().has(id));

  /* ================= 文件夹卡片 ================= */

  function buildFolderCard(folder) {
    const el = document.createElement('div');
    el.className = 'folder-card';
    el.dataset.fid = folder.id;
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');

    const head = document.createElement('header');
    head.className = 'folder-card__head mono';
    head.innerHTML = `<span>FOLDER · 档案夹</span><span class="folder-card__count">×${folder.workIds.length}</span>`;

    const name = document.createElement('h3');
    name.className = 'folder-card__name';
    name.textContent = folder.name;

    const stack = document.createElement('div');
    stack.className = 'folder-card__stack';
    stack.innerHTML = '<i></i><i></i><i></i>';

    el.appendChild(head);
    el.appendChild(name);
    el.appendChild(stack);

    el.addEventListener('click', (e) => {
      if (e.target.closest('.name-input')) return;
      openFolderView(folder.id);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFolderView(folder.id); }
    });
    return el;
  }

  /** 重排文件夹卡片：永远在最前，新的排最前 */
  function renderFolderCards(autofocusId = null) {
    grid.querySelectorAll('.folder-card').forEach((el) => el.remove());
    for (const f of folders) grid.prepend(buildFolderCard(f)); // prepend 逆序 → 最新在最前

    if (autofocusId) {
      const card = grid.querySelector(`.folder-card[data-fid="${autofocusId}"]`);
      const nameEl = card && card.querySelector('.folder-card__name');
      if (nameEl) startRename(nameEl, folderById(autofocusId), () => renderFolderCards());
    }
  }

  /** 名称 → input 内联编辑（非破坏式：隐藏原名元素，提交后恢复，保留原事件监听） */
  function startRename(nameEl, folder, after) {
    if (!folder) return;
    const input = document.createElement('input');
    input.className = 'name-input';
    input.value = folder.name;
    input.maxLength = 24;
    input.setAttribute('aria-label', '文件夹名称');
    nameEl.hidden = true;
    nameEl.after(input);
    input.focus();
    input.select();

    let done = false;
    const commit = (ok) => {
      if (done) return;
      done = true;
      const v = input.value.trim();
      if (ok && v) { folder.name = v; save(); }
      input.remove();
      nameEl.hidden = false;
      if (after) after();
      else renderFolderCards();
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); commit(true); }
      if (e.key === 'Escape') { e.preventDefault(); commit(false); }
      e.stopPropagation();
    });
    input.addEventListener('blur', () => commit(true));
    input.addEventListener('click', (e) => e.stopPropagation());
  }

  function refresh() {
    // 移除空文件夹
    const before = folders.length;
    folders = folders.filter((f) => f.workIds.length > 0);
    if (folders.length !== before) save();
    renderFolderCards();
    archive.applyVisibility();
  }

  /* ================= 文件夹视图（覆盖层） ================= */

  const view = document.createElement('div');
  view.className = 'folder-view';
  view.hidden = true;
  view.innerHTML =
    `<div class="detail__bar">` +
    `  <button class="detail__back mono" type="button" data-fv-back>← 返回</button>` +
    `  <span class="detail__idx mono" data-fv-idx></span>` +
    `</div>` +
    `<div class="folder-view__body">` +
    `  <h2 class="folder-view__name" data-fv-name title="点击重命名"></h2>` +
    `  <div class="folder-view__actions mono">` +
    `    <span data-fv-hint>点击名称可重命名</span>` +
    `    <button type="button" data-fv-disband>解散文件夹</button>` +
    `  </div>` +
    `  <div class="folder-view__grid" data-fv-grid></div>` +
    `</div>`;
  document.body.appendChild(view);

  let viewFid = null;
  let viewOpen = false;

  function buildMiniCard(work) {
    const cat = catOf(work.category);
    const el = document.createElement('div');
    el.className = 'fmini';

    const media = document.createElement('a');
    media.className = 'fmini__media';
    media.href = `#/work/${work.id}`;
    if (work.image) {
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.src = work.image;
      img.alt = work.name;
      media.appendChild(img);
    } else {
      const ph = document.createElement('div');
      ph.className = 'card__placeholder';
      ph.style.background = cat.color;
      ph.textContent = work.name;
      media.appendChild(ph);
    }

    const name = document.createElement('p');
    name.className = 'fmini__name';
    name.textContent = work.name;

    const out = document.createElement('button');
    out.type = 'button';
    out.className = 'fmini__out mono';
    out.textContent = '移出 ×';
    out.addEventListener('click', () => removeFromFolder(folderById(viewFid), work.id));

    el.appendChild(media);
    el.appendChild(name);
    el.appendChild(out);
    return el;
  }

  function renderViewBody() {
    const folder = folderById(viewFid);
    if (!folder) { closeFolderView(); return; }
    view.querySelector('[data-fv-idx]').textContent = `FOLDER · 档案夹 ×${folder.workIds.length}`;
    const nameEl = view.querySelector('[data-fv-name]');
    nameEl.textContent = folder.name;
    const vgrid = view.querySelector('[data-fv-grid]');
    vgrid.innerHTML = '';
    for (const id of folder.workIds) {
      const w = worksById.get(id);
      if (w) vgrid.appendChild(buildMiniCard(w));
    }
  }

  function openFolderView(fid) {
    if (!folderById(fid)) return;
    viewFid = fid;
    viewOpen = true;
    renderViewBody();
    view.hidden = false;
    view.scrollTop = 0;
    requestAnimationFrame(() => view.classList.add('is-open'));
  }

  function closeFolderView() {
    viewOpen = false;
    viewFid = null;
    view.classList.remove('is-open');
    setTimeout(() => { if (!viewOpen) view.hidden = true; }, 480);
  }

  view.querySelector('[data-fv-back]').addEventListener('click', closeFolderView);
  view.querySelector('[data-fv-disband]').addEventListener('click', () => {
    const folder = folderById(viewFid);
    if (!folder) return;
    folders = folders.filter((f) => f.id !== folder.id); // 解散：作品回到主网格
    save();
    closeFolderView();
    refresh();
  });
  view.querySelector('[data-fv-name]').addEventListener('click', (e) => {
    const folder = folderById(viewFid);
    if (folder) startRename(e.currentTarget, folder, renderViewBody);
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && viewOpen && !location.hash.startsWith('#/work/')) {
      closeFolderView();
    }
  });

  /* ================= 拖拽状态机 ================= */

  let drag = null;        // {pointerId, sourceId, sourceEl, startX, startY, active, ghost, targetEl}
  let suppressClick = false;

  function isWorkCard(el) {
    return el && el.classList && el.classList.contains('card') && !el.classList.contains('is-hidden');
  }

  function startDrag(e) {
    drag.active = true;
    const rect = drag.sourceEl.getBoundingClientRect();
    const ghost = drag.sourceEl.cloneNode(true);
    ghost.classList.add('drag-ghost');
    ghost.classList.remove('reveal', 'is-in');
    ghost.style.width = rect.width + 'px';
    document.body.appendChild(ghost);
    drag.ghost = ghost;
    drag.offsetX = e.clientX - rect.left;
    drag.offsetY = e.clientY - rect.top;
    drag.sourceEl.classList.add('is-drag-source');
    try { drag.sourceEl.setPointerCapture(drag.pointerId); } catch { /* noop */ }
    moveGhost(e);
  }

  function moveGhost(e) {
    if (!drag.ghost) return;
    drag.ghost.style.transform =
      `translate(${(e.clientX - drag.offsetX).toFixed(1)}px, ${(e.clientY - drag.offsetY).toFixed(1)}px) rotate(2deg)`;
  }

  function updateTarget(e) {
    const under = document.elementFromPoint(e.clientX, e.clientY);
    let target = under ? under.closest('.folder-card, .card') : null;
    if (target && target === drag.sourceEl) target = null;
    if (target && target.classList.contains('card') && !isWorkCard(target)) target = null;
    if (drag.targetEl !== target) {
      if (drag.targetEl) drag.targetEl.classList.remove('is-drop-target');
      drag.targetEl = target;
      if (drag.targetEl) drag.targetEl.classList.add('is-drop-target');
    }
  }

  function cleanupDrag() {
    if (drag.ghost) drag.ghost.remove();
    if (drag.targetEl) drag.targetEl.classList.remove('is-drop-target');
    if (drag.sourceEl) drag.sourceEl.classList.remove('is-drag-source');
    drag = null;
  }

  function handleDrop() {
    const t = drag.targetEl;
    if (!t) return;
    const sourceId = drag.sourceId;

    if (t.classList.contains('folder-card')) {
      addToFolder(t.dataset.fid, sourceId);
      return;
    }
    const targetId = t.dataset.id;
    if (!targetId || targetId === sourceId) return;
    createFolder([targetId, sourceId]);
  }

  grid.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const card = e.target.closest('.card');
    if (!isWorkCard(card)) return;
    drag = {
      pointerId: e.pointerId,
      sourceId: card.dataset.id,
      sourceEl: card,
      startX: e.clientX, startY: e.clientY,
      active: false, ghost: null, targetEl: null,
    };
  }, { passive: true });

  window.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (!drag.active) {
      const dist = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);
      if (dist <= DRAG_THRESHOLD) return; // 仍是 pending
      startDrag(e);
    }
    moveGhost(e);
    updateTarget(e);
  }, { passive: true });

  window.addEventListener('pointerup', (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (drag.active) {
      updateTarget(e);
      handleDrop();
      suppressClick = true; // 拦截拖拽后的 click，避免误触发 <a> 进详情
    }
    cleanupDrag();
  }, { passive: true });

  window.addEventListener('pointercancel', (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    cleanupDrag(); // 触屏滚动接管等情况：放弃本次拖拽
  }, { passive: true });

  // 拖拽结束后的那一次 click 一律吞掉
  grid.addEventListener('click', (e) => {
    if (suppressClick) {
      e.preventDefault();
      e.stopPropagation();
      suppressClick = false;
    }
  }, true);

  // 阻止浏览器原生 HTML5 拖拽干扰
  grid.addEventListener('dragstart', (e) => e.preventDefault());

  /* ================= 文件夹操作 ================= */

  function createFolder(workIds) {
    const id = 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    folders.push({ id, name: '未命名档案夹', workIds: [...new Set(workIds)] });
    save();
    archive.applyVisibility();
    renderFolderCards(id); // 新文件夹名称立即进入编辑态
  }

  function addToFolder(fid, workId) {
    const folder = folderById(fid);
    if (!folder || folder.workIds.includes(workId)) return;
    folder.workIds.push(workId);
    save();
    archive.applyVisibility();
    renderFolderCards();
    // 弹性反馈（注意要作用在重渲染后的新节点上）
    const el = grid.querySelector(`.folder-card[data-fid="${fid}"]`);
    if (el) {
      el.classList.remove('folder-pop');
      void el.offsetWidth; // 重启动画
      el.classList.add('folder-pop');
    }
  }

  function removeFromFolder(folder, workId) {
    if (!folder) return;
    folder.workIds = folder.workIds.filter((id) => id !== workId);
    if (folder.workIds.length === 0) {
      folders = folders.filter((f) => f.id !== folder.id); // 空文件夹自动删除
      save();
      closeFolderView();
      refresh();
      return;
    }
    save();
    renderFolderCards();
    archive.applyVisibility();
    renderViewBody();
  }

  /* ================= 初始化 ================= */
  refresh();
}


/* ===== main.js ===== */
const worksData = window.WORKS_DATA;
/**
 * main.js — 装配：数据加载、各区块初始化、导航平滑滚动、静态元素入场
 */


function boot() {
  const data = worksData;

  const navigate = (id) => { location.hash = `#/work/${id}`; };

  // 04 档案 + 05 详情路由 + 拖拽文件夹
  const archiveSection = document.getElementById('archive');
  const archive = initArchive(archiveSection, data);
  initDetail(data);
  initFolders(archive, data);

  // 03 索引：点击竖条 → 应用筛选并平滑滚动到档案区
  initShelf(document.getElementById('shelf-row'), data.categories, data.works, (catId) => {
    archive.setFilter(catId);
    archiveSection.scrollIntoView({ behavior: 'smooth' });
  });

  // 01 雾气玻璃
  const fogCanvas = document.getElementById('fog');
  if (fogCanvas) initFog(fogCanvas);

  // 02 长廊
  initCorridor(document.getElementById('corridor-stage'), data.works, navigate);

  // 导航：JS 平滑滚动（不占用 hash，避免与详情路由冲突）
  document.querySelectorAll('[data-scroll]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(a.dataset.scroll);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // 静态元素入场：JS 先加 reveal，IO 到视口再加 is-in（无 JS 时内容完整可见）
  const revealTargets = document.querySelectorAll(
    '.section-head, .about__statement, .about__quote, .shelf__row, .archive__filters, .footer__col'
  );
  revealTargets.forEach((t) => t.classList.add('reveal'));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      }
    }, { threshold: 0.12 });
    revealTargets.forEach((t) => io.observe(t));
  } else {
    revealTargets.forEach((t) => t.classList.add('is-in'));
  }
}

boot();
