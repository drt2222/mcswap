import { createHash } from 'node:crypto';
import { category, METRICS } from '../src/engine.mjs';

export function unwrapTool(response) {
  if(response.error || response.result?.isError) throw new Error('MCP returned an error');
  let payload=response.result?.structuredContent;
  if(!payload) {
    const text=response.result?.content?.filter(c=>c.type==='text').map(c=>c.text).join('\n') || '';
    const start=text.indexOf('## Original Response');
    try {payload=JSON.parse(start>=0?text.slice(start+'## Original Response'.length).trim():text);} catch {throw new Error('Unsupported MCP response format');}
  }
  if(payload?.success!==true || payload?.code!==200) throw new Error('MCP business request failed');
  return payload;
}

function parseCsv(line) {
  const cells=[];let cell='',quoted=false;
  for(let i=0;i<line.length;i++) {
    const ch=line[i];
    if(ch==='"') {if(quoted&&line[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
    else if(ch===','&&!quoted){cells.push(cell);cell='';}else cell+=ch;
  }
  if(quoted) throw new Error('Unclosed quote in nutrition row');
  cells.push(cell);return cells;
}

export function normalizeNutrition(payload) {
  if(typeof payload.data!=='string') throw new Error('Expected tabular nutrition data');
  const lines=payload.data.trim().split(/\r?\n/);
  const match=lines.shift().match(/^\[(\d+)\]\{([^}]+)\}:$/);
  if(!match) throw new Error('Unsupported nutrition table header');
  const keys=match[2].split(',');
  const required=['productName','energyKj',...METRICS];
  if(required.some(key=>!keys.includes(key)) || new Set(keys).size!==keys.length) throw new Error('Nutrition fields missing or duplicated');
  if(!/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(payload.datetime||'')) throw new Error('Invalid nutrition timestamp');
  if(lines.length!==Number(match[1])) throw new Error('Nutrition row count mismatch');
  const seen=new Map();let duplicates=0;
  for(const line of lines) {
    const values=parseCsv(line.trim());
    if(values.length!==keys.length) throw new Error('Nutrition column count mismatch');
    const row=Object.fromEntries(keys.map((key,i)=>[key,values[i]]));
    if(!row.productName.trim()) throw new Error('Product name missing');
    const food={id:createHash('sha256').update(row.productName).digest('hex').slice(0,12),name:row.productName,category:category(row.productName)};
    for(const key of ['energyKj',...METRICS]) {
      if(row[key].trim()==='' || row[key]==='null') throw new Error('Missing nutrition value');
      const value=Number(row[key]);
      if(!Number.isFinite(value)||value<0) throw new Error('Invalid nutrition value');
      food[key]=value;
    }
    if(seen.has(food.name)) {
      if(JSON.stringify(seen.get(food.name))!==JSON.stringify(food)) throw new Error('Conflicting duplicate product');
      duplicates++;
    } else seen.set(food.name,food);
  }
  return {
    source:{endpoint:'https://mcp.mcd.cn',tool:'list-nutrition-foods',fetchedAt:payload.datetime.replace(' ','T')+'+08:00',rawCount:Number(match[1]),duplicateCount:duplicates,unitReference:'https://www.mcdonalds.com.cn/nutrition_calculator',units:{energyKj:'kJ',energyKcal:'kcal',protein:'g',fat:'g',carbohydrate:'g',sodium:'mg',calcium:'mg'},note:'官方 MCP 营养数据快照。按接口餐品规格逐份计算；不代表门店当前在售。'},
    foods:[...seen.values()]
  };
}
