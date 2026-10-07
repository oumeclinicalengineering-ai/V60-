import { useRef, useState } from "react";
import { NumberField } from "./components/NumberField";
import { Results } from "./components/Results";
import { Checklist } from "./components/Checklist";
import { SafetyNotice } from "./components/SafetyNotice";
import { useCalculation, initialSettings } from "./hooks/useCalculation";
import type { CalculationInput, CylinderSettings } from "./types";
const mainFields: {
  key: keyof CalculationInput;
  label: string;
  unit: string;
  help: string;
  hint?: string;
  step?: string;
  min: number;
  max?: number;
}[] = [
  {
    key: "currentPressure",
    label: "① 酸素ボンベ残圧",
    unit: "MPa",
    help: "酸素ボンベの圧力計を確認して入力します。",
    step: "0.1",
    min: 0,
  },
  {
    key: "fio2Percent",
    label: "② FiO₂",
    unit: "%",
    help: "V60に設定されている酸素濃度を入力します。",
    min: 21,
    max: 100,
  },
  {
    key: "minuteVentilation",
    label: "③ 分時換気量（MinVent）",
    unit: "L/min",
    help: "V60画面に表示されている分時換気量を入力します。",
    hint: "V60画面に表示されているMinVentを入力",
    min: 0,
  },
  {
    key: "leakFlow",
    label: "④ リーク量（Leak）",
    unit: "L/min",
    help: "V60画面に表示されているリーク量を入力します。",
    hint: "V60画面に表示されているLeakを入力",
    min: 0,
  },
  {
    key: "transportMinutes",
    label: "⑤ 搬送予定時間",
    unit: "分",
    help: "準備・移動・引き継ぎを考慮した搬送予定時間を入力します。",
    min: 0,
  },
];
const settingFields: {
  key: keyof CylinderSettings;
  label: string;
  unit: string;
  help: string;
  min: number;
  max?: number;
}[] = [
  {
    key: "cylinderCapacity",
    label: "ボンベ容量",
    unit: "L",
    help: "満充填時の酸素量です。使用するボンベの仕様を確認してください。",
    min: 0,
  },
  {
    key: "fullPressure",
    label: "満充填圧",
    unit: "MPa",
    help: "ボンベの満充填時の圧力です。",
    min: 0,
  },
  {
    key: "reservePressure",
    label: "安全残圧",
    unit: "MPa",
    help: "使用せずに残す圧力です。満充填圧より小さい値を設定します。",
    min: 0,
  },
  {
    key: "circuitCompensationFlow",
    label: "回路補正流量",
    unit: "L/min",
    help: "簡易推定のための補正値です。メーカー公式値ではありません。",
    min: 0,
  },
  {
    key: "safetyFactor",
    label: "安全係数",
    unit: "%",
    help: "推定時間に掛ける係数です。50～100%で設定します。",
    min: 50,
    max: 100,
  },
];
export default function App() {
  const c = useCalculation();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  return (
    <main>
      <header>
        <div className="brand-icon" aria-hidden="true">
          ＋
        </div>
        <div>
          <p className="brand-kicker">V60 搬送用</p>
          <h1>酸素ボンベ残時間計算</h1>
          <p className="subtitle">NPPV患者 他院搬送用簡易計算ツール</p>
        </div>
      </header>
      <div className="intro">
        <strong>簡易推定ツール</strong>
        <span>参考値です。搬送可否を単独で判断しないでください。</span>
      </div>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (c.calculate())
            requestAnimationFrame(() => resultRef.current?.focus());
          else {
            setDetailsOpen(true);
            requestAnimationFrame(() =>
              document
                .querySelector<HTMLInputElement>('[aria-invalid="true"]')
                ?.focus(),
            );
          }
        }}
      >
        <section className="panel input-panel">
          <div className="section-heading">
            <h2>V60の表示値とボンベ残圧を入力</h2>
            <span className="step-chip">入力 → 計算</span>
          </div>
          <div className="fields">
            {mainFields.map((f) => (
              <NumberField
                {...f}
                key={f.key}
                value={c.inputs[f.key]}
                error={c.errors[f.key]}
                max={
                  f.key === "currentPressure"
                    ? Number(c.settings.fullPressure)
                    : f.max
                }
                onChange={(v) => c.changeInput(f.key, v)}
              />
            ))}
          </div>
          <div className="input-actions">
            <span>入力値は端末内でのみ使用します。</span>
            <button
              type="button"
              className="text-button"
              onClick={c.resetInputs}
            >
              入力をクリア
            </button>
          </div>
        </section>
        <button className="calculate-button" type="submit">
          計算する <span aria-hidden="true">→</span>
        </button>
        {c.attempted && Object.keys(c.errors).length > 0 && (
          <p role="alert" className="error summary-error">
            入力欄のエラーを修正してください。詳細設定も確認してください。
          </p>
        )}
        {c.message && (
          <p role="alert" className="error summary-error">
            {c.message}
          </p>
        )}
        <div ref={resultRef} tabIndex={-1} className="result-focus">
          {c.result && (
            <>
              <Results result={c.result} />
              <Checklist />
            </>
          )}
        </div>
        <details
          className="panel settings"
          open={detailsOpen}
          onToggle={(e) => setDetailsOpen(e.currentTarget.open)}
        >
          <summary>
            詳細設定 <span>ボンベ・補正値・安全係数</span>
          </summary>
          <p className="settings-warning">
            回路補正流量は簡易計算用の補正値です。
            <br />
            実際のV60の酸素消費量を直接示す値ではありません。
          </p>
          <div className="fields">
            {settingFields.map((f) => (
              <NumberField
                {...f}
                key={f.key}
                value={c.settings[f.key]}
                error={c.errors[f.key]}
                onChange={(v) => c.changeSetting(f.key, v)}
                reset={() => c.changeSetting(f.key, initialSettings()[f.key])}
              />
            ))}
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={c.resetSettings}
          >
            詳細設定をすべて初期値に戻す
          </button>
        </details>
      </form>
      <SafetyNotice />
      <footer>
        <p>個人情報の入力不要 · 外部送信なし</p>
        <p>
          オフライン使用には、一度オンラインで開いて読み込みを完了してください。対応ブラウザでは「ホーム画面に追加」から使用できます。
        </p>
        <p>設定を変更した場合は、結果を再計算してください。</p>
      </footer>
    </main>
  );
}
