import { describe, expect, it } from "vitest";
import { datesInYear, isLeapYear, isScheduled, parseISODate, statusForCounts, toISODate } from "./date";

describe("date-only utilities", () => {
  it("applies Gregorian leap-year rules", () => {
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2028)).toBe(true);
    expect(datesInYear(2028)).toHaveLength(366);
    expect(datesInYear(2027)).toHaveLength(365);
  });

  it("round-trips dates in UTC and rejects rollover", () => {
    expect(toISODate(parseISODate("2026-08-20"))).toBe("2026-08-20");
    expect(() => parseISODate("2026-02-30")).toThrow();
  });

  it("selects schedules by UTC weekday", () => {
    expect(isScheduled([1, 2, 3, 4, 5], parseISODate("2026-08-20"))).toBe(true);
    expect(isScheduled([0, 6], parseISODate("2026-08-20"))).toBe(false);
  });
});

describe("daily status", () => {
  it.each([
    [0, 0, "none"],
    [0, 4, "low"],
    [1, 4, "low"],
    [2, 4, "partial"],
    [3, 4, "partial"],
    [4, 4, "complete"],
  ])("maps %i of %i to %s", (completed, total, status) => {
    expect(statusForCounts(completed, total)).toBe(status);
  });
});
