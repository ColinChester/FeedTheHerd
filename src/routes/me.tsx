import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isArchived, ROLE_LABEL } from "@/lib/haf";
import { isVerified, useAuth, useFavorites, useItems, useUi, useVenues } from "@/lib/app";
import { FavButton } from "@/components/cards";

export const Route = createFileRoute("/me")({
  head: () => ({ meta: [
    { title: "Me · Howard Affordable Food" },
    { name: "description", content: "Your Howard account, deal alerts, favorite places and posts." },
    { property: "og:title", content: "Me · Howard Affordable Food" },
    { property: "og:description", content: "Your account, alerts and favorite places." },
  ] }),
  component: Me,
});

function Me() {
  const { role, session, profile, userId, signedInUnverified, refresh } = useAuth();
  const { open, toast } = useUi();
  const { favs } = useFavorites();
  const venues = useVenues(); const items = useItems();
  const qc = useQueryClient();
  const favList = (venues.data ?? []).filter((v) => favs.has(v.id));
  const mine = (items.data ?? []).filter((i) => userId && i.author_id === userId);
  const myRevs = useQuery({ queryKey: ["myrevcount", userId], enabled: !!userId, queryFn: async () => (await supabase.from("reviews").select("id", { count: "exact", head: true }).eq("user_id", userId!)).count ?? 0 });

  async function setNotif(k: "notify_deals" | "notify_events", v: boolean) {
    if (!userId) return open({ kind: "signin", path: "student" });
    await supabase.from("profiles").update(k === "notify_deals" ? { notify_deals: v } : { notify_events: v }).eq("user_id", userId);
    refresh(); toast(`${k === "notify_deals" ? "Deal" : "Event"} alerts ${v ? "on" : "off"}`);
  }
  async function signOut() { await supabase.auth.signOut(); qc.clear(); toast("Signed out"); }

  return (
    <>
      <div className="h-row"><h2>Me</h2></div>
      {isVerified(role) ? (
        <div className="box">
          <div className="h-row"><span className={`rolepill ${role}`}>{ROLE_LABEL[role]}</span><button className="btn ghost sm" onClick={signOut}>Sign out</button></div>
          <div className="kv"><span>Account</span><span>{session?.user.email}</span></div>
          {profile?.org && role === "org" && <div className="kv"><span>Organization</span><span>{profile.org}</span></div>}
          {profile?.grad_year && role === "alumni" && <div className="kv"><span>Class of</span><span>{profile.grad_year}</span></div>}
          <div className="kv"><span>Verified</span><span className="open">Howard credentials ✓</span></div>
          {myRevs.data ? <div className="kv"><span>Reviews written</span><span className="num">{myRevs.data}</span></div> : null}
        </div>
      ) : signedInUnverified ? (
        <div className="box"><span className="rolepill visitor">Not verified</span>
          <p className="sub">{session?.user.email} isn't a Howard student address and has no alumni verification, so you can browse like a visitor.</p>
          <button className="btn ghost sm" onClick={signOut}>Sign out</button></div>
      ) : (
        <div className="box"><span className="rolepill visitor">Visitor</span>
          <p className="sub">You can browse the directory and public listings. Sign in to post, review, verify deals and see student-only items.</p>
          <div className="grid2"><button className="btn" onClick={() => open({ kind: "signin", path: "student" })}>Student sign-in</button><button className="btn ghost" onClick={() => open({ kind: "signin", path: "alumni" })}>Alumni sign-in</button></div></div>
      )}
      <div className="box"><h3>Notifications</h3>
        <label className="switch">Alert me when a new deal is posted<input type="checkbox" checked={!!userId && !!profile?.notify_deals} onChange={(e) => setNotif("notify_deals", e.target.checked)} /></label>
        <label className="switch">Alert me when a new event is posted<input type="checkbox" checked={!!userId && !!profile?.notify_events} onChange={(e) => setNotif("notify_events", e.target.checked)} /></label>
        {!isVerified(role) && <p className="sub">Alerts are for verified Howard accounts.</p>}
      </div>
      <div className="box"><h3>Favorite places · {favList.length}</h3><p className="sub">New deals from these places are pinned to the top of This Week.</p>
        {favList.length ? favList.map((v) => <div key={v.id} className="mini"><button className="linkbtn" onClick={() => open({ kind: "venue", id: v.id })}>{v.name}</button><FavButton id={v.id} name={v.name} /></div>) : <p className="sub">Tap the heart on any place to save it.</p>}
      </div>
      {mine.length > 0 && <div className="box"><h3>Your posts</h3>{mine.map((i) => <div key={i.id} className="mini"><span>{i.title}</span><span className="sub">{isArchived(i) ? "Archived" : "Active"}</span></div>)}</div>}
    </>
  );
}
