import type {Field,Unit} from './types';
export function numberValue(raw:string,min=0,max?:number):number|null {
 if(raw.trim()===''||!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(raw.trim()))return null;
 const n=Number(raw);return Number.isFinite(n)&&n>=min&&(max===undefined||n<=max)?n:null;
}
export function fieldError(raw:string,f:Field,unit:Unit=f.unit):string|null {
 if(unit!==f.unit)return `単位は${f.unit}で入力してください`;
 return numberValue(raw,f.min??0,f.max)===null?`未入力・非数値・負値・非有限値または範囲外です${f.min!==undefined?`（${f.min}${f.max!==undefined?`〜${f.max}`:'以上'} ${f.unit}）`:''}`:null;
}
export function invalidate<T>(s:{result:T|null;checks:boolean[]}){return {result:null,checks:s.checks.map(()=>false)};}
export const displayAmount=(n:number|null)=>n===null?'未評価':String(n>Number.MAX_VALUE/10?n:Math.ceil(n*10)/10);
export const displayTime=(n:number|null)=>n===null?'未評価':n>0&&n<0.1?'0.1分未満':`${n>Number.MAX_VALUE/10?n:Math.floor(n*10)/10}分`;

export const displayAvailable=(n:number|null)=>n===null?'未評価':n>0&&n<0.1?'0.1未満':String(n>Number.MAX_VALUE/10?n:Math.floor(n*10)/10);
