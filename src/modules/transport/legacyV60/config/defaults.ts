import type { CylinderSettings } from "../types";
export const DEVICE_MODEL = {
  name: "NPPV共通の簡易推定モデル",
  referencedDevices: ["V60", "ART70"],
  manufacturerValidated: false,
  roomAirFraction: 0.21,
  oxygenFraction: 1,
  defaultCircuitCompensationFlow: 5,
} as const;
export const DEFAULT_SETTINGS: CylinderSettings = {
  cylinderCapacity: 500,
  fullPressure: 14.7,
  reservePressure: 1,
  circuitCompensationFlow: DEVICE_MODEL.defaultCircuitCompensationFlow,
  safetyFactor: 0.8,
};
