import { useEffect, useMemo, useRef, useState } from "react";
import { CAT_COLORS, UPDATED, splitTitle } from "../data";
import type { Category, Entry } from "../data";

interface Props {
  cat: Category;
  onBack: () => void;
  onOpenEntry: (index: number, rect: DOMRect) => void;
  initialScroll?: number;
  onScrollPos?: (top: number) => void;
}

function matchQuery(e: Entry, q: string): boolean {
  if (!q) return true;
  const hay = [e.title, e.author, e.year, e.type, e.desc, e.note, e.keywords, e.case]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}

/** 模块总览 — magazine index of every entry in a category, with search + auto-scroll */
export default function Overview({ cat, onBack, onOpenEntry, initialScroll = 0, onScrollPos }: Props) {
  const col = CAT_COLORS[cat.id];
  const scrollRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [auto, setAuto] = useState(true);

  // filtered entries keep original indices for spread navigation
  const filtered = useMemo(() => {
    return cat.entries.map((e, i) => ({ e, i })).filter(({ e }) => matchQuery(e, query));
  }, [cat.entries, query]);

  /** seamless conveyor: duplicated shelf loops downward forever, no jump, no blank */
  const conveyor = auto && !query && filtered.length > 0;
  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const lastTopRef = useRef(initialScroll);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = initialScroll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // leaving conveyor mode: restore last manual scroll position
  useEffect(() => {
    if (!conveyor) {
      trackRef.current?.style.setProperty("transform", "");
      const el = scrollRef.current;
      if (el) el.scrollTop = lastTopRef.current;
    }
  }, [conveyor]);

  useEffect(() => {
    if (!conveyor) return;
    const el = scrollRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    offsetRef.current = 0;
    let raf = 0;
    let last = performance.now();
    let vel = 0; // wheel-driven velocity px/ms
    const DRIFT = 0.045;
    const tick = (now: number) => {
      const dt = Math.min(now - last, 50);
      last = now;
      const half = track.scrollHeight / 2;
      if (half > el.clientHeight + 4) {
        offsetRef.current += (DRIFT + vel) * dt;
        vel *= Math.pow(0.94, dt / 16.7); // inertia decay
        if (Math.abs(vel) < 0.005) vel = 0;
        // wrap either direction — copies are identical, so both wraps are invisible
        if (offsetRef.current >= half) offsetRef.current -= half;
        if (offsetRef.current < 0) offsetRef.current += half;
        track.style.transform = `translateY(${-offsetRef.current}px)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // wheel is the primary control: drives the belt with momentum
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      vel = Math.max(-3, Math.min(3, vel + d * 0.012));
    };
    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => (touchY = e.touches[0].clientY);
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0].clientY;
      const dy = touchY - y;
      touchY = y;
      offsetRef.current += dy;
      vel = Math.max(-3, Math.min(3, dy / 16));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, [conveyor]);

  return (
    <div className="absolute inset-0 top-12 bottom-10 flex flex-col bg-[#FFFDF5]">
      {/* sub-header */}
      <div className="shrink-0 h-9 flex items-center justify-between px-4 border-b border-black/40 bg-[#FFFDF5]">
        <button onClick={onBack} className="text-[11px] font-bold tracking-[0.2em] hover:opacity-60 transition-opacity">
          ← INDEX 书本目录
        </button>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3.5 h-3.5 rounded-full fm-hair" style={{ background: col.bg }} />
          <span className="font-display-md text-sm tracking-wide">{cat.name}</span>
          <span className="text-[10px] opacity-50 tracking-[0.2em]">{cat.en}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAuto((a) => !a)}
            className={`text-[10px] font-bold tracking-[0.2em] px-2 py-[3px] fm-hair rounded-full transition-colors ${
              auto ? "text-white" : "text-black/60 hover:text-black"
            }`}
            style={auto ? { background: col.deep } : undefined}
            title={auto ? "暂停自动滚动" : "开启自动滚动"}
          >
            {auto ? "AUTO ■" : "AUTO ▶"}
          </button>
          <span className="text-[11px] font-bold tracking-[0.2em]">{cat.entries.length} ENTRIES</span>
        </div>
      </div>

      {/* masthead — static, shelf scrolls under it */}
      <div className="shrink-0 relative overflow-hidden border-b border-black/40" style={{ background: col.bg }}>
        <div className="px-5 md:px-10 pt-8 md:pt-10 pb-5 md:pb-6">
          <div className="anim-fade-up text-[10px] md:text-xs font-bold tracking-[0.35em] text-black/70" style={{ animationDelay: "0.1s" }}>
            GUIDE — UPDATE {UPDATED}
          </div>
          <h1 className="anim-fade-up font-display-md text-black leading-none mt-2 text-[clamp(34px,6vw,76px)]" style={{ animationDelay: "0.2s" }}>
            {cat.name}
            <span className="align-top text-[0.35em] ml-3 tracking-[0.3em] font-bold">{cat.en}</span>
          </h1>

          {/* search */}
          <div className="anim-fade-up mt-4 md:mt-5 flex items-center gap-3 max-w-xl" style={{ animationDelay: "0.3s" }}>
            <div className="relative flex-1">
              <input
                value={query}
                onChange={(ev) => setQuery(ev.target.value)}
                placeholder="搜索关键词 / 标题 / 作者…"
                className="w-full bg-[#FFFDF5] fm-hair rounded-full pl-9 pr-8 py-2 text-xs md:text-sm outline-none placeholder:text-black/35 focus:placeholder:text-black/20 transition-shadow"
                onFocus={(e) => (e.target.style.boxShadow = `3px 3px 0 ${col.deep}`)}
                onBlur={(e) => (e.target.style.boxShadow = "none")}
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/45 hover:text-black text-sm leading-none"
                  aria-label="清除"
                >
                  ×
                </button>
              )}
            </div>
            <span className="text-[10px] font-bold tracking-[0.2em] text-black/60 whitespace-nowrap">
              {query ? `${filtered.length} / ${cat.entries.length}` : "ALL"}
            </span>
          </div>
        </div>
        <div className="absolute -right-4 -bottom-10 font-display-md text-[11rem] md:text-[15rem] leading-none text-black/10 select-none">
          {cat.id}
        </div>
      </div>

      {/* shelf — conveyor belt in auto mode, plain scroller when searching / auto off */}
      <div
        ref={scrollRef}
        onScroll={() => {
          const top = scrollRef.current?.scrollTop ?? 0;
          lastTopRef.current = top;
          onScrollPos?.(top);
        }}
        className={conveyor ? "flex-1 overflow-hidden relative" : "flex-1 overflow-y-auto no-scrollbar"}
      >
        <div ref={trackRef} className={conveyor ? "will-change-transform" : undefined}>
          {filtered.length === 0 && (
            <div className="px-5 md:px-10 py-16 text-center text-black/45 text-sm">
              没有找到与「{query}」相关的条目 — <button className="fm-underline font-bold" onClick={() => setQuery("")}>清除筛选</button>
            </div>
          )}
          {(conveyor ? [...filtered, ...filtered] : filtered).map(({ e, i }, idx) => {
            const { cn, en } = splitTitle(e.title);
            const no = String(i + 1).padStart(2, "0");
            return (
              <button
                key={conveyor ? `c${idx}-${i}` : i}
                onClick={(ev) => onOpenEntry(i, ev.currentTarget.getBoundingClientRect())}
                className="group relative w-full text-left flex items-stretch gap-4 md:gap-6 px-4 md:px-10 py-4 md:py-5 border-b border-black/15 transition-colors duration-300 hover:bg-black/[0.04] bg-[#FFFDF5]"
              >
                {/* index number */}
                <div className="shrink-0 w-10 md:w-16 flex flex-col justify-between py-1">
                  <span className="font-display-md text-xl md:text-3xl leading-none" style={{ color: col.deep }}>
                    {no}
                  </span>
                  <span className="text-[8px] md:text-[9px] font-bold tracking-[0.25em] opacity-40 mt-1">ARTICLE</span>
                </div>

                {/* text */}
                <div className="flex-1 min-w-0 py-1">
                  <div className="font-display-md text-base md:text-2xl leading-tight text-black truncate md:whitespace-normal">
                    {cn || e.title}
                  </div>
                  {en && <div className="text-[10px] md:text-xs font-bold tracking-[0.12em] text-black/55 mt-0.5 truncate">{en}</div>}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] md:text-[11px] text-black/60">
                    {e.author && <span>{e.author}</span>}
                    {e.year && <span className="opacity-70">{e.year}</span>}
                    {e.type && <span className="opacity-70">{e.type}</span>}
                  </div>
                  {e.keywords && (
                    <div className="mt-1.5 hidden md:flex flex-wrap gap-1.5">
                      {e.keywords.split(/[｜/、,，;；]/).map((k) => k.trim()).filter(Boolean).slice(0, 4).map((k, j) => (
                        <span key={j} className="text-[9px] font-bold px-2 py-[2px] fm-hair rounded-full text-black/70">
                          {k}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* thumb — only when the entry has an image */}
                {e.img && (
                  <div className="shrink-0 self-center w-20 h-14 md:w-36 md:h-24 overflow-hidden flex items-center justify-center">
                    <img
                      src={e.img}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 fm-ease group-hover:rotate-[-2deg] group-hover:scale-105"
                      style={{ boxShadow: "3px 4px 0 rgba(0,0,0,0.15)" }}
                    />
                  </div>
                )}

                {/* hover arrow */}
                <div className="shrink-0 self-center hidden md:block opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 font-display-md text-lg" style={{ color: col.deep }}>
                  →
                </div>
              </button>
            );
          })}

          {!conveyor && (
            <div className="px-5 md:px-10 py-8 text-center text-[10px] font-bold tracking-[0.4em] text-black/40">
              — END OF {cat.en} —
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
