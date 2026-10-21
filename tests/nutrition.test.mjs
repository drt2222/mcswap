import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeNutrition, unwrapTool } from '../scripts/nutrition.mjs';
const header='productName,nutritionDescription,energyKj,energyKcal,protein,fat,carbohydrate,sodium,calcium';
const row='麦香鱼,example,1000,240,12,10,26,400,100';
const payload=(rows)=>({datetime:'2026-10-21 15:00:00',data:`[${rows.length}]{${header}}:\n${rows.join('\n')}`});
test('normalization deduplicates identical rows and publishes only whitelisted fields',()=>{
 const p=payload([row,row]);p.traceId='private-trace';p.account='private-account';
 const r=normalizeNutrition(p);assert.equal(r.foods.length,1);assert.equal(r.source.duplicateCount,1);
 assert.equal(r.source.fetchedAt,'2026-10-21T15:00:00+08:00');assert.ok(!JSON.stringify(r).includes('private'));
 assert.deepEqual(Object.keys(r.foods[0]),['id','name','category','energyKj','energyKcal','protein','fat','carbohydrate','sodium','calcium']);
});
test('partial, invalid, conflicting data fails closed',()=>{
 for(const r of [row.replace(',240,',',null,'),row.replace(',240,',',-1,'),row.replace(',240,',',,'),row.replace(',240,',',Infinity,'),row+',extra'])assert.throws(()=>normalizeNutrition(payload([r])));
 assert.throws(()=>normalizeNutrition(payload([row,row.replace(',240,',',250,')])));
 assert.throws(()=>normalizeNutrition({...payload([row]),data:payload([row]).data.replace('[1]','[2]')}));
 assert.throws(()=>normalizeNutrition({...payload([row]),datetime:undefined}));
});
test('quoted CSV names and structured/text MCP variants parse',()=>{
 const p=payload([row.replace('麦香鱼','"测试,麦香鱼"')]);assert.equal(normalizeNutrition(p).foods[0].name,'测试,麦香鱼');
 const body={success:true,code:200,...p};
 assert.deepEqual(unwrapTool({result:{structuredContent:body}}),body);
 assert.deepEqual(unwrapTool({result:{content:[{type:'text',text:'## Original Response\n'+JSON.stringify(body)}]}}),body);
 assert.throws(()=>unwrapTool({result:{isError:true}}));
 assert.throws(()=>unwrapTool({result:{structuredContent:{success:false,code:500}}}));
});
