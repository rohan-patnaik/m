let savedBatches={},batchDraft=null;
const PERSON_NAMES={w:'Wife',h:'Husband'},MEAL_NAMES={l:'Lunch',d:'Dinner'};
function addDate(iso,days){const d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
function dateForDay(i){return addDate(state.weekKey||mondayOf(dayViewISO()),i);}
function batchDay(date){const mon=mondayOf(date),i=(new Date(date+'T12:00:00').getDay()+6)%7;const days=state.weekKey===mon?state.days:lockedWeeks[mon]?.days||templateDays||state.days;return days[i];}
function batchName(batch){const base=SABZIS[batch.recipe]||PROTEINS[batch.recipe];const soy=batch.ingredients.find(x=>x.id==='soyN'||x.id==='soyS');return base+(soy?' · '+(soy.id==='soyS'?'Saffola':'Nutrela'):'');}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function batchLink(date,m,p,component){for(const [id,b]of Object.entries(savedBatches)){const s=b.servings.find(x=>x.date===date&&x.meal===m&&x.person===p&&x.component===component);if(s)return{id,batch:b,serving:s};}return null;}
function mealDate(day){const i=state.days.indexOf(day);return state.weekKey&&i>=0?dateForDay(i):null;}
function coveredComponent(day,m,p,component){const date=mealDate(day);if(!date)return false;if(batchLink(date,m,p,component))return true;return component==='protein'&&m==='d'&&BatchMath.PROTEIN_SABZIS.has(batchLink(date,m,p,'sabzi')?.batch.recipe);}
function originalComponent(day,m,p,component){
 if(!['l','d'].includes(m)||!kept(day,m))return[];
 if(component==='sabzi')return sabzi(day.s).map(x=>L(x.id,x.q*sabShare(day,p,m)));
 if(component==='protein'&&m==='d'&&!NO_EXTRA(day.s)){
 const qw=protein(day.p,'w',day)[0].q,qh=protein(day.p,'h',day)[0].q,denom=qw/dinnerScale('w')+qh/dinnerScale('h'),my=protein(day.p,p,day)[0].q;
 return [...protein(day.p,p,day),...(oilUse().prot?[L('oil',oilUse().prot*my/denom)]:[])];
 }return[];
}
function subtractIngredients(lines,remove){const q={};for(const x of lines)q[x.id]=(q[x.id]||0)+x.q;for(const x of remove)q[x.id]=(q[x.id]||0)-x.q;return Object.entries(q).filter(([,v])=>v>1e-8).map(([id,v])=>L(id,v));}
function freshMeal(day,m,p){let lines=baseMeal(day,m,p);for(const component of ['sabzi','protein'])if(coveredComponent(day,m,p,component))lines=subtractIngredients(lines,originalComponent(day,m,p,component));return lines;}
function meal(day,m,p){let lines=freshMeal(day,m,p);const date=mealDate(day);if(date&&kept(day,m)&&['l','d'].includes(m))for(const c of['sabzi','protein']){const link=batchLink(date,m,p,c);if(link)lines.push(...BatchMath.portionLines(link.batch,link.serving));}return lines;}
function batchesCookedOn(date){return Object.entries(savedBatches).filter(([,b])=>b.cookedOn===date);}
function batchMealTitle(day,m){const date=mealDate(day);if(!date||m==='b')return mealTitle(day,m);let changed=false;const names=['w','h'].map(p=>{
 const s=batchLink(date,m,p,'sabzi'),proteinBatch=batchLink(date,m,p,'protein');changed||=!!s||!!proteinBatch;
 const sab=s?SABZIS[s.batch.recipe]:SABZIS[day.s];let prot='';
 if(m==='d'&&!coveredComponent(day,m,p,'protein')&&!NO_EXTRA(day.s))prot=PROTEINS[day.p];
 if(proteinBatch)prot=SABZIS[proteinBatch.batch.recipe]||PROTEINS[proteinBatch.batch.recipe];
 return sab+(prot?' + '+prot:'');
 });return !changed?mealTitle(day,m):names[0]===names[1]?names[0]:`Wife: ${names[0]} · Husband: ${names[1]}`;}
function batchMealNotes(i,m){if(!state.weekKey||!['l','d'].includes(m))return'';const date=dateForDay(i),rows=[];for(const p of['w','h'])for(const c of['sabzi','protein']){const l=batchLink(date,m,p,c);if(l)rows.push(`<button class="batch-note" data-batch-view="${l.id}"><b>${PERSON_NAMES[p]}: ${l.serving.grams} g</b> ${c==='protein'?'dinner protein':'sabzi'} · ${esc(batchName(l.batch))}<span>From ${fmtMon(l.batch.cookedOn)} batch</span></button>`);}return rows.length?`<div class="batch-meal-notes">${rows.join('')}</div>`:'';}
function batchCookGroups(i){if(!state.weekKey)return[];const date=dateForDay(i),groups=[];
 for(const [id,b]of batchesCookedOn(date))groups.push(['Cooked batch · '+batchName(b),[...b.ingredients.map(x=>`${DB[x.id][0]} — ${F(x.q)} ${DB[x.id][3]}`),`Cooked food: ${b.netWeight} g · Covers: ${b.servings.map(s=>`${fmtMon(s.date)} ${MEAL_NAMES[s.meal]} ${PERSON_NAMES[s.person]}`).join('; ')}`]]);
 for(const [id,b]of Object.entries(savedBatches)){const rows=b.servings.filter(s=>s.date===date).map(s=>`${MEAL_NAMES[s.meal]} · ${PERSON_NAMES[s.person]}: ${s.grams} g ${s.component==='protein'?'as dinner protein':'sabzi'}${kept(batchDay(s.date),s.meal)?'':' (meal currently skipped)'}`);if(rows.length)groups.push(['Already prepared · '+batchName(b)+' · '+fmtMon(b.cookedOn),rows]);}return groups;}
function freshSabziLines(day){const result=[];for(const m of['l','d'])for(const p of['w','h'])if(!coveredComponent(day,m,p,'sabzi'))result.push(...originalComponent(day,m,p,'sabzi'));return aggregateBatchLines(result);}
function aggregateBatchLines(lines){const q={};for(const x of lines)q[x.id]=(q[x.id]||0)+x.q;return Object.entries(q).filter(([,v])=>v>1e-8).map(([id,q])=>({id,q}));}
function freshSabziShare(day,p,m){return kept(day,m)&&!coveredComponent(day,m,p,'sabzi')?sabShare(day,p,m):0;}
function freshSabziTotal(day){return ['l','d'].reduce((a,m)=>a+freshSabziShare(day,'w',m)+freshSabziShare(day,'h',m),0);}
function batchSplitRows(day,m,rows){const date=mealDate(day);if(!date)return rows;const out=[];for(const row of rows){let c=row[0].startsWith('Sabzi')?'sabzi':row[0].startsWith('Protein ·')?'protein':null;if(c&&['w','h'].some(p=>coveredComponent(day,m,p,c))){for(const p of['w','h']){const l=batchLink(date,m,p,c);if(l)out.push([`${PERSON_NAMES[p]} · ${c==='protein'?'dinner protein':'sabzi'}`,`${l.serving.grams} g from ${fmtMon(l.batch.cookedOn)} batch`]);else if(!coveredComponent(day,m,p,c))out.push([`${PERSON_NAMES[p]} · ${c}`,'Cook separately; use fresh batch weight below']);}}else out.push(row);}return out;}
function batchPortionTable(batch){const groups={};for(const s of batch.servings){const key=s.date+'/'+s.meal+'/'+s.component;const r=groups[key]||={date:s.date,meal:s.meal,component:s.component};r[s.person]=s;}
 const core=batch.ingredients.find(x=>['paneer','soyN','soyS'].includes(x.id));
 return `<div class="batch-table-wrap"><table class="batch-portions"><thead><tr><th>Date / meal</th><th class="num">Wife</th><th class="num">Husband</th></tr></thead><tbody>${Object.values(groups).map(r=>`<tr><td><b>${fmtMon(r.date)}</b><span>${MEAL_NAMES[r.meal]} · ${r.component==='protein'?'Dinner protein':'Sabzi'}</span></td>${['w','h'].map(p=>{const s=r[p];if(!s)return'<td class="num">—</td>';const n=sum(BatchMath.portionLines(batch,s));return `<td class="num"><strong>${s.grams} g</strong><span>${F(s.share*100)}% · ${R(n.k)} kcal</span>${core?`<span>${F(core.q*s.share)} g ${core.id==='paneer'?'raw paneer':'dry soya'}</span>`:''}</td>`;}).join('')}</tr>`).join('')}</tbody><tfoot><tr><th>All portions</th><td colspan="2" class="num"><b>${batch.netWeight} g</b></td></tr></tfoot></table></div><p class="batch-caution">Grams in bold are cooked food. Calories are for the batch portion only.</p>`;
}
function batchIngredientTable(batch){return `<table><thead><tr><th>Cook once</th><th class="num">Raw quantity</th></tr></thead><tbody>${batch.ingredients.map(x=>`<tr><td>${DB[x.id][0]}</td><td class="num">${F(x.q)} ${DB[x.id][3]}</td></tr>`).join('')}</tbody></table>`;}
function batchPieceNote(batch){const x=batch.ingredients.find(x=>['paneer','soyN','soyS'].includes(x.id));return x?`<p class="batch-caution">Distribute ${x.id==='paneer'?'paneer pieces':'soya chunks'} first, then gravy. Each box should receive its listed share of the pieces too.</p>`:'';}
function renderBatchList(){const el=document.querySelector('#batchList');if(!el)return;const from=state.weekKey||mondayOf(dayViewISO()),to=addDate(from,6);const entries=Object.entries(savedBatches).filter(([,b])=>b.servings.some(s=>s.date>=from&&s.date<=to)||b.cookedOn>=from&&b.cookedOn<=to);
 el.innerHTML=entries.length?`<section class="batch-list"><h2>Prepared batches</h2>${entries.map(([id,b])=>`<button class="batch-list-item" data-batch-view="${id}"><span><b>${esc(batchName(b))}</b><small>Cooked ${fmtMon(b.cookedOn)} · ${b.servings.length} servings</small></span><strong>${b.netWeight} g</strong></button>`).join('')}</section>`:'';}
function sourceRecipe(recipe){if(recipe==='P')return[L('paneer',225)];if(recipe==='Y')return[L(soyaId(),110)];return sabziBase(recipe);}
function sourceProtein(recipe){return recipe==='P'||recipe==='S3'?'paneer':recipe==='Y'||recipe==='S8'?soyaId():null;}
function servingFactor(recipe,date,m,p,component){const day=batchDay(date);if(component==='sabzi')return sabShare({...day,s:recipe},p,m);const core=sourceProtein(recipe);if(!core)throw Error('Choose a paneer or soya recipe for dinner protein.');const q=protein(core==='paneer'?'P':'Y',p,day)[0].q;return q/sourceRecipe(recipe).find(x=>x.id===core).q;}
function occupiedServing(date,m,p,component,recipe){for(const b of Object.values(savedBatches)){const keys=b.servings.flatMap(s=>BatchMath.claimsFor(b,s));const claims=BatchMath.claimsFor({recipe},{date,meal:m,person:p,component});if(claims.some(k=>keys.includes(k)))return true;}return false;}
function batchPickerHTML(){const b=batchDraft;let html='';for(let n=0;n<7;n++){const date=addDate(b.cookedOn,n),day=batchDay(date);html+=`<fieldset class="batch-date"><legend>${fmtMon(date)}</legend>`;for(const m of['l','d']){const key=date+'/'+m,role=b.roles[key]||(['P','Y'].includes(b.recipe)?'protein':'sabzi');b.roles[key]=role;
 const canProtein=!!sourceProtein(b.recipe)&&m==='d'&&!NO_EXTRA(day.s),canSabzi=!['P','Y'].includes(b.recipe);
 if(!canSabzi&&!canProtein)continue;
 const disabled=!kept(day,m)||role==='protein'&&!canProtein;
 html+=`<div class="batch-choice"><span>${MEAL_NAMES[m]}</span><select aria-label="${fmtMon(date)} ${MEAL_NAMES[m]} batch use" data-batch-role="${key}">${canSabzi?`<option value="sabzi"${role==='sabzi'?' selected':''}>Sabzi</option>`:''}${canProtein?`<option value="protein"${role==='protein'?' selected':''}>Dinner protein</option>`:''}</select>${['w','h'].map(p=>{const token=key+'/'+p,blocked=disabled||occupiedServing(date,m,p,role,b.recipe);return `<label><input type="checkbox" data-batch-serving="${token}"${b.selected[token]&&!blocked?' checked':''}${blocked?' disabled':''}> ${PERSON_NAMES[p]}</label>`;}).join('')}</div>`;
 if(!kept(day,m))html+='<small class="batch-unavailable">Meal skipped</small>';else if(disabled)html+='<small class="batch-unavailable">This meal has its protein inside the sabzi.</small>';
 }html+='</fieldset>';}
 return html;
}
function buildBatchPreview(requireWeight=false){const b=batchDraft,servings=[];for(const [token,on]of Object.entries(b.selected)){if(!on)continue;const [date,m,p]=token.split('/'),component=b.roles[date+'/'+m]||'sabzi',day=batchDay(date);
 if(!kept(day,m)||occupiedServing(date,m,p,component,b.recipe))continue;
 if(component==='protein'&&(m!=='d'||NO_EXTRA(day.s)))continue;
 servings.push({date,meal:m,person:p,component,factor:servingFactor(b.recipe,date,m,p,component)});
 }servings.sort((a,b)=>a.date.localeCompare(b.date)||(['l','d'].indexOf(a.meal)-['l','d'].indexOf(b.meal))||a.person.localeCompare(b.person));
 if(!servings.length)throw Error('Select at least one meal and person.');
 const total=servings.reduce((n,s)=>n+s.factor,0),lines=sourceRecipe(b.recipe).map(x=>L(x.id,x.q*total));
 const oil=b.oil===null?(oilUse()[['P','Y'].includes(b.recipe)?'prot':'sabzi']*total):b.oil;
 if(!Number.isFinite(oil)||oil<0||oil>5000)throw Error('Enter oil between 0 and 5,000 ml.');if(oil>0)lines.push(L('oil',oil));
 const tare=b.includeVessel?state.utensils[b.vessel]||0:0;
 if(b.includeVessel&&!tare)throw Error('Set this vessel’s empty weight first, or enter food-only weight.');
 const net=Math.round(b.gross-tare);
 if(requireWeight&&(!Number.isFinite(b.gross)||net<=0))throw Error('Enter the finished batch weight above the vessel’s empty weight.');
 const grams=net>0?BatchMath.portionWeights(net,servings.map(s=>s.factor)):servings.map(()=>0);
 const ingredients=aggregateBatchLines(lines).map(x=>({...x,n:val(x)}));
 return {recipe:b.recipe,cookedOn:b.cookedOn,vessel:b.vessel,tare,netWeight:net>0?net:0,createdAt:Date.now(),ingredients,servings:servings.map((s,i)=>{const {factor,...rest}=s;return {...rest,share:factor/total,grams:grams[i]};})};
}
function refreshBatchPreview(){const el=document.querySelector('#batchPreview');if(!el)return;try{const b=buildBatchPreview();const oil=b.ingredients.find(x=>x.id==='oil')?.q||0;const oilInput=document.querySelector('[data-batch-oil]');if(batchDraft.oil===null&&document.activeElement!==oilInput)oilInput.value=F(oil);
 el.innerHTML=`<h3>Combined cook list</h3>${batchIngredientTable(b)}<h3>Pack by date and meal</h3>${b.netWeight?batchPortionTable(b):`<p class="hintline">Enter the cooked weight to get grams for each box.</p><ul class="batch-selection-list">${b.servings.map(s=>`<li>${fmtMon(s.date)} · ${MEAL_NAMES[s.meal]} · ${PERSON_NAMES[s.person]} · ${s.component==='protein'?'dinner protein':'sabzi'} (${F(s.share*100)}%)</li>`).join('')}</ul>`}${batchPieceNote(b)}`;
 document.querySelector('[data-batch-save]').disabled=!b.netWeight||cloudSaving;
 }catch(e){el.innerHTML=`<p role="status" class="hintline">${esc(e.message)}</p>`;document.querySelector('[data-batch-save]').disabled=true;}}
function openBatch(i){save();const cookedOn=dateForDay(i),day=batchDay(cookedOn);batchDraft={recipe:day.s,cookedOn,vessel:utDayAt(i).sabzi,includeVessel:false,gross:0,oil:null,roles:{},selected:{}};prefillBatchServings();drawBatchEditor();document.querySelector('#dlg').showModal();}
function prefillBatchServings(){const b=batchDraft;b.selected={};b.roles={};for(let n=0;n<7;n++){const date=addDate(b.cookedOn,n),day=batchDay(date);for(const m of['l','d']){
 const core=sourceProtein(b.recipe),matchSabzi=b.recipe===day.s&&!['P','Y'].includes(b.recipe),matchProtein=m==='d'&&core&&!NO_EXTRA(day.s)&&((day.p==='P')===(core==='paneer'));
 const role=matchSabzi?'sabzi':matchProtein?'protein':(['P','Y'].includes(b.recipe)?'protein':'sabzi');b.roles[date+'/'+m]=role;
 for(const p of['w','h'])b.selected[date+'/'+m+'/'+p]=n<3&&kept(day,m)&&!!(matchSabzi||matchProtein)&&!occupiedServing(date,m,p,role,b.recipe);
 }} }
function drawBatchEditor(){const b=batchDraft;document.querySelector('#dlgTitle').textContent='Cook a batch';document.querySelector('#dlgBody').innerHTML=`<div class="batch-editor"><div class="batch-fields"><label>Recipe<select data-batch-recipe>${opts({...SABZIS,P:'Separate paneer',Y:'Separate soya chunks'},b.recipe)}</select></label><label>Cooked on<input type="date" data-batch-date value="${b.cookedOn}"></label></div><h3>Meals this batch covers</h3><div class="batch-picker">${batchPickerHTML()}</div><div class="batch-fields batch-weigh"><label>Vessel<select data-batch-vessel>${utOpts(b.vessel)}</select></label><label>Finished scale reading (g)<input type="number" min="1" step="1" inputmode="decimal" data-batch-gross value="${b.gross||''}"></label><label class="batch-checkbox"><input type="checkbox" data-batch-tare${b.includeVessel?' checked':''}> Includes empty vessel (<span data-batch-tare-value>${state.utensils[b.vessel]||0}</span> g)</label><label>Oil in entire batch (ml)<input type="number" min="0" max="5000" step="0.5" inputmode="decimal" data-batch-oil value="${b.oil??''}"><small>Starts from your recipe estimate; edit if measured.</small></label></div><div id="batchPreview"></div><p class="batch-caution">Using a sabzi for dinner protein also counts its gravy and oil. Other parts of the meal stay in the plan.</p><div class="editbtns"><button data-batch-cancel>Cancel</button><button class="primary" data-batch-save>Save cooked batch</button></div><p data-batch-error role="alert"></p></div>`;refreshBatchPreview();}
function stageBatch(id,batch){
 // Include the cooking week even when all boxes are for the following week.
 const weeks=new Set([batch.cookedOn,...batch.servings.map(s=>s.date)].map(mondayOf));
 for(const mon of weeks)if(!lockedWeeks[mon])lockedWeeks[mon]={days:structuredClone(mon===state.weekKey?state.days:templateDays),utDay:structuredClone(mon===state.weekKey?state.utDay:templateUtensils),savedAt:Date.now()};
 savedBatches[id]=batch;save();
}
async function saveBatch(){const err=document.querySelector('[data-batch-error]');try{
 const batch=buildBatchPreview(true);BatchMath.validateBatch(batch);const id=crypto.randomUUID();
 stageBatch(id,batch);
 if(state.view==='day')dayOff+=Math.round((Date.parse(batch.cookedOn)-Date.parse(dayViewISO()))/86400000);
 selectWeek(mondayOf(batch.cookedOn));render();const ok=await saveChanges();if(ok){document.querySelector('#dlg').close();openBatchView(id);}else{const node=document.querySelector('[data-batch-error]');if(node)node.textContent=syncStatusText+' Close this editor to review the unsaved batch.';}
 }catch(e){if(err)err.textContent=e.message;}}
function openBatchView(id){batchDraft=null;const b=savedBatches[id];if(!b)return;document.querySelector('#dlgTitle').textContent=batchName(b);document.querySelector('#dlgBody').innerHTML=`<div class="batch-view"><p>Cooked ${fmtMon(b.cookedOn)} · ${b.netWeight} g food</p>${batchPortionTable(b)}${batchPieceNote(b)}<details class="explanation"><summary>Ingredients and weighing</summary>${batchIngredientTable(b)}<p>Vessel: ${UT_NAMES[b.vessel]} · tare used: ${b.tare} g. Recorded portions stay fixed when your portion settings change. Cooked grams are rounded to whole grams.</p></details><details class="explanation"><summary>Correct cooked weight</summary><label class="batch-weight-fix">Food-only weight (g)<input type="number" min="1" max="100000" step="1" data-batch-newweight value="${b.netWeight}"></label><button data-batch-reweigh="${id}">Recalculate boxes</button><p class="hintline">This updates every linked portion. Use before packing the boxes.</p></details><div class="editbtns"><button data-batch-remove="${id}">Remove batch</button><button class="primary" data-batch-cancel>Done</button></div><p data-batch-error role="alert"></p></div>`;if(!document.querySelector('#dlg').open)document.querySelector('#dlg').showModal();}
async function reweighBatch(id){try{const weight=Number(document.querySelector('[data-batch-newweight]').value),b=structuredClone(savedBatches[id]),grams=BatchMath.portionWeights(weight,b.servings.map(s=>s.share));b.netWeight=weight;b.servings.forEach((s,i)=>s.grams=grams[i]);BatchMath.validateBatch(b);savedBatches[id]=b;save();render();if(await saveChanges())openBatchView(id);else document.querySelector('[data-batch-error]').textContent=syncStatusText;}catch(e){document.querySelector('[data-batch-error]').textContent=e.message;}}
document.addEventListener('change',e=>{const t=e.target;if(!batchDraft)return;
 if(t.hasAttribute('data-batch-recipe')){batchDraft.recipe=t.value;batchDraft.oil=null;prefillBatchServings();drawBatchEditor();}
 else if(t.hasAttribute('data-batch-date')){if(!BatchMath.validDate(t.value))return;batchDraft.cookedOn=t.value;batchDraft.oil=null;prefillBatchServings();drawBatchEditor();}
 else if(t.dataset.batchRole){batchDraft.roles[t.dataset.batchRole]=t.value;for(const p of['w','h'])batchDraft.selected[t.dataset.batchRole+'/'+p]=false;const picker=document.querySelector('.batch-picker');picker.innerHTML=batchPickerHTML();refreshBatchPreview();}
 else if(t.dataset.batchServing){batchDraft.selected[t.dataset.batchServing]=t.checked;refreshBatchPreview();}
 else if(t.hasAttribute('data-batch-vessel')){batchDraft.vessel=t.value;document.querySelector('[data-batch-tare-value]').textContent=state.utensils[t.value]||0;refreshBatchPreview();}
 else if(t.hasAttribute('data-batch-tare')){batchDraft.includeVessel=t.checked;refreshBatchPreview();}
});
document.addEventListener('input',e=>{if(!batchDraft)return;const t=e.target;if(t.hasAttribute('data-batch-gross')){batchDraft.gross=Number(t.value);refreshBatchPreview();}if(t.hasAttribute('data-batch-oil')){batchDraft.oil=t.value===''?null:Number(t.value);refreshBatchPreview();}});
document.addEventListener('click',async e=>{
 const add=e.target.closest('[data-batch-add]');if(add)openBatch(+add.dataset.batchAdd);
 const view=e.target.closest('[data-batch-view]');if(view)openBatchView(view.dataset.batchView);
 if(e.target.closest('[data-batch-cancel]'))document.querySelector('#dlg').close();
 if(e.target.closest('[data-batch-save]')){e.target.closest('[data-batch-save]').disabled=true;await saveBatch();}
 const weigh=e.target.closest('[data-batch-reweigh]');if(weigh)await reweighBatch(weigh.dataset.batchReweigh);
 const remove=e.target.closest('[data-batch-remove]');if(remove&&confirm('Remove this batch and return its servings to the original meal plan?')){delete savedBatches[remove.dataset.batchRemove];save();render();if(await saveChanges())document.querySelector('#dlg').close();else document.querySelector('[data-batch-error]').textContent=syncStatusText;}
});
