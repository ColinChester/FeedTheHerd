import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Item, Role, Venue } from "./haf";

/* ---------- Auth ---------- */
type Profile = { email: string | null; org: string; grad_year: number | null; notify_deals: boolean; notify_events: boolean };
type AuthCtx = { ready: boolean; session: Session | null; userId: string | null; role: Role; signedInUnverified: boolean; profile: Profile | null; refresh: () => void };
const Auth = createContext<AuthCtx>(null as never);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") qc.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [qc]);
  const userId = session?.user.id ?? null;
  const me = useQuery({
    queryKey: ["me", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [r, p] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId!),
        supabase.from("profiles").select("email,org,grad_year,notify_deals,notify_events").eq("user_id", userId!).maybeSingle(),
      ]);
      return { roles: (r.data ?? []).map((x) => x.role as string), profile: p.data as Profile | null };
    },
  });
  const roles = me.data?.roles ?? [];
  const role: Role = !userId ? "visitor" : roles.includes("org") ? "org" : roles.includes("student") ? "student" : roles.includes("alumni") ? "alumni" : "visitor";
  const value: AuthCtx = {
    ready, session, userId, role, signedInUnverified: !!userId && me.isSuccess && role === "visitor",
    profile: me.data?.profile ?? null, refresh: () => qc.invalidateQueries({ queryKey: ["me"] }),
  };
  return <Auth.Provider value={value}>{children}</Auth.Provider>;
}
export const useAuth = () => useContext(Auth);
export const isVerified = (r: Role) => r !== "visitor";
export const isStudent = (r: Role) => r === "student" || r === "org";

/* ---------- UI: sheets + toast ---------- */
type Sheet = { kind: "venue"; id: string } | { kind: "signin"; path: "student" | "alumni" } | { kind: "inbox" } | null;
type UiCtx = { sheet: Sheet; open: (s: Sheet) => void; close: () => void; toast: (title: string, body?: string | undefined) => void; toastMsg: { title: string; body?: string | undefined } | null };
const Ui = createContext<UiCtx>(null as never);
export function UiProvider({ children }: { children: ReactNode }) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const [toastMsg, setToast] = useState<{ title: string; body?: string | undefined } | null>(null);
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  const toast = useCallback((title: string, body?: string | undefined) => { setToast({ title, body }); clearTimeout(t.current); t.current = setTimeout(() => setToast(null), 3800); }, []);
  const value = useMemo(() => ({ sheet, open: setSheet, close: () => setSheet(null), toast, toastMsg }), [sheet, toast, toastMsg]);
  return <Ui.Provider value={value}>{children}</Ui.Provider>;
}
export const useUi = () => useContext(Ui);

/* ---------- Data ---------- */
export function useVenues() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["venues", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("venues").select("*");
      if (error) throw error;
      return data as unknown as Venue[];
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ItemRow = any;
const toItem = (r: ItemRow, teaser = false): Item => ({
  id: r.id, kind: r.kind, title: r.title ?? "Student-only listing", venue_id: r.venue_id ?? null, location: r.location ?? "Location hidden",
  lat: r.lat, lng: r.lng, start: new Date(r.start_at), end: new Date(r.end_at),
  daily: r.daily_start != null ? [Number(r.daily_start), Number(r.daily_end)] : null, dow: r.dow ?? null,
  recurring: r.recurring ?? null, season: r.season_start != null ? [r.season_start, r.season_end] : null, season_txt: r.season_txt ?? null,
  description: r.description ?? "Details are visible to verified Howard students.", food: r.food ?? "Hidden", free: !!r.free, student_only: !!r.student_only,
  id_req: r.id_req ?? "none", snap: !!r.snap, bison: !!r.bison, match_txt: r.match_txt ?? null, by_label: r.by_label ?? "", by_role: r.by_role ?? "",
  author_id: r.author_id ?? null, verified_at: r.verified_at ? new Date(r.verified_at) : null, vcount: r.vcount ?? 0, flags: r.flags ?? 0, teaser,
});
export function useItems() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["items", userId],
    refetchInterval: 60_000,
    queryFn: async () => {
      const [a, b] = await Promise.all([supabase.from("items").select("*"), supabase.rpc("item_teasers")]);
      if (a.error) throw a.error;
      const seen = new Set((a.data ?? []).map((r) => r.id));
      return [...(a.data ?? []).map((r) => toItem(r)), ...((b.data ?? []) as ItemRow[]).filter((r) => !seen.has(r.id)).map((r) => toItem(r, true))];
    },
  });
}
export function useReviews(venueId: string) {
  return useQuery({
    queryKey: ["reviews", venueId],
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select("*").eq("venue_id", venueId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

const LOCAL_FAVS = "haf-favs";
export function useFavorites() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["favs", userId],
    queryFn: async () => {
      if (!userId) { try { return new Set<string>(JSON.parse(localStorage.getItem(LOCAL_FAVS) ?? '["corner"]')); } catch { return new Set<string>(); } }
      const { data } = await supabase.from("favorites").select("venue_id");
      return new Set((data ?? []).map((r) => r.venue_id));
    },
  });
  const favs = q.data ?? new Set<string>();
  const toggle = useMutation({
    mutationFn: async (venueId: string) => {
      const has = favs.has(venueId);
      if (!userId) {
        const next = new Set(favs); has ? next.delete(venueId) : next.add(venueId);
        localStorage.setItem(LOCAL_FAVS, JSON.stringify([...next]));
      } else if (has) await supabase.from("favorites").delete().eq("venue_id", venueId).eq("user_id", userId);
      else await supabase.from("favorites").insert({ venue_id: venueId, user_id: userId });
      return !has;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favs"] }),
  });
  return { favs, toggle };
}

export function useMyVotes() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["votes", userId], enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("votes").select("item_id,vote");
      return Object.fromEntries((data ?? []).map((v) => [v.item_id, v.vote])) as Record<string, "ok" | "no">;
    },
  });
}

export function useNotifications() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["notifs", userId], enabled: !!userId, refetchInterval: 30_000,
    queryFn: async () => {
      const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });
}

/* ---------- Filter state shared across tabs ---------- */
import { DIR_DEFAULT, WEEK_DEFAULT, type DirFilters, type WeekFilters } from "./haf";
type FCtx = { dir: DirFilters; setDir: (p: Partial<DirFilters>) => void; week: WeekFilters; setWeek: (p: Partial<WeekFilters>) => void };
const Filters = createContext<FCtx>(null as never);
export function FiltersProvider({ children }: { children: ReactNode }) {
  const [dir, sd] = useState(DIR_DEFAULT);
  const [week, sw] = useState(WEEK_DEFAULT);
  const value = useMemo(() => ({ dir, week, setDir: (p: Partial<DirFilters>) => sd((d) => ({ ...d, ...p })), setWeek: (p: Partial<WeekFilters>) => sw((w) => ({ ...w, ...p })) }), [dir, week]);
  return <Filters.Provider value={value}>{children}</Filters.Provider>;
}
export const useFilters = () => useContext(Filters);
