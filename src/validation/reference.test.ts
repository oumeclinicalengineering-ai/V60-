import {describe,it,expect} from 'vitest';
import {estimateReference, type ReferenceInput} from '../modules/transport/reference';
const valid:ReferenceInput={pressure:'10.13',volume:'2',reserve:'0',rates:['5','10','20'],times:['10','5','0','0','0']};
describe('仮定流量の参考計算',()=>{
 it('独立参照200Lと40/20/10分、不足100Lに一致',()=>{const r=estimateReference(valid);expect(r.available).toBeCloseTo(200);expect(r.scenarios.map(s=>s.duration)).toEqual([40,20,10]);expect(r.scenarios[2].shortage).toBeCloseTo(100);});
 it.each(['','0','-1','NaN','Infinity','5 L/min'])('不正な消費流量 %s で停止',flow=>{const r=estimateReference({...valid,rates:[flow]});expect(r.scenarios).toEqual([]);expect(r.errors.rate0).toBeTruthy();});
 it('残圧と留保同値は0分、無限時間は表示しない',()=>{expect(estimateReference({...valid,reserve:'10.13'}).scenarios[0].duration).toBe(0);});
 it('留保が残圧超過なら停止',()=>{expect(estimateReference({...valid,reserve:'11'}).errors.reserve).toBeTruthy();});
 it('時間未入力を0にしない',()=>{expect(estimateReference({...valid,times:['10','']}).scenarios).toEqual([]);});
 it('比較流量は任意、最初の流量は必須',()=>{expect(estimateReference({...valid,rates:['5','','']}).scenarios).toHaveLength(1);expect(estimateReference({...valid,rates:['','10']}).scenarios).toHaveLength(0);});
 it('単位混同・非有限な積を遮断',()=>{expect(estimateReference({...valid,pressure:'10 MPa'}).scenarios).toHaveLength(0);expect(estimateReference({...valid,volume:'1e308'}).scenarios).toHaveLength(0);});
});
