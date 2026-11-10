import { createFileRoute } from "@tanstack/react-router";
import { feedItems, isArchived, venueVisible, WEEK_DEFAULT } from "@/lib/haf";
import { useAuth, useFavorites, useItems, useVenues } from "@/lib/app";
import { ItemCard, VenueCard } from "@/components/cards";

export const Route = createFileRoute("/free")({
  head: () => ({ meta: [
    { title: "Free food · Howard Affordable Food" },
    { name: "description", content: "Campus pantries, community fridges and free-meal events near Howard University in one place." },
    { property: "og:title", content: "Free food · Howard Affordable Food" },
    { property: "og:description", content: "Pantries, community fridges and free-meal events near Howard." },
  ] }),
  component: Free,
});

function Free() {
  const { role } = useAuth();
  const { favs } = useFavorites();
  const items = useItems(); const venues = useVenues();
  const events = feedItems(items.data ?? [], WEEK_DEFAULT, role, favs, { kind: "event", free: true, ignoreFilters: true }).filter((i) => !isArchived(i));
  const vs = venues.data ?? [];
  const pantries = vs.filter((v) => v.type === "pantry" && venueVisible(v, role));
  const fridges = vs.filter((v) => v.type === "fridge");
  return (
    <>
      <div className="h-row"><h2>Free food</h2><span className="count">No sign-up needed to look</span></div>
      <p className="sub">Pantries, community fridges and campus events serving free meals, in one place.</p>
      <div className="section-h">Free meals this week · {events.length}</div>
      <div className="list">{events.map((i) => <ItemCard key={i.id} i={i} />)}{!items.isLoading && !events.length && <div className="empty">No free-meal events posted this week yet.</div>}</div>
      <div className="section-h">Campus pantries</div>
      {role === "alumni" ? <div className="empty">Campus pantries serve current students, so they are hidden for alumni accounts. Community fridges below are open to everyone.</div>
        : <div className="list">{pantries.map((v) => <VenueCard key={v.id} v={v} />)}</div>}
      <div className="section-h">Community fridges</div>
      <div className="list">{fridges.map((v) => <VenueCard key={v.id} v={v} />)}</div>
    </>
  );
}
