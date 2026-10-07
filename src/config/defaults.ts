import type { CylinderSettings } from "../types";
export const DEVICE_MODEL = {
  name: "Philips Respironics V60",
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
