import { describe, it, expect } from "vitest";
import { DEFAULT_SETTINGS as s } from "../config/defaults";
import {
  calculateOxygen,
  validateInput,
  calculateTransportStatus,
  calculateEstimatedDuration,
} from "./oxygenCalculation";
import type { CalculationInput, CylinderSettings } from "../types";
const i: CalculationInput = {
  currentPressure: 12,
  fio2Percent: 40,
  minuteVentilation: 10,
  leakFlow: 30,
  transportMinutes: 30,
};
describe("簡易酸素計算", () => {
  it("通常値を指定式で計算する", () => {
    const r = calculateOxygen(i, s);
    expect(r.usableOxygenLiters).toBeCloseTo(374.14965986);
    expect(r.estimatedTotalFlow).toBe(45);
    expect(r.oxygenConsumption).toBeCloseTo(10.82278481);
    expect(r.estimatedDurationMinutes).toBeCloseTo(34.57097105);
    expect(r.safeDurationMinutes).toBeCloseTo(27.65677684);
    expect(r.status?.level).toBe("red");
    expect(r.remainingMargin).toBeCloseTo(-2.34322316);
  });
  it("FiO₂21%は対象外でInfinityを返さない", () => {
    const r = calculateOxygen({ ...i, fio2Percent: 21 }, s);
    expect(r.oxygenConsumption).toBe(0);
    expect(r.estimatedDurationMinutes).toBeNull();
    expect(r.safeDurationMinutes).toBeNull();
    expect(r.status).toBeNull();
    expect(r.simulation.every((x) => x.safeDurationMinutes === null)).toBe(
      true,
    );
  });
  it.each([1, 0.5])("安全残圧以下 %s は使用可能量と時間が0", (pressure) => {
    const r = calculateOxygen({ ...i, currentPressure: pressure }, s);
    expect(r.usableOxygenLiters).toBe(0);
    expect(r.safeDurationMinutes).toBe(0);
    expect(r.status?.level).toBe("red");
  });
  it("高リークとシミュレーションで時間が短縮する", () => {
    const r = calculateOxygen(i, s);
    expect(
      calculateOxygen({ ...i, leakFlow: 100 }, s).safeDurationMinutes!,
    ).toBeLessThan(r.safeDurationMinutes!);
    expect(r.simulation.map((x) => x.leakFlow)).toEqual([30, 40, 50]);
    expect(r.simulation[0].safeDurationMinutes).toBe(r.safeDurationMinutes);
    expect(r.simulation[1].safeDurationMinutes!).toBeLessThan(
      r.simulation[0].safeDurationMinutes!,
    );
    expect(r.simulation[2].safeDurationMinutes!).toBeLessThan(
      r.simulation[1].safeDurationMinutes!,
    );
  });
  it("FiO₂100%では総流量と酸素消費量が一致", () =>
    expect(
      calculateOxygen({ ...i, fio2Percent: 100 }, s).oxygenConsumption,
    ).toBeCloseTo(45));
  it("安全係数を適用する", () =>
    expect(
      calculateOxygen(i, { ...s, safetyFactor: 0.5 }).safeDurationMinutes,
    ).toBeCloseTo(
      calculateOxygen(i, { ...s, safetyFactor: 1 }).safeDurationMinutes! * 0.5,
    ));
  it.each([
    ["currentPressure", 0],
    ["currentPressure", 15],
    ["fio2Percent", 20],
    ["fio2Percent", 101],
    ["minuteVentilation", 0],
    ["leakFlow", -1],
    ["transportMinutes", 0],
    ["currentPressure", NaN],
    ["leakFlow", Infinity],
  ] as [keyof CalculationInput, number][])(
    "異常入力 %s=%s を拒否",
    (key, value) => {
      const input = { ...i, [key]: value };
      expect(validateInput(input, s)[key]).toBeTruthy();
      expect(() => calculateOxygen(input, s)).toThrow();
    },
  );
  it.each([
    ["cylinderCapacity", 0],
    ["fullPressure", 0],
    ["reservePressure", 14.7],
    ["reservePressure", -1],
    ["circuitCompensationFlow", -1],
    ["safetyFactor", 0.49],
    ["safetyFactor", 1.01],
  ] as [keyof CylinderSettings, number][])(
    "異常設定 %s=%s を拒否",
    (key, value) => {
      expect(validateInput(i, { ...s, [key]: value })[key]).toBeTruthy();
      expect(() => calculateOxygen(i, { ...s, [key]: value })).toThrow();
    },
  );
  it("極端な数値による非有限の計算結果を拒否", () =>
    expect(() =>
      calculateOxygen(i, { ...s, cylinderCapacity: Number.MAX_VALUE }),
    ).toThrow());
  it("判定境界を丸め前に評価", () => {
    expect(calculateTransportStatus(45, 30).level).toBe("green");
    expect(calculateTransportStatus(44.99, 30).level).toBe("yellow");
    expect(calculateTransportStatus(30, 30).level).toBe("yellow");
    expect(calculateTransportStatus(29.99, 30).level).toBe("red");
  });
  it("ゼロ消費では除算しない", () =>
    expect(calculateEstimatedDuration(100, 0)).toBeNull());
});
