import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addDays, CAMPUS, dayStart, fRange, hrs, ROLE_LABEL } from "@/lib/haf";
import { isVerified, useAuth, useFilters, useUi, useVenues } from "@/lib/app";
import { SignInBanner } from "@/components/cards";

export const Route = createFileRoute("/post")({
  head: () => ({ meta: [
    { title: "Post a deal or event · Howard Affordable Food" },
    { name: "description", content: "Verified Howard students, student orgs and alumni can share food deals and free-food events." },
    { property: "og:title", content: "Post a deal or event · Howard Affordable Food" },
    { property: "og:description", content: "Share a food deal or free-food event with Howard students." },
  ] }),
  component: Post,
});

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function Post() {
  const { role, profile, userId, signedInUnverified } = useAuth();
  const { toast } = useUi();
  const { setWeek } = useFilters();
  const venues = useVenues();
  const qc = useQueryClient();
  const nav = useNavigate();
  const today = iso(new Date());
  const [kind, setKind] = useState<"deal" | "event">("deal");
  const [f, setF] = useState({ title: "", venue: "", loc: "", sd: today, st: "12:00", ed: today, et: "14:00", rec: "", food: "", desc: "", idReq: "none", snap: false, bison: false, so: false });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const up = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));

  if (!isVerified(role)) return (
    <><div className="h-row"><h2>Post a deal or event</h2></div>
      {signedInUnverified ? <div className="banner"><div className="grow"><b>This account isn't verified as Howard.</b><span className="sub">Sign out and sign in with your @bison.howard.edu address or the alumni path.</span></div></div>
        : <SignInBanner msg="Posting is for verified Howard students, student orgs and alumni." />}
      <p className="sub">Posts keep listings current. Every post shows who shared it and when it was last verified.</p></>
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const title = f.title.trim(), loc = f.loc.trim(), food = f.food.trim();
    let start = new Date(`${f.sd}T${f.st || "00:00"}`), end = new Date(`${f.ed}T${f.et || "00:00"}`);
    if (!title || !loc || !food) return setErr("Add a title, location and food details.");
    if (isNaN(+start) || isNaN(+end) || end <= start) return setErr("End time must be after the start time.");
    if (end <= new Date()) return setErr("That end time has already passed, so the post would be archived right away.");
    let daily: [number, number] | null = null, dow: number[] | null = null, recurring: string | null = null;
    if (f.rec) {
      daily = [hrs(start), hrs(end) <= hrs(start) ? hrs(end) + 24 : hrs(end)];
      if (f.rec === "weekdays") dow = [1, 2, 3, 4, 5];
      recurring = (f.rec === "weekdays" ? "Weekdays, " : "Daily, ") + fRange(daily[0], daily[1]);
      start = dayStart(start); end = addDays(dayStart(end), 1);
    }
    setBusy(true);
    const { error } = await supabase.from("items").insert({
      kind, title, venue_id: f.venue || null, location: loc, lat: CAMPUS.lat, lng: CAMPUS.lng,
      start_at: start.toISOString(), end_at: end.toISOString(), daily_start: daily?.[0] ?? null, daily_end: daily?.[1] ?? null, dow, recurring,
      description: f.desc.trim(), food, snap: f.snap, bison: f.bison, id_req: f.idReq, student_only: role !== "alumni" && f.so, free: kind === "event", author_id: userId!,
    });
    setBusy(false);
    if (error) return setErr("Couldn't post this. Check the details and try again.");
    await qc.invalidateQueries({ queryKey: ["items"] });
    setWeek({ kind: "all", day: null });
    toast("Posted to This Week", ` People with ${kind} alerts on were notified.`);
    nav({ to: "/week" });
  }
  return (
    <>
      <div className="h-row"><h2>Post a deal or event</h2></div>
      <p className="sub">Posting as <b>{profile?.org || ROLE_LABEL[role]}</b>. {role === "alumni" ? "Alumni posts are visible to students and alumni." : "Posts go to This Week and alert anyone who turned on notifications."}</p>
      <form className="list" onSubmit={submit} noValidate>
        <div className="seg">{([["deal", "Deal or discount"], ["event", "Free-food event"]] as const).map(([k, l]) => <button type="button" key={k} aria-pressed={kind === k} onClick={() => { setKind(k); setErr(""); }}>{l}</button>)}</div>
        <label className="f">Title<input className="input" maxLength={80} placeholder={kind === "deal" ? "$5 lunch special with student ID" : "Free tacos after the club meeting"} value={f.title} onChange={(e) => up({ title: e.target.value })} /></label>
        <label className="f">Linked venue <small>Optional. Links the post to its directory listing.</small>
          <select className="input" value={f.venue} onChange={(e) => up({ venue: e.target.value })}><option value="">None</option>{(venues.data ?? []).filter((v) => !["pantry", "fridge"].includes(v.type)).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
        <label className="f">Location<input className="input" list="campusLocs" placeholder="Blackburn Center, Room 148" value={f.loc} onChange={(e) => up({ loc: e.target.value })} />
          <datalist id="campusLocs">{["Blackburn Center", "Founders Library", "Douglass Hall", "The Yard", "Howard Plaza Towers", "Cramton Auditorium"].map((x) => <option key={x} value={x} />)}</datalist></label>
        <div className="grid2">
          <label className="f">Starts<input className="input" type="date" value={f.sd} onChange={(e) => up({ sd: e.target.value })} /></label>
          <label className="f">&nbsp;<input className="input" type="time" value={f.st} onChange={(e) => up({ st: e.target.value })} aria-label="Start time" /></label>
          <label className="f">Ends<input className="input" type="date" value={f.ed} onChange={(e) => up({ ed: e.target.value })} /></label>
          <label className="f">&nbsp;<input className="input" type="time" value={f.et} onChange={(e) => up({ et: e.target.value })} aria-label="End time" /></label>
        </div>
        <label className="f">Repeats<select className="input" value={f.rec} onChange={(e) => up({ rec: e.target.value })}><option value="">Does not repeat</option><option value="daily">Every day in that window</option><option value="weekdays">Weekdays only</option></select></label>
        <label className="f">Food details<input className="input" placeholder="Cheese pizza, vegan option, drinks" value={f.food} onChange={(e) => up({ food: e.target.value })} /></label>
        <label className="f">Description<textarea className="input" placeholder="Anything students should know: limits, how to claim, who it's for" value={f.desc} onChange={(e) => up({ desc: e.target.value })} /></label>
        <label className="f">Student ID<select className="input" value={f.idReq} onChange={(e) => up({ idReq: e.target.value })}><option value="none">Not required</option><option value="required">Required</option>{role !== "alumni" && <option value="only">Students with ID only</option>}</select></label>
        <label className="switch">SNAP/EBT eligible<input type="checkbox" checked={f.snap} onChange={(e) => up({ snap: e.target.checked })} /></label>
        <label className="switch">Bison Bucks accepted<input type="checkbox" checked={f.bison} onChange={(e) => up({ bison: e.target.checked })} /></label>
        {role !== "alumni" && <label className="switch">Students only (hidden from visitors and alumni)<input type="checkbox" checked={f.so} onChange={(e) => up({ so: e.target.checked })} /></label>}
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn block" type="submit" disabled={busy}>Post to This Week</button>
      </form>
    </>
  );
}
