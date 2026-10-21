/** @typedef {{id:string,name:string,category:string,energyKcal:number,protein:number,fat:number,carbohydrate:number,sodium:number,calcium:number}} Food */
/** @typedef {{key:string,foods:Food[],total:Record<string,number>,gain:number,changes:number,tradeoff:number}} Suggestion */
export const METRICS = ['energyKcal', 'protein', 'fat', 'carbohydrate', 'sodium', 'calcium'];
export const GROUP_LABELS = {main:'汉堡与卷', breakfast:'早餐', side:'小食', drink:'饮品', dessert:'甜品'};

export function category(name) {
  if (/麦满分|早安|炒双蛋|粥|油条|薯饼|图林根香肠$/.test(name)) return 'breakfast';
  if (/汉堡|牛堡|鸡腿堡|鱼排堡|巨无霸|麦香|不素之霸|鳕鱼堡|叠叠卷|多笋卷|果然多肉|苹板|专“薯鱼|牛气满满/.test(name)) return 'main';
  if (/新地|麦旋风|冰淇淋|派$|拉明顿|阿芙佳朵/.test(name)) return 'dessert';
  if (/薯条|玉米杯|鸡|翅|苹果片|绝代双翅|蜜汁快乐/.test(name)) return 'side';
  return 'drink';
}

export function totals(foods) {
  return Object.fromEntries(METRICS.map(key=>[key, foods.reduce((s,f)=>s+f[key],0)]));
}

/** Exhaustive search within the same meal role; locks and change budget are hard constraints. */
export function solve(foods, selected, locked, maxChanges=1) {
  if (selected.length!==3 || locked.length!==3 || ![1,2].includes(maxChanges)) throw new Error('Invalid plate constraints');
  const original=totals(selected);
  const objectives=['energyKcal','protein','sodium'];
  /** @type {Record<string,Suggestion|null>} */
  const best=Object.fromEntries(objectives.map(k=>[k,null]));
  const choices=selected.map((food,i)=>locked[i]?[food]:[food,...foods.filter(f=>f.category===food.category && f.id!==food.id)]);
  let examined=0;
  function visit(plate, index, changes) {
    if (index<3) {
      for (const candidate of choices[index]) {
        const next=changes+(candidate.id!==selected[index].id?1:0);
        if(next<=maxChanges) visit([...plate,candidate],index+1,next);
      }
      return;
    }
    if(changes===0) return;
    examined++;
    const total=totals(plate);
    for(const key of objectives) {
      const gain=key==='protein'?total[key]-original[key]:original[key]-total[key];
      if(gain<=0) continue;
      // On equal primary gain prefer fewer changes, then less deterioration in other dimensions.
      const tradeoff=Math.max(0,total.energyKcal-original.energyKcal)/500+Math.max(0,original.protein-total.protein)/25+Math.max(0,total.sodium-original.sodium)/1000;
      const current=best[key];
      if(!current || gain>current.gain || (gain===current.gain && (changes<current.changes || (changes===current.changes && tradeoff<current.tradeoff)))) {
        best[key]={key,foods:[...plate],total,gain,changes,tradeoff};
      }
    }
  }
  visit([],0,0);
  return {original,best,examined};
}

export function encodePlate(selected,locked,changes,candidate) {
  return new URLSearchParams({v:'1',p:selected.map(f=>f.id).join(','),l:locked.map(Boolean).map(Number).join(''),c:String(changes),...(candidate?{s:candidate.map(f=>f.id).join(',')}:{})}).toString();
}

export function decodePlate(hash,foods) {
  const params=new URLSearchParams(hash.replace(/^#/,''));
  if(params.get('v')!=='1') return null;
  const lookup=new Map(foods.map(f=>[f.id,f]));
  const ids=(params.get('p')||'').split(',');
  const locks=params.get('l');const changes=Number(params.get('c'));
  if(ids.length!==3 || ids.some(id=>!lookup.has(id)) || !/^[01]{3}$/.test(locks||'') || ![1,2].includes(changes)) return null;
  const selected=ids.map(id=>lookup.get(id));
  const s=(params.get('s')||'').split(',');
  const candidate=s.length===3&&s.every((id,i)=>lookup.has(id)&&lookup.get(id).category===selected[i].category&&(!(locks[i]==='1')||id===ids[i]))&&s.filter((id,i)=>id!==ids[i]).length<=changes?s.map(id=>lookup.get(id)):null;
  return {selected,locked:locks.split('').map(x=>x==='1'),changes,candidate};
}
