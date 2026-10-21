// Original vector illustrations; symbolic meal icons, not product photographs.
export function foodArt(name: string, group: string, small=false) {
  let drawing='';
  let motion='snack';
  if(group==='main'||group==='breakfast') {
    motion='burger';
    drawing=`<ellipse cx="100" cy="154" rx="72" ry="9" fill="#3c2815" opacity=".1"/>
    <path d="M34 126h132l-6 20q-60 20-120 0z" fill="#d68931"/><path d="M33 123q67-15 134 0v13H33z" fill="#f0b351"/>
    <rect x="30" y="111" width="140" height="17" rx="8" fill="#673c23"/>
    <path d="M31 106l21-9 22 7 22-8 23 8 22-9 27 11-8 10-20-4-21 7-23-7-22 6-23-7-15 5z" fill="#80a34c"/>
    <path d="M32 88h136v16H32z" fill="#e5a149"/><rect x="30" y="79" width="140" height="15" rx="7" fill="#7c4526"/>
    <path d="M36 76h128l-38 21-36-17-28 12z" fill="#ffdb4a"/>
    <g class="burger-top"><path d="M31 72c2-65 136-65 138 0q-67 18-138 0z" fill="#edaf57"/><path d="M37 59c20-40 105-42 126 0" fill="none" stroke="#f8cb78" stroke-width="6"/>
    <g stroke="#fff0be" stroke-width="4" stroke-linecap="round"><path d="m62 47 5 2m29-11 5 2m29 6 5-1m-51 12 5-1m30 5 5-1"/></g></g>`;
  } else if(/薯条/.test(name)) {
    motion='fries';
    drawing=`<ellipse cx="100" cy="160" rx="54" ry="8" fill="#3c2815" opacity=".1"/>
    <g class="fries-tips" fill="#f9c74e" stroke="#e6a632" stroke-width="2"><path d="m51 106-8-67 12-2 8 69z"/><path d="m65 107-5-88 13-1 5 89z"/><path d="m83 108-1-76 13-1 1 77z"/><path d="m102 109 7-91 13 1-8 91z"/><path d="m121 112 13-80 13 3-14 79z"/><path d="m141 110 10-55 13 3-12 55z"/></g>
    <path d="M41 83q59 32 118 0l-13 69q-46 15-92 0z" fill="#bf4934"/><path d="M54 99q45 20 92 0l-9 43q-38 9-74 0z" fill="#d75c40"/>
    <path d="m85 116 15-7 15 7m-30 15 15 7 15-7" stroke="#ffdb75" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  } else if(/玉米/.test(name)) {
    drawing=`<ellipse cx="100" cy="155" rx="51" ry="8" fill="#3c2815" opacity=".1"/><path d="M45 64h110l-13 83q-42 19-84 0z" fill="#f5eee0"/><ellipse cx="100" cy="66" rx="55" ry="24" fill="#dac79a"/><g fill="#efbc38">${Array.from({length:22},(_,i)=>`<ellipse cx="${61+(i%6)*15}" cy="${49+Math.floor(i/6)*10}" rx="8" ry="6"/>`).join('')}</g><path d="M75 105q25 16 50 0" fill="none" stroke="#9cb55d" stroke-width="7" stroke-linecap="round"/>`;
  } else if(/苹果片/.test(name)) {
    drawing=`<ellipse cx="100" cy="147" rx="71" ry="15" fill="#e7dfca"/><g stroke="#b94b38" stroke-width="7" stroke-linejoin="round"><path d="M35 78q0 70 65 65L71 62z" fill="#fff1cc"/><path d="M73 64q0 70 65 65l-29-81z" fill="#fff3d4"/><path d="M110 69q0 62 56 58l-25-72z" fill="#fff1cc"/></g><path d="m85 82 5 9m32-7 5 10" stroke="#a97e4d" stroke-width="4" stroke-linecap="round"/>`;
  } else if(group==='drink') {
    motion='drink';
    const clear=/纯悦|茶|美式|鲜萃咖啡|浓缩/.test(name);
    const milk=/奶|豆浆|巧|雪冰/.test(name);
    drawing=`<ellipse cx="100" cy="160" rx="43" ry="8" fill="#3c2815" opacity=".1"/><path d="m113 17 8-13 15 3" fill="none" stroke="#cc795b" stroke-width="6" stroke-linecap="round"/><path d="m113 17-13 96" stroke="#cc795b" stroke-width="6"/>
    <path d="M55 44h90l-11 107q-34 13-68 0z" fill="${clear?'#c4d9d0':milk?'#e9d0a5':'#b54834'}"/><path d="m62 51 9 94" stroke="white" opacity=".35" stroke-width="6"/>
    <ellipse cx="100" cy="44" rx="45" ry="9" fill="${clear?'#e2ede5':'#f6e9cc'}"/><path d="m110 41 3-24" stroke="#cc795b" stroke-width="6"/>
    <circle cx="101" cy="100" r="23" fill="${clear?'#f4f5da':'#ffdb75'}"/><path d="m89 96 12-6 12 6m-24 10 12 6 12-6" stroke="${clear?'#678774':'#a44f35'}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  } else if(group==='dessert') {
    motion='dessert';
    drawing=`<ellipse cx="100" cy="160" rx="42" ry="8" fill="#3c2815" opacity=".1"/><path d="m64 86 36 73 36-73z" fill="#dca15b"/><path d="m76 100 36 36m-21-41 28 28m6-21-36 28m21-35-28 21" stroke="#c68d47" stroke-width="3"/><path d="M59 87q-8-20 16-27-9-15 16-23-3-12 15-20-1 20 17 28 17 9 10 21 20 8 9 23z" fill="#f8e9cf"/><path d="M68 74q30 15 62-5M83 52q18 10 35-5" fill="none" stroke="#e6d4b4" stroke-width="5" stroke-linecap="round"/>`;
  } else {
    drawing=`<ellipse cx="100" cy="144" rx="74" ry="22" fill="#eee6d4"/><ellipse cx="100" cy="140" rx="59" ry="13" fill="#d8c8a9"/><g fill="#d29649" stroke="#bc7d37" stroke-width="3"><path d="M42 116q-7-25 20-32 25-4 30 19 4 22-22 27z"/><path d="M92 103q-3-28 25-32 24 1 27 25-1 25-26 25z"/><path d="M78 132q-8-25 17-29 22-2 30 19 2 23-22 24z"/></g><g fill="#f2c274"><circle cx="57" cy="103" r="3"/><circle cx="72" cy="115" r="3"/><circle cx="113" cy="89" r="3"/><circle cx="101" cy="122" r="3"/></g>`;
  }
  // Keep the ground shadow still while the sticker moves inside its SVG frame.
  const shadowEnd=drawing.indexOf('/>')+2;
  const bubbles=motion==='drink'?'<g class="drink-bubbles" fill="#f5dc98"><circle cx="72" cy="31" r="4"/><circle cx="90" cy="23" r="3"/><circle cx="132" cy="28" r="3.5"/></g>':'';
  return `<svg viewBox="0 0 200 180" class="food-art food-${motion} ${small?'small':''}" aria-hidden="true">${drawing.slice(0,shadowEnd)}<g class="food-motion">${drawing.slice(shadowEnd)}${bubbles}</g></svg>`;
}

export const icons={
 swap:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16l-4-4M20 17H4l4 4"/></svg>',
 lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><rect x="6" y="10" width="12" height="10" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v2"/></svg>',
 unlock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><rect x="6" y="10" width="12" height="10" rx="3"/><path d="M8 10V7a4 4 0 0 1 7.5-2m-3.5 9v2"/></svg>',
 arrow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg>',
 close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg>'
};
