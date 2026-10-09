import { describe, it, expect } from "vitest";
import { formatDuration, formatMargin } from "./formatDuration";
describe("時間表示の境界", () => {
  it.each([
    [null, "対象外"],
    [0, "約0分"],
    [0.01, "1分未満"],
    [0.99, "1分未満"],
    [1, "約1分"],
    [27.656, "約28分"],
  ] as const)("推定時間 %s → %s", (value, expected) => {
    expect(formatDuration(value)).toBe(expected);
  });
  it.each([
    [null, "対象外"],
    [0, "0分"],
    [-0.0436, "1分未満の不足"],
    [-0.99, "1分未満の不足"],
    [0.04, "1分未満の余裕"],
    [0.99, "1分未満の余裕"],
    [-1, "約1分"],
    [2.34, "約2分"],
  ] as const)("時間差 %s → %s", (value, expected) => {
    expect(formatMargin(value)).toBe(expected);
  });
});
