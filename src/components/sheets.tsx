import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ago, DAYN, HOWARD_ID, hoursText, isArchived, isOpenNow, mi, STUDENT_EMAIL, TYPE, visibility, walkMi, walkMin, busNear, stationsNear, ROLE_LABEL } from "@/lib/haf";
import { isVerified, useAuth, useItems, useNotifications, useReviews, useUi, useVenues } from "@/lib/app";
import { FavButton, SignInBanner, VenueBadges } from "./cards";

const Close = () => { const { close } = useUi(); return <button className="iconbtn" onClick={close} aria-label="Close">✕</button>; };

export function SheetHost() {
  const { sheet, close } = useUi();
  if (!sheet) return null;
  return (
    <div className="sheet-wrap" onClick={(e) => { if (e.target === e.currentTarget) close(); }} onKeyDown={(e) => e.key === "Escape" && close()}>
      <div className="sheet" role="dialog" aria-modal="true">
        {sheet.kind === "venue" ? <VenueSheet id={sheet.id} /> : sheet.kind === "signin" ? <SignInSheet initial={sheet.path} /> : <InboxSheet />}
      </div>
    </div>
  );
}

function VenueSheet({ id }: { id: string }) {
  const { role, userId } = useAuth();
  const { toast } = useUi();
  const qc = useQueryClient();
  const venues = useVenues(); const items = useItems(); const reviews = useReviews(id);
  const [rev, setRev] = useState({ p: 0, v: 0, t: "", err: "" });
  const v = venues.data?.find((x) => x.id === id);
  if (!v) return <><div className="sheet-h"><div className="grow"><h2>{venues.isLoading ? "Loading…" : "Place not found"}</h2></div><Close /></div></>;
  const open = isOpenNow(v); const today = new Date().getDay(); const d = walkMi(v);
  const st = stationsNear(v), bus = busNear(v);
  const revs = reviews.data ?? [];
  const avg = (k: "price" | "value") => (revs.length ? (revs.reduce((s, r) => s + r[k], 0) / revs.length).toFixed(1) : "–");
  const deals = (items.data ?? []).filter((i) => i.venue_id === v.id && !isArchived(i) && visibility(i, role) === "show");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rev.p || !rev.v) return setRev({ ...rev, err: "Rate both price accuracy and portion value." });
    const { error } = await supabase.from("reviews").insert({ venue_id: id, user_id: userId!, price: rev.p, value: rev.v, body: rev.t.trim() || "(No comment)" });
    if (error) return setRev({ ...rev, err: "Couldn't post your review. Try again." });
    setRev({ p: 0, v: 0, t: "", err: "" }); qc.invalidateQueries({ queryKey: ["reviews", id] }); toast("Review posted");
  }
  const starRow = (k: "p" | "v", label: string) => (
    <div className="rating-row"><span>{label} <span className="err" style={{ display: "inline" }}>*</span></span>
      <span role="radiogroup" aria-label={label}>{[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" className={`starbtn ${rev[k] >= n ? "on" : ""}`} aria-label={`${n} of 5`} onClick={() => setRev({ ...rev, [k]: n, err: "" })}>★</button>))}</span></div>
  );
  return (
    <>
      <div className="sheet-h"><div className="grow"><p className="sub">{TYPE[v.type]}{v.sample ? " · sample listing" : ""}</p><h2>{v.name}</h2><p className="sub">{v.addr}</p></div>
        <FavButton id={v.id} name={v.name} /><Close /></div>
      <div className="score">
        <div><b className="num">{Number(v.cost) ? `$${Number(v.cost)}` : "Free"}</b><small>{Number(v.cost) ? (v.unit === "basket" ? "avg. 12-item student basket" : "avg. meal") : "no cost"}</small></div>
        <div><b className={open ? "open" : "closed"}>{open ? "Open" : "Closed"}</b><small>{hoursText(v.hours[today] ?? null)} today</small></div>
      </div>
      <VenueBadges v={v} />
      <div className="box"><h3>Getting there from main campus</h3>
        <div className="kv num"><span>Walking</span><span>{walkMin(d)} min · {mi(d)}</span></div>
        {st.length ? st.map((s) => <div key={s.id} className="kv num"><span>Metro</span><span>{s.name} ({s.lines}) · {mi(s.d)} away</span></div>) : <div className="kv"><span>Metro</span><span>None within 0.6 mi</span></div>}
        <div className="kv"><span>Bus</span><span>{bus.length ? bus.map((b) => b.name).join(", ") : "No nearby corridor"}</span></div>
      </div>
      <div className="box"><h3>Hours</h3><table className="hours"><tbody>{[1, 2, 3, 4, 5, 6, 0].map((dd) => <tr key={dd} className={dd === today ? "today" : ""}><td>{DAYN[dd]}</td><td>{hoursText(v.hours[dd] ?? null)}</td></tr>)}</tbody></table></div>
      {deals.length > 0 && <div className="box"><h3>Active deals here</h3>{deals.map((i) => <div key={i.id} className="mini"><span>{i.title}</span><span className="sub">{i.recurring ?? ""}</span></div>)}</div>}
      <div className="box"><h3>Price &amp; value reviews</h3>
        <div className="score"><div><b className="num">{avg("price")}</b><small>Price accuracy / 5</small></div><div><b className="num">{avg("value")}</b><small>Portion value / 5</small></div></div>
        {revs.length ? revs.map((r) => <div key={r.id} className="review"><b>{"★".repeat(r.price)}</b> price · <b>{"★".repeat(r.value)}</b> value<br />{r.body}<br /><span className="sub">{r.who}{r.user_id === userId ? " · you" : ""} · verified Howard</span></div>) : <p className="sub">No reviews yet.</p>}
      </div>
      {isVerified(role) ? (
        <form className="box" onSubmit={submit}><h3>Write a review</h3>{starRow("p", "Price accuracy")}{starRow("v", "Portion value")}
          <label className="f">What did you pay, and was it worth it?<textarea className="input" maxLength={280} placeholder="Optional, 280 characters" value={rev.t} onChange={(e) => setRev({ ...rev, t: e.target.value })} /></label>
          {rev.err && <p className="err" role="alert">{rev.err}</p>}
          <button className="btn" type="submit" disabled={!rev.p || !rev.v}>Post review</button></form>
      ) : <SignInBanner msg="Only verified Howard users can post reviews." />}
    </>
  );
}

function SignInSheet({ initial }: { initial: "student" | "alumni" }) {
  const { close, toast } = useUi();
  const [path, setPath] = useState(initial);
  const [step, setStep] = useState(1);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [d, setD] = useState({ email: "", isOrg: false, org: "", hid: "", grad: String(new Date().getFullYear()), code: "" });
  const yr = new Date().getFullYear();

  async function send(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const email = d.email.trim();
    let data: Record<string, string> = {};
    if (path === "student") {
      if (!STUDENT_EMAIL.test(email)) return setErr("Use your @bison.howard.edu address. Only current Howard students can sign up.");
      if (d.isOrg && !d.org.trim()) return setErr("Add your organization's name, or uncheck the box.");
      data = { org: d.isOrg ? d.org.trim() : "" };
    } else {
      if (!HOWARD_ID.test(d.hid.trim())) return setErr("Enter your 8-digit Howard ID, like @02912345.");
      if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("Enter an email we can send your code to.");
      data = { howard_id: d.hid.trim(), grad_year: d.grad };
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true, data, emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (error) return setErr(error.message);
    setStep(2);
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email: d.email.trim(), token: d.code.trim(), type: "email" });
    setBusy(false);
    if (error) return setErr("That code doesn't match or has expired. Check the latest email.");
    close(); toast("Verified with Howard credentials", " You're signed in.");
  }
  return (
    <>
      <div className="sheet-h"><div className="grow"><h2>{path === "alumni" ? "Alumni verification" : "Sign in with Howard"}</h2>
        <p className="sub">{path === "alumni" ? "For recent graduates. Alumni accounts can post community deals; campus-only resources stay hidden." : "Only current Howard students can create an account."}</p></div><Close /></div>
      <div className="seg">{(["student", "alumni"] as const).map((k) => <button key={k} aria-pressed={path === k} onClick={() => { setPath(k); setStep(1); setErr(""); }}>{k === "student" ? "Student" : "Alumni"}</button>)}</div>
      {step === 2 ? (
        <form className="list" onSubmit={verify} noValidate>
          <p className="sub">We sent a sign-in email to <b>{d.email}</b>. Enter the code from it, or tap the link in the email.</p>
          <label className="f">Verification code<input className="input num" inputMode="numeric" maxLength={8} autoComplete="one-time-code" value={d.code} onChange={(e) => setD({ ...d, code: e.target.value })} /></label>
          {err && <p className="err" role="alert">{err}</p>}
          <button className="btn block" type="submit" disabled={busy}>Verify and continue</button>
          <button className="btn ghost block" type="button" onClick={() => { setStep(1); setErr(""); }}>Use a different email</button>
        </form>
      ) : path === "student" ? (
        <form className="list" onSubmit={send} noValidate>
          <label className="f">Howard student email<input className="input" type="email" autoComplete="email" placeholder="firstname.lastname@bison.howard.edu" value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} /></label>
          <label className="switch">I post for a student organization<input type="checkbox" checked={d.isOrg} onChange={(e) => setD({ ...d, isOrg: e.target.checked })} /></label>
          <label className="f">Organization name <small>Only if you checked the box above</small><input className="input" placeholder="Howard ACM" value={d.org} onChange={(e) => setD({ ...d, org: e.target.value })} /></label>
          {err && <p className="err" role="alert">{err}</p>}
          <button className="btn block" type="submit" disabled={busy}>Send verification code</button>
        </form>
      ) : (
        <form className="list" onSubmit={send} noValidate>
          <label className="f">Howard ID number<input className="input num" placeholder="@02912345" value={d.hid} onChange={(e) => setD({ ...d, hid: e.target.value })} /></label>
          <label className="f">Graduation year<select className="input" value={d.grad} onChange={(e) => setD({ ...d, grad: e.target.value })}>{[...Array(6)].map((_, k) => <option key={k}>{yr - k}</option>)}</select></label>
          <label className="f">Email for your account<input className="input" type="email" placeholder="you@example.com" value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} /></label>
          {err && <p className="err" role="alert">{err}</p>}
          <button className="btn block" type="submit" disabled={busy}>Send verification code</button>
        </form>
      )}
    </>
  );
}

function InboxSheet() {
  const { profile, role } = useAuth();
  const n = useNotifications();
  const list = n.data ?? [];
  return (
    <>
      <div className="sheet-h"><div className="grow"><h2>Notifications</h2>
        <p className="sub">{isVerified(role) ? `Deals ${profile?.notify_deals ? "on" : "off"} · Events ${profile?.notify_events ? "on" : "off"} · change in Me` : `Signed in as ${ROLE_LABEL[role]}`}</p></div><Close /></div>
      {!isVerified(role) ? <SignInBanner msg="Sign in to get alerts for new deals and events." /> :
        list.length ? list.map((x) => <div key={x.id} className="box"><b>{x.title}</b><span className="sub">{x.body} · {ago(new Date(x.created_at))}</span></div>)
          : <div className="empty">No alerts yet. Turn on deal or event alerts in Me.</div>}
    </>
  );
}
