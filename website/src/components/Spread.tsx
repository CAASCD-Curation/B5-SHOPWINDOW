import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CAT_COLORS, UPDATED, bubbleText, splitTitle } from "../data";
import type { Category, Entry } from "../data";

interface Props {
  cat: Category;
  entry: Entry;
  index: number;
  total: number;
}

/** BODY — one freakmag article spread (left color page + right text page) */
export default function Spread({ cat, entry, index, total }: Props) {
  const col = CAT_COLORS[cat.id];
  const { cn, en } = splitTitle(entry.title);
  const ghost = String(index + 1).padStart(2, "0");
  const bubble = bubbleText(entry);
  const noImg = !entry.img;
  const [cardOpen, setCardOpen] = useState(false);

  // double-click card: Escape closes the card instead of exiting the spread
  useEffect(() => {
    if (!cardOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // capture phase fires before CategoryView's bubble listener: card wins
        e.stopPropagation();
        setCardOpen(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [cardOpen]);

  return (
    <article className="relative w-screen h-full shrink-0 snap-center flex overflow-hidden bg-[#FFFDF5]">
      {/* ======== LEFT PAGE ======== */}
      <div className="relative flex fm-grain overflow-hidden" style={{ background: col.bg, flex: "11 1 0" }}>
        {/* cream left rail like P2 */}
        <div className="shrink-0 w-10 md:w-12 self-stretch border-r border-black/20 bg-[#FFFDF5] flex flex-col items-center py-4 gap-3">
          <span className="text-[9px] font-black tracking-[0.25em] text-black">GUIDE</span>
          <span className="v-text font-display text-lg md:text-xl text-black leading-none">{cat.name}</span>
          <span className="v-text text-[9px] tracking-[0.2em] text-black/60 mt-auto">UPDATE {UPDATED}</span>
        </div>

        <div className="relative flex-1 flex flex-col min-w-0">
          {/* title block */}
          <div className="px-4 md:px-8 pt-5 md:pt-7">
            <div className="anim-fade-up flex items-baseline gap-3 text-[10px] md:text-xs font-black tracking-[0.3em] text-black/80" style={{ animationDelay: "0.15s" }}>
              <span>SUPERFUZZ ARCHIVE vol.{index + 1}</span>
              <span className="opacity-50">{entry.year || "—"}</span>
            </div>
            <h2
              className="anim-fade-up font-display text-black leading-[1.05] mt-2 text-[clamp(20px,3.2vw,44px)]"
              style={{ animationDelay: "0.25s" }}
            >
              {cn || entry.title}
            </h2>
            {en && (
              <div className="anim-fade-up text-[11px] md:text-sm font-bold tracking-[0.15em] text-black/70 mt-1" style={{ animationDelay: "0.32s" }}>
                {en}
              </div>
            )}
            {(entry.author || entry.type) && (
              <div className="anim-fade-up mt-2 text-[11px] md:text-xs text-black/75 font-serif-sc" style={{ animationDelay: "0.38s" }}>
                {[entry.author, entry.type].filter(Boolean).join(" ／ ")}
              </div>
            )}
          </div>

          {/* image zone / typographic zone */}
          <div className="relative flex-1 flex items-end justify-center pb-8 md:pb-10 px-6">
            {!noImg && (
              <div className="relative anim-img-in" style={{ ["--img-rot" as string]: "-6deg", animationDelay: "0.45s" }}>
                <img
                  src={entry.img}
                  alt={entry.title}
                  onDoubleClick={() => setCardOpen(true)}
                  title="双击放大查看意义与描述"
                  className="fm-photo anim-float max-h-[42vh] md:max-h-[56vh] w-auto max-w-[72vw] md:max-w-[40vw] object-cover fm-hair cursor-zoom-in"
                  style={{ animationDelay: `${index * 0.7}s` }}
                />
                {/* speech bubble */}
                <div
                  className="anim-pop absolute -top-8 -right-4 md:-right-10 z-10"
                  style={{ ["--pop-rot" as string]: "-10deg", animationDelay: "0.85s" }}
                >
                  <div
                    className="relative px-5 py-3 md:px-6 md:py-4 rounded-[50%] fm-hair text-white font-bold text-[11px] md:text-sm leading-tight"
                    style={{ background: col.bubble, boxShadow: "4px 5px 0 rgba(0,0,0,0.3)" }}
                  >
                    {bubble}
                    <span
                      className="absolute -bottom-[10px] left-6 w-4 h-4 border-b border-r fm-hair-c rotate-45"
                      style={{ background: col.bubble }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* typographic poster for entries without image */}
            {noImg && (
              <div className="relative w-full max-w-[560px] anim-img-in" style={{ ["--img-rot" as string]: "-2deg", animationDelay: "0.45s" }}>
                <div className="fm-photo bg-black text-[#FFFDF5] px-6 md:px-10 py-6 md:py-8 fm-hair">
                  <div className="font-display text-6xl md:text-8xl leading-none text-[#FFE600]">“</div>
                  <p className="font-serif-sc text-sm md:text-lg leading-relaxed -mt-3 md:-mt-5">
                    {(entry.desc || entry.title).slice(0, 72)}
                    {(entry.desc || "").length > 72 ? "…" : ""}
                  </p>
                </div>
                <div
                  className="anim-pop absolute -top-6 -right-3 md:-right-8 z-10"
                  style={{ ["--pop-rot" as string]: "8deg", animationDelay: "0.85s" }}
                >
                  <div
                    className="relative px-4 py-2.5 md:px-5 md:py-3 rounded-[50%] fm-hair text-white font-bold text-[10px] md:text-xs leading-tight"
                    style={{ background: col.bubble, boxShadow: "4px 5px 0 rgba(0,0,0,0.3)" }}
                  >
                    {bubble}
                    <span className="absolute -bottom-[9px] left-5 w-3.5 h-3.5 border-b border-r fm-hair-c rotate-45" style={{ background: col.bubble }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ======== RIGHT PAGE ======== */}
      <div className="relative flex flex-col fm-grain overflow-hidden fm-hair-r" style={{ background: col.light, flex: "9 1 0" }}>
        {/* ghost number */}
        <div className="absolute -right-3 -top-8 font-display text-[7rem] md:text-[10rem] leading-none select-none" style={{ color: col.bg, opacity: 0.35 }}>
          {ghost}
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar px-5 md:px-9 pt-14 md:pt-16 pb-6">
          {entry.case && (
            <div className="anim-fade-up inline-block bg-black text-white text-[10px] md:text-xs font-bold tracking-widest px-3 py-1.5 mb-4" style={{ animationDelay: "0.4s" }}>
              CASE — {entry.case}
            </div>
          )}
          {entry.desc && (
            <p className="anim-fade-up font-serif-sc text-[13px] md:text-[15px] leading-[1.9] text-black/85" style={{ animationDelay: "0.5s" }}>
              {entry.desc}
            </p>
          )}
          {entry.note && (
            <div className="anim-fade-up mt-5 border-l pl-4 py-1 text-[12px] md:text-[13.5px] leading-[1.9] text-black/75 font-serif-sc" style={{ borderColor: col.deep, animationDelay: "0.6s" }}>
              <span className="font-display not-italic text-xs tracking-[0.2em] block mb-1" style={{ color: col.deep }}>
                ▼ WHY IT MATTERS
              </span>
              {entry.note}
            </div>
          )}
          {entry.keywords && (
            <div className="anim-fade-up mt-6 flex flex-wrap gap-2" style={{ animationDelay: "0.7s" }}>
              {entry.keywords.split(/[｜/、,，;；]/).map((k) => k.trim()).filter(Boolean).slice(0, 10).map((k, i) => (
                <span
                  key={i}
                  className="text-[10px] md:text-[11px] font-bold px-2.5 py-1 fm-hair rounded-full transition-colors hover:text-white"
                  style={{ background: "transparent" }}
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.background = col.deep)}
                  onMouseLeave={(e) => ((e.target as HTMLElement).style.background = "transparent")}
                >
                  # {k}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* caption footer like P2 */}
        <div className="shrink-0 border-t border-black/40 px-5 md:px-9 py-3 flex items-end justify-between gap-4 bg-[#FFFDF5]">
          <div className="fm-underline font-serif-sc text-xs md:text-sm font-bold leading-snug min-w-0">
            「{(cn || entry.title).slice(0, 30)}{(cn || entry.title).length > 30 ? "…" : ""}」
            {entry.author ? ` — ${entry.author}` : ""}
          </div>
          <div className="text-right shrink-0">
            <div className="text-[9px] font-black tracking-[0.25em]">Articles</div>
            <div className="font-display text-2xl md:text-3xl leading-none">
              {ghost}
              <span className="text-sm opacity-50">/{total}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======== DOUBLE-CLICK ZOOM CARD — 意义与描述 ======== */}
      {cardOpen &&
        createPortal(
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 md:p-10"
          style={{ background: "rgba(17,17,17,0.78)", backdropFilter: "blur(3px)" }}
          onClick={() => setCardOpen(false)}
        >
          <div
            className="relative w-full max-w-5xl max-h-full overflow-y-auto no-scrollbar bg-[#FFFDF5] fm-hair anim-pop"
            style={{ ["--pop-rot" as string]: "0deg", boxShadow: "12px 16px 0 rgba(0,0,0,0.35)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* card header */}
            <div className="flex items-center justify-between px-4 md:px-6 py-2.5 border-b border-black/40" style={{ background: col.bg }}>
              <span className="font-display text-xs md:text-sm tracking-[0.2em] text-black">
                {cat.name} — NO.{ghost}
              </span>
              <button
                onClick={() => setCardOpen(false)}
                aria-label="关闭卡片"
                className="w-7 h-7 rounded-full fm-hair bg-black text-white font-black leading-none hover:rotate-90 transition-transform duration-300"
              >
                ×
              </button>
            </div>

            <div className="grid md:grid-cols-2">
              {/* image side */}
              <div className="flex items-center justify-center p-4 md:p-6 border-b md:border-b-0 md:border-r border-black/20">
                <img src={entry.img} alt={entry.title} className="max-h-[38vh] md:max-h-[62vh] w-auto object-contain fm-hair" />
              </div>

              {/* text side: 描述 + 意义 */}
              <div className="p-4 md:p-6 flex flex-col gap-4">
                <div>
                  <h3 className="font-display text-lg md:text-2xl leading-tight text-black">{cn || entry.title}</h3>
                  {en && <div className="text-[11px] md:text-xs font-bold tracking-[0.15em] text-black/60 mt-1">{en}</div>}
                  {(entry.author || entry.year || entry.type) && (
                    <div className="mt-1.5 text-[11px] md:text-xs text-black/70">
                      {[entry.author, entry.year, entry.type].filter(Boolean).join(" ／ ")}
                    </div>
                  )}
                </div>

                {entry.desc && (
                  <div>
                    <div className="text-[10px] font-black tracking-[0.3em] mb-1.5" style={{ color: col.deep }}>
                      ■ 描述 DESCRIPTION
                    </div>
                    <p className="text-[13px] md:text-sm leading-[1.9] text-black/85">{entry.desc}</p>
                  </div>
                )}

                {entry.note && (
                  <div className="border-l-2 pl-3 py-0.5" style={{ borderColor: col.deep }}>
                    <div className="text-[10px] font-black tracking-[0.3em] mb-1.5" style={{ color: col.deep }}>
                      ▼ 意义 WHY IT MATTERS
                    </div>
                    <p className="text-[13px] md:text-sm leading-[1.9] text-black/75">{entry.note}</p>
                  </div>
                )}

                {entry.keywords && (
                  <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
                    {entry.keywords.split(/[｜/、,，;；]/).map((k) => k.trim()).filter(Boolean).slice(0, 8).map((k, i) => (
                      <span key={i} className="text-[9px] md:text-[10px] font-bold px-2 py-[2px] fm-hair rounded-full text-black/70">
                        # {k}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
          document.body
        )}
    </article>
  );
}
