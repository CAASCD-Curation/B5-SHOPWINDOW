import { useEffect, useRef, useState } from "react";
import { CAT_COLORS } from "../data";
import type { Category } from "../data";
import Spread from "./Spread";

interface Props {
  cat: Category;
  onBack: () => void;
  initial?: number;
}

/** BODY — horizontally flipping spreads with scroll-velocity skew */
export default function CategoryView({ cat, onBack, initial = 0 }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(initial);
  const col = CAT_COLORS[cat.id];

  // scroll-velocity skew, the freakmag signature motion
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let last = el.scrollLeft;
    let lastT = performance.now();
    let skew = 0;
    let raf = 0;
    const onScroll = () => {
      const now = performance.now();
      const dx = el.scrollLeft - last;
      const dt = Math.max(now - lastT, 1);
      const v = dx / dt; // px per ms
      skew = Math.max(-8, Math.min(8, v * -18));
      last = el.scrollLeft;
      lastT = now;
    };
    const tick = () => {
      skew *= 0.88;
      el.style.setProperty("--skew", `${skew.toFixed(2)}deg`);
      raf = requestAnimationFrame(tick);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // jump to initial page on mount
  useEffect(() => {
    const el = trackRef.current;
    if (el && initial > 0) {
      el.scrollLeft = initial * el.clientWidth;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // track current page
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onScroll = () => setPage(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const goTo = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const idx = Math.max(0, Math.min(cat.entries.length - 1, i));
    el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
  };

  // keyboard flip
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goTo(page + 1);
      if (e.key === "ArrowLeft") goTo(page - 1);
      if (e.key === "Escape") onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, cat.entries.length]);

  return (
    <div className="absolute inset-0 top-12 bottom-10 flex flex-col">
      {/* category sub-header */}
      <div className="shrink-0 h-9 flex items-center justify-between px-4 border-b border-black/40 bg-[#FFFDF5]">
        <button onClick={onBack} className="text-[11px] font-black tracking-[0.2em] hover:opacity-60 transition-opacity">
          ← 总览 OVERVIEW
        </button>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3.5 h-3.5 rounded-full fm-hair" style={{ background: col.bg }} />
          <span className="font-display text-sm tracking-wide">{cat.name}</span>
          <span className="text-[10px] opacity-50 tracking-[0.2em]">{cat.en}</span>
        </div>
        <div className="text-[11px] font-black tracking-[0.2em]">
          {String(page + 1).padStart(2, "0")} / {cat.entries.length}
        </div>
      </div>

      {/* horizontal flip track */}
      <div
        ref={trackRef}
        className="flex-1 overflow-x-auto overflow-y-hidden no-scrollbar snap-x snap-mandatory"
      >
        <div
          className="flex h-full will-change-transform"
          style={{ transform: "skewX(var(--skew, 0deg))", transition: "transform 0.08s linear" }}
        >
          {cat.entries.map((e, i) => (
            <Spread key={i} cat={cat} entry={e} index={i} total={cat.entries.length} />
          ))}
        </div>
      </div>

      {/* pager */}
      <div className="shrink-0 h-9 flex items-center justify-center gap-3 border-t border-black/40 bg-[#FFFDF5]">
        <button onClick={() => goTo(page - 1)} className="text-[11px] font-black px-2 hover:opacity-60" aria-label="prev">
          ◀ PREV
        </button>
        <div className="flex gap-1.5 max-w-[50vw] overflow-hidden">
          {cat.entries.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`page ${i + 1}`}
              className="h-2.5 rounded-full border border-black transition-all duration-300"
              style={{ width: i === page ? 22 : 6, background: i === page ? col.deep : "transparent" }}
            />
          ))}
        </div>
        <button onClick={() => goTo(page + 1)} className="text-[11px] font-black px-2 hover:opacity-60" aria-label="next">
          NEXT ▶
        </button>
      </div>
    </div>
  );
}
