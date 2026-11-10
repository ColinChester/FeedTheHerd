import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL } from "@/lib/haf";
import { useAuth, useNotifications, useUi } from "@/lib/app";
import { SheetHost } from "./sheets";

const I = {
  directory: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>,
  week: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></svg>,
  free: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z" /></svg>,
  post: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>,
  me: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>,
};

export function AppShell({ children }: { children: ReactNode }) {
  const { role, session, signedInUnverified, userId } = useAuth();
  const { open, toastMsg, toast } = useUi();
  const qc = useQueryClient();
  const notifs = useNotifications();
  const unread = (notifs.data ?? []).filter((n) => !n.read);
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => { // F20: in-app banner when a new alert arrives
    if (!notifs.data) return;
    if (seen.current) { const fresh = notifs.data.find((n) => !seen.current!.has(n.id)); if (fresh) toast(fresh.title, ` ${fresh.body}`); }
    seen.current = new Set(notifs.data.map((n) => n.id));
  }, [notifs.data, toast]);
  useEffect(() => { seen.current = null; }, [userId]);

  async function openInbox() {
    open({ kind: "inbox" });
    if (unread.length) { await supabase.from("notifications").update({ read: true }).eq("read", false); qc.invalidateQueries({ queryKey: ["notifs"] }); }
  }
  const who = role !== "visitor" ? `${ROLE_LABEL[role]} · ${session?.user.email ?? ""}` : signedInUnverified ? `Signed in · not verified as Howard` : "Browsing as visitor";
  return (
    <div className="shell">
      <div className="phone">
        <header className="appbar">
          <div className="brand">
            <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><rect width="34" height="34" rx="9" fill="var(--navy)" /><path d="M17 7c-4.4 0-8 3.4-8 7.7 0 5.6 8 12.3 8 12.3s8-6.7 8-12.3C25 10.4 21.4 7 17 7z" fill="var(--red)" /><circle cx="17" cy="14.6" r="3.2" fill="var(--surface)" /></svg>
            <div className="grow"><b>Howard Affordable Food</b><small>{who}</small></div>
          </div>
          <button className="iconbtn" onClick={openInbox} aria-label="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
            {unread.length > 0 && <span className="dot">{unread.length}</span>}
          </button>
        </header>
        <main className="view">{children}</main>
        <nav className="tabbar" aria-label="Sections">
          <Link to="/" activeOptions={{ exact: true }}>{I.directory}<span>Directory</span></Link>
          <Link to="/week">{I.week}<span>This Week</span></Link>
          <Link to="/free">{I.free}<span>Free Food</span></Link>
          <Link to="/post">{I.post}<span>Post</span></Link>
          <Link to="/me">{I.me}<span>Me</span></Link>
        </nav>
        <SheetHost />
        {toastMsg && <div className="toast-on" role="status" aria-live="polite"><div><b>{toastMsg.title}</b>{toastMsg.body}</div></div>}
      </div>
    </div>
  );
}
