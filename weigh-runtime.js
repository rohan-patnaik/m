let dailyWeights={},weighContext=null;
const DISH_NAMES={sabzi:'Sabzi',dal:'Dal',prot:'Dinner paneer/soya'};
function weighSpecs(i,dish,scope='all'){
 const day=state.days[i],servings=[];
 for(const meal of ['l','d'])for(const person of ['w','h']){
  if(scope!=='all'&&scope!==meal||!kept(day,meal))continue;
  let factor=0;
  if(dish==='sabzi'&&!coveredComponent(day,meal,person,'sabzi'))factor=sabShare(day,person,meal);
  if(dish==='dal')factor=dalShare(person);
  if(dish==='prot'&&meal==='d'&&!NO_EXTRA(day.s)&&!coveredComponent(day,meal,person,'protein'))factor=protein(day.p,person,day)[0].q;
  if(factor>0)servings.push({meal,person,factor});
 }
 return servings;
}
function weighBasis(i,dish,scope){const d=state.days[i];return JSON.stringify({recipe:dish==='sabzi'?d.s:dish==='dal'?d.dal:d.p,servings:weighSpecs(i,dish,scope)});}
function currentWeigh(i,dish){if(!state.weekKey)return null;const r=dailyWeights[dateForDay(i)+'/'+dish];return r&&r.basis===weighBasis(i,dish,r.scope)?r:null;}
function weighedNotes(i,meal){if(!state.weekKey||!['l','d'].includes(meal))return '';const rows=[];
 for(const dish of Object.keys(DISH_NAMES)){
  const raw=dailyWeights[dateForDay(i)+'/'+dish],r=currentWeigh(i,dish);if(!raw)continue;
  if(!r){rows.push(`<button class="weighed-note" data-weigh="${i}" data-weigh-meal="${meal}">${DISH_NAMES[dish]}: plan changed — update portions</button>`);continue;}
  const portions=r.portions.filter(s=>s.meal===meal);if(!portions.length)continue;
  rows.push(`<button class="weighed-note" data-weigh="${i}" data-weigh-meal="${meal}"><b>${DISH_NAMES[dish]}</b> ${portions.map(s=>`${PERSON_NAMES[s.person]} ${s.grams} g`).join(' · ')}</button>`);
 }
 return rows.length?`<div class="weighed-notes">${rows.join('')}</div>`:'';
}
function weighResults(r){
 let left=r.netWeight;const rows=[];
 for(const meal of ['l','d']){const list=r.portions.filter(s=>s.meal===meal);if(!list.length)continue;left-=list.reduce((n,s)=>n+s.grams,0);rows.push(`<tr><th>${MEAL_NAMES[meal]}</th>${['w','h'].map(p=>`<td>${list.find(s=>s.person===p)?.grams??'—'}${list.some(s=>s.person===p)?' g':''}</td>`).join('')}<td>${left} g</td></tr>`);}
 return `<div class="weigh-net"><strong>${r.netWeight} g food</strong><span>${r.gross} g scale − ${r.tare} g empty vessel</span></div><table class="weigh-portions"><thead><tr><th>Meal</th><th>Wife</th><th>Husband</th><th>Food left</th></tr></thead><tbody>${rows.join('')}</tbody></table><details class="weigh-steps"><summary>Expected scale after serving</summary>${['l','d'].map(m=>{const steps=WeighMath.servingSteps(r,m);return steps.length?`<p><b>${MEAL_NAMES[m]}</b></p>${steps.map(s=>`<div>Serve ${PERSON_NAMES[s.person]} <b>${s.grams} g</b><span>Scale <b>${s.scaleLeft} g</b> · food left ${s.foodLeft} g</span></div>`).join('')}`:'';}).join('')}<p class="hintline">Expected readings include the vessel above. Lunch comes first, then dinner. These are serving guides, not logged amounts eaten.</p></details>`;
}
function readWeighCard(card){
 const dish=card.dataset.weighDish,i=weighContext.i,scope=card.querySelector('[data-weigh-scope]').value,servings=weighSpecs(i,dish,scope);
 if(!servings.length)throw Error('No fresh portions for this selection. Use the prepared batch portions.');
 const input=card.querySelector('[data-weigh-gross]');if(input.value==='')return null;
 const gross=Number(input.value),vessel=card.querySelector('[data-weigh-vessel]').value;
 const includes=card.querySelector('[data-weigh-includes]').checked;
 const prior=dailyWeights[weighContext.date+'/'+dish];
 const tare=includes?(card.dataset.originalTare!==undefined&&prior?.vessel===vessel?Number(card.dataset.originalTare):state.utensils[vessel]||0):0;
 if(includes&&!tare)throw Error('Set this vessel’s empty weight in Utensils, or enter food-only weight.');
 const allocated=WeighMath.allocateFood(gross,tare,servings);
 const r={gross,tare,vessel,scope,...allocated,basis:weighBasis(i,dish,scope),savedAt:Date.now()};
 WeighMath.validateWeighRecord('weigh/'+weighContext.date+'/'+dish,r);return r;
}
function refreshWeighCard(card){const vessel=card.querySelector('[data-weigh-vessel]').value,scope=card.querySelector('[data-weigh-scope]'),includes=card.querySelector('[data-weigh-includes]').checked;const tare=includes?Number(card.dataset.originalTare??state.utensils[vessel]??0):0;card.querySelector('[data-weigh-caption]').textContent=UT_NAMES[vessel]+(tare?' ('+tare+' g empty)':'')+' · '+scope.selectedOptions[0].textContent;card.querySelector('[data-weigh-reading-label]').textContent=includes?'Whole batch + vessel on scale':'Whole cooked batch, food only';const output=card.querySelector('[data-weigh-output]');try{const r=readWeighCard(card);output.innerHTML=r?weighResults(r):'<p class="hintline">Enter the whole cooked batch weight once.</p>';card.dataset.invalid='';}catch(e){output.innerHTML=`<p role="alert" class="weigh-error">${esc(e.message)}</p>`;card.dataset.invalid='true';}}
function openWeigh(i,meal='l'){
 if(!cloudReady)return;
 save();weighContext={i,date:dateForDay(i),meal};document.querySelector('#dlgTitle').textContent='Weigh & serve · '+fmtMon(weighContext.date);
 const cards=[];
 for(const dish of Object.keys(DISH_NAMES)){
  if(!weighSpecs(i,dish).length)continue;
  const r=dailyWeights[weighContext.date+'/'+dish],vessel=r?.vessel||utDayAt(i)[dish==='prot'?'prot':dish],weight=state.utensils[vessel]||0;
  const stale=r&&r.basis!==weighBasis(i,dish,r.scope);
  const scopeOpts=dish==='prot'?'<option value="d">Dinner</option>':[['all','Lunch + dinner'],['l','Lunch only'],['d','Dinner only']].map(([v,n])=>`<option value="${v}"${(r?.scope||'all')===v?' selected':''}>${n}</option>`).join('');
  const card=`<section class="weigh-card" data-weigh-dish="${dish}"${r?.tare>0?` data-original-tare="${r.tare}"`:''}><h3>${DISH_NAMES[dish]}</h3><p class="weigh-vessel" data-weigh-caption></p><div class="weigh-fields"><label class="weigh-reading"><span data-weigh-reading-label>Whole batch scale reading</span><input data-weigh-gross type="number" min="1" max="150000" step="1" inputmode="decimal" value="${r?.gross??''}"><span class="weigh-unit">grams</span></label><details class="weigh-options"><summary>Change vessel or meals</summary><label>Cooked for<select data-weigh-scope>${scopeOpts}</select></label><label>Vessel<select data-weigh-vessel>${utOpts(vessel)}</select></label><label class="weigh-includes"><input type="checkbox" data-weigh-includes${r?r.tare>0?' checked':'':weight?' checked':''}> Includes empty vessel</label></details></div>${weight?'':`<p class="hintline">Empty vessel weight missing. <button class="text-btn" data-weigh-utensils>Set it once</button>, or enter food-only weight.</p>`}${stale?'<p class="weigh-error">The plan changed. Review and save the updated portions.</p>':''}<div data-weigh-output></div>${r?'<button class="text-btn" data-weigh-clear>Clear saved weight</button>':''}</section>`;
  cards.push(dish==='prot'?`<details class="weigh-protein"${meal==='d'||r?' open':''}><summary>Separate dinner paneer/soya</summary>${card}</details>`:card);
 }
 const prepared=batchCookGroups(i).filter(g=>g[0].startsWith('Already prepared'));
 document.querySelector('#dlgBody').innerHTML=`<p class="hintline">Weigh each dish separately. Lunch + dinner means the full batch for both meals.</p>${cards.join('')}${prepared.map(g=>`<details class="explanation"><summary>${esc(g[0])}</summary>${g[1].map(x=>`<p>${esc(x)}</p>`).join('')}</details>`).join('')}${!cards.length&&!prepared.length?'<p>No home meals to weigh today.</p>':''}<p class="hintline">Portions follow your saved diet plans. Cooked weight does not change calories.</p><div class="editbtns weigh-actions"><button data-weigh-close>Close</button>${cards.length?'<button class="primary" data-weigh-save>Save weights</button>':''}</div><p data-weigh-status role="status"></p>`;
 document.querySelectorAll('[data-weigh-dish]').forEach(refreshWeighCard);document.querySelector('#dlg').showModal();
}
async function saveDailyWeights(){
 if(!cloudReady)return;
 const status=document.querySelector('[data-weigh-status]'),button=document.querySelector('[data-weigh-save]');button.disabled=true;
 try{
  const staged=[];for(const card of document.querySelectorAll('[data-weigh-dish]')){if(card.dataset.clear==='true')staged.push([card.dataset.weighDish,null]);else{const r=readWeighCard(card);if(r)staged.push([card.dataset.weighDish,r]);}}
  if(!staged.length)throw Error('Enter at least one cooked weight.');
  const mon=mondayOf(weighContext.date);if(!lockedWeeks[mon])lockedWeeks[mon]={days:structuredClone(state.days),utDay:structuredClone(state.utDay),savedAt:Date.now()};
  for(const [dish,r]of staged){const key=weighContext.date+'/'+dish;if(r)dailyWeights[key]=r;else delete dailyWeights[key];}
  save();selectWeek(mon);render();const ok=await saveChanges();status.textContent=ok?'Weights saved.':syncStatusText;
 }catch(e){status.textContent=e.message;}finally{button.disabled=false;}
}
document.addEventListener('input',e=>{const card=e.target.closest('[data-weigh-dish]');if(card&&e.target.hasAttribute('data-weigh-gross')){delete card.dataset.clear;refreshWeighCard(card);}});
document.addEventListener('change',e=>{const card=e.target.closest('[data-weigh-dish]');if(card){if(e.target.hasAttribute('data-weigh-vessel'))delete card.dataset.originalTare;refreshWeighCard(card);}});
document.addEventListener('click',async e=>{
 const open=e.target.closest('[data-weigh]');if(open)openWeigh(Number(open.dataset.weigh),open.dataset.weighMeal||'l');
 if(e.target.closest('[data-weigh-close]'))document.querySelector('#dlg').close();
 if(e.target.closest('[data-weigh-save]'))await saveDailyWeights();
 const clear=e.target.closest('[data-weigh-clear]');if(clear){const card=clear.closest('[data-weigh-dish]');card.dataset.clear='true';card.querySelector('[data-weigh-gross]').value='';refreshWeighCard(card);}
 if(e.target.closest('[data-weigh-utensils]')){document.querySelector('#dlg').close();document.querySelector('#utensils').scrollIntoView({behavior:'smooth'});}
});

let savingUtensils=false,utensilsQueued=false;
async function persistGlobalUtensils(){
 utensilsQueued=true;if(savingUtensils)return;savingUtensils=true;
 try{while(utensilsQueued){utensilsQueued=false;if(!await saveChanges())break;}}finally{savingUtensils=false;}
}
