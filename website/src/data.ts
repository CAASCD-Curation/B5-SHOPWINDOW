import raw from "./data.json";

export interface Entry {
  title: string;
  author?: string;
  year?: string;
  type?: string;
  desc?: string;
  note?: string;
  keywords?: string;
  case?: string;
  img?: string;
}

export interface Category {
  id: string;
  name: string;
  en: string;
  entries: Entry[];
}

export const CATEGORIES = raw.categories as Category[];

export const CAT_COLORS: Record<string, { bg: string; deep: string; bubble: string; light: string }> = {
  A: { bg: "#DE91F8", deep: "#B45BD6", bubble: "#2FB7DB", light: "#F9EEFD" }, // 紫 Purple 222,145,248
  B: { bg: "#73E5FC", deep: "#2FB7DB", bubble: "#B45BD6", light: "#EAF9FE" }, // 青蓝 Cyan 115,229,252
  C: { bg: "#4CA77A", deep: "#2F7F5B", bubble: "#B45BD6", light: "#ECF6F1" }, // 绿 Green 76,167,122
  D: { bg: "#EBFF60", deep: "#A8BD1F", bubble: "#B45BD6", light: "#FAFEE0" }, // 荧光黄 Yellow 235,255,96
};

export const UPDATED = "2026.09.13";

/** pick a short punchy phrase for the speech bubble */
export function bubbleText(e: Entry): string {
  const kw = (e.keywords || "").split(/[｜/、,，;；]/).map((s) => s.trim()).filter(Boolean);
  if (kw.length) return kw.slice(0, 3).join("・");
  if (e.case) return e.case;
  return (e.type || "SHOW WINDOW").slice(0, 12);
}

export function splitTitle(title: string): { cn: string; en: string } {
  const m = title.match(/^(.*?[》」])?\s*([A-Za-z0-9].*)$/);
  const enMatch = title.match(/[A-Za-z][A-Za-z0-9 ,.'&:;!?()\-—×’‘“”]*$/);
  if (enMatch && enMatch.index !== undefined && enMatch.index > 0) {
    void m;
    return { cn: title.slice(0, enMatch.index).replace(/[《》]/g, "").trim(), en: enMatch[0].trim() };
  }
  return { cn: title.replace(/[《》]/g, "").trim(), en: "" };
}
