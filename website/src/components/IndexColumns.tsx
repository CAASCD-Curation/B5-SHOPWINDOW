import { CAT_COLORS, UPDATED } from "../data";
import type { Category } from "../data";

interface Props {
  cats: Category[];
  onOpen: (id: string) => void;
}

/** HEAD — freakmag book-index: four full-height color columns */
export default function IndexColumns({ cats, onOpen }: Props) {
  return (
    <div className="absolute inset-0 top-12 bottom-10 flex overflow-x-auto no-scrollbar">
      {cats.map((c, i) => {
        const col = CAT_COLORS[c.id];
        const cover = c.entries.find((e) => e.img)?.img;
        const tilt = i === 0 ? "-2.5deg" : i === cats.length - 1 ? "1.5deg" : "0deg";
        return (
          <button
            key={c.id}
            onClick={() => onOpen(c.id)}
            className="group relative flex-1 min-w-[240px] text-left fm-col outline-none"
            style={{ zIndex: 10 - i }}
            aria-label={c.name}
          >
            {/* entrance: staggered rise — background lives here so the page tilts like P1 */}
            <div
              className="absolute inset-x-0 -inset-y-8 anim-rise overflow-hidden"
              style={{
                background: col.bg,
                ["--rise-rot" as string]: tilt,
                ["--rest-rot" as string]: i === 0 ? "-3.5deg" : "0deg",
                animationDelay: `${0.15 + i * 0.14}s`,
              }}
            >
              {/* hover lift + tilt, freakmag page feel */}
              <div className="absolute inset-0 transition-transform duration-500 fm-ease group-hover:-translate-y-3 group-hover:rotate-[-1.5deg] group-hover:scale-[1.02]">
                {/* left rail: GUIDE + vertical CN name */}
                <div className="absolute left-4 md:left-5 top-4 bottom-4 flex gap-3 md:gap-4">
                  <div className="flex flex-col items-center gap-3 anim-fade-up" style={{ animationDelay: `${0.7 + i * 0.12}s` }}>
                    <span className="text-[10px] md:text-[11px] font-black tracking-[0.3em]">GUIDE</span>
                    <span className="w-px flex-1 bg-black/70" />
                  </div>
                  <div
                    className="v-text font-display text-2xl md:text-4xl leading-none anim-fade-up"
                    style={{ animationDelay: `${0.8 + i * 0.12}s` }}
                  >
                    {c.name}
                  </div>
                  <div className="v-text text-[10px] md:text-xs tracking-[0.3em] opacity-80 anim-fade-up" style={{ animationDelay: `${0.9 + i * 0.12}s` }}>
                    UPDATE&nbsp;{UPDATED}
                  </div>
                </div>

                {/* top-right: EN name rotated */}
                <div className="absolute right-3 md:right-5 top-16 md:top-20 v-text text-[10px] md:text-xs font-bold tracking-[0.35em] opacity-80 anim-fade-up" style={{ animationDelay: `${0.85 + i * 0.12}s` }}>
                  {c.en}
                </div>

                {/* bottom: Articles count */}
                <div className="absolute left-4 md:left-5 bottom-5 anim-fade-up" style={{ animationDelay: `${1 + i * 0.12}s` }}>
                  <div className="text-[10px] md:text-[11px] font-black tracking-[0.25em]">Articles</div>
                  <div className="font-display text-4xl md:text-6xl leading-none">{c.entries.length}</div>
                </div>

                {/* center-right: big index letter */}
                <div className="absolute right-2 bottom-4 font-display text-[9rem] md:text-[13rem] leading-none text-black/10 select-none group-hover:text-black/20 transition-colors duration-500">
                  {c.id}
                </div>

                {/* hover peek: cover image rises from bottom, tilted like a polaroid */}
                {cover && (
                  <div className="absolute inset-x-6 bottom-24 md:bottom-28 flex justify-center pointer-events-none">
                    <img
                      src={cover}
                      alt=""
                      className="fm-col-img w-full max-w-[240px] md:max-w-[300px] opacity-0 translate-y-[60%] rotate-[-8deg] group-hover:opacity-100 group-hover:translate-y-0 group-hover:rotate-[-6deg]"
                      style={{ boxShadow: "8px 10px 0 rgba(0,0,0,0.25)" }}
                    />
                  </div>
                )}

                {/* no-image categories: typographic peek */}
                {!cover && (
                  <div className="absolute inset-x-6 bottom-24 md:bottom-28 flex justify-center pointer-events-none">
                    <div className="fm-col-img opacity-0 translate-y-[60%] rotate-[-6deg] group-hover:opacity-100 group-hover:translate-y-0 bg-black text-white px-5 py-4 max-w-[240px]" style={{ boxShadow: "8px 10px 0 rgba(0,0,0,0.25)" }}>
                      <div className="font-display text-5xl leading-none mb-2">“</div>
                      <div className="text-xs md:text-sm font-serif-sc leading-relaxed">
                        {c.entries[0]?.title.replace(/[《》]/g, "").slice(0, 24)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* seams */}
              <span className="absolute right-0 top-0 bottom-0 w-px bg-black/25" />
              {/* click hint */}
              <span className="absolute right-3 bottom-3 text-[10px] font-black tracking-[0.3em] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                OPEN →
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
