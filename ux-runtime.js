// Presentation and shared checklists; meal quantities still come from the existing ledger.
let activityRecords={},uxRoute='today',uxHideBought=false,uxSaveTimer;
const UX_MEALS={b:'Breakfast',l:'Lunch',d:'Dinner'};
const UX_ICONS={today:'<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/>',week:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18"/>',shop:'<path d="M3 3h2l3 12h11l2-8H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>',settings:'<path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3z"/><circle cx="12" cy="12" r="3"/>'};
function uxIcon(name){return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${UX_ICONS[name]}</svg>`;}
function uxDietName(p){return isKeto(p)?'Keto draft':'Balanced';}
function uxDietChips(){return `<div class="ux-diet-chips">${['w','h'].map(p=>`<a href="#week">${PERSON_NAMES[p]} <span>${uxDietName(p)}</span></a>`).join('')}</div>`;}
function uxWarning(i){const people=['w','h'].filter(isKeto),warnings=[];for(const p of people){const t=assignedDayNutrition(i,p);if(!t.k)continue;if(t.aHi>ketoOptions.carbBudget)warnings.push(`${PERSON_NAMES[p]}: carb budget needs review`);else if(t.carbUnknown)warnings.push(`${PERSON_NAMES[p]}: carb check unverified`);}return warnings.length?`<div class="ux-warning" role="status"><span aria-hidden="true">⚠</span> ${warnings.map(esc).join('; ')} <a href="#keto">Review</a></div>`:'';}
function uxCurrentIndex(){return (new Date(dayViewISO()+'T12:00:00').getDay()+6)%7;}
function uxMealName(i,p,m){const day=state.days[i];return isKeto(p)?ketoSuggestion(day,p,m).name:assignedBalancedTitle(day,p,m);}
function uxMealBasis(i,m){return JSON.stringify(['w','h'].map(p=>meal(state.days[i],m,p)));}
function uxMealDone(i,m){const r=activityRecords[`done/${dayViewISO()}/${m}`];return !!r?.complete&&r.basis===uxMealBasis(i,m);}
function uxCookedNotes(i,m){
 const d=state.days[i],date=dayViewISO(),rows=[];
 for(const dish of Object.keys(DISH_NAMES)){const r=currentWeigh(i,dish);if(r){const portions=r.portions.filter(s=>s.meal===m);if(portions.length)rows.push(`<div><span>${esc(weighDishName(i,dish))}</span><b>${portions.map(s=>PERSON_NAMES[s.person]+' '+s.grams+' g').join(' · ')}</b></div>`);}}
 for(const p of ['w','h'])for(const c of ['sabzi','protein']){const link=batchLink(date,m,p,c);if(link)rows.push(`<div><span>${esc(batchName(link.batch))}</span><b>${PERSON_NAMES[p]} ${link.serving.grams} g</b></div>`);}
 return rows.length?`<div class="ux-portions">${rows.join('')}</div>`:'';
}
function uxNutrition(i){return `<details class="ux-disclosure"><summary>Nutrition details</summary><div class="ux-nutrition">${['w','h'].map(p=>{const t=assignedDayNutrition(i,p);return `<section><h3>${PERSON_NAMES[p]}</h3><strong>${R(t.k)} kcal</strong><p>${F(t.p)} g protein · ${F(t.fb)} g counted fibre</p><p>${F(t.aHi)} g counted carbs · ${F(t.c)} g estimated total carbs</p>${isKeto(p)?`<ul>${dailyPlanChecks(t,p).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}</section>`;}).join('')}</div><a href="#keto">Compare diets and review targets</a></details>`;}
function uxMealHTML(i,m,open){
 const day=state.days[i],done=uxMealDone(i,m),planned=kept(day,m),notes=uxCookedNotes(i,m);
 const same=personRecipe(day,'w')===personRecipe(day,'h'),title=m==='b'?'':same?recipeName(personRecipe(day,'w')):'Individual sabzis';
 const hasLunchWeight=m==='d'&&Object.keys(DISH_NAMES).some(dish=>currentWeigh(i,dish)?.scope==='all'&&currentWeigh(i,dish)?.portions.some(s=>s.meal==='d'));
 return `<details class="ux-meal" data-ux-meal="${m}"${open?' open':''}><summary><span>${done?'<span class="ux-check" aria-label="Complete">✓</span>':''}${UX_MEALS[m]}${!planned?'<small>Eating out / skipped</small>':done?'<small>Complete</small>':title?`<small>${esc(title)}</small>`:''}</span></summary><div class="ux-meal-body">${planned?`${hasLunchWeight?'<p class="ux-reserved">Reserved from the batch weighed at lunch</p>':''}<div class="ux-person-meals">${['w','h'].map(p=>`<section><h3>${PERSON_NAMES[p]} <span>${uxDietName(p)}</span></h3><p>${esc(uxMealName(i,p,m))}</p></section>`).join('')}</div>${notes}${m==='b'?`<button class="primary ux-primary" data-ux-done="${m}">${done?'Mark incomplete':'Mark complete'}</button>`:`<button class="primary ux-primary" data-weigh="${i}" data-weigh-meal="${m}">Weigh &amp; serve</button>`}<div class="ux-meal-links"><button class="text-btn" data-cook="${i}">Cook list</button><button class="text-btn" data-ing="${i},${m}">Ingredients &amp; nutrition</button>${m!=='b'?`<button class="text-btn" data-ux-done="${m}">${done?'Mark incomplete':'Mark complete'}</button>`:''}</div>`:'<p>Home-food quantities are excluded. Restaurant intake is unknown.</p>'}</div></details>`;
}
function renderToday(){
 const el=document.querySelector('#todayPage');if(!el)return;
 const openInfo=new Set([...el.querySelectorAll('.ux-disclosure[open]')].map(x=>x.querySelector('summary').textContent));
 const open=new Set([...el.querySelectorAll('[data-ux-meal][open]')].map(x=>x.dataset.uxMeal)),sameDate=el.dataset.date===dayViewISO();el.dataset.date=dayViewISO();
 const i=uxCurrentIndex(),date=new Date(dayViewISO()+'T12:00:00'),dateText=date.toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'});
 const hour=new Date().getHours(),preferred=dayOff===0?(hour<11?'b':hour<17?'l':'d'):'l';
 const next=[preferred,...['b','l','d'].filter(m=>m!==preferred)].find(m=>kept(state.days[i],m)&&!uxMealDone(i,m));
 el.innerHTML=`<div class="ux-day-heading"><button data-daynav="-1" aria-label="Previous day">‹</button><h2>${esc(dateText)}</h2><button data-daynav="1" aria-label="Next day">›</button></div>${dayOff!==0?'<button class="text-btn ux-back-today" data-daynav="0">Back to today</button>':''}<div class="ux-context">${uxDietChips()}${uxWarning(i)}</div>${!lockedWeeks[mondayOf(dayViewISO())]?'<p class="ux-note">No saved week for this date. Showing the template; saving a meal creates its week.</p>':''}<div class="ux-today-meals">${['b','l','d'].map(m=>uxMealHTML(i,m,sameDate&&[...open].some(x=>!uxMealDone(i,x))?open.has(m)&&!uxMealDone(i,m):m===next)).join('')}</div><div class="ux-day-tools"><button class="text-btn" data-edit="${i}">Edit day</button><button class="text-btn" data-batch-add="${i}">Cook a batch</button></div>${uxNutrition(i)}${['w','h'].some(p=>meal(state.days[i],'e',p).length)?`<details class="ux-disclosure"><summary>Other planned food</summary>${['w','h'].map(p=>`<p><b>${PERSON_NAMES[p]}</b> ${meal(state.days[i],'e',p).filter(x=>x.q>0).map(x=>esc(DB[x.id][0])+' '+F(x.q)+' '+DB[x.id][3]).join(', ')||'None'}</p>`).join('')}</details>`:''}`;
 if(sameDate)el.querySelectorAll('.ux-disclosure').forEach(x=>x.open=openInfo.has(x.querySelector('summary').textContent));
}
function uxRecipeOptions(selected){return Object.entries({...SABZIS,...KETO_SHARED}).map(([id,name])=>`<option value="${id}"${id===selected?' selected':''}>${esc(name)}</option>`).join('');}
function uxWeekRow(day,i){const r=sharedRecipes[sharedKey(i)]||{},shared=sharedRecipe(day),date=state.weekKey?fmtMon(dateForDay(i)):'';return `<div class="ux-week-row${r.w||r.h?' ux-row-expanded':''}" data-ux-week-day="${i}"><div class="ux-week-date"><b>${DAYS[i]}</b><small>${date}</small><button class="text-btn" data-ux-open-day="${i}">View day</button><button class="text-btn ux-expand-row" data-ux-expand-row="${i}" aria-expanded="${!!(r.w||r.h)}">Choices</button></div><label><span class="ux-mobile-label">Shared sabzi</span><select aria-label="${DAYS[i]} shared sabzi" data-ux-recipe="${i}" data-ux-person="shared"><option value="original"${!r.recipe?' selected':''}>${esc(SABZIS[day.s])}</option>${uxRecipeOptions(r.recipe)}</select></label>${['w','h'].map(p=>`<label class="${r[p]?'ux-exception':''}"><span class="ux-mobile-label">${PERSON_NAMES[p]}</span><select aria-label="${DAYS[i]} ${PERSON_NAMES[p]} sabzi" data-ux-recipe="${i}" data-ux-person="${p}"><option value="shared"${!r[p]?' selected':''}>Shared</option>${uxRecipeOptions(r[p])}</select>${isKeto(p)&&['S6','S7','S10','S11'].includes(personRecipe(day,p))?'<small class="ux-recipe-warning">Review higher-carb recipe</small>':''}</label>`).join('')}</div>`;}
function renderWeek(){
 const el=document.querySelector('#weekPage');if(!el)return;
 const mon=state.weekKey||mondayOf(dayViewISO());
 const openDetails=new Set([...el.querySelectorAll('.ux-disclosure[open]')].map(x=>x.querySelector('summary').textContent));
 const openEdits=new Set([...el.querySelectorAll('[data-keto-edit][open]')].map(x=>x.dataset.ketoEdit));
 const expanded=new Set([...el.querySelectorAll('.ux-row-expanded')].map(x=>x.dataset.uxWeekDay));
 el.innerHTML=`<div class="ux-section-heading"><div class="ux-week-nav"><button data-ux-week-shift="-1" aria-label="Previous week">‹</button><button class="text-btn" id="uxCalendar" data-ux-calendar><h2>${state.weekKey?fmtMon(mon)+' – '+fmtMon(addDate(mon,6)):'Week template'}</h2></button><button data-ux-week-shift="1" aria-label="Next week">›</button></div><button class="primary" data-batch-add="${uxCurrentIndex()}">Cook a batch</button></div><div class="ux-assignments">${['w','h'].map(p=>`<label>${PERSON_NAMES[p]}<select data-ux-diet="${p}" aria-label="${PERSON_NAMES[p]} diet"><option value="balanced"${!isKeto(p)?' selected':''}>Balanced</option><option value="keto"${isKeto(p)?' selected':''}>Keto draft</option></select></label>`).join('')}</div>${['w','h'].filter(isKeto).map(p=>{const count=state.days.filter((_,i)=>{const t=assignedDayNutrition(i,p);return t.k&&(t.aHi>ketoOptions.carbBudget||t.carbUnknown);}).length;return count?`<div class="ux-warning">⚠ ${PERSON_NAMES[p]}: ${count} days need carb review <a href="#keto">Review</a></div>`:'';}).join('')}<div class="ux-week-table"><div class="ux-week-columns"><span>Day</span><span>Shared sabzi</span><span>Wife</span><span>Husband</span></div>${state.days.map(uxWeekRow).join('')}</div><details class="ux-disclosure"><summary>Meals and protein portions</summary>${state.days.map((d,i)=>`<div class="ux-week-detail"><h3>${DAYS[i]}</h3><div class="ux-week-detail-actions"><button data-edit="${i}">Edit meals</button><button data-cook="${i}">Cook list</button></div>${['w','h'].map(p=>`<section><b>${PERSON_NAMES[p]}</b>${['b','l','d'].map(m=>`<p>${UX_MEALS[m]}: ${esc(uxMealName(i,p,m))}</p>${isKeto(p)?ketoEditHTML(d,i,p,m):''}`).join('')}</section>`).join('')}</div>`).join('')}</details><details class="ux-disclosure"><summary>Nutrition comparison</summary><div class="keto-baselines">${['w','h'].map(comparisonTable).join('')}</div><a href="#keto">Full review and targets</a></details><details class="ux-disclosure"><summary>Prepared batches</summary><div id="uxBatchList"></div></details><div class="ux-week-footer"><button class="text-btn" data-ux-calendar>Calendar &amp; saved weeks</button>${!state.weekKey?'<button data-ux-calendar class="primary">Set week meals</button>':''}</div>`;
 const list=document.querySelector('#batchList');document.querySelector('#uxBatchList').innerHTML=list?.innerHTML||'<p>No prepared batches.</p>';
 el.querySelectorAll('.ux-disclosure').forEach(x=>x.open=openDetails.has(x.querySelector('summary').textContent));
 el.querySelectorAll('[data-keto-edit]').forEach(x=>x.open=openEdits.has(x.dataset.ketoEdit));
 el.querySelectorAll('[data-ux-week-day]').forEach(x=>{if(expanded.has(x.dataset.uxWeekDay)){x.classList.add('ux-row-expanded');x.querySelector('[data-ux-expand-row]').setAttribute('aria-expanded','true');}});
}
function initializeUX(){
 const settings=document.querySelector('#settingsPage');if(!settings)return;
 if(!settings.dataset.initialized){settings.dataset.initialized='true';settings.innerHTML='<h2>Settings</h2><details class="ux-disclosure" open><summary>Household portions</summary><div id="uxPortionSettings"></div></details><details class="ux-disclosure" id="uxUtensils"><summary>Utensil weights</summary></details><details class="ux-disclosure" id="uxLabels"><summary>Food labels &amp; cooking oil</summary></details><details class="ux-disclosure"><summary>Appearance &amp; connection</summary><div id="uxOtherSettings"></div></details>';
 document.querySelector('#uxPortionSettings').append(document.querySelector('.portion-controls'));
 document.querySelector('#uxUtensils').append(document.querySelector('#utensils'));
 document.querySelector('#uxLabels').append(document.querySelector('#labels'));
 const other=document.querySelector('#uxOtherSettings');other.append(document.querySelector('#themeBtn'),document.querySelector('#syncBtn'));
 document.querySelector('#resetBtn').hidden=true;
 other.insertAdjacentHTML('beforeend','<p><a href="#keto">Diet research, targets and trial review</a></p>');
 document.querySelectorAll('[data-ux-nav]').forEach(a=>{a.querySelector('span').insertAdjacentHTML('beforebegin',uxIcon(a.dataset.uxNav));});
 document.querySelector('#settingsLink').innerHTML=uxIcon('settings');
 }
}
function renderUX(){initializeUX();renderToday();renderWeek();showUXRoute(location.hash,false);}
function showUXRoute(hash,refresh=true){
 const route=hash==='#keto'?'review':hash==='#shopping'||hash==='#shop'?'shop':hash==='#week'||hash==='#planner'?'week':hash==='#settings'||hash==='#labels'||hash==='#utensils'?'settings':'today';
 const old=uxRoute;uxRoute=route;
 const desired=route==='today'?'day':'week';
 if(refresh&&cloudReady&&(state.view!==desired||old!==route)){state.view=desired;state.viewExplicit=true;if(route==='today')selectDayWeek();render();}
 document.querySelector('#regularPlan').hidden=true;
 for(const [id,name]of [['todayPage','today'],['weekPage','week'],['shopping','shop'],['settingsPage','settings'],['keto','review']]){const el=document.querySelector('#'+id);if(el)el.hidden=route!==name;}
 document.querySelectorAll('[data-ux-nav]').forEach(a=>{const active=a.dataset.uxNav===route;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 const settings=document.querySelector('#settingsLink');if(settings)settings.setAttribute('aria-current',route==='settings'?'page':'false');
 document.body.dataset.uxRoute=route;
 if(route==='settings'&&(hash==='#utensils'||hash==='#labels'))document.querySelector(hash==='#utensils'?'#uxUtensils':'#uxLabels').open=true;
}
function queueUXSave(){clearTimeout(uxSaveTimer);uxSaveTimer=setTimeout(async()=>{if(cloudSaving){queueUXSave();return;}if(cloudReady)await saveChanges();},450);}
async function uxSaveActivity(key,value){MealCloud.validateRecord(key,value);activityRecords[key]=value;save();const ok=await saveChanges();render();return ok;}
document.addEventListener('change',e=>{
 const t=e.target;if(!cloudReady)return;
 if(t.matches('[data-ux-diet]')){householdDiets[t.dataset.uxDiet]=t.value;save();render();queueUXSave();}
 if(t.matches('[data-ux-recipe]')){updateRecipe(+t.dataset.uxRecipe,t.dataset.uxPerson,t.value);queueUXSave();}
 if(t.closest('#settingsPage,#keto,#weekPage')&&!t.closest('#dlg'))queueUXSave();
});
document.addEventListener('click',async e=>{
 const done=e.target.closest('[data-ux-done]');if(done&&cloudReady&&!cloudSaving){const m=done.dataset.uxDone,i=uxCurrentIndex();await uxSaveActivity(`done/${dayViewISO()}/${m}`,{complete:!uxMealDone(i,m),basis:uxMealBasis(i,m),updatedAt:Date.now()});}
 if(e.target.closest('[data-ux-calendar]'))openCal();
 const expand=e.target.closest('[data-ux-expand-row]');if(expand){const row=expand.closest('[data-ux-week-day]');row.classList.toggle('ux-row-expanded');expand.setAttribute('aria-expanded',String(row.classList.contains('ux-row-expanded')));}
 const day=e.target.closest('[data-ux-open-day]');if(day){const date=state.weekKey?dateForDay(+day.dataset.uxOpenDay):addDate(mondayOf(dayViewISO()),+day.dataset.uxOpenDay);dayOff+=Math.round((Date.parse(date)-Date.parse(dayViewISO()))/86400000);state.view='day';state.viewExplicit=true;selectDayWeek();location.hash='today';render();}
 const shift=e.target.closest('[data-ux-week-shift]');if(shift){const mon=addDate(state.weekKey||mondayOf(dayViewISO()),7*Number(shift.dataset.uxWeekShift));if(lockedWeeks[mon]){selectWeek(mon);render();}else{openCal();document.querySelector('#calDate').value=mon;document.querySelector('#calWeekRange').innerHTML=calWeekRange(mon);}}
});

// A single dish at a time. Existing allocation, global tare and frozen batches are reused.
let serveStep=1,serveDish='sabzi',serveRecord=null;
function serveDishes(i){return Object.keys(DISH_NAMES).filter(d=>weighSpecs(i,d).length);}
function openServe(i,meal='l'){
 if(!cloudReady)return;
 weighContext={i,date:dateForDay(i),meal,guided:true};
 const dishes=serveDishes(i);serveDish=dishes.find(d=>currentWeigh(i,d)?.portions.some(s=>s.meal===meal))||dishes[0];serveRecord=serveDish?currentWeigh(i,serveDish):null;serveStep=serveRecord?2:1;
 drawServe();document.querySelector('#dlg').showModal();
}
function serveTitle(i,dish){return dish==='sabzi'?recipeName(sharedRecipe(state.days[i])):dish==='dal'?DALNAMES[state.days[i].dal]+' dal':weighDishName(i,dish);}
function drawServe(){
 const {i,meal,date}=weighContext,dishes=serveDishes(i),r=serveDish?dailyWeights[date+'/'+serveDish]:null;
 document.querySelector('#dlgTitle').textContent='Weigh & serve';document.querySelector('#dlg').classList.add('ux-serve-dialog');
 const prepared=batchCookGroups(i).filter(g=>g[0].startsWith('Already prepared'));
 if(!serveDish){document.querySelector('#dlgBody').innerHTML=`${prepared.map(g=>`<section><h3>${esc(g[0])}</h3>${g[1].map(x=>`<p>${esc(x)}</p>`).join('')}</section>`).join('')||'<p>No fresh dishes to weigh for this day.</p>'}<button data-weigh-close>Done</button>`;return;}
 const vessel=r?.vessel||utDayAt(i)[serveDish==='prot'?'prot':serveDish.startsWith('sabzi')?'sabzi':serveDish],weight=state.utensils[vessel]||0;
 const stale=r&&!currentWeigh(i,serveDish);
 let body='';
 if(serveStep===1){body=`<h3>${esc(serveTitle(i,serveDish))}</h3><section class="weigh-card ux-weigh-card" data-weigh-dish="${serveDish}"${r?.tare>0?` data-original-tare="${r.tare}"`:''}><p data-weigh-caption></p><label class="ux-weight-entry"><span data-weigh-reading-label>Pan + cooked food</span><div><input data-weigh-gross type="number" min="1" max="150000" step="1" inputmode="numeric" value="${r?.gross||''}" aria-label="Whole cooked batch weight"><span>g</span></div></label><details class="ux-disclosure"><summary>Vessel or meals</summary><label>Vessel<select data-weigh-vessel>${utOpts(vessel)}</select></label><label>Cooked for<select data-weigh-scope>${(serveDish==='prot'?[['d','Dinner']]:[['all','Lunch + dinner'],['l','Lunch only'],['d','Dinner only']]).map(([v,n])=>`<option value="${v}"${(r?.scope||'all')===v?' selected':''}>${n}</option>`).join('')}</select></label><label class="ux-checkbox"><input type="checkbox" data-weigh-includes${r?r.tare?' checked':'':weight?' checked':''}> Includes empty vessel</label></details>${!weight?'<p class="ux-note">Enter food-only weight, or <a href="#utensils" data-serve-settings>set the empty vessel weight</a>.</p>':''}${stale?'<p class="ux-warning">Plan changed. Review this weight and its new portions.</p>':''}<div data-weigh-output></div></section><button class="primary ux-primary" data-serve-preview>Show portions</button>`;}
 else if(serveStep===2){const portions=serveRecord.portions.filter(s=>s.meal===meal),progress=activityRecords[`serve/${date}/${serveDish}`],served=progress?.basis===ActivityMath.activityBasis(serveRecord)?progress.served:[],later=serveRecord.portions.filter(s=>s.meal!==meal&&!served.includes(s.meal+'/'+s.person));body=`<h3>${UX_MEALS[meal]} portions</h3><p class="ux-note">${esc(serveTitle(i,serveDish))} · ${serveRecord.netWeight} g cooked food</p><div class="ux-serve-portions">${portions.map(s=>`<div><span>${PERSON_NAMES[s.person]}<small>${uxDietName(s.person)}</small></span><strong>${s.grams} g</strong></div>`).join('')||'<p>No portions for this meal.</p>'}${later.length?`<h4>${meal==='l'?'Save for dinner':'Other planned meal'}</h4>${later.map(s=>`<div><span>${UX_MEALS[s.meal]} · ${PERSON_NAMES[s.person]}</span><strong>${s.grams} g</strong></div>`).join('')}`:''}</div><button class="primary ux-primary" data-serve-start${portions.length?'':' disabled'}>Start serving</button><button class="text-btn" data-serve-back>Change weight</button>`;}
 else{const activity=activityRecords[`serve/${date}/${serveDish}`],s=ActivityMath.servingState(serveRecord,activity,meal);body=`<h3>Serve ${UX_MEALS[meal].toLowerCase()}</h3><p>${esc(serveTitle(i,serveDish))}</p><div class="ux-food-left"><strong>${s.left} g</strong><span>food left now</span>${serveRecord.tare?`<small>Expected scale: ${s.left+serveRecord.tare} g with vessel</small>`:''}</div><div class="ux-serve-portions">${s.portions.map(p=>`<div class="${p.served?'ux-served':''}"><span>${PERSON_NAMES[p.person]}<small>${p.served?'Served':uxDietName(p.person)}</small></span><strong>${p.grams} g</strong><button class="${p.served?'text-btn':'primary'}" data-serve-mark="${p.meal}/${p.person}">${p.served?'Undo':'Mark served'}</button></div>`).join('')}</div>${meal==='l'&&s.dinner?`<p class="ux-reserved">${s.dinner} g stays for dinner</p>`:''}<button class="text-btn" data-serve-back>Change weight</button>`;}
 document.querySelector('#dlgBody').innerHTML=`<nav class="ux-dish-tabs" aria-label="Dish">${dishes.map(d=>`<button data-serve-dish="${d}" aria-pressed="${serveDish===d}">${esc(serveTitle(i,d))}</button>`).join('')}</nav><div class="ux-serve-step">${serveStep} of 3</div>${body}${prepared.length?`<details class="ux-disclosure"><summary>Already prepared portions</summary>${prepared.map(g=>`<h4>${esc(g[0])}</h4>${g[1].map(x=>`<p>${esc(x)}</p>`).join('')}`).join('')}</details>`:''}<div class="ux-serve-footer"><button data-weigh-close>Done</button></div><p data-serve-status role="status"></p>`;
 if(serveStep===1)refreshServeCard(document.querySelector('[data-weigh-dish]'));
}
function refreshServeCard(card){
 const vessel=card.querySelector('[data-weigh-vessel]').value,inc=card.querySelector('[data-weigh-includes]').checked;
 const tare=inc?Number(card.dataset.originalTare??state.utensils[vessel]??0):0;
 card.querySelector('[data-weigh-caption]').textContent=UT_NAMES[vessel]+(tare?' · '+tare+' g empty':' · food only');card.querySelector('[data-weigh-reading-label]').textContent=inc?'Pan + cooked food':'Cooked food only';
 const out=card.querySelector('[data-weigh-output]');try{const r=readWeighCard(card);out.innerHTML=r?`<p class="ux-subtraction">${r.gross} − ${r.tare} = <b>${r.netWeight} g food</b></p>`:'';card.dataset.invalid='';}catch(e){out.innerHTML=`<p class="weigh-error" role="alert">${esc(e.message)}</p>`;card.dataset.invalid='true';}
}
document.addEventListener('click',async e=>{
 if(!weighContext?.guided||!document.querySelector('#dlg').open)return;
 const dish=e.target.closest('[data-serve-dish]');if(dish){serveDish=dish.dataset.serveDish;serveRecord=currentWeigh(weighContext.i,serveDish);serveStep=serveRecord?2:1;drawServe();}
 if(e.target.closest('[data-serve-settings]'))document.querySelector('#dlg').close();
 if(e.target.closest('[data-serve-back]')){serveStep=1;drawServe();}
 const status=()=>document.querySelector('[data-serve-status]');
 if(e.target.closest('[data-serve-preview]'))try{serveRecord=readWeighCard(document.querySelector('[data-weigh-dish]'));if(!serveRecord)throw Error('Enter the cooked weight first.');serveStep=2;drawServe();}catch(err){status().textContent=err.message;}
 const start=e.target.closest('[data-serve-start]');if(start&&!cloudSaving){start.disabled=true;try{const mon=mondayOf(weighContext.date);if(!lockedWeeks[mon])lockedWeeks[mon]={days:structuredClone(state.days),utDay:structuredClone(state.utDay),savedAt:Date.now()};dailyWeights[weighContext.date+'/'+serveDish]=serveRecord;save();if(await saveChanges()){serveStep=3;drawServe();}else{status().textContent=syncStatusText;start.disabled=false;}}catch(err){status().textContent=err.message;start.disabled=false;}}
 const mark=e.target.closest('[data-serve-mark]');if(mark&&!cloudSaving){mark.disabled=true;const key=`serve/${weighContext.date}/${serveDish}`,basis=ActivityMath.activityBasis(serveRecord),old=activityRecords[key],served=old?.basis===basis?[...old.served]:[],item=mark.dataset.serveMark;const value={basis,served:served.includes(item)?served.filter(x=>x!==item):[...served,item],updatedAt:Date.now()};if(await uxSaveActivity(key,value))drawServe();else{status().textContent=syncStatusText;mark.disabled=false;}}
});
document.addEventListener('DOMContentLoaded',()=>{document.querySelector('#dlg').addEventListener('close',()=>{document.querySelector('#dlg').classList.remove('ux-serve-dialog');weighContext=null;});});
