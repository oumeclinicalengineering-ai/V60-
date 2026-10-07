import type { CalculationResult } from "../types";
const duration = (n: number | null) =>
  n === null ? "対象外" : `約${Math.round(n)}分`;
export function Results({ result: r }: { result: CalculationResult }) {
  const max = r.simulation[0].safeDurationMinutes ?? 0;
  return (
    <section aria-label="計算結果" aria-live="polite">
      <div className="result-card">
        <div className="eyebrow">計算結果 · 簡易推定 / 参考値</div>
        {r.usableOxygenLiters === 0 && (
          <p className="empty-warning" role="alert">
            使用可能な酸素残量がありません
          </p>
        )}
        {r.safeDurationMinutes === null ? (
          <p className="out-of-scope">
            FiO₂ 21%では酸素ボンベ消費量計算の対象外です
          </p>
        ) : (
          <>
            <h2>安全使用目安</h2>
            <div className="big-time">
              約<span>{Math.round(r.safeDurationMinutes)}</span>分
            </div>
            <p>安全係数 {Math.round(r.settings.safetyFactor * 100)}% を適用</p>
          </>
        )}
        <div className="metrics">
          <div>
            <span>推定使用可能時間</span>
            <strong>{duration(r.estimatedDurationMinutes)}</strong>
          </div>
          <div>
            <span>搬送予定時間</span>
            <strong>{r.input.transportMinutes}分</strong>
          </div>
          <div>
            <span>
              {r.remainingMargin !== null && r.remainingMargin < 0
                ? "不足時間"
                : "余裕時間"}
            </span>
            <strong>
              {r.remainingMargin === null
                ? "対象外"
                : duration(Math.abs(r.remainingMargin))}
            </strong>
          </div>
        </div>
        <p className="result-note">
          搬送可否はこの結果だけで判断しないでください。
        </p>
      </div>
      {r.status && (
        <div className={`status ${r.status.level}`}>
          <strong>
            {r.status.level === "green"
              ? "✓"
              : r.status.level === "yellow"
                ? "!"
                : "⚠"}{" "}
            {r.status.title}
          </strong>
          <p>{r.status.description}</p>
          <small>判定は四捨五入前の値で行っています。</small>
        </div>
      )}
      <section className="panel simulation">
        <h2>リーク増加時の参考</h2>
        <p className="muted">リークが増えると、安全使用目安が短くなります。</p>
        {r.simulation.map((s) => (
          <div className="simulation-row" key={s.increment}>
            <div className="sim-label">
              <strong>
                {s.increment === 0 ? "現在" : `+${s.increment} L/min`}
              </strong>
              <span>Leak {s.leakFlow} L/min</span>
            </div>
            <div className="bar-track">
              <div
                className="bar"
                style={{
                  width: `${max > 0 ? ((s.safeDurationMinutes ?? 0) / max) * 100 : 0}%`,
                }}
              />
            </div>
            <strong>{duration(s.safeDurationMinutes)}</strong>
          </div>
        ))}
        <details className="formula">
          <summary>計算の内訳・簡易推定式</summary>
          <p>使用可能酸素量：{r.usableOxygenLiters.toFixed(1)} L</p>
          <p>簡易総流量：{r.estimatedTotalFlow.toFixed(1)} L/min</p>
          <p>推定酸素消費量：{r.oxygenConsumption.toFixed(2)} L/min</p>
          <p>使用可能量 = 容量 × (残圧 − 安全残圧) ÷ 満充填圧</p>
          <p>
            酸素消費量 = (MinVent + Leak + 回路補正流量) × (FiO₂ / 100 − 0.21) ÷
            0.79
          </p>
          <p>メーカー公式の計算式ではありません。</p>
        </details>
      </section>
    </section>
  );
}
