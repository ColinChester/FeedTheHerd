import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ago, isArchived, isOpenNow, isLate, mi, TYPE, visibility, walkMi, walkMin, whenInfo, type Item, type Venue } from "@/lib/haf";
import { isVerified, useAuth, useFavorites, useMyVotes, useUi } from "@/lib/app";

export const Heart = ({ filled }: { filled: boolean }) => (
  <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" /></svg>
);

export function SignInBanner({ msg }: { msg: string }) {
  const { open } = useUi();
  return (
    <div className="banner"><div className="grow"><b>{msg}</b><span className="sub">Sign in with your Howard credentials.</span></div>
      <button className="btn sm" onClick={() => open({ kind: "signin", path: "student" })}>Sign in</button></div>
  );
}

export function VenueBadges({ v }: { v: Venue }) {
  return (
    <div className="badges">
      {v.ebt && <span className="b ebt">EBT/SNAP</span>}{v.bison && <span className="b bison">Bison Bucks</span>}
      {v.halal && <span className="b">Halal</span>}{v.veg && <span className="b">Vegetarian</span>}
      {isLate(v) && <span className="b">Late night</span>}{v.campus_only && <span className="b navy">Students only</span>}
    </div>
  );
}

export function FavButton({ id, name }: { id: string; name: string }) {
  const { favs, toggle } = useFavorites();
  const { toast } = useUi();
  const on = favs.has(id);
  return (
    <button className="fav" aria-pressed={on} aria-label={`${on ? "Remove" : "Save"} ${name} ${on ? "from" : "to"} favorites`}
      onClick={(e) => { e.stopPropagation(); toggle.mutate(id, { onSuccess: (added) => toast(added ? "Saved to favorites" : "Removed from favorites", added ? " Its deals now pin to the top of This Week." : "") }); }}>
      <Heart filled={on} />
    </button>
  );
}

export function VenueCard({ v }: { v: Venue }) {
  const { open } = useUi();
  const isOpen = isOpenNow(v); const d = walkMi(v);
  const go = () => open({ kind: "venue", id: v.id });
  return (
    <div className="vcard" role="button" tabIndex={0} onClick={go} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } }}>
      {Number(v.cost) === 0 ? <div className="price free"><b>Free</b></div> : <div className="price"><b>${Number(v.cost)}</b><small>{v.unit === "basket" ? "basket" : "meal"}</small></div>}
      <div><h3>{v.name}</h3>
        <div className="meta num">{TYPE[v.type]} · {mi(d)} · {walkMin(d)} min walk · <span className={isOpen ? "open" : "closed"}>{isOpen ? "Open" : "Closed"}</span></div>
        <VenueBadges v={v} /></div>
      <FavButton id={v.id} name={v.name} />
    </div>
  );
}

export function ItemCard({ i }: { i: Item }) {
  const { role, userId } = useAuth();
  const { open, toast } = useUi();
  const votes = useMyVotes();
  const qc = useQueryClient();
  const vis = visibility(i, role), arch = isArchived(i);
  const kindL = { deal: "Deal", event: i.free ? "Free food event" : "Event", market: "Farmers market" }[i.kind];
  const voted = votes.data?.[i.id];
  const w = whenInfo(i);

  async function vote(v: "ok" | "no") {
    if (!userId || voted === v) return;
    const { error } = await supabase.from("votes").upsert({ item_id: i.id, user_id: userId, vote: v, updated_at: new Date().toISOString() });
    if (error) return toast("Couldn't save your vote", " Try again.");
    await qc.invalidateQueries({ queryKey: ["items"] }); await qc.invalidateQueries({ queryKey: ["votes"] });
    const flags = i.flags + (v === "no" ? 1 : 0) - (voted === "no" ? 1 : 0);
    if (v === "ok") toast("Thanks for verifying", " Last-verified time updated.");
    else toast(flags >= 2 ? "Deal archived" : "Flagged as expired", flags >= 2 ? " Two people reported it expired, so it moved to archived." : " One more report archives it.");
  }

  const body = (
    <>
      <h3>{i.title}</h3>
      <p>{i.location}{i.venue_id && <> · <button className="linkbtn" onClick={() => open({ kind: "venue", id: i.venue_id! })}>View venue</button></>}</p>
      <p>{i.description}</p>
      <p className="food"><b>Food:</b> {i.food}</p>
      <div className="badges">
        {i.snap && <span className="b ebt">SNAP</span>}{i.bison && <span className="b bison">Bison Bucks</span>}
        {i.id_req === "required" && <span className="b warn">Student ID required</span>}{i.id_req === "only" && <span className="b warn">Student-ID only</span>}
        {i.student_only && <span className="b navy">Students only</span>}{i.match_txt && <span className="b ebt">{i.match_txt}</span>}
        {i.recurring && <span className="b">{i.recurring}</span>}{i.season_txt && <span className="b">Season: {i.season_txt}</span>}
        {i.by_role === "alumni" && <span className="b">Alumni post</span>}
      </div>
    </>
  );
  return (
    <article className={`item k-${i.kind} ${arch ? "archived" : ""}`}>
      <div className="item-top"><span className="kind">{kindL}</span>
        <span className="num">{arch ? "Ended · archived" : w.live ? <b className="open">{w.text}</b> : w.text}</span>
        <span className="num">· {mi(walkMi(i))}</span>{i._pin && <span className="pin">♥ From your favorites</span>}</div>
      {vis === "locked" ? (
        <><div className="locked" aria-hidden="true">{body}</div>
          <div className="lockmsg"><span>Student-only. Sign in with Howard credentials to see details.</span><button className="btn sm" onClick={() => open({ kind: "signin", path: "student" })}>Sign in</button></div></>
      ) : (
        <>{body}
          {i.kind === "deal" && !arch && (
            <div className="verify">
              {isVerified(role) && <><button className="vbtn ok" aria-pressed={voted === "ok"} onClick={() => vote("ok")}>✓ Still valid</button><button className="vbtn no" aria-pressed={voted === "no"} onClick={() => vote("no")}>Expired</button></>}
              <span className="note">{i.vcount > 0 && <><b>Peer-verified</b> by {i.vcount} · </>}Last verified {i.verified_at ? ago(i.verified_at) : "never"}{i.flags > 0 && ` · flagged expired by ${i.flags}`}</span>
            </div>
          )}
          <p className="sub">Posted by {i.by_label}</p></>
      )}
    </article>
  );
}
