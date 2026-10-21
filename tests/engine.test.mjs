import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { solve, totals, category, encodePlate, decodePlate } from '../src/engine.mjs';
const data=JSON.parse(readFileSync(new URL('../public/data/nutrition.json',import.meta.url)));
const plate=['巨无霸','中薯条','可乐中杯'].map(n=>data.foods.find(f=>f.name===n));
test('official snapshot has unique valid foods and reproducible baseline',()=>{
 assert.equal(data.foods.length,158);assert.equal(new Set(data.foods.map(f=>f.id)).size,158);
 assert.equal(data.source.rawCount,160);assert.equal(data.source.duplicateCount,2);
 assert.equal(totals(plate).energyKcal,949);assert.equal(totals(plate).protein,31);assert.equal(totals(plate).sodium,1126);
 for(const f of data.foods){assert.equal(f.category,category(f.name));for(const k of ['energyKcal','protein','sodium'])assert.ok(Number.isFinite(f[k])&&f[k]>=0);}
 assert.equal(category('儿童鱼排堡'),'main');assert.equal(category('猪柳炒双蛋堡'),'breakfast');
});
test('all lock masks and budgets respect hard constraints',()=>{
 for(let mask=0;mask<8;mask++)for(const budget of [1,2]){
  const locks=[0,1,2].map(i=>Boolean(mask&(1<<i)));
  const result=solve(data.foods,plate,locks,budget);
  for(const [key,s] of Object.entries(result.best))if(s){
   assert.ok(s.changes<=budget&&s.changes>0);
   assert.equal(s.changes,s.foods.filter((f,i)=>f.id!==plate[i].id).length);
   s.foods.forEach((f,i)=>{assert.equal(f.category,plate[i].category);if(locks[i])assert.equal(f.id,plate[i].id);});
   assert.ok(key==='protein'?s.total[key]>result.original[key]:s.total[key]<result.original[key]);
  }
  if(mask===7){assert.equal(result.examined,0);assert.deepEqual(Object.values(result.best),[null,null,null]);}
 }
});
const make=(id,c,e,p,s)=>({id,name:id,category:c,energyKcal:e,protein:p,sodium:s,fat:0,carbohydrate:0,calcium:0});
test('solver matches independent brute-force oracle including tradeoffs and ties',()=>{
 const foods=[make('a','main',500,20,900),make('b','main',350,22,950),make('c','side',300,4,100),make('d','side',100,3,50),make('e','drink',150,0,0),make('f','drink',0,0,35),make('g','drink',0,0,0)];
 const selected=[foods[0],foods[2],foods[4]],base=totals(selected);
 for(const locks of [[false,false,false],[true,false,false]])for(const max of [1,2]){
  const candidates=[];
  for(const a of foods)for(const b of foods)for(const c of foods){
   const fs=[a,b,c],changes=fs.filter((f,i)=>f.id!==selected[i].id).length;
   if(changes===0||changes>max||fs.some((f,i)=>f.category!==selected[i].category||(locks[i]&&f.id!==selected[i].id)))continue;
   candidates.push({foods:fs,changes,total:totals(fs)});
  }
  const result=solve(foods,selected,locks,max);assert.equal(result.examined,candidates.length);
  for(const key of ['energyKcal','protein','sodium']){
   const sign=key==='protein'?1:-1;
   const penalty=x=>Math.max(0,x.total.energyKcal-base.energyKcal)/500+Math.max(0,base.protein-x.total.protein)/25+Math.max(0,x.total.sodium-base.sodium)/1000;
   const valid=candidates.filter(x=>sign*(x.total[key]-base[key])>0).sort((a,b)=>sign*(b.total[key]-a.total[key])||a.changes-b.changes||penalty(a)-penalty(b));
   assert.deepEqual(result.best[key]?.foods.map(f=>f.id),valid[0]?.foods.map(f=>f.id));
  }
 }
});
test('shared plate roundtrip and tampered constraint rejection',()=>{
 const locks=[true,false,false],candidate=solve(data.foods,plate,locks,1).best.energyKcal.foods;
 const hash=encodePlate(plate,locks,1,candidate),decoded=decodePlate(hash,data.foods);
 assert.deepEqual(decoded,{selected:plate,locked:locks,changes:1,candidate});
 assert.equal(decodePlate('v=1&p=unknown&l=000&c=1',data.foods),null);
 assert.equal(decodePlate(hash.replace('c=1','c=9'),data.foods),null);
 const tampered=encodePlate(plate,locks,1,[data.foods.find(f=>f.category==='main'&&f.id!==plate[0].id),plate[1],plate[2]]);
 assert.equal(decodePlate(tampered,data.foods).candidate,null);
});
