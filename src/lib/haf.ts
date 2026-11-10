// Pure business rules ported from the prototype (R/F ids reference the team's RTM).
export type Role = "visitor" | "student" | "org" | "alumni";
export type Pt = { lat: number; lng: number };
export type Hours = ([number, number] | null)[];

export type Venue = {
  id: string; name: string; type: string; addr: string; lat: number; lng: number;
  cost: number; unit: string; ebt: boolean; bison: boolean; halal: boolean; veg: boolean;
  campus_only: boolean; sample: boolean; hours: Hours;
};
export type Item = {
  id: string; kind: "deal" | "event" | "market"; title: string; venue_id: string | null;
  location: string; lat: number; lng: number; start: Date; end: Date;
  daily: [number, number] | null; dow: number[] | null; recurring: string | null;
  season: [number, number] | null; season_txt: string | null; description: string; food: string;
  free: boolean; student_only: boolean; id_req: "none" | "required" | "only"; snap: boolean; bison: boolean;
  match_txt: string | null; by_label: string; by_role: string; author_id: string | null;
  verified_at: Date | null; vcount: number; flags: number; teaser?: boolean; _pin?: boolean;
};

export const CAMPUS: Pt = { lat: 38.9223, lng: -77.0199 };
export function hav(a: Pt, b: Pt) {
  const R = 3958.8, t = Math.PI / 180;
  const dLa = (b.lat - a.lat) * t, dLo = (b.lng - a.lng) * t;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
export const walkMi = (p: Pt) => hav(CAMPUS, p) * 1.25; // F10: straight line × 1.25 street factor
export const walkMin = (mi: number) => Math.max(1, Math.round(mi * 20)); // 3 mph
export const STATIONS = [
  { id: "shaw", name: "Shaw–Howard U", lines: "Green · Yellow", lat: 38.9134, lng: -77.0219 },
  { id: "ust", name: "U St / Cardozo", lines: "Green · Yellow", lat: 38.9169, lng: -77.0279 },
  { id: "colhts", name: "Columbia Heights", lines: "Green · Yellow", lat: 38.9284, lng: -77.0326 },
  { id: "petworth", name: "Georgia Ave–Petworth", lines: "Green · Yellow", lat: 38.9374, lng: -77.0237 },
  { id: "mtvernon", name: "Mt Vernon Sq", lines: "Green · Yellow", lat: 38.9055, lng: -77.0219 },
];
export const CORRIDORS = [
  { id: "georgia", name: "Georgia Ave buses", pts: [[38.903, -77.0219], [38.913, -77.0219], [38.922, -77.0217], [38.93, -77.0228], [38.94, -77.0244]] },
  { id: "ufla", name: "U St / Florida Ave buses", pts: [[38.917, -77.04], [38.917, -77.032], [38.917, -77.026], [38.9195, -77.022], [38.92, -77.015]] },
  { id: "fourteenth", name: "14th St buses", pts: [[38.904, -77.032], [38.912, -77.032], [38.92, -77.0322], [38.928, -77.0328], [38.936, -77.033]] },
  { id: "sixth", name: "6th St / Howard Pl shuttle", pts: [[38.9135, -77.02], [38.918, -77.02], [38.9225, -77.0199], [38.926, -77.0195]] },
];
export const corridorDist = (c: (typeof CORRIDORS)[number], p: Pt) => Math.min(...c.pts.map(([lat, lng]) => hav({ lat, lng }, p)));
export const stationsNear = (p: Pt) => STATIONS.map((s) => ({ ...s, d: hav(s, p) })).filter((s) => s.d <= 0.6).sort((a, b) => a.d - b.d);
export const busNear = (p: Pt) => CORRIDORS.filter((c) => corridorDist(c, p) <= 0.2);

export const DAYN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function fh(h: number) { h = ((h % 24) + 24) % 24; const H = Math.floor(h), M = Math.round((h - H) * 60); const ap = H < 12 ? "AM" : "PM"; const hh = H % 12 || 12; return M ? `${hh}:${String(M).padStart(2, "0")} ${ap}` : `${hh} ${ap}`; }
export const fRange = (a: number, b: number) => `${fh(a)}–${fh(b)}`;
export const dayStart = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const at = (off: number, h: number, base = new Date()) => { const x = dayStart(addDays(base, off)); x.setMinutes(Math.round(h * 60)); return x; };
export const hrs = (d: Date) => d.getHours() + d.getMinutes() / 60;
export function fDay(d: Date, now = new Date()) { const diff = Math.round((+dayStart(d) - +dayStart(now)) / 864e5); if (diff === 0) return "Today"; if (diff === 1) return "Tomorrow"; if (diff === -1) return "Yesterday"; return `${DAYN[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}`; }
export function ago(d: Date) { const m = Math.round((Date.now() - +d) / 6e4); if (m < 1) return "just now"; if (m < 60) return `${m} min ago`; const h = Math.round(m / 60); if (h < 24) return `${h} hr ago`; return `${Math.round(h / 24)} d ago`; }
export const mi = (x: number) => `${x < 0.1 ? x.toFixed(2) : x.toFixed(1)} mi`;
export const TYPE: Record<string, string> = { grocery: "Grocery", restaurant: "Restaurant", market: "Corner market", pantry: "Food pantry", fridge: "Community fridge" };
export const ROLE_LABEL: Record<Role, string> = { visitor: "Visitor", student: "Student", org: "Student org", alumni: "Alumni" };

export const isLate = (v: Venue) => v.hours.some((h) => h && h[1] > 23);
export function isOpenNow(v: Venue, now = new Date()) {
  const d = now.getDay(), h = hrs(now), today = v.hours[d], yest = v.hours[(d + 6) % 7];
  if (today && h >= today[0] && h < today[1]) return true;
  if (yest && yest[1] > 24 && h < yest[1] - 24) return true;
  return false;
}
export function hoursText(r: [number, number] | null) { if (!r) return "Closed"; if (r[0] === 0 && r[1] === 24) return "Open 24 hours"; return fRange(r[0], r[1]); }
export const venueVisible = (v: Venue, role: Role) => !(role === "alumni" && v.campus_only); // R36

export type DirFilters = { q: string; radius: number; type: string; ebt: boolean; bison: boolean; halal: boolean; veg: boolean; late: boolean; open: boolean; transit: "any" | "walk" | "metro" | "bus"; sort: "cost" | "distance" | "transit" };
export const DIR_DEFAULT: DirFilters = { q: "", radius: 1.5, type: "all", ebt: false, bison: false, halal: false, veg: false, late: false, open: false, transit: "any", sort: "cost" };
export function filterVenues(all: Venue[], f: DirFilters, role: Role, now = new Date()) {
  const q = f.q.trim().toLowerCase();
  const list = all.filter((v) => {
    const dist = walkMi(v), st = stationsNear(v), bus = busNear(v);
    return venueVisible(v, role) && dist <= f.radius && (f.type === "all" || v.type === f.type)
      && (!q || `${v.name} ${TYPE[v.type]} ${v.addr}`.toLowerCase().includes(q))
      && (!f.ebt || v.ebt) && (!f.bison || v.bison) && (!f.halal || v.halal) && (!f.veg || v.veg) && (!f.late || isLate(v))
      && (!f.open || isOpenNow(v, now))
      && (f.transit === "any" || (f.transit === "walk" && walkMin(dist) <= 15) || (f.transit === "metro" && st.some((s) => s.d <= 0.35)) || (f.transit === "bus" && bus.length > 0));
  });
  const ts = (v: Venue) => (f.transit === "bus" ? -busNear(v).length : stationsNear(v)[0]?.d ?? 9);
  if (f.sort === "cost") list.sort((a, b) => a.cost - b.cost || walkMi(a) - walkMi(b));
  else if (f.sort === "distance") list.sort((a, b) => walkMi(a) - walkMi(b));
  else list.sort((a, b) => ts(a) - ts(b) || walkMi(a) - walkMi(b));
  return list;
}

export const inSeason = (i: Item, now = new Date()) => { if (!i.season) return true; const m = now.getMonth(); return m >= i.season[0] && m <= i.season[1]; };
export const isArchived = (i: Item, now = new Date()) => i.end <= now || i.flags >= 2; // F17 / R21
export const itemRange = (i: Item): [number, number] => i.daily ?? [hrs(i.start), hrs(i.start) + (+i.end - +i.start) / 36e5];
export function occursOn(i: Item, day: Date, now = new Date()) {
  const ds = dayStart(day), de = addDays(ds, 1);
  if (!(i.start < de && i.end > ds)) return false;
  if (i.dow && !i.dow.includes(ds.getDay())) return false;
  if (i.daily && +dayStart(now) === +ds && hrs(now) >= i.daily[1] && i.daily[1] <= 24) return false;
  return true;
}
export function nextStart(i: Item, now = new Date()) {
  if (!i.daily) return i.start;
  for (let k = 0; k < 7; k++) { const d = addDays(now, k); if (occursOn(i, d, now)) return at(k, i.daily[0], now); }
  return i.start;
}
export function whenInfo(i: Item, now = new Date()): { live: boolean; text: string } {
  if (i.daily) {
    const r = i.daily; const live = occursOn(i, now, now) && hrs(now) >= r[0] && hrs(now) < r[1];
    return { live, text: live ? `On now · ${fRange(r[0], r[1])}` : `Next: ${fDay(nextStart(i, now), now)} · ${fRange(r[0], r[1])}` };
  }
  const live = i.start <= now && i.end > now;
  const rng = fRange(hrs(i.start), hrs(i.start) + (+i.end - +i.start) / 36e5);
  return { live, text: live ? `Happening now · ${rng}` : `${fDay(i.start, now)} · ${rng}` };
}
const WINDOWS: Record<string, [number, number]> = { morning: [5, 12], afternoon: [12, 17], evening: [17, 21], late: [21, 29] };
export function overlapsWindow(i: Item, w: string) {
  let [a, b] = itemRange(i); if (b <= a) b += 24; const [x, y] = WINDOWS[w];
  return (a < y && b > x) || (a + 24 < y && b + 24 > x) || (a - 24 < y && b - 24 > x);
}
export const isRestricted = (i: Pick<Item, "student_only" | "id_req">) => i.student_only || i.id_req === "only";
export function visibility(i: Item, role: Role): "hidden" | "locked" | "show" { // R25, R26, R36
  if (role === "alumni" && isRestricted(i)) return "hidden";
  if (role === "visitor" && (isRestricted(i) || i.teaser)) return "locked";
  return "show";
}

export type WeekFilters = { kind: string; bison: boolean; snap: boolean; id: "any" | "required" | "none"; idOnly: boolean; time: string; near: string; sort: "date" | "distance"; day: number | null; archived: boolean };
export const WEEK_DEFAULT: WeekFilters = { kind: "all", bison: false, snap: false, id: "any", idOnly: false, time: "any", near: "", sort: "date", day: null, archived: false };
export function feedItems(items: Item[], f: WeekFilters, role: Role, favs: Set<string>, opts: { kind?: string; free?: boolean; ignoreFilters?: boolean } = {}, now = new Date()) {
  const end = dayStart(addDays(now, 7));
  const list = items.filter((i) => {
    if (visibility(i, role) === "hidden") return false;
    if (!inSeason(i, now)) return false; // R37
    const arch = isArchived(i, now);
    if (arch && !f.archived) return false;
    if (!arch && i.start >= end) return false; // R22
    if (opts.kind && i.kind !== opts.kind) return false;
    if (opts.free && !i.free) return false;
    if (opts.ignoreFilters) return true;
    if (f.kind !== "all" && i.kind !== f.kind) return false;
    if (f.bison && !i.bison) return false;
    if (f.snap && !i.snap) return false;
    if (f.id === "required" && i.id_req === "none") return false;
    if (f.id === "none" && i.id_req !== "none") return false;
    if (f.idOnly && i.id_req !== "only") return false;
    if (f.time !== "any" && !overlapsWindow(i, f.time)) return false;
    if (f.near) {
      const [t, id] = f.near.split(":");
      if (t === "st") { const s = STATIONS.find((x) => x.id === id)!; if (hav(s, i) > 0.5) return false; }
      else { const c = CORRIDORS.find((x) => x.id === id)!; if (corridorDist(c, i) > 0.2) return false; }
    }
    if (f.day !== null && !occursOn(i, addDays(now, f.day), now)) return false;
    return true;
  });
  const key = f.sort === "distance" ? (i: Item) => walkMi(i) : (i: Item) => +nextStart(i, now);
  list.sort((a, b) => key(a) - key(b));
  const pinned = list.filter((i) => i.kind === "deal" && i.venue_id && favs.has(i.venue_id) && !isArchived(i, now)); // R34
  return [...pinned.map((i) => ({ ...i, _pin: true })), ...list.filter((i) => !pinned.includes(i))];
}

export const STUDENT_EMAIL = /^[^@\s]+@bison\.howard\.edu$/i;
export const HOWARD_ID = /^@?\d{8}$/;
