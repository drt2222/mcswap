import './style.css';
import { foodArt, icons } from './art';
import { solve, totals, GROUP_LABELS, encodePlate, decodePlate } from './engine.mjs';

type Food={id:string;name:string;category:string;energyKcal:number;protein:number;fat:number;carbohydrate:number;sodium:number;calcium:number};
type Snapshot={source:{fetchedAt:string;rawCount:number;duplicateCount:number};foods:Food[]};
type Goal='energyKcal'|'protein'|'sodium';
const app=document.querySelector<HTMLDivElement>('#app')!;
const labels:Record<Goal,string>={energyKcal:'能量',protein:'蛋白质',sodium:'钠'};
const units:Record<Goal,string>={energyKcal:'kcal',protein:'g',sodium:'mg'};
const titles:Record<Goal,string>={energyKcal:'少一点能量',protein:'多一点蛋白质',sodium:'少一点钠'};
const keys:Goal[]=['energyKcal','protein','sodium'];
const e=(value:unknown)=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
let data:Snapshot, selected:Food[], locked=[true,false,false], changes=1, active:Goal='energyKcal', custom:Food[]|null=null;
let slot=0, filter='all', search='';
let focusReturn:HTMLElement|null=null;
const date=()=>data.source.fetchedAt.replace('T',' ').slice(0,16);

async function start() {
  app.innerHTML='<div class="loading"><span class="brand-icon">⇄</span><p>正在铺好你的餐盘…</p></div>';
  try {
    const response=await fetch(`${import.meta.env.BASE_URL}data/nutrition.json`);
    if(!response.ok) throw new Error('snapshot unavailable');
    data=await response.json();
    if(!Array.isArray(data.foods)||!data.foods.length||!data.source?.fetchedAt) throw new Error('invalid snapshot');
    selected=['巨无霸','中薯条','可乐中杯'].map(name=>data.foods.find(f=>f.name===name)!);
    if(selected.some(f=>!f)) throw new Error('default plate missing');
    const saved=decodePlate(location.hash,data.foods);
    if(saved){selected=saved.selected;locked=saved.locked;changes=saved.changes;custom=saved.candidate;}
    render();
  } catch {
    app.innerHTML='<div class="loading"><h1>餐品数据暂时没有加载成功</h1><p>请检查连接后重新加载。我们不会用虚构数据替代官方快照。</p><button class="button primary" id="retry">重新加载</button></div>';
    document.querySelector('#retry')?.addEventListener('click',start);
  }
}

function compute() {
  const result=solve(data.foods,selected,locked,changes);
  const suggestion=result.best[active];
  const plate=custom||suggestion?.foods||selected;
  return {...result,plate,total:totals(plate)};
}

