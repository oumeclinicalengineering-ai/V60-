import type {Plan} from '../core/types';
import {getProfile} from '../profiles';
import {numberValue,displayTime} from '../core/validation';
export function OtherDeviceResults({plan}:{plan:Plan}){
 const profile=getProfile(plan.profileId)!;
 const times=plan.segments.flatMap(s=>Object.values(s.times)).map(t=>numberValue(t));
 const total=times.every(t=>t!==null)?times.reduce<number>((a,b)=>a+(b??0),0):null;
 const minutes=total!==null&&Number.isFinite(total)?total:null;
 return <section aria-label="機器の参考結果"><div className="overall"><strong>参考時間は未計算です</strong><p>{plan.environment==='external'?'院外の参考計算は未対応です。':`${profile.name}の酸素消費モデルが未登録です。`}</p></div><div className="result-metrics"><div><small>酸素の参考残時間</small><strong>未計算</strong></div><div><small>搬送予定（追加時間込み）</small><strong>{displayTime(minutes)}</strong></div></div><p className="notice">時間の余裕・不足は算出していません。V60の式や係数はこの機器に流用しません。</p><dl className="supply-assumptions"><div><dt>酸素</dt><dd>{profile.id==='airvo2'?'入力した酸素添加流量を実機と照合してください。':'酸素源・残圧・接続を実機と照合してください。'}</dd></div><div><dt>空気</dt><dd>必要な空気供給を確保する想定。機器構成・接続を確認してください。</dd></div><div><dt>電源</dt><dd>電源供給を確保する想定。本体・付属機器・切替を確認してください。</dd></div></dl></section>;
}
