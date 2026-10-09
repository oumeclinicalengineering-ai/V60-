export interface CalculationInput {
  currentPressure: number;
  fio2Percent: number;
  minuteVentilation: number;
  leakFlow: number;
  transportMinutes: number;
}
export interface CylinderSettings {
  cylinderCapacity: number;
  fullPressure: number;
  reservePressure: number;
  circuitCompensationFlow: number;
  safetyFactor: number;
}
export type FieldKey = keyof CalculationInput | keyof CylinderSettings;
export type ValidationErrors = Partial<Record<FieldKey, string>>;
export interface TransportStatus {
  level: "green" | "yellow" | "red";
  title: string;
  description: string;
  ratio: number;
}
export interface LeakSimulationResult {
  leakFlow: number;
  increment: number;
  safeDurationMinutes: number | null;
}
export interface CalculationResult {
  usableOxygenLiters: number;
  estimatedTotalFlow: number;
  oxygenConsumption: number;
  estimatedDurationMinutes: number | null;
  safeDurationMinutes: number | null;
  remainingMargin: number | null;
  status: TransportStatus | null;
  simulation: LeakSimulationResult[];
  input: CalculationInput;
  settings: CylinderSettings;
}