function render() {
  const result=compute();
  const favorite=selected.filter((_,i)=>locked[i]).map(f=>f.name);
  const differences=result.plate.map((f:Food,i:number)=>f.id===selected[i].id?null:{from:selected[i],to:f}).filter(Boolean);
  const isSame=differences.length===0;
  app.innerHTML=`
    <a class="skip" href="#lab">跳到餐盘实验室</a>
    <header class="header wrap"><a class="brand" href="./"><span class="brand-icon">${icons.swap}</span><span>麦麦换一换<small>McSWAP</small></span></a><nav aria-label="主导航"><a href="#lab">餐盘实验室</a><button data-action="source">数据来源 <span class="live-dot"></span></button><a class="github" href="https://github.com/drt2222/mcswap" target="_blank" rel="noreferrer">GitHub ↗</a></nav></header>
    <main class="wrap">
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy"><div class="eyebrow"><span class="tiny-rule"></span> A LITTLE SWAP. STILL YOUR FAVOURITE.</div><h1 id="hero-title">心头好，<br><span>不用换。</span><i class="title-star">✳</i></h1><p>锁住最想吃的那一口。<br>只换一两样，看看餐盘会有什么不同。</p><a class="button primary" href="#lab">开始我的换餐实验 ${icons.arrow}</a><div class="hero-note"><span class="live-dot"></span> ${data.foods.length} 款真实餐品数据 · 无需登录，即刻体验</div></div>
        <div class="hero-visual"><span class="visual-label">THE KEEP-YOUR-FAVOURITE CLUB</span><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="hero-burger">${foodArt('巨无霸','main')}</div><div class="keep-sticker">${icons.lock} 这口快乐，保留。</div><div class="hero-drink">${foodArt('可乐中杯','drink')}</div><span class="hero-swap">${icons.swap}</span><div class="hero-tea">${foodArt('锡兰红茶','drink')}</div><div class="visual-caption"><span>01 / 保留喜欢</span><span>02 / 探索变化</span></div></div>
      </section>

      <section id="lab" class="lab" aria-labelledby="lab-title">
        <div class="section-heading"><div><span class="eyebrow">YOUR PLATE, YOUR RULES</span><h2 id="lab-title">今天这盘，你说了算。</h2></div><button class="text-button" data-action="reset">重置餐盘 ↺</button></div>
        <div class="workspace">
          <aside class="builder"><div class="panel-heading"><span class="step">01</span><h3>先选好你的餐盘</h3></div><p class="helper">点餐品可更换，点锁保留心头好。</p>
            <div class="food-list">${selected.map((f,i)=>`<div class="food-row ${locked[i]?'is-locked':''}"><button class="food-select" data-slot="${i}" aria-label="更换第 ${i+1} 样：${e(f.name)}"><span class="food-thumb">${foodArt(f.name,f.category,true)}</span><span><strong>${e(f.name)}</strong><small>${f.energyKcal} kcal · ${e(GROUP_LABELS[f.category as keyof typeof GROUP_LABELS])}</small></span><span class="edit-symbol">↗</span></button><button class="lock-button" data-lock="${i}" aria-label="${locked[i]?'解锁':'锁定'}${e(f.name)}" aria-pressed="${locked[i]}">${locked[i]?icons.lock:icons.unlock}</button></div>`).join('')}</div>
            <div class="change-budget"><label>这次最多换几样？</label><div class="segments" aria-label="替换数量">${[1,2].map(n=>`<button data-changes="${n}" aria-pressed="${changes===n}" class="${changes===n?'selected':''}">${n} 样</button>`).join('')}</div></div>
            <div class="lock-note">${icons.lock}<span>${favorite.length?`已锁住 ${favorite.map(e).join('、')}`:'都可以换，按你的心意来。'}</span></div>
          </aside>

          <div class="comparison"><div class="panel-heading"><span class="step">02</span><h3>${custom?'分享给你的换餐灵感':'看看一小步的变化'}</h3><span class="comparison-tag">${isSame?'原餐盘':`换 ${differences.length} 样`}</span></div>
            <div class="trays"><div class="tray-side"><div class="tray-label">原来的这一盘 <span>BEFORE</span></div><div class="tray before">${selected.map(f=>`<div>${foodArt(f.name,f.category)}<span>${e(f.name)}</span></div>`).join('')}</div></div><span class="tray-arrow">${icons.arrow}</span><div class="tray-side"><div class="tray-label">换一换的这一盘 <span>AFTER</span></div><div class="tray after">${result.plate.map((f:Food,i:number)=>`<div class="${f.id!==selected[i].id?'changed':''}">${foodArt(f.name,f.category)}<span>${e(f.name)}</span>${locked[i]?`<i class="kept">${icons.lock}</i>`:''}</div>`).join('')}</div></div></div>
            <div class="metrics">${keys.map(key=>{const delta=result.total[key]-result.original[key];return `<div class="metric"><span class="metric-label">${labels[key]} <small>${units[key]}</small></span><div class="metric-numbers"><span>${result.original[key]}</span><i>→</i><strong>${result.total[key]}</strong></div><div class="metric-delta ${delta===0?'neutral':''}">${delta===0?'保持不变':`${delta>0?'+':'−'}${Math.abs(delta)} ${units[key]}`}</div></div>`;}).join('')}</div>
            <p class="comparison-explain">${isSame?'当前约束下没有找到该方向的改善方案。可以解锁餐品或选择另一个方向。':differences.map((d:any)=>`${e(d.from.name)} → <strong>${e(d.to.name)}</strong>`).join('；')}</p>
            <div class="comparison-footer"><span>数据按单份相加 · 所有变化一起看</span><button class="button dark" data-action="share" ${isSame?'disabled':''}>保存 / 分享这盘 ${icons.arrow}</button></div>
          </div>
        </div>

        <div class="suggestion-heading"><div><span class="step">03</span><h3>三个方向，没有标准答案。</h3></div><span>在当前约束下比较了 ${result.examined.toLocaleString()} 种替换组合</span></div>
        <div class="suggestions">${keys.map((key,i)=>{const candidate=result.best[key];return `<button class="suggestion ${active===key&&!custom?'active':''}" data-goal="${key}" aria-pressed="${active===key&&!custom}" ${!candidate?'disabled':''}><span class="suggestion-top"><span class="option-number">0${i+1}</span><span class="radio-dot"></span></span><h4>${titles[key]}</h4>${candidate?`<div class="suggestion-value">${key==='protein'?'+':'−'}${candidate.gain}<small>${units[key]}</small></div><p>${candidate.foods.map((f:Food,j:number)=>f.id!==selected[j].id?`${e(selected[j].name)} → ${e(f.name)}`:null).filter(Boolean).join('<br>')}</p><div class="tradeoffs">${keys.filter(k=>k!==key).map(k=>{const d=candidate.total[k]-result.original[k];return `<span>${labels[k]} ${d>0?'+':d<0?'−':''}${Math.abs(d)} ${units[k]}</span>`;}).join('')}</div>`:'<p class="no-result">当前约束下没有改善方案。<br>试试解锁一款餐品。</p>'}<span class="suggestion-bottom">${active===key&&!custom?'正在对比':'查看这一盘'} ${icons.arrow}</span></button>`;}).join('')}</div>
      </section>
    </main>
    <footer class="footer wrap"><div><strong>麦麦换一换 <span>McSWAP</span></strong><p>独立参赛作品，非麦当劳官方产品。仅作信息比较，不构成营养或医疗建议。</p></div><div class="footer-right"><button data-action="source">MCP 数据快照 · ${date()} ↗</button><p>供应以官方实时渠道为准 · 插画为示意图</p></div></footer>
    <dialog id="picker" class="modal picker"><div class="modal-heading"><div><span class="eyebrow">MAKE IT YOURS</span><h2>这一格，放点什么？</h2></div><button class="icon-button" data-close aria-label="关闭餐品选择">${icons.close}</button></div><label class="search-box"><span>⌕</span><input id="food-search" type="search" placeholder="搜索餐品，比如：麦香鱼" autocomplete="off" aria-label="搜索餐品"></label><div class="filters">${[['all','全部'],...Object.entries(GROUP_LABELS)].map(([key,label])=>`<button data-filter="${key}">${label}</button>`).join('')}</div><p class="helper">类别为本项目整理；餐品规格按名称区分，不保证当前在售。</p><div id="picker-grid" class="picker-grid"></div></dialog>
    <dialog id="source" class="modal source"><div class="modal-heading"><h2>每个数字，都有来处。</h2><button class="icon-button" data-close aria-label="关闭数据来源">${icons.close}</button></div><span class="source-badge">官方 MCP · 真实调用快照</span><dl><dt>数据服务</dt><dd>https://mcp.mcd.cn</dd><dt>调用工具</dt><dd>list-nutrition-foods</dd><dt>获取时间</dt><dd>${date()}（北京时间）</dd><dt>数据规模</dt><dd>${data.source.rawCount} 条记录 → ${data.foods.length} 款餐品，合并 ${data.source.duplicateCount} 条完全重复记录</dd></dl><p>数值来自官方 MCP 返回。单位与单份口径参照<a href="https://www.mcdonalds.com.cn/nutrition_calculator" target="_blank" rel="noreferrer">麦当劳官方营养计算器</a>：能量 kcal，蛋白质 / 脂肪 / 碳水 g，钠 / 钙 mg。网页抓取时间不等于配方更新时间。</p><p>网页使用已保存快照，不会读取你的账户或实时门店菜单。类别由本项目按餐品名整理；替换只在同类别内枚举，按所选单一指标优化，数值相同时优先少换、少影响其他指标。供应时段、价格、过敏原和个人需求不在算法判断范围内。</p><p>本地运行 <code>npm run sync</code> 可用自己的 Token 更新。Token 仅在本机脚本中使用，不发送给本网页，不写入构建产物。</p><a class="button primary" href="https://github.com/drt2222/mcswap" target="_blank" rel="noreferrer">查看源码与计算方法 ↗</a></dialog>
    <dialog id="share" class="modal share"><div class="modal-heading"><div><span class="eyebrow">A LITTLE IDEA TO PASS ON</span><h2>你的换餐灵感，打包好了。</h2></div><button class="icon-button" data-close aria-label="关闭分享">${icons.close}</button></div><canvas id="share-canvas" width="1080" height="1180" aria-label="餐盘前后对比分享卡"></canvas><div class="share-actions"><button class="button primary" data-action="download">下载 PNG 卡片 ↓</button><button class="button secondary" data-action="copy">复制餐盘链接 ↗</button></div><p class="helper">链接仅包含餐品选择。朋友打开后可以继续编辑。</p></dialog>
    <div id="toast" role="status" aria-live="polite"></div>`;
  wire();
}

