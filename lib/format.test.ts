import { describe, expect, it } from "vitest";
import {
  describeBin,
  formatCompactMoney,
  formatDate,
  formatMoney,
  formatRelative,
  formatSignedUnits,
  formatUnits,
} from "./format";

describe("formatMoney", () => {
  it("reads minor units and shows whole currency", () => {
    expect(formatMoney(123456)).toBe("$1,235");
    expect(formatMoney(0)).toBe("$0");
  });
});

describe("formatCompactMoney", () => {
  it("shortens thousands and millions but leaves small figures alone", () => {
    expect(formatCompactMoney(49900)).toBe("$499");
    expect(formatCompactMoney(150000)).toBe("$1.5k");
    expect(formatCompactMoney(250_000_000)).toBe("$2.5M");
  });
});

describe("formatUnits", () => {
  it("groups thousands", () => {
    expect(formatUnits(1234567)).toBe("1,234,567");
    expect(formatUnits(0)).toBe("0");
  });
});

describe("formatSignedUnits", () => {
  it("signs a change and leaves zero unsigned", () => {
    expect(formatSignedUnits(45)).toBe("+45");
    expect(formatSignedUnits(-1200)).toBe("-1,200");
    expect(formatSignedUnits(0)).toBe("0");
  });
});

describe("formatRelative", () => {
  const now = Date.parse("2026-08-09T12:00:00.000Z");

  it("scales the unit to the distance", () => {
    expect(formatRelative("2026-08-09T11:55:00.000Z", now)).toBe("5 minutes ago");
    expect(formatRelative("2026-08-09T09:00:00.000Z", now)).toBe("3 hours ago");
    expect(formatRelative("2026-08-06T12:00:00.000Z", now)).toBe("3 days ago");
  });

  it("names yesterday rather than counting to it", () => {
    expect(formatRelative("2026-08-08T12:00:00.000Z", now)).toBe("yesterday");
  });

  it("counts years rather than piling up months", () => {
    expect(formatRelative("2019-02-03T12:00:00.000Z", now)).toMatch(/^\d+ years ago$/);
    expect(formatRelative("2026-05-09T12:00:00.000Z", now)).toMatch(/months ago$/);
  });
});

describe("formatDate", () => {
  it("writes an unambiguous day, month and year", () => {
    expect(formatDate("2026-08-09T12:00:00.000Z")).toBe("09 Aug 2026");
  });
});

describe("describeBin", () => {
  it("spells out the address and drops the padding zeroes", () => {
    expect(describeBin("C-04-12")).toBe("Aisle C, rack 4, shelf 12");
    expect(describeBin("A-01-01")).toBe("Aisle A, rack 1, shelf 1");
  });

  it("hands back anything that is not an address, rather than inventing one", () => {
    expect(describeBin("NOT-A-BIN-CODE")).toBe("NOT-A-BIN-CODE");
    expect(describeBin("loose")).toBe("loose");
    expect(describeBin("")).toBe("");
  });
});
