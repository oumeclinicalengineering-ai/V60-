import type {Evaluation,Plan,Profile,Resource,ResourceResult} from '../../core/types';
import {numberValue,fieldError} from '../../core/validation';
import {getProfile} from '../../profiles';
import {usable} from './demoModel';
export function clinicalGate(p:Profile,plan:Plan,now:Date):string[]{
 const reasons:string[]=[];
 if(p.state==='停止中')reasons.push('停止中のプロファイルは使用できません');
 if(plan.mode==='demo'&&p.modelId!=='fictional-direct-v1')reasons.push('未対応のデモモデルです');
 if(p.demo!==(plan.mode==='demo'))reasons.push('デモと臨床用の不一致。新しいセッションを開始してください');
 if(plan.mode==='clinical'){
 if(p.state!=='院内承認済み')reasons.push(`プロファイルは${p.state}。機器担当CEに根拠資料・実機検証・承認を確認してください`);
 if(!p.approval.by||!p.approval.date||!p.validation.length||!p.sources.length)reasons.push('承認情報・検証記録・出典が不足しています');
 const expiry=p.approval.reviewUntil?Date.parse(p.approval.reviewUntil):NaN;
 if(!Number.isFinite(expiry)||now.getTime()>expiry)reasons.push('レビュー期限が未登録または期限切れです');
 if(!p.approval.environments.includes(plan.environment))reasons.push('この使用環境は承認範囲外です。院外は別承認が必要です');
 reasons.push('臨床計算モデル・認証済み承認基盤は未実装です。確認画面のみ利用できます');
 }
 if(!plan.matched)reasons.push('実機と登録構成を照合してください');
 return reasons;
}
export function evaluate(plan:Plan,now=new Date()):Evaluation{
 const profile=getProfile(plan.profileId);const errors:Record<string,string>={};
 const base={overall:'判定保留' as const,resources:[] as ResourceResult[],errors,reasons:[] as string[],planned:null as number|null,evaluated:null as number|null,calculatedAt:now.toISOString(),profileVersion:profile?.version??'未登録',modelId:profile?.modelId??null,mode:plan.mode,totalTime:null};
 const reasons=profile?clinicalGate(profile,plan,now):['プロファイル未登録'];
 const held=(resource:Resource):ResourceResult=>({resource,status:'判定保留',available:null,needed:null,shortage:null,unit:resource==='power'?'分':'L',reasons:[...reasons],rates:[],ledger:[]});
 for(const field of profile?.fields??[]){const e=fieldError(plan.fields[field.id]??'',field);if(e)errors[`field.${field.id}`]=e;}
 for(const [key,raw] of Object.entries(plan.fields))if(['cylinderPressure','supplyPressure'].includes(key)&&numberValue(raw)===null)errors[`field.${key}`]='0以上のMPaを入力してください';
 if(!profile||reasons.length){for(const s of plan.segments)for(const [k,v]of Object.entries(s.times))if(numberValue(v)===null)errors[`segment.${s.id}.${k}`]='0以上の分を入力してください。未入力は0にしません';return {...base,reasons,resources:(['oxygen','air','power'] as Resource[]).map(held)};}
 if(!plan.segments.length)errors.segments='区間を追加してください';
 let planned=0,evaluated=0;let badTime=false;
 for(const s of plan.segments)for(const [k,v]of Object.entries(s.times)){const n=numberValue(v);if(n===null){errors[`segment.${s.id}.${k}`]='0以上の分を入力してください。未入力は0にしません';badTime=true;}else{evaluated+=n;if(k!=='delay')planned+=n;}}
 if(!Number.isFinite(planned)||!Number.isFinite(evaluated)){errors.segments='時間の積算が非有限値です';badTime=true;}
 const duplicate=new Set<string>();const seen=new Set<string>();for(const c of plan.cylinders){if(!c.id.trim()||seen.has(c.id))duplicate.add(c.id);seen.add(c.id);}
 for(const id of duplicate)errors[`cylinder.${id}.id`]='識別番号が空欄または二重登録です';
 for(const c of plan.cylinders)if(usable(c)===null)errors[`cylinder.${c.id}.pressure`]='架空登録製品・MPa・0〜15の残圧を確認してください';
 const resources:ResourceResult[]=[];
 for(const resource of ['oxygen','air'] as const){
 const rr:ResourceResult={resource,status:'計算上の資源余裕あり',available:0,needed:0,shortage:0,unit:'L',reasons:[],rates:[],ledger:[]};
 const balances=new Map<string,number>();const allocated=new Set<string>();
 for(const c of plan.cylinders.filter(c=>c.resource===resource)){const v=usable(c);if(v!==null)balances.set(c.id,v);}
 for(const s of plan.segments){const id=s[resource];const c=plan.cylinders.find(c=>c.id===id&&c.resource===resource);const rate=numberValue(s[resource==='oxygen'?'oxygenRate':'airRate']);
 const ns=Object.values(s.times).map(v=>numberValue(v));
 if(!c||duplicate.has(id)||!balances.has(id)){rr.reasons.push(`${s.name}：単独供給ボンベを選択してください`);continue;}
 if(c.role==='reserve'){rr.reasons.push(`${s.name}：緊急時留保用は通常計画へ割当できません`);continue;}
 if(!c.compatible||!s.sourceConfirmed){rr.reasons.push(`${s.name}：供給系の適合・圧力・瞬時流量能力を確認してください`);continue;}
 if(c.role==='exchange'&&(!c.exchangePoint.trim()||!c.exchangeResponsible||!c.exchangeProcedure||(c.exchangePoint!==s.id&&!allocated.has(c.id)))){rr.reasons.push(`${s.name}：交換地点・担当確認・交換手順が必要です`);continue;}
 if(rate===null||rate===0){errors[`segment.${s.id}.${resource}Rate`]='デモ設計消費量は0より大きいL/minを入力してください';rr.reasons.push(`${s.name}：消費量が不明またはゼロです。無限時間にはしません`);continue;}
 if(ns.some(n=>n===null)){rr.reasons.push(`${s.name}：時間が未確定です`);continue;}
 const used=rate*(ns as number[]).reduce((a,b)=>a+b,0);const start=balances.get(id)!;
 if(!Number.isFinite(used)){rr.reasons.push(`${s.name}：消費量が非有限値です`);continue;}
 if(!allocated.has(id)){rr.available!+=usable(c)!;allocated.add(id);}
 const shortage=Math.max(used-start,0);const end=Math.max(start-used,0);balances.set(id,end);rr.needed!+=used;rr.shortage!+=shortage;rr.rates.push(rate);rr.ledger.push({segment:s.name,source:id,start,used,end,shortage});
 }
 if(!Number.isFinite(rr.available)||!Number.isFinite(rr.needed)||!Number.isFinite(rr.shortage)){rr.reasons.push('資源の積算が非有限値です');rr.available=null;rr.needed=null;rr.shortage=null;}
 rr.status=(rr.shortage??0)>0?'資源不足':rr.reasons.length?'判定保留':'計算上の資源余裕あり';resources.push(rr);
 }
 const power:ResourceResult={resource:'power',status:'計算上の資源余裕あり',available:numberValue(plan.powerMinutes),needed:0,shortage:null,unit:'分',reasons:[],rates:[],ledger:[]};
 if(power.available===null||!plan.powerConfirmed)power.reasons.push('架空固定負荷の評価時間・負荷構成を確認してください。電池％比例計算はしません');
 let consumed=0;
 for(const s of plan.segments){const ns=Object.values(s.times).map(v=>numberValue(v));if(ns.some(n=>n===null)){power.reasons.push(`${s.name}：時間が未確定です`);continue;}
 const t=(ns as number[]).reduce((a,b)=>a+b,0);
 if(s.power==='unknown'||!s.sourceConfirmed)power.reasons.push(`${s.name}：電源・切替条件を確認してください`);
 else if(s.power==='battery'){consumed+=t;power.needed!+=t;if(power.available!==null){const start=Math.max(power.available-(consumed-t),0);power.ledger.push({segment:s.name,source:'架空電池',start,used:t,end:Math.max(start-t,0),shortage:Math.max(t-start,0)});}}
 }
 if(!Number.isFinite(consumed)){power.reasons.push('電源時間が非有限値です');power.needed=null;}
 if(power.available!==null&&power.needed!==null)power.shortage=Math.max(power.needed-power.available,0);
 power.status=(power.shortage??0)>0?'資源不足':power.reasons.length?'判定保留':'計算上の資源余裕あり';resources.push(power);
 if(plan.environment==='external'&&Object.values(plan.external).some(x=>!x))reasons.push('車両・固定方法・ガス・電源・到着先を確認してください（デモ確認）');
 if(Object.keys(errors).length)reasons.push('入力エラーを修正してください');
 const unknown=resources.some(r=>r.reasons.length>0)||reasons.length>0;
 return {...base,overall:unknown?'判定保留':resources.some(r=>r.status==='資源不足')?'資源不足':'計算上の資源余裕あり',reasons,resources,planned:badTime?null:planned,evaluated:badTime?null:evaluated};
}