function openDialog(id:string) {
  focusReturn=document.activeElement as HTMLElement;
  const dialog=document.getElementById(id) as HTMLDialogElement;
  dialog.showModal();document.body.style.overflow='hidden';
}
function closeDialog(dialog:HTMLDialogElement) {dialog.close();document.body.style.overflow='';focusReturn?.focus();}
function wire() {
  document.querySelectorAll<HTMLElement>('[data-slot]').forEach(btn=>btn.onclick=()=>{slot=Number(btn.dataset.slot);search='';filter='all';renderPicker();openDialog('picker');document.querySelector<HTMLInputElement>('#food-search')!.focus();});
  document.querySelectorAll<HTMLElement>('[data-lock]').forEach(btn=>btn.onclick=()=>{const index=Number(btn.dataset.lock);locked[index]=!locked[index];custom=null;render();document.querySelector<HTMLElement>(`[data-lock="${index}"]`)!.focus();});
  document.querySelectorAll<HTMLElement>('[data-changes]').forEach(btn=>btn.onclick=()=>{changes=Number(btn.dataset.changes);custom=null;render();document.querySelector<HTMLElement>(`[data-changes="${changes}"]`)!.focus();});
  document.querySelectorAll<HTMLElement>('[data-goal]').forEach(btn=>btn.onclick=()=>{active=btn.dataset.goal as Goal;custom=null;render();document.querySelector<HTMLElement>(`[data-goal="${active}"]`)!.focus();});
  document.querySelectorAll<HTMLElement>('[data-action]').forEach(btn=>btn.onclick=()=>action(btn.dataset.action!));
  document.querySelectorAll<HTMLElement>('[data-close]').forEach(btn=>btn.onclick=()=>closeDialog(btn.closest('dialog')!));
  document.querySelectorAll<HTMLDialogElement>('dialog').forEach(dialog=>{dialog.addEventListener('cancel',ev=>{ev.preventDefault();closeDialog(dialog);});dialog.addEventListener('click',ev=>{if(ev.target===dialog){const rect=dialog.getBoundingClientRect();if(ev.clientX<rect.left||ev.clientX>rect.right||ev.clientY<rect.top||ev.clientY>rect.bottom)closeDialog(dialog);}});});
  document.querySelector<HTMLInputElement>('#food-search')!.oninput=ev=>{search=(ev.target as HTMLInputElement).value;renderPicker();};
  document.querySelectorAll<HTMLElement>('[data-filter]').forEach(btn=>btn.onclick=()=>{filter=btn.dataset.filter!;renderPicker();});
}

