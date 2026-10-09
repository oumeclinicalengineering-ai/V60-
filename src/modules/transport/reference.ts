import {numberValue} from '../../core/validation';
export const REFERENCE_VERSION='oxygen-scenario-1.0';
export type ReferenceInput={pressure:string;volume:string;reserve:string;rates:string[];times:string[]};
export type ReferenceResult={errors:Record<string,string>;available:number|null;minutes:number|null;scenarios:{flow:number;duration:number;difference:number;shortage:number}[]};
// 一般的な理想気体概算。V60固有の消費モデルではない。流量・留保は利用者の仮定値。
export function estimateReference(i:ReferenceInput):ReferenceResult{
 const errors:Record<string,string>={};const read=(raw:string,key:string,positive=false)=>{const n=numberValue(raw);if(n===null||(positive&&n===0)){errors[key]='数値を入力してください（負値・非有限値不可）'+(positive?'。0より大きい値が必要です':'');return null;}return n;};
 const pressure=read(i.pressure,'pressure'),volume=read(i.volume,'volume',true),reserve=read(i.reserve,'reserve');
 if(pressure!==null&&reserve!==null&&reserve>pressure)errors.reserve='留保圧が現在残圧を上回っています。値を確認してください';
 const times=i.times.map((t,j)=>read(t,'time'+j));let minutes=times.every(t=>t!==null)?times.reduce<number>((a,b)=>a+(b??0),0):null;
 const flows=i.rates.flatMap((r,j)=>{if(r.trim()===''&&j>0)return [];const n=read(r,'rate'+j,true);return n===null?[]:[n];});
 let available=pressure!==null&&volume!==null&&reserve!==null?volume*Math.max(pressure-reserve,0)/0.1013:null;
 if((available!==null&&!Number.isFinite(available))||(minutes!==null&&!Number.isFinite(minutes))){errors.calculation='計算可能な数値範囲を超えています';available=null;minutes=null;}
 const scenarios=Object.keys(errors).length||available===null||minutes===null?[]:flows.map(flow=>({flow,duration:available!/flow,difference:available!/flow-minutes!,shortage:Math.max(flow*minutes!-available!,0)}));
 if(scenarios.some(s=>Object.values(s).some(n=>!Number.isFinite(n)))){errors.calculation='計算可能な数値範囲を超えています';return {errors,available:null,minutes:null,scenarios:[]};}
 return {errors,available,minutes,scenarios};
}
