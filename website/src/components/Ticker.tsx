import { CATEGORIES, UPDATED } from "../data";

/** bottom yellow marquee ticker, freakmag style */
export default function Ticker() {
  const items = CATEGORIES.flatMap((c) =>
    c.entries.slice(0, 6).map((e) => ({ cat: c.name, title: e.title.replace(/[《》]/g, "") }))
  );
  const row = (key: string) => (
    <div key={key} className="flex shrink-0 items-center">
      {items.map((it, i) => (
        <span key={i} className="flex items-center mx-5 text-[13px] font-bold tracking-wide whitespace-nowrap">
          <span
            className="inline-block w-5 h-5 mr-2 rounded-full bg-black text-[#EBFF60] text-[10px] leading-5 text-center"
            style={{ animation: "fm-ticker-bounce 1.6s ease-in-out infinite", animationDelay: `${(i % 5) * 0.2}s` }}
          >
            櫥
          </span>
          <span className="opacity-60 mr-2">[{it.cat}]</span>
          {it.title.length > 26 ? it.title.slice(0, 26) + "…" : it.title}
          <span className="mx-5 opacity-40">★</span>
        </span>
      ))}
    </div>
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 h-10 bg-[#EBFF60] border-t border-black/40 overflow-hidden flex items-center">
      <div className="flex anim-marquee" style={{ ["--marquee-dur" as string]: "60s" }}>
        {row("a")}
        {row("b")}
      </div>
      <div className="absolute right-0 top-0 h-full px-3 bg-[#EBFF60] border-l border-black/40 flex items-center text-[10px] font-black tracking-widest">
        UPDATE {UPDATED}
      </div>
    </div>
  );
}
