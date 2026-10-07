import { useState } from "react";
const items = [
  "酸素ボンベ残圧を確認",
  "FiO₂を確認",
  "MinVentを確認",
  "Leakを確認",
  "マスク・回路のリークを確認",
  "酸素ボンベ接続を確認",
  "予備酸素ボンベを準備",
  "SpO₂モニターを確認",
  "V60バッテリー残量を確認",
  "搬送先までの所要時間を確認",
];
export function Checklist() {
  const [checked, setChecked] = useState<string[]>([]);
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>搬送前チェック</h2>
        <span>
          {checked.length} / {items.length}
        </span>
      </div>
      <p className="muted">チェックは再読込時にリセットされます。</p>
      <div className="checklist">
        {items.map((item) => (
          <label key={item}>
            <input
              type="checkbox"
              checked={checked.includes(item)}
              onChange={(e) =>
                setChecked((x) =>
                  e.target.checked ? [...x, item] : x.filter((v) => v !== item),
                )
              }
            />
            <span>{item}</span>
          </label>
        ))}
      </div>
      <button
        type="button"
        className="text-button"
        onClick={() => setChecked([])}
      >
        チェックをリセット
      </button>
    </section>
  );
}
