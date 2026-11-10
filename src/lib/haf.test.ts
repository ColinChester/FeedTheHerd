import { describe, expect, it } from "vitest";
import { DIR_DEFAULT, filterVenues, isArchived, isOpenNow, STUDENT_EMAIL, visibility, WEEK_DEFAULT, feedItems, type Item, type Venue } from "./haf";

const venue = (p: Partial<Venue>): Venue => ({ id: "v", name: "V", type: "pantry", addr: "", lat: 38.9223, lng: -77.0199, cost: 0, unit: "free", ebt: false, bison: false, halal: false, veg: false, campus_only: false, sample: false, hours: [[0, 24], [0, 24], [0, 24], [0, 24], [0, 24], [0, 24], [0, 24]], ...p });
const now = new Date(2026, 10, 10, 12, 0);
const item = (p: Partial<Item>): Item => ({ id: "i", kind: "deal", title: "t", venue_id: null, location: "", lat: 38.9223, lng: -77.0199, start: new Date(2026, 10, 10, 0), end: new Date(2026, 10, 12, 0), daily: null, dow: null, recurring: null, season: null, season_txt: null, description: "", food: "", free: false, student_only: false, id_req: "none", snap: false, bison: false, match_txt: null, by_label: "", by_role: "student", author_id: null, verified_at: null, vcount: 0, flags: 0, ...p });

describe("Howard rules", () => {
  it("only @bison.howard.edu emails pass the student check", () => {
    expect(STUDENT_EMAIL.test("a.b@bison.howard.edu")).toBe(true);
    expect(STUDENT_EMAIL.test("a@gmail.com")).toBe(false);
  });
  it("hides campus-only pantries from alumni (R36)", () => {
    const v = [venue({ campus_only: true })];
    expect(filterVenues(v, DIR_DEFAULT, "alumni", now)).toHaveLength(0);
    expect(filterVenues(v, DIR_DEFAULT, "student", now)).toHaveLength(1);
  });
  it("radius is honored", () => {
    expect(filterVenues([venue({ lat: 38.95 })], DIR_DEFAULT, "student", now)).toHaveLength(0);
  });
  it("student-only items lock for visitors and hide for alumni (R25, R26)", () => {
    const i = item({ student_only: true });
    expect(visibility(i, "visitor")).toBe("locked");
    expect(visibility(i, "alumni")).toBe("hidden");
    expect(visibility(i, "student")).toBe("show");
  });
  it("two expired flags archive a deal (F17)", () => {
    expect(isArchived(item({ flags: 1 }), now)).toBe(false);
    expect(isArchived(item({ flags: 2 }), now)).toBe(true);
  });
  it("late-night hours past midnight count as open", () => {
    const v = venue({ hours: [[10, 26], [10, 26], [10, 26], [10, 26], [10, 26], [10, 26], [10, 26]] });
    expect(isOpenNow(v, new Date(2026, 10, 10, 1, 30))).toBe(true);
    expect(isOpenNow(v, new Date(2026, 10, 10, 3, 0))).toBe(false);
  });
  it("favorited venues' deals pin to the top (R34)", () => {
    const a = item({ id: "a", start: new Date(2026, 10, 10, 1) }), b = item({ id: "b", venue_id: "fav", start: new Date(2026, 10, 11, 1) });
    const out = feedItems([a, b], WEEK_DEFAULT, "student", new Set(["fav"]), {}, now);
    expect(out[0].id).toBe("b");
  });
});
