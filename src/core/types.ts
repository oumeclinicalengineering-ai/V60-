export type Resource = 'oxygen' | 'air' | 'power';
export type Status = '計算上の資源余裕あり' | '資源不足' | '判定保留' | '対象外' | '再計算が必要';
export type ApprovalState = '調査中' | '検証中' | '院内承認済み' | '停止中';
export type Unit = '%' | 'MPa' | 'L/min' | '分' | 'cmH₂O';
export interface Field { id:string;label:string;unit:Unit;location:string;meaning:string;min?:number;max?:number }
export interface Profile { id:string;name:string;version:string;demo:boolean;state:ApprovalState;modelId:string|null;fields:Field[];required:Resource[];nonConsumed:Resource[];configuration:Record<string,string>;sources:{title:string;version:string;page:string}[];validation:string[];approval:{by:string|null;date:string|null;reviewUntil:string|null;environments:('internal'|'external')[]} }
export interface Cylinder { id:string;resource:'oxygen'|'air';product:string;pressure:string;pressureUnit:'MPa';role:'connected'|'exchange'|'reserve';compatible:boolean;exchangePoint:string;exchangeResponsible:boolean;exchangeProcedure:boolean }
export interface Segment { id:string;name:string;times:Record<'move'|'exam'|'wait'|'connect'|'delay',string>;oxygen:string;air:string;power:'battery'|'mains'|'unknown';oxygenRate:string;airRate:string;sourceConfirmed:boolean }
export interface Plan { mode:'demo'|'clinical';environment:'internal'|'external';profileId:string;configurationId:string;matched:boolean;fields:Record<string,string>;cylinders:Cylinder[];segments:Segment[];powerMinutes:string;powerConfirmed:boolean;external:Record<'vehicle'|'fixation'|'gas'|'power'|'destination',boolean>;readings:Record<string,string> }
export interface ResourceResult { resource:Resource;status:Status;available:number|null;needed:number|null;shortage:number|null;unit:'L'|'分';reasons:string[];rates:number[];ledger:{segment:string;source:string;start:number;used:number;end:number;shortage:number}[] }
export interface Evaluation { overall:Status;resources:ResourceResult[];errors:Record<string,string>;reasons:string[];planned:number|null;evaluated:number|null;calculatedAt:string;profileVersion:string;modelId:string|null;mode:Plan['mode'];totalTime:null }
