import { useId, useState } from "react";
interface Props {
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  help: string;
  hint?: string;
  error?: string;
  step?: string;
  min?: number;
  max?: number;
  reset?: () => void;
}
export function NumberField(p: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <div className="field">
      <div className="field-heading">
        <label htmlFor={id}>{p.label}</label>
        <button
          type="button"
          className="help"
          aria-label={`${p.label}の説明`}
          aria-expanded={open}
          aria-controls={`${id}-help`}
          onClick={() => setOpen(!open)}
        >
          ？
        </button>
      </div>
      {open && (
        <p className="help-text" id={`${id}-help`}>
          {p.help}
        </p>
      )}
      <div className={`number-wrap ${p.error ? "invalid" : ""}`}>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={p.step ?? "any"}
          min={p.min}
          max={p.max}
          value={p.value}
          onChange={(e) => p.onChange(e.target.value)}
          aria-invalid={!!p.error}
          aria-describedby={`${id}-hint ${p.error ? `${id}-error` : ""}`}
        />
        <span>{p.unit}</span>
      </div>
      <p className="hint" id={`${id}-hint`}>
        {p.hint}
      </p>
      {p.error && (
        <p className="error" id={`${id}-error`}>
          {p.error}
        </p>
      )}
      {p.reset && (
        <button className="text-button" type="button" onClick={p.reset}>
          初期値に戻す
        </button>
      )}
    </div>
  );
}
