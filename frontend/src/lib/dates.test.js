import { describe, expect, it } from "vitest";
import { daysFromToday, relativeDue } from "./dates";

const today = new Date(2026, 9, 21, 15, 30); // Wed 21 Oct 2026, mid-afternoon

describe("relativeDue", () => {
  it("names nearby days", () => {
    expect(relativeDue("2026-10-21", today)).toBe("today");
    expect(relativeDue("2026-10-22", today)).toBe("tomorrow");
    expect(relativeDue("2026-10-20", today)).toBe("yesterday");
  });
  it("counts late days", () => {
    expect(relativeDue("2026-10-17", today)).toBe("4d late");
  });
  it("is empty without a date", () => {
    expect(relativeDue(null, today)).toBe("");
  });
  it("ignores the time of day", () => {
    expect(daysFromToday("2026-10-28", today)).toBe(7);
  });
});
