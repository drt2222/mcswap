import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeNutrition, unwrapTool } from './nutrition.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
let token=process.env.MCD_MCP_TOKEN;
if(!token) {
  try {
    const env=await readFile(resolve(root,'.env.local'),'utf8');
    token=env.split(/\r?\n/).find(line=>/^MCD_MCP_TOKEN=/.test(line))?.slice('MCD_MCP_TOKEN='.length).trim().replace(/^(['"])(.*)\1$/,'$2');
  } catch {}
}
if(!token) {console.error('请先在 .env.local 中设置 MCD_MCP_TOKEN。不要提交或公开 Token。');process.exit(1);}
let session;let protocol='2025-03-26';let seq=0;
async function rpc(method,params,notification=false) {
  const response=await fetch('https://mcp.mcd.cn',{
    method:'POST',signal:AbortSignal.timeout(30000),
    headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':protocol,...(session?{'Mcp-Session-Id':session}:{})},
    body:JSON.stringify({jsonrpc:'2.0',...(notification?{}:{id:++seq}),method,params})
  });
  if(!response.ok) throw new Error(`MCP HTTP ${response.status}`);
  session=response.headers.get('mcp-session-id')||session;
  const text=await response.text();
  if(notification) return;
  let body;
  if(response.headers.get('content-type')?.includes('text/event-stream')) {
    const messages=text.split(/\r?\n\r?\n/).map(block=>block.split(/\r?\n/).filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n')).filter(Boolean);
    body=messages.map(data=>JSON.parse(data)).find(data=>data.id===seq);
  } else body=JSON.parse(text);
  if(!body||body.id!==seq||body.error) throw new Error('MCP protocol error');
  return body;
}

try {
  const initialized=await rpc('initialize',{protocolVersion:protocol,capabilities:{},clientInfo:{name:'mcswap',version:'0.1.0'}});
  protocol=initialized.result.protocolVersion;
  await rpc('notifications/initialized',{} ,true);
  const listed=await rpc('tools/list',{});
  if(!listed.result?.tools?.some(t=>t.name==='list-nutrition-foods')) throw new Error('Nutrition tool unavailable');
  const response=await rpc('tools/call',{name:'list-nutrition-foods',arguments:{}});
  const snapshot=normalizeNutrition(unwrapTool(response));
  const target=resolve(root,'public/data/nutrition.json');
  await mkdir(resolve(root,'public/data'),{recursive:true});
  await writeFile(target+'.tmp',JSON.stringify(snapshot,null,2)+'\n');
  await rename(target+'.tmp',target);
  console.log(`MCP 同步成功：${snapshot.source.rawCount} 条原始记录，${snapshot.foods.length} 款去重餐品。只保存餐品营养字段。`);
} catch(error) {
  // Never print response bodies, request headers or arbitrary network errors.
  const safe=/^(MCP |Nutrition |Unsupported |Expected |Invalid |Missing |Conflicting |Product |Unclosed )/.test(error.message)?error.message:'Connection or response validation failed';
  console.error(`同步失败：${safe}。原有快照未覆盖。`);process.exitCode=1;
}
