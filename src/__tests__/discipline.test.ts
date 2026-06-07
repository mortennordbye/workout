import { describe, expect, it } from "vitest";
import {
  DISCIPLINES,
  DISCIPLINE_CONFIG,
  disciplineConfig,
} from "@/lib/utils/discipline";

describe("DISCIPLINE_CONFIG integrity", () => {
  it("covers swim, bike, run", () => {
    expect(DISCIPLINES).toEqual(["swim", "bike", "run"]);
  });

  it("has matching preset and label arrays for every discipline", () => {
    for (const d of DISCIPLINES) {
      const cfg = DISCIPLINE_CONFIG[d];
      expect(cfg.distancePresetsM.length).toBe(cfg.distanceLabels.length);
      expect(cfg.distancePresetsM.length).toBeGreaterThan(0);
      expect(cfg.paceBrackets.length).toBeGreaterThan(0);
    }
  });

  it("uses meter input only for swim", () => {
    expect(DISCIPLINE_CONFIG.swim.inputUnit).toBe("m");
    expect(DISCIPLINE_CONFIG.bike.inputUnit).toBe("km");
    expect(DISCIPLINE_CONFIG.run.inputUnit).toBe("km");
  });

  it("maps each discipline to its conventional pace formatter", () => {
    expect(DISCIPLINE_CONFIG.swim.paceFormatter).toBe("per100m");
    expect(DISCIPLINE_CONFIG.bike.paceFormatter).toBe("kmh");
    expect(DISCIPLINE_CONFIG.run.paceFormatter).toBe("perKm");
  });

  it("shows incline only for run", () => {
    expect(DISCIPLINE_CONFIG.run.showIncline).toBe(true);
    expect(DISCIPLINE_CONFIG.swim.showIncline).toBe(false);
    expect(DISCIPLINE_CONFIG.bike.showIncline).toBe(false);
  });
});

describe("disciplineConfig fallback", () => {
  it("falls back to run for null/undefined (legacy cardio)", () => {
    expect(disciplineConfig(null)).toBe(DISCIPLINE_CONFIG.run);
    expect(disciplineConfig(undefined)).toBe(DISCIPLINE_CONFIG.run);
  });

  it("resolves a tagged discipline", () => {
    expect(disciplineConfig("swim")).toBe(DISCIPLINE_CONFIG.swim);
  });
});