function renderPicker() {
  document.querySelectorAll<HTMLElement>('[data-filter]').forEach(btn=>{const current=btn.dataset.filter===filter;btn.classList.toggle('active',current);btn.setAttribute('aria-pressed',String(current));});
  const foods=data.foods.filter(f=>(filter==='all'||f.category===filter)&&f.name.toLowerCase().includes(search.trim().toLowerCase()));
  document.querySelector('#picker-grid')!.innerHTML=foods.length?foods.map(f=>`<button class="picker-food" data-id="${f.id}">${foodArt(f.name,f.category,true)}<strong>${e(f.name)}</strong><small>${f.energyKcal} kcal · 蛋白质 ${f.protein} g</small></button>`).join(''):'<p class="empty">没找到这款餐品，试试更短的关键词。</p>';
  document.querySelectorAll<HTMLElement>('[data-id]').forEach(btn=>btn.onclick=()=>{selected[slot]=data.foods.find(f=>f.id===btn.dataset.id)!;custom=null;closeDialog(document.querySelector('#picker')!);render();document.querySelector<HTMLElement>(`[data-slot="${slot}"]`)!.focus();});
}

function toast(message:string) {const el=document.querySelector('#toast')!;el.textContent=message;el.classList.add('visible');setTimeout(()=>el.classList.remove('visible'),3000);}
async function action(name:string) {
  if(name==='reset') {selected=['巨无霸','中薯条','可乐中杯'].map(n=>data.foods.find(f=>f.name===n)!);locked=[true,false,false];changes=1;active='energyKcal';custom=null;history.replaceState(null,'',location.pathname+location.search);render();document.querySelector<HTMLElement>('[data-action="reset"]')!.focus();}
  if(name==='source') openDialog('source');
  if(name==='share') {openDialog('share');drawShare();}
  if(name==='download') {
    const canvas=document.querySelector<HTMLCanvasElement>('#share-canvas')!;
    canvas.toBlob(blob=>{if(!blob){toast('图片生成失败，请重试');return;}const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='麦麦换一换-我的餐盘.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  }
  if(name==='copy') {
    const url=new URL(location.href);url.hash=encodePlate(selected,locked,changes,compute().plate);
    try{await navigator.clipboard.writeText(url.href);toast('已复制。把这一点灵感分享出去吧。');}catch{toast('浏览器未允许复制，请复制下方链接。');let input=document.querySelector<HTMLInputElement>('#copy-fallback');if(!input){input=document.createElement('input');input.id='copy-fallback';input.className='copy-fallback';input.setAttribute('aria-label','餐盘分享链接');document.querySelector('#share')!.append(input);}input.value=url.href;input.focus();input.select();}
  }
}

function drawShare() {
  const canvas=document.querySelector<HTMLCanvasElement>('#share-canvas')!;const ctx=canvas.getContext('2d')!;
  const r=compute();
  ctx.fillStyle='#faf7ee';ctx.fillRect(0,0,1080,1180);
  ctx.fillStyle='#ffcf3f';ctx.fillRect(0,0,1080,16);
  const text=(t:string,x:number,y:number,size=26,color='#2b2920',weight=400)=>{ctx.fillStyle=color;ctx.font=`${weight} ${size}px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif`;ctx.fillText(t,x,y);};
  text('McSWAP  /  麦麦换一换',64,88,28,'#595749',600);
  text('心头好，不用换。',64,187,66,'#29271f',700);
  text(`最多换 ${changes} 样 · ${locked.filter(Boolean).length} 样心头好已锁住`,68,242,27,'#706c5d');
  ctx.fillStyle='#f0e9d9';ctx.beginPath();ctx.roundRect(48,290,984,390,28);ctx.fill();
  text('原来这一盘',78,344,27,'#797261');text('换一换这一盘',594,344,27,'#797261');
  selected.forEach((f,i)=>{
    const y=410+i*92;
    const fit=(t:string,x:number)=>{let size=30;while(size>18){ctx.font=`600 ${size}px -apple-system, "PingFang SC", sans-serif`;if(ctx.measureText(t).width<355)break;size--;}text(t,x,y,size,'#2b2920',600);};
    fit(f.name,78);fit(r.plate[i].name,594);text('→',510,y,30,'#b09447');
    text(`${f.energyKcal} kcal`,78,y+34,23,'#7d7767');text(`${r.plate[i].energyKcal} kcal${locked[i]?' · 保留':''}`,594,y+34,23,'#7d7767');
  });
  keys.forEach((key,i)=>{const x=76+i*333;const d=r.total[key]-r.original[key];text(labels[key],x,754,25,'#6d685b');text(`${r.original[key]} → ${r.total[key]}`,x,815,37,'#2b2920',700);text(`${d>0?'+':d<0?'−':''}${Math.abs(d)} ${units[key]}`,x,863,26,'#8a4f32',600);});
  ctx.fillStyle='#d9d2c1';ctx.fillRect(64,919,952,1);
  text('小小的改变，也是自己的选择。',64,979,33,'#2b2920',600);
  text(`官方 MCP 营养快照 · ${date()}（北京时间）`,64,1035,23,'#6d685b');
  text('按单份餐品相加。供应以官方渠道为准；非营养或医疗建议。',64,1074,22,'#6d685b');
  text('独立参赛作品 · 非官方产品',64,1114,21,'#6d685b');
  text('github.com/drt2222/mcswap',620,1114,21,'#6d685b');
}

window.addEventListener('hashchange',()=>{if(!data)return;const shared=decodePlate(location.hash,data.foods);if(shared){selected=shared.selected;locked=shared.locked;changes=shared.changes;custom=shared.candidate;render();}});
start();
