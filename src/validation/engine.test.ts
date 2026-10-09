import {describe,it,expect} from 'vitest';
import {evaluate,clinicalGate} from '../modules/transport/engine';
import {demoExample,emptyPlan,newCylinder,usable} from '../modules/transport/demoModel';
import {profiles,demoProfile} from '../profiles';
import {numberValue,fieldError,invalidate,displayAmount,displayTime} from '../core/validation';
import type {Profile} from '../core/types';
const oxygen=(p=demoExample())=>evaluate(p).resources[0];
describe('独立参照・区間別資源',()=>{
 it('手計算参照: 190 L、30分、酸素150 L、空気90 L、電源30分',()=>{const r=evaluate(demoExample());expect(r.overall).toBe('計算上の資源余裕あり');expect(r.planned).toBe(28);expect(r.evaluated).toBe(30);expect(r.resources.map(x=>x.available)).toEqual([190,190,60]);expect(r.resources.map(x=>x.needed)).toEqual([150,90,30]);expect(r.totalTime).toBeNull();});
 it('同一ボンベの2区間目開始量は90 L、終端40 L。二重合算しない',()=>{const r=oxygen();expect(r.ledger.map(x=>x.start)).toEqual([190,90]);expect(r.ledger[1].end).toBe(40);expect(r.available).toBe(190);});
 it('区間別消費を積算・遅延を一度だけ計上',()=>{const p=demoExample();p.segments[1].oxygenRate='7';expect(oxygen(p).needed).toBe(170);});
 it('供給源切替前の不足を後続ボンベで相殺しない',()=>{const p=demoExample();p.cylinders[0].pressure='1';p.cylinders.push({...newCylinder(3),id:'NEXT',pressure:'15',compatible:true});p.segments[1].oxygen='NEXT';const r=oxygen(p);expect(r.available).toBe(300);expect(r.needed).toBe(150);expect(r.shortage).toBe(90);expect(r.ledger[0].shortage).toBe(90);expect(r.status).toBe('資源不足');});
 it('必須電源不明でも酸素不足を残す',()=>{const p=demoExample();p.powerMinutes='';p.cylinders[0].pressure='1';const r=evaluate(p);expect(r.overall).toBe('判定保留');expect(r.resources[0].shortage).toBe(140);expect(r.resources[0].status).toBe('資源不足');expect(r.resources[2].status).toBe('判定保留');});
 it('空気の供給条件が不明なら総合保留',()=>{const p=demoExample();p.cylinders[1].compatible=false;expect(evaluate(p).overall).toBe('判定保留');});
 it('二重登録を阻止・同一IDを酸素と空気へ二重割当できない',()=>{const p=demoExample();p.cylinders[1].id=p.cylinders[0].id;p.segments.forEach(s=>s.air=p.cylinders[0].id);const r=evaluate(p);expect(r.overall).toBe('判定保留');expect(r.resources[0].available).toBe(0);expect(r.resources[1].available).toBe(0);expect(Object.values(r.errors)).toContain('識別番号が空欄または二重登録です');});
 it('緊急留保は除外、通常計画に割り当てても保留',()=>{const p=demoExample();p.cylinders.push({...newCylinder(3),id:'RESERVE',pressure:'15',compatible:true,role:'reserve'});expect(oxygen(p).available).toBe(190);p.segments[1].oxygen='RESERVE';expect(oxygen(p).available).toBe(190);expect(oxygen(p).status).toBe('判定保留');});
 it('交換は地点・担当・手順が全て必要',()=>{const p=demoExample();p.cylinders[0].role='exchange';expect(oxygen(p).status).toBe('判定保留');Object.assign(p.cylinders[0],{exchangePoint:'s1',exchangeResponsible:true,exchangeProcedure:true});expect(oxygen(p).needed).toBe(150);});
 it('外部電源で電池消費を止めても再充電しない',()=>{const p=demoExample();p.segments[0].power='mains';expect(evaluate(p).resources[2].needed).toBe(10);});
 it('ボンベ留保圧と境界: 0、0.5、15。公称容量を製品IDへ代入不可',()=>{const c=demoExample().cylinders[0];expect(usable({...c,pressure:'0'})).toBe(0);expect(usable({...c,pressure:'0.5'})).toBe(0);expect(usable({...c,pressure:'15'})).toBe(290);expect(usable({...c,pressure:'15.1'})).toBeNull();expect(usable({...c,product:'500 L級'})).toBeNull();});
 it('ゼロ消費・空欄・非有限積算を保留。無限時間なし',()=>{for(const raw of ['0','','-1','NaN','Infinity','1e309']){const p=demoExample();p.segments[0].oxygenRate=raw;expect(evaluate(p).overall).toBe('判定保留');}const p=demoExample();p.segments[0].oxygenRate='1e308';expect(oxygen(p).reasons.length).toBeGreaterThan(0);});
 it('未入力時間をゼロにしない',()=>{const p=demoExample();p.segments[0].times.wait='';expect(evaluate(p).evaluated).toBeNull();expect(evaluate(p).overall).toBe('判定保留');});
});
describe('承認・分離・状態遷移',()=>{
 it('実機8機種は全て調査中、臨床数値なし',()=>{expect(profiles).toHaveLength(8);for(const p of profiles){const plan={...emptyPlan('clinical'),profileId:p.id};const r=evaluate(plan);expect(p.state).toBe('調査中');expect(r.resources.every(x=>x.available===null&&x.needed===null)).toBe(true);}});
 it.each(['調査中','検証中','停止中'] as const)('%sでは遮断',state=>{const p:Profile={...profiles[5],state};expect(clinicalGate(p,emptyPlan('clinical'),new Date()).some(x=>x.includes(state))).toBe(true);});
 it('期限切れ・院外範囲外を明示。デモ承認を作成しない',()=>{const p:Profile={...profiles[5],state:'院内承認済み',approval:{by:'テスト用のみ',date:'2020-01-01',reviewUntil:'2020-02-01',environments:['internal']},validation:['テスト用のみ']};const plan={...emptyPlan('clinical'),environment:'external' as const};const reasons=clinicalGate(p,plan,new Date('2026-10-09'));expect(reasons.some(x=>x.includes('期限切れ'))).toBe(true);expect(reasons.some(x=>x.includes('承認範囲外'))).toBe(true);expect(reasons.some(x=>x.includes('未実装'))).toBe(true);});
 it('デモ値を臨床へ渡しても数値を遮断、臨床値をデモへ渡しても遮断',()=>{const p=demoExample();p.mode='clinical';expect(evaluate(p).resources.every(x=>x.available===null)).toBe(true);const c=emptyPlan('demo');c.profileId='v60';expect(evaluate(c).resources.every(x=>x.available===null)).toBe(true);expect(demoProfile.approval.by).toBeNull();});
 it('入力変更時、旧結果・準備チェックを破棄',()=>{expect(invalidate({result:evaluate(demoExample()),checks:[true,true]})).toEqual({result:null,checks:[false,false]});});
});
describe('単位・不正入力・表示',()=>{
 it.each(['',' ','abc','NaN','Infinity','-1','1e309','0x10','40%','1 MPa'])('%sを拒否',s=>expect(numberValue(s)).toBeNull());
 it('ゼロと有限境界は保持、％と小数を区別',()=>{expect(numberValue('0')).toBe(0);const f=profiles[5].fields[0];expect(fieldError('0.4',f)).toBeTruthy();expect(fieldError('21',f)).toBeNull();expect(fieldError('100',f)).toBeNull();expect(fieldError('101',f)).toBeTruthy();});
 it('MPaと気道内圧単位を混同しない',()=>{const f=profiles[5].fields.find(x=>x.id==='ipap')!;expect(fieldError('10',f,'MPa')).toContain('cmH₂O');});
 it('持続時間を切上げず、不足を切下げない',()=>{expect(displayTime(1.99)).toBe('1.9分');expect(displayTime(0.01)).toBe('0.1分未満');expect(displayAmount(0.01)).toBe('0.1');});
});

it('巨大な有限値の表示でInfinityを生成しない',()=>{expect(displayAmount(1e308)).not.toContain('Infinity');expect(displayTime(1e308)).not.toContain('Infinity');});
it('停止中のデモモデルも遮断する',()=>{expect(clinicalGate({...demoProfile,state:'停止中'},demoExample(),new Date()).some(x=>x.includes('停止中'))).toBe(true);});
