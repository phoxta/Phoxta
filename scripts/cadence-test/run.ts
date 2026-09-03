import { normaliseSchedule, wallClockToUtc, DEFAULTS } from "../../supabase/functions/_shared/cadence.ts";

let failures = 0;
const check = (name: string, cond: boolean, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : ` — ${detail}`}`);
  if (!cond) failures++;
};

// 2026-09-07 is a Monday. 09-12 Saturday, 09-13 Sunday.
const dow = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay();
check("fixture: 2026-09-07 is Monday", dow("2026-09-07") === 1, `got ${dow("2026-09-07")}`);
check("fixture: 2026-09-13 is Sunday", dow("2026-09-13") === 0, `got ${dow("2026-09-13")}`);

// 1. Three Instagram posts clustered on one morning must be spaced out.
{
  const { slots, changes } = normaliseSchedule([
    { slotId: "a", date: "2026-09-07", hour: 11, platforms: ["instagram"] },
    { slotId: "b", date: "2026-09-07", hour: 12, platforms: ["instagram"] },
    { slotId: "c", date: "2026-09-07", hour: 13, platforms: ["instagram"] },
  ], { timezone: "UTC" });
  const times = slots.map((s) => new Date(`${s.date}T${String(s.hour).padStart(2, "0")}:00:00Z`).getTime()).sort((x, y) => x - y);
  const gaps = times.slice(1).map((t, i) => (t - times[i]) / 3600_000);
  check("clustered IG posts are spaced >= minGap", gaps.every((g) => g >= DEFAULTS.instagram.minGapHours), `gaps=${gaps.join(",")}`);
  check("clustering produced change notes", changes.length >= 2, `changes=${changes.length}`);
  check("no slot was dropped", slots.length === 3, `got ${slots.length}`);
}

// 2. A LinkedIn post on a Sunday must move to a weekday.
{
  const { slots } = normaliseSchedule([
    { slotId: "li", date: "2026-09-13", hour: 12, platforms: ["linkedin"] },
  ], { timezone: "UTC" });
  check("Sunday LinkedIn moved to a weekday", DEFAULTS.linkedin.days.includes(dow(slots[0].date)), `landed ${slots[0].date} (dow ${dow(slots[0].date)})`);
}

// 3. A blackout date must be vacated.
{
  const { slots, changes } = normaliseSchedule([
    { slotId: "b1", date: "2026-09-08", hour: 11, platforms: ["instagram"] },
  ], { timezone: "UTC", blackout: ["2026-09-08"] });
  check("blackout date vacated", slots[0].date !== "2026-09-08", `still ${slots[0].date}`);
  check("blackout move explained", changes.length === 1 && !!changes[0].why, JSON.stringify(changes));
}

// 4. An odd hour snaps onto a default window.
{
  const { slots } = normaliseSchedule([
    { slotId: "h", date: "2026-09-09", hour: 3, platforms: ["instagram"] },
  ], { timezone: "UTC" });
  check("3am snapped to a real window", DEFAULTS.instagram.hours.includes(slots[0].hour), `got ${slots[0].hour}`);
}

// 5. Learned hours must beat defaults when present.
{
  const { slots } = normaliseSchedule([
    { slotId: "l", date: "2026-09-09", hour: 11, platforms: ["instagram"] },
  ], { timezone: "UTC", learned: { instagram: { hours: [7], posts: 20, note: "" } } });
  check("learned hour overrides default", slots[0].hour === 7, `got ${slots[0].hour}`);
}

// 6. An already-good schedule must be left alone (no churn).
{
  const { slots, changes } = normaliseSchedule([
    { slotId: "ok1", date: "2026-09-07", hour: 11, platforms: ["instagram"] },
    { slotId: "ok2", date: "2026-09-09", hour: 11, platforms: ["instagram"] },
  ], { timezone: "UTC" });
  check("well-spaced schedule is untouched", changes.length === 0, JSON.stringify(changes));
  check("untouched slots keep their times", slots[0].hour === 11 && slots[1].date === "2026-09-09");
}

// 7. Different platforms may share a moment.
{
  const { slots } = normaliseSchedule([
    { slotId: "p1", date: "2026-09-09", hour: 12, platforms: ["linkedin"] },
    { slotId: "p2", date: "2026-09-09", hour: 12, platforms: ["tiktok"] },
  ], { timezone: "UTC" });
  check("cross-platform same hour allowed", slots[0].hour === slots[1].hour && slots[0].date === slots[1].date,
    `${slots[0].date} ${slots[0].hour} vs ${slots[1].date} ${slots[1].hour}`);
}

// 8. wallClockToUtc: the bug it exists to prevent.
{
  const ny = wallClockToUtc("2026-09-09", 10, "America/New_York");
  check("NY 10am is 14:00Z (EDT)", ny?.getUTCHours() === 14, `got ${ny?.toISOString()}`);
  const utc = wallClockToUtc("2026-09-09", 10, "UTC");
  check("UTC 10am is 10:00Z", utc?.getUTCHours() === 10, `got ${utc?.toISOString()}`);
  check("bad date returns null", wallClockToUtc("not-a-date", 10, "UTC") === null);
  check("unknown zone falls back, does not throw", wallClockToUtc("2026-09-09", 10, "Mars/Olympus")?.getUTCHours() === 10);
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
