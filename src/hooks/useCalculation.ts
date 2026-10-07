import { useState } from "react";
import { DEFAULT_SETTINGS } from "../config/defaults";
import { calculateOxygen, validateInput } from "../utils/oxygenCalculation";
import type {
  CalculationInput,
  CylinderSettings,
  CalculationResult,
  ValidationErrors,
} from "../types";
export type InputStrings = Record<keyof CalculationInput, string>;
export type SettingStrings = Record<keyof CylinderSettings, string>;
export const EMPTY_INPUT: InputStrings = {
  currentPressure: "",
  fio2Percent: "",
  minuteVentilation: "",
  leakFlow: "",
  transportMinutes: "",
};
export const initialSettings = (): SettingStrings => ({
  cylinderCapacity: String(DEFAULT_SETTINGS.cylinderCapacity),
  fullPressure: String(DEFAULT_SETTINGS.fullPressure),
  reservePressure: String(DEFAULT_SETTINGS.reservePressure),
  circuitCompensationFlow: String(DEFAULT_SETTINGS.circuitCompensationFlow),
  safetyFactor: String(DEFAULT_SETTINGS.safetyFactor * 100),
});
const numeric = (v: string) => (v.trim() === "" ? NaN : Number(v));
export function useCalculation() {
  const [inputs, setInputs] = useState<InputStrings>({ ...EMPTY_INPUT });
  const [settings, setSettings] = useState(initialSettings);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [message, setMessage] = useState("");
  const [attempted, setAttempted] = useState(false);
  function invalidate() {
    setResult(null);
    setMessage("");
    setErrors({});
    setAttempted(false);
  }
  function changeInput(k: keyof CalculationInput, v: string) {
    setInputs((x) => ({ ...x, [k]: v }));
    invalidate();
  }
  function changeSetting(k: keyof CylinderSettings, v: string) {
    setSettings((x) => ({ ...x, [k]: v }));
    invalidate();
  }
  function calculate() {
    setAttempted(true);
    const i = Object.fromEntries(
      Object.entries(inputs).map(([k, v]) => [k, numeric(v)]),
    ) as unknown as CalculationInput;
    const s = Object.fromEntries(
      Object.entries(settings).map(([k, v]) => [
        k,
        numeric(v) / (k === "safetyFactor" ? 100 : 1),
      ]),
    ) as unknown as CylinderSettings;
    const e = validateInput(i, s);
    setErrors(e);
    setResult(null);
    setMessage("");
    if (Object.keys(e).length) return false;
    try {
      setResult(calculateOxygen(i, s));
      return true;
    } catch (err) {
      setMessage((err as Error).message);
      return false;
    }
  }
  function resetSettings() {
    setSettings(initialSettings());
    invalidate();
  }
  function resetInputs() {
    setInputs({ ...EMPTY_INPUT });
    invalidate();
  }
  return {
    inputs,
    settings,
    errors,
    result,
    message,
    attempted,
    changeInput,
    changeSetting,
    calculate,
    resetSettings,
    resetInputs,
  };
}
