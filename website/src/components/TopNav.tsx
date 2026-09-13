interface Props {
  onBack: () => void;
  dark?: boolean;
}

export default function TopNav({ onBack: onHome, dark }: Props) {
  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 md:px-6 h-12 border-b ${
        dark ? "border-black/15 text-black" : "border-white/25 text-white"
      }`}
      style={{ backdropFilter: "blur(6px)", background: dark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.25)" }}
    >
      <button className="flex flex-col gap-[5px] w-7 group" aria-label="menu">
        <span className={`h-[2px] w-full transition-transform group-hover:-translate-y-[1px] ${dark ? "bg-black" : "bg-white"}`} />
        <span className={`h-[2px] w-full ${dark ? "bg-black" : "bg-white"}`} />
        <span className={`h-[2px] w-full transition-transform group-hover:translate-y-[1px] ${dark ? "bg-black" : "bg-white"}`} />
      </button>

      <button onClick={onHome} className="absolute left-1/2 -translate-x-1/2 select-none">
        <span className="font-display text-xl md:text-2xl tracking-wide anim-logo">
          SHOP WINDOW 橱窗
        </span>
      </button>

      <div className="flex items-center gap-2">
        <span className="hidden md:inline text-[10px] tracking-[0.25em] opacity-80">SHOW WINDOW ARCHIVE</span>
        <a
          href="#top"
          onClick={(e) => e.preventDefault()}
          className={`text-[10px] md:text-xs font-bold tracking-widest border px-2.5 py-1 rounded-sm transition-colors ${
            dark ? "border-black hover:bg-black hover:text-white" : "border-white hover:bg-white hover:text-black"
          }`}
        >
          INDEX →
        </a>
      </div>
    </header>
  );
}
