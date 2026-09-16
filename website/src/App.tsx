import { useCallback, useRef, useState } from "react";
import { CATEGORIES, CAT_COLORS } from "./data";
import TopNav from "./components/TopNav";
import Ticker from "./components/Ticker";
import IndexColumns from "./components/IndexColumns";
import Overview from "./components/Overview";
import CategoryView from "./components/CategoryView";

interface Wipe {
  dir: "in" | "out";
  color: string;
  label: string;
}

interface Zoom {
  rect: { top: number; left: number; width: number; height: number };
  color: string;
  phase: "in" | "hold" | "out";
}

type View = "index" | "overview" | "spread";

export default function App() {
  const [catId, setCatId] = useState<string | null>(() => {
    const q = new URLSearchParams(window.location.search);
    const p = q.get("cat");
    return p && CATEGORIES.some((c) => c.id === p) ? p : null;
  });
  const [view, setView] = useState<View>(() => {
    const q = new URLSearchParams(window.location.search);
    const c = q.get("cat");
    if (c && CATEGORIES.some((x) => x.id === c)) return q.get("p") ? "spread" : "overview";
    return "index";
  });
  const [spreadIdx, setSpreadIdx] = useState(() => {
    const q = new URLSearchParams(window.location.search);
    return Math.max(0, parseInt(q.get("p") || "0", 10) || 0);
  });
  const [wipe, setWipe] = useState<Wipe | null>(null);
  const [zoom, setZoom] = useState<Zoom | null>(null);
  const scrollMemory = useRef<Record<string, number>>({});

  const cat = CATEGORIES.find((c) => c.id === catId) ?? null;

  /** color-sheet wipe between index and overview */
  const wipeTo = useCallback((next: () => void, color: string, label: string) => {
    setWipe({ dir: "in", color, label });
    window.setTimeout(() => {
      next();
      setWipe((w) => (w ? { ...w, dir: "out" } : w));
      window.setTimeout(() => setWipe(null), 470);
    }, 460);
  }, []);

  const openOverview = useCallback(
    (id: string) => {
      const c = CATEGORIES.find((x) => x.id === id);
      if (!c || wipe || zoom) return;
      wipeTo(() => {
        setCatId(id);
        setView("overview");
      }, CAT_COLORS[id].bg, c.name);
    },
    [wipe, zoom, wipeTo]
  );

  const backToIndex = useCallback(() => {
    if (wipe || (zoom && zoom.phase === "in")) return;
    setZoom(null);
    wipeTo(() => {
      setCatId(null);
      setView("index");
    }, "#111111", "SHOP WINDOW 橱窗");
  }, [wipe, zoom, wipeTo]);

  /** overview entry → spread: the card zooms up to full screen */
  const openSpread = useCallback(
    (index: number, rect: DOMRect) => {
      if (!cat || zoom) return;
      const r = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
      setSpreadIdx(index);
      setView("spread");
      setZoom({ rect: r, color: CAT_COLORS[cat.id].bg, phase: "in" });
      // expand on next frame
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setZoom((z) => (z ? { ...z, rect: { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight } } : z)))
      );
      window.setTimeout(() => setZoom((z) => (z ? { ...z, phase: "hold" } : z)), 620);
      // sheet is opacity:0 during "hold" — drop it from the tree once the fade ends
      window.setTimeout(() => setZoom(null), 1180);
    },
    [cat, zoom]
  );

  const backToOverview = useCallback(() => {
    if (zoom && zoom.phase === "in") return;
    setZoom(null);
    // reverse zoom: color sheet drops quickly then overview reappears
    if (cat) {
      setWipe({ dir: "in", color: CAT_COLORS[cat.id].bg, label: cat.name });
      window.setTimeout(() => {
        setView("overview");
        setWipe((w) => (w ? { ...w, dir: "out" } : w));
        window.setTimeout(() => setWipe(null), 470);
      }, 380);
    }
  }, [cat, zoom]);

  const rememberScroll = useCallback((top: number) => {
    if (cat) scrollMemory.current[cat.id] = top;
  }, [cat]);

  return (
    <div id="top" className="fixed inset-0 overflow-hidden bg-[#111]">
      <TopNav onBack={backToIndex} dark={view !== "index"} />

      {view === "index" && <IndexColumns cats={CATEGORIES} onOpen={openOverview} />}

      {cat && view === "overview" && (
        <Overview
          key={cat.id}
          cat={cat}
          onBack={backToIndex}
          onOpenEntry={openSpread}
          initialScroll={scrollMemory.current[cat.id] ?? 0}
          onScrollPos={rememberScroll}
        />
      )}

      {cat && view === "spread" && (
        <div className={zoom && zoom.phase === "in" ? "invisible" : "visible"}>
          <CategoryView key={`${cat.id}-${spreadIdx}`} cat={cat} initial={spreadIdx} onBack={backToOverview} />
        </div>
      )}

      {/* zoom sheet: the clicked overview card expands into the spread */}
      {zoom && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            top: zoom.rect.top,
            left: zoom.rect.left,
            width: zoom.rect.width,
            height: zoom.rect.height,
            background: zoom.color,
            transition: "top 0.55s cubic-bezier(0.7,0,0.3,1), left 0.55s cubic-bezier(0.7,0,0.3,1), width 0.55s cubic-bezier(0.7,0,0.3,1), height 0.55s cubic-bezier(0.7,0,0.3,1), opacity 0.35s ease 0.12s",
            opacity: zoom.phase === "hold" ? 0 : 1,
          }}
        />
      )}

      {/* freakmag wipe transition */}
      {wipe && (
        <div
          className={`absolute inset-0 z-50 flex pointer-events-none ${wipe.dir === "in" ? "anim-wipe" : "anim-wipe-out"}`}
          style={{ background: wipe.color }}
        >
          <div className="m-auto font-display text-white text-[13vw] leading-none drop-shadow-[6px_8px_0_rgba(0,0,0,0.35)] select-none">
            {wipe.label}
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 text-[10px] font-black tracking-[0.4em] whitespace-nowrap">
            SHOP WINDOW 橱窗
          </div>
        </div>
      )}

      <Ticker />
    </div>
  );
}
