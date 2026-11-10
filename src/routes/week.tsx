import { createFileRoute } from "@tanstack/react-router";
import { addDays, CORRIDORS, DAYN, dayStart, feedItems, inSeason, isArchived, MON, occursOn, STATIONS } from "@/lib/haf";
import { isStudent, useAuth, useFavorites, useFilters, useItems } from "@/lib/app";
import { ItemCard, SignInBanner } from "@/components/cards";
import { Chip, Seg } from "@/components/controls";

export const Route = createFileRoute("/week")({
  head: () => ({ meta: [
    { title: "This week · Howard Affordable Food" },
    { name: "description", content: "Student deals, free-food events and farmers markets near Howard University this week." },
    { property: "og:title", content: "This week · Howard Affordable Food" },
    { property: "og:description", content: "Deals, free-food events and farmers markets near Howard this week." },
  ] }),
  component: Week,
});

function Week() {
  const { role } = useAuth();
  const { week: f, setWeek } = useFilters();
  const { favs } = useFavorites();
  const items = useItems();
  const all = items.data ?? [];
  const list = feedItems(all, f, role, favs);
  const base = feedItems(all, f, role, favs, { ignoreFilters: true });
  const offSeason = all.filter((i) => i.kind === "market" && !inSeason(i)).length;
  const s = dayStart(new Date()), e = addDays(s, 6);
  return (
    <>
      <div className="h-row"><h2>This week</h2><span className="count num">{MON[s.getMonth()]} {s.getDate()} – {MON[e.getMonth()]} {e.getDate()}</span></div>
      {role === "visitor" && <SignInBanner msg="Some student-only deals and events are hidden." />}
      <div className="days" role="group" aria-label="Pick a day">
        {[...Array(7)].map((_, k) => { const d = addDays(new Date(), k); const n = base.filter((i) => !isArchived(i) && occursOn(i, d)).length;
          return <button key={k} className="day" aria-pressed={f.day === k} onClick={() => setWeek({ day: f.day === k ? null : k })}><small>{k === 0 ? "Today" : DAYN[d.getDay()]}</small><b className="num">{d.getDate()}</b><i>{n ? `${n} items` : ""}</i></button>; })}
      </div>
      <Seg value={f.kind} onChange={(v) => setWeek({ kind: v })} options={[["all", "All"], ["deal", "Deals"], ["event", "Events"], ["market", "Markets"]]} />
      <div className="filters">
        <div className="chips">
          <Chip on={f.bison} onClick={() => setWeek({ bison: !f.bison })}>Bison Bucks</Chip>
          <Chip on={f.snap} onClick={() => setWeek({ snap: !f.snap })}>SNAP</Chip>
          {(isStudent(role) || role === "visitor") && <Chip on={f.idOnly} onClick={() => setWeek({ idOnly: !f.idOnly })}>Student-ID only</Chip>}
          <Chip on={f.archived} onClick={() => setWeek({ archived: !f.archived })}>Show archived</Chip>
        </div>
        <div className="row"><span className="lbl">Student ID</span><Seg value={f.id} onChange={(v) => setWeek({ id: v })} options={[["any", "Any"], ["required", "Required"], ["none", "Not required"]]} /></div>
        <div className="row"><span className="lbl">Time</span><div className="chips">{([["any", "Any time"], ["morning", "Morning"], ["afternoon", "Afternoon"], ["evening", "Evening"], ["late", "Late night"]] as [string, string][]).map(([k, l]) => <Chip key={k} on={f.time === k} onClick={() => setWeek({ time: k })}>{l}</Chip>)}</div></div>
        <div className="row"><span className="lbl">Near</span>
          <select className="input" style={{ flex: 1 }} value={f.near} onChange={(e) => setWeek({ near: e.target.value })} aria-label="Near a Metro station or bus route">
            <option value="">Anywhere</option>
            <optgroup label="Metro">{STATIONS.map((x) => <option key={x.id} value={`st:${x.id}`}>{x.name}</option>)}</optgroup>
            <optgroup label="Bus">{CORRIDORS.map((x) => <option key={x.id} value={`bus:${x.id}`}>{x.name}</option>)}</optgroup>
          </select></div>
        <div className="row"><span className="lbl">Sort</span><Seg value={f.sort} onChange={(v) => setWeek({ sort: v })} options={[["date", "Soonest"], ["distance", "Closest to campus"]]} /></div>
      </div>
      <div className="list">{list.map((i) => <ItemCard key={i.id} i={i} />)}{!items.isLoading && !list.length && <div className="empty">Nothing matches these filters this week.</div>}</div>
      {offSeason > 0 && (f.kind === "all" || f.kind === "market") && <p className="sub">{offSeason} farmers market is out of season and will reappear when it opens.</p>}
    </>
  );
}
