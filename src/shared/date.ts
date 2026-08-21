export type DayStatus = "complete" | "partial" | "low" | "none";

export function parseISODate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Invalid ISO date");
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error("Invalid ISO date");
  }
  return date;
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function datesInYear(year: number): string[] {
  const total = isLeapYear(year) ? 366 : 365;
  return Array.from({ length: total }, (_, index) =>
    toISODate(new Date(Date.UTC(year, 0, index + 1))),
  );
}

export function statusForCounts(completed: number, total: number): DayStatus {
  if (total === 0) return "none";
  const percentage = (completed / total) * 100;
  if (percentage === 100) return "complete";
  return percentage >= 50 ? "partial" : "low";
}

export function isScheduled(weekdays: number[], date: Date): boolean {
  return weekdays.includes(date.getUTCDay());
}
