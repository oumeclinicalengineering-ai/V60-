import { DEVICE_MODEL } from "../config/defaults";
import type {
  CalculationInput,
  CylinderSettings,
  CalculationResult,
  TransportStatus,
  LeakSimulationResult,
  ValidationErrors,
} from "../types";
export function validateInput(
  i: CalculationInput,
  s: CylinderSettings,
): ValidationErrors {
  const e: ValidationErrors = {};
  const positive = (n: number) => Number.isFinite(n) && n > 0;
  const nonnegative = (n: number) => Number.isFinite(n) && n >= 0;
  if (!positive(s.fullPressure))
    e.fullPressure = "満充填圧は0より大きい値で入力してください";
  if (!positive(s.cylinderCapacity))
    e.cylinderCapacity = "ボンベ容量は0より大きい値で入力してください";
  if (!nonnegative(s.reservePressure) || s.reservePressure >= s.fullPressure)
    e.reservePressure = "安全残圧は0以上、満充填圧未満で入力してください";
  if (!nonnegative(s.circuitCompensationFlow))
    e.circuitCompensationFlow = "回路補正流量は0以上で入力してください";
  if (
    !Number.isFinite(s.safetyFactor) ||
    s.safetyFactor < 0.5 ||
    s.safetyFactor > 1
  )
    e.safetyFactor = "安全係数は50～100%で入力してください";
  if (!positive(i.currentPressure) || i.currentPressure > s.fullPressure)
    e.currentPressure = "ボンベ圧は0より大きく、満充填圧以下で入力してください";
  if (
    !Number.isFinite(i.fio2Percent) ||
    i.fio2Percent < 21 ||
    i.fio2Percent > 100
  )
    e.fio2Percent = "FiO₂は21～100%で入力してください";
  if (!positive(i.minuteVentilation))
    e.minuteVentilation = "MinVentは0より大きい値で入力してください";
  if (!nonnegative(i.leakFlow))
    e.leakFlow = "Total Leakは0以上で入力してください";
  if (!positive(i.transportMinutes))
    e.transportMinutes = "搬送時間は0より大きい値で入力してください";
  return e;
}
export function calculateUsableOxygen(
  pressure: number,
  s: CylinderSettings,
): number {
  return (
    (s.cylinderCapacity * Math.max(0, pressure - s.reservePressure)) /
    s.fullPressure
  );
}
export function calculateEstimatedTotalFlow(
  minVent: number,
  leak: number,
  compensation: number,
): number {
  return minVent + leak + compensation;
}
export function calculateOxygenConsumption(
  totalFlow: number,
  fio2Percent: number,
): number {
  return fio2Percent === 21
    ? 0
    : (totalFlow * (fio2Percent / 100 - DEVICE_MODEL.roomAirFraction)) /
        (DEVICE_MODEL.oxygenFraction - DEVICE_MODEL.roomAirFraction);
}
export function calculateEstimatedDuration(
  oxygen: number,
  consumption: number,
): number | null {
  return consumption > 0 ? oxygen / consumption : null;
}
export function calculateSafeDuration(
  duration: number | null,
  factor: number,
): number | null {
  return duration === null ? null : duration * factor;
}
export function calculateTransportStatus(
  safe: number,
  time: number,
): TransportStatus {
  const ratio = safe / time;
  if (ratio >= 1.5)
    return {
      level: "green",
      ratio,
      title: "酸素残量に余裕があります",
      description: "搬送予定時間に対して十分な余裕があります。",
    };
  if (ratio >= 1)
    return {
      level: "yellow",
      ratio,
      title: "酸素残量の余裕が少なくなっています",
      description: "予備酸素ボンベの準備を確認してください。",
    };
  return {
    level: "red",
    ratio,
    title: "酸素残量が不足する可能性があります",
    description:
      "現在の条件では安全使用目安が搬送予定時間を下回っています。予備酸素ボンベまたは搬送計画を確認してください。",
  };
}
export function calculateLeakSimulation(
  i: CalculationInput,
  s: CylinderSettings,
): LeakSimulationResult[] {
  return [0, 10, 20].map((increment) => {
    const leakFlow = i.leakFlow + increment;
    return {
      increment,
      leakFlow,
      safeDurationMinutes: calculateSafeDuration(
        calculateEstimatedDuration(
          calculateUsableOxygen(i.currentPressure, s),
          calculateOxygenConsumption(
            calculateEstimatedTotalFlow(
              i.minuteVentilation,
              leakFlow,
              s.circuitCompensationFlow,
            ),
            i.fio2Percent,
          ),
        ),
        s.safetyFactor,
      ),
    };
  });
}
export function calculateOxygen(
  i: CalculationInput,
  s: CylinderSettings,
): CalculationResult {
  if (Object.keys(validateInput(i, s)).length)
    throw new Error("入力値を確認してください");
  const usableOxygenLiters = calculateUsableOxygen(i.currentPressure, s);
  const estimatedTotalFlow = calculateEstimatedTotalFlow(
    i.minuteVentilation,
    i.leakFlow,
    s.circuitCompensationFlow,
  );
  const oxygenConsumption = calculateOxygenConsumption(
    estimatedTotalFlow,
    i.fio2Percent,
  );
  const estimatedDurationMinutes = calculateEstimatedDuration(
    usableOxygenLiters,
    oxygenConsumption,
  );
  const safeDurationMinutes = calculateSafeDuration(
    estimatedDurationMinutes,
    s.safetyFactor,
  );
  const simulation = calculateLeakSimulation(i, s);
  const values = [
    usableOxygenLiters,
    estimatedTotalFlow,
    oxygenConsumption,
    estimatedDurationMinutes,
    safeDurationMinutes,
    ...simulation.map((x) => x.safeDurationMinutes),
  ];
  if (values.some((n) => n !== null && (!Number.isFinite(n) || n < 0)))
    throw new Error(
      "数値が大きすぎる、または小さすぎるため計算できません。入力値を確認してください。",
    );
  const remainingMargin =
    safeDurationMinutes === null
      ? null
      : safeDurationMinutes - i.transportMinutes;
  const status =
    safeDurationMinutes === null
      ? null
      : calculateTransportStatus(safeDurationMinutes, i.transportMinutes);
  if (status && !Number.isFinite(status.ratio))
    throw new Error("搬送時間の入力値を確認してください。");
  return {
    usableOxygenLiters,
    estimatedTotalFlow,
    oxygenConsumption,
    estimatedDurationMinutes,
    safeDurationMinutes,
    remainingMargin,
    status,
    simulation,
    input: { ...i },
    settings: { ...s },
  };
}
