import { createFileRoute } from "@tanstack/react-router";
import { filterVenues } from "@/lib/haf";
import { useAuth, useFilters, useVenues } from "@/lib/app";
import { VenueCard } from "@/components/cards";
import { Chip, Seg } from "@/components/controls";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Food near campus · Howard Affordable Food" },
    { name: "description", content: "Find cheap groceries, meals, pantries and community fridges near Howard University, with EBT and Bison Bucks filters." },
    { property: "og:title", content: "Food near campus · Howard Affordable Food" },
    { property: "og:description", content: "Cheap groceries, meals, pantries and fridges near Howard University." },
  ] }),
  component: Directory,
});

function Directory() {
  const { role } = useAuth();
  const { dir: f, setDir } = useFilters();
  const venues = useVenues();
  const list = filterVenues(venues.data ?? [], f, role);
  return (
    <>
      <div className="h-row"><h2>Food near campus</h2><span className="count num">{venues.isLoading ? "…" : `${list.length} places`}</span></div>
      <div className="search"><input className="input" type="search" placeholder="Search groceries, halal, pantry…" value={f.q} onChange={(e) => setDir({ q: e.target.value })} aria-label="Search venues" /></div>
      <div className="filters">
        <div className="row"><span className="lbl">Radius</span><input type="range" min="0.25" max="2" step="0.25" value={f.radius} onChange={(e) => setDir({ radius: +e.target.value })} aria-label="Search radius in miles" /><b className="num" style={{ minWidth: 52, textAlign: "right" }}>{f.radius} mi</b></div>
        <div className="chips">
          {([["all", "All"], ["grocery", "Grocery"], ["restaurant", "Restaurants"], ["market", "Markets"], ...(role !== "alumni" ? [["pantry", "Pantries"]] : []), ["fridge", "Fridges"]] as [string, string][]).map(([k, l]) => <Chip key={k} on={f.type === k} onClick={() => setDir({ type: k })}>{l}</Chip>)}
        </div>
        <div className="chips">
          {([["ebt", "EBT/SNAP"], ["bison", "Bison Bucks"], ["halal", "Halal"], ["veg", "Vegetarian"], ["late", "Late night"], ["open", "Open now"]] as const).map(([k, l]) => <Chip key={k} on={f[k]} onClick={() => setDir({ [k]: !f[k] })}>{l}</Chip>)}
        </div>
        <div className="row"><span className="lbl">Getting there</span><Seg value={f.transit} onChange={(v) => setDir({ transit: v })} options={[["any", "Any"], ["walk", "≤15 min walk"], ["metro", "Metro"], ["bus", "Bus"]]} /></div>
        <div className="row"><span className="lbl">Sort</span><Seg value={f.sort} onChange={(v) => setDir({ sort: v })} options={[["cost", "Lowest cost"], ["distance", "Closest"], ["transit", "Transit access"]]} /></div>
      </div>
      {role === "alumni" && <p className="sub">Campus pantries are for current students and are hidden for alumni accounts.</p>}
      <div className="list">{list.map((v) => <VenueCard key={v.id} v={v} />)}{!venues.isLoading && !list.length && <div className="empty">No places match. Try a wider radius or fewer filters.</div>}</div>
      <p className="samplenote">Sample data. Prices, hours and deals are illustrative.</p>
    </>
  );
}
