// One staged meal editor. Nothing touches the household ledger until Save.
let mealEditor=null;
const MEAL_FIELDS={quantity:['Protein','g',1000,1],eggWhites:['Extra whites','whites',12,1],soya:['Soya chunks','g dry',100,1],spinach:['Spinach','g',1000,1],mushroom:['Mushrooms','g',500,1],tomato:['Tomato','g',500,1],onion:['Onion','g',200,1],avocado:['Avocado','g',500,1],cucumber:['Cucumber','g',1000,1],curd:['Curd','g',500,1],whey:['Whey','scoops',3,.5],milk:['Milk','ml',500,1],butter:['Butter','g',50,1],oil:['Cooking oil','ml',50,.5],flax:['Ground flaxseed','g',50,1],almonds:['Almonds','g',150,1],walnuts:['Walnuts','g',150,1],cashews:['Cashews','g',150,1],sabziFraction:['Sabzi portion','g before cooking',1000,1]};
function mealEditorWithDraft(fn){
 const e=mealEditor,oldDay=state.days[e.i],oldMeals=ketoMeals;state.days[e.i]=e.day;ketoMeals={...ketoMeals};
 for(const [id,cfg]of Object.entries(e.drafts)){const [p,m]=id.split('/');ketoMeals[ketoMealKey(e.i,p,m)]=cfg;}
 try{return fn();}finally{state.days[e.i]=oldDay;ketoMeals=oldMeals;}
}
function mealEditorCurrent(){return mealEditor.drafts[mealEditor.p+'/'+mealEditor.m];}
function mealEditorDirty(){const e=mealEditor;return JSON.stringify([e.day,e.drafts])!==e.original;}
function mealEditorLocked(){const e=mealEditor;return ['l','d'].includes(e.m)&&coveredComponent(state.days[e.i],e.m,e.p,'protein');}
function mealEditorAllowed(){const e=mealEditor,ready=e.m==='b'&&e.day.readyB?.[e.p];return Object.keys(MEAL_FIELDS).filter(k=>
 (!(e.m!=='b'&&personRecipe(e.day,e.p)==='S12'&&!mealEditorCurrent().mealRecipe)||!['quantity','soya'].includes(k))&&
 (e.p==='h'||e.m==='b'||!['mushroom','tomato','onion'].includes(k))&&
 (!ready||['whey','curd','milk',...KETO_NUT_IDS].includes(k))&&
 (e.m!=='b'||k!=='sabziFraction')&&(!coveredComponent(state.days[e.i],e.m,e.p,'sabzi')||k!=='sabziFraction')&&
 (e.p==='h'||k!=='eggWhites')&&
 (!ketoEveningOnly(e.i,e.p)||!KETO_NUT_IDS.includes(k)));
}
function mealEditorValue(k){const e=mealEditor,cfg=mealEditorCurrent();if(k==='sabziFraction')return F(cfg[k]*ketoVegetableBase(personRecipe(e.day,e.p)).reduce((n,x)=>n+x.q,0));if(k==='whey'&&e.m==='b'&&!e.day[e.p==='h'?'wheyH':'wheyW'])return 0;return cfg[k]||0;}
function mealEditorSet(k,value){
 if(mealEditor.applied||mealEditor.saving)throw Error('Close this editor to make further changes.');
 if(!mealEditorAllowed().includes(k)||!Number.isFinite(value))throw Error('Invalid meal amount.');
 const e=mealEditor,cfg=mealEditorCurrent(),next={...cfg,[k]:k==='sabziFraction'?value/ketoVegetableBase(personRecipe(e.day,e.p)).reduce((n,x)=>n+x.q,0):value};
 if(e.m!=='b'&&['mushroom','tomato','onion'].includes(k)&&!next.mealRecipe)next.mealRecipe='custom';
 MealCloud.validateRecord(ketoMealKey(e.i,e.p,e.m),next);e.drafts[e.p+'/'+e.m]=next;
 if(k==='whey'&&e.m==='b')e.day[e.p==='h'?'wheyH':'wheyW']=value>0;
 if(e.p==='h'){if(k==='whey')e.autoWhey=false;else if(e.autoWhey)mealEditorBalanceWhey();}
}
function mealEditorPick(id){
 const e=mealEditor;if(e.applied||e.saving)throw Error('Close this editor to make further changes.');if(mealEditorLocked())throw Error('This portion belongs to a prepared batch.');
 if(e.m==='b'){
  e.day.readyB={w:false,h:false,...e.day.readyB,[e.p]:id==='ready'};if(!e.day.readyB.w&&!e.day.readyB.h)delete e.day.readyB;
  if(id!=='ready'&&id!=='custom'){const option=mealEditorWithDraft(()=>ketoBreakfastOptions(e.i,e.p,e.day).find(o=>o.id===id));if(!option)throw Error('Choose a breakfast dish.');e.drafts[e.p+'/'+e.m]=option.config;}
 }else if(id!=='custom')e.drafts[e.p+'/'+e.m]=mealEditorWithDraft(()=>ketoMainConfig(e.i,e.p,e.m,id,e.day));
 if(e.p==='h'&&e.autoWhey)mealEditorBalanceWhey();
 e.added={};e.page=0;
}
function openMealEditor(i,m='b',p=isKeto('h')?'h':'w',iso){
 if(!cloudReady||cloudSaving)return;if(!['w','h'].some(isKeto)){openEdit(i,iso);return;}
 if(iso)selectWeek(mondayOf(iso));
 const drafts={};for(const person of ['w','h'].filter(isKeto))for(const part of ['b','l','d'])drafts[person+'/'+part]=structuredClone(ketoConfig(state.days[i],person,part,i));
 mealEditor={i,m,p:isKeto(p)?p:['w','h'].find(isKeto),day:structuredClone(state.days[i]),drafts,original:JSON.stringify([state.days[i],drafts]),scope:state.weekKey,nutritionRevision:householdRevision(Object.values(cloudBase)),autoWhey:false,added:{},page:0};
 const dlg=document.querySelector('#dlg');dlg.classList.remove('ux-edit-dialog','ux-serve-dialog','ux-cal-dialog');dlg.classList.add('simple-meal-dialog');renderMealEditor();if(!dlg.open)dlg.showModal();fitMealEditor();
}
function mealEditorField(k){
 const e=mealEditor,cfg=mealEditorCurrent(),[name,unit,max,step]=MEAL_FIELDS[k],eggs=k==='quantity'&&cfg.protein==='eggs',label=k==='quantity'?eggs?'Whole eggs':cfg.protein==='chicken'?'Chicken':'Paneer':name;
 const input=`<input id="meal-field-${k}" data-meal-field="${k}" aria-label="${label}" type="number" inputmode="decimal" min="0" max="${eggs?6:k==='sabziFraction'?ketoVegetableBase(personRecipe(e.day,e.p)).reduce((n,x)=>n+x.q,0)*2:max}" step="${eggs||k==='eggWhites'?1:k==='whey'?.5:'any'}" value="${mealEditorValue(k)}">`;
 return `<label class="simple-meal-field" data-meal-item>${label}<span class="simple-meal-amount">${eggs?`<button type="button" data-meal-egg="-1" aria-label="Remove one whole egg"${!cfg.quantity?' disabled':''}>−</button>`:''}${input}${eggs?`<button type="button" data-meal-egg="1" aria-label="Add one whole egg"${cfg.quantity>=6?' disabled':''}>+</button>`:`<small>${unit}</small>`}</span></label>`;
}
function mealEditorBalanceWhey(){
 const e=mealEditor;if(e.p!=='h'||ketoSuggestionIsPast(e.i))throw Error('Past days stay unchanged.');
 const result=mealEditorWithDraft(()=>ketoWheySuggestion(e.i));
 for(const m of ['b','l','d'])e.drafts['h/'+m]=result.configs[m];
 e.autoWhey=true;e.nutritionGuard=e.nutritionRevision;return result;
}
function mealEditorSuggestDay(){
 const e=mealEditor;if(e.p!=='h')return;
 const result=mealEditorWithDraft(()=>ketoSuggestedDay(e.i));if(result.blocked)throw Error(result.reason);
 if(!result.compatible)throw Error('No suggested day fits these portions and targets. '+result.issues[0]);
 for(const m of ['b','l','d'])e.drafts['h/'+m]=result.configs[m];
 e.autoWhey=true;e.nutritionGuard=e.nutritionRevision;e.added={};e.page=0;
}
function mealEditorSummary(){return mealEditorWithDraft(()=>{
 const e=mealEditor,t=comparisonSum(meal(e.day,e.m,e.p)),day=assignedDayNutrition(e.i,e.p);
 let text=`Meal ~${R(t.k)} kcal · ${R(t.p)} g protein · ${R(t.aHi)} g carbs${t.carbUnknown?' (estimate)':''}<br>Day ~${R(day.k)} kcal · ${R(day.p)} g protein · ${R(day.aHi)} g carbs`;
 if(e.p==='h'&&!ketoSuggestionIsPast(e.i)){
  const x=ketoWheySuggestion(e.i),status=!e.autoWhey&&day.k>x.targets.kMax?`Current day exceeds ${x.targets.kMax} kcal.`:!e.autoWhey&&day.p>x.targets.pMax?`Current day exceeds ${x.targets.pMax} g protein.`:x.issues.length?x.issues[0]:`Target ${x.targets.pMin}–${x.targets.pMax} g protein · ${x.targets.kMin}–${x.targets.kMax} kcal`;
  text+=`<div class="meal-whey-balance"><span>Food ${F(x.foodProtein)} g protein · whey ${F(x.currentScoops)} scoop${x.currentScoops===1?'':'s'}/day</span> <button type="button" data-meal-balance>${e.autoWhey?'Auto whey on':'Balance whey'}</button><small>${e.autoWhey?esc(status):`Suggested: ${F(x.scoops)} scoop${x.scoops===1?'':'s'}/day. ${esc(status)}`}</small></div>`;
 }
 return text;
});}
function renderMealEditor(){
 const e=mealEditor,cfg=mealEditorCurrent(),ready=e.m==='b'&&e.day.readyB?.[e.p],locked=mealEditorLocked(),allowed=mealEditorAllowed(),visible=allowed.filter(k=>mealEditorValue(k)>0||e.added[k]||k==='quantity'&&!ready&&cfg.protein==='eggs'),unused=allowed.filter(k=>!visible.includes(k));
 const recipe=e.m==='b'?ready?'ready':cfg.breakfastRecipe||'custom':cfg.mealRecipe||'custom';
 const options=e.m==='b'?[['ready','No cooked breakfast'],...Object.entries(KETO_BREAKFASTS).filter(([,x])=>e.p==='h'||x.portion.protein==='paneer').map(([id,x])=>[id,x.name.replace(/^\d+ /,'')])]:e.p==='h'?Object.entries(KETO_MAINS).map(([id,x])=>[id,x.name.replace(/^\d+ /,'')]):[];
 document.querySelector('#dlgTitle').textContent=`${DAYS[e.i]} · edit meal`;
 document.querySelector('#dlgBody').innerHTML=`<div class="simple-meal-toolbar"><div role="group" aria-label="Meal">${['b','l','d'].map(m=>`<button type="button" data-meal-tab="${m}" aria-pressed="${e.m===m}">${UX_MEALS[m]}</button>`).join('')}</div><button type="button" data-meal-day-options>Day options</button>${['w','h'].filter(isKeto).length>1?`<select data-meal-person aria-label="Person">${['w','h'].filter(isKeto).map(p=>`<option value="${p}"${p===e.p?' selected':''}>${PERSON_NAMES[p]}</option>`).join('')}</select>`:`<small>${PERSON_NAMES[e.p]}</small>`}</div>
 <p class="simple-meal-scope">${e.scope?'This saved week only':state.view==='day'?'This day’s week only':'Weekly template'}</p>
 ${!kept(e.day,e.m)?'<p>This meal is skipped. Enable it in Day options to edit its foods.</p>':locked?'<p>This meal uses a prepared batch. Its saved ingredients and portions stay fixed.</p>':`<div class="simple-meal-choice"><label>Dish<select data-meal-recipe><option value="custom"${recipe==='custom'?' selected':''}>${!cfg.quantity&&e.m!=='b'&&personRecipe(e.day,e.p)==='S12'?'Shared paneer bhurji':'Current / custom'}</option>${options.map(([id,label])=>`<option value="${id}"${id===recipe?' selected':''}>${esc(uxMealText(label))}</option>`).join('')}</select></label>${cfg.protein==='eggs'&&!ready?`<label>Egg preparation<select data-meal-preparation>${Object.entries(EGG_PREPARATIONS).map(([id,label])=>`<option value="${id}"${(cfg.eggPreparation||'planned')===id?' selected':''}>${label}</option>`).join('')}</select></label>`:''}</div>
 <div class="simple-meal-fields">${visible.map(mealEditorField).join('')}</div><div class="simple-meal-page" data-meal-pages></div>
 <div class="simple-meal-add"><select data-meal-add aria-label="Add food"><option value="">+ Add food</option>${unused.map(k=>`<option value="${k}">${k==='quantity'?cfg.protein==='chicken'?'Chicken':cfg.protein==='eggs'?'Whole eggs':'Paneer':MEAL_FIELDS[k][0]}</option>`).join('')}</select><small>Food weights before cooking. Oil counted separately.</small></div>`}
 <div class="simple-meal-summary" aria-live="polite">${mealEditorSummary()}</div><p class="simple-meal-error" role="status" data-meal-error></p><div class="simple-meal-footer">${e.p==='h'&&!ketoSuggestionIsPast(e.i)?'<button type="button" data-meal-suggest title="Preview new lunch and dinner portions with whey balanced for the whole day">Suggest day</button>':''}<button type="button" data-meal-cancel>Cancel</button><button type="button" class="primary" data-meal-save${mealEditorDirty()?'':' disabled'}>Save</button></div>`;
 fitMealEditor();
}
function fitMealEditor(){
 if(!document.querySelector('#dlg.simple-meal-dialog[open]')||!mealEditor)return;
 const area=document.querySelector('.simple-meal-fields'),pager=document.querySelector('[data-meal-pages]');if(!area||!pager)return;
 const fields=[...area.children];fields.forEach(x=>x.hidden=false);pager.innerHTML='';
 // Two-column portions, with small pages only when the viewport cannot fit the active foods.
 const rowHeight=Math.max(1,...fields.map(x=>x.getBoundingClientRect().height))+8,rows=Math.max(1,Math.floor(area.clientHeight/rowHeight)),size=rows*2,pages=Math.ceil(fields.length/size);
 mealEditor.page=Math.min(mealEditor.page,Math.max(0,pages-1));
 if(pages>1){pager.innerHTML=Array.from({length:pages},(_,n)=>`<button type="button" data-meal-page="${n}" aria-pressed="${n===mealEditor.page}">${n+1}</button>`).join('');fields.forEach((x,n)=>x.hidden=Math.floor(n/size)!==mealEditor.page);}
}
function mealEditorError(message){document.querySelector('[data-meal-error]').textContent=message;fitMealEditor();}
function mealEditorRefreshSummary(){if(mealEditor.autoWhey){const whey=document.querySelector('[data-meal-field="whey"]');if(whey)whey.value=mealEditorValue('whey');}document.querySelector('.simple-meal-summary').innerHTML=mealEditorSummary();document.querySelector('[data-meal-save]').disabled=!mealEditorDirty();document.querySelector('[data-meal-error]').textContent='';fitMealEditor();}
function commitMealEditor(){
 const e=mealEditor;if(!e||!cloudReady||cloudSaving)return false;
 if(e.nutritionGuard!==undefined&&deferredCloud&&householdRevision(deferredCloud)!==e.nutritionGuard)throw Error('The household changed. Close and reopen before recalculating.');
 if(state.weekKey!==e.scope)throw Error('The selected week changed. Reopen this meal.');
 const [oldDay,oldDrafts]=JSON.parse(e.original),changed=Object.entries(e.drafts).filter(([id,cfg])=>JSON.stringify(cfg)!==JSON.stringify(oldDrafts[id]));
 if(!changed.length&&JSON.stringify(oldDay)===JSON.stringify(e.day))return false;
 if(JSON.stringify(state.days[e.i])!==JSON.stringify(oldDay)||changed.some(([id])=>{const[p,m]=id.split('/');return JSON.stringify(ketoConfig(state.days[e.i],p,m,e.i))!==JSON.stringify(oldDrafts[id]);}))throw Error('This meal changed while you were editing. Close and reopen it.');
 for(const [id,cfg]of changed){const [p,m]=id.split('/');if(coveredComponent(state.days[e.i],m,p,'protein'))throw Error('This meal now belongs to a prepared batch. Reopen it.');MealCloud.validateRecord(ketoMealKey(e.i,p,m),cfg);}
 const values={...cloudDraft};for(const [id,cfg]of Object.entries(e.drafts)){const [p,m]=id.split('/');values[ketoMealKey(e.i,p,m)]=cfg;}const dayKey=(state.weekKey?'week/'+state.weekKey:'template')+'/day/'+e.i;values[dayKey]={...values[dayKey],meal:e.day};
 const rows=Object.entries(values).map(([key,value])=>({key,value}));MealCloud.validateKetoWheyTotals(rows);MealCloud.validateKetoNuts(rows);
 if(state.view==='day'&&!state.weekKey){const mon=mondayOf(dayViewISO());copyDietScope('template',mon);lockedWeeks[mon]={days:structuredClone(state.days),utDay:structuredClone(state.utDay),savedAt:Date.now()};state.weekKey=mon;}
 state.days[e.i]=structuredClone(e.day);for(const [id,cfg]of changed){const [p,m]=id.split('/');ketoMeals[ketoMealKey(e.i,p,m)]=structuredClone(cfg);}
 save();render();return true;
}
async function saveMealEditor(){
 const e=mealEditor;if(e.saving)return;
 try{
  for(const el of document.querySelectorAll('[data-meal-field]'))if(!el.checkValidity()){el.reportValidity();return;}
  if(!e.applied){if(!commitMealEditor())return;e.applied=true;}
  e.saving=true;document.querySelectorAll('#dlg button,#dlg input,#dlg select').forEach(x=>x.disabled=true);
  if(await saveChanges(e.nutritionGuard))document.querySelector('#dlg').close();
  else{mealEditorError(syncStatusText+' Changes are kept in this tab. Retry saving or close the editor.');const cancel=document.querySelector('[data-meal-cancel]'),save=document.querySelector('[data-meal-save]');cancel.textContent='Close';cancel.disabled=false;save.textContent='Retry save';save.disabled=false;const close=document.querySelector('#dlg .dialog-close');if(close)close.disabled=false;}
 }catch(error){mealEditorError(error.message);}finally{e.saving=false;const close=document.querySelector('#dlg .dialog-close');if(close)close.disabled=false;}
}
function openMealDayOptions(){
 const e=mealEditor;if(mealEditorDirty()){mealEditorError('Save or cancel your meal changes before opening Day options.');return;}
 document.querySelector('#dlg').close();openEdit(e.i,state.view==='day'?dayViewISO():undefined,true);
}
document.addEventListener('click',e=>{
 const open=e.target.closest?.('[data-meal-edit]');if(open){const [i,m,p]=open.dataset.mealEdit.split('|');openMealEditor(Number(i),m||'b',p||'h');return;}
 if(!e.target.closest?.('#dlg.simple-meal-dialog'))return;
 if(mealEditor.saving)return;
 if(e.target.closest('[data-meal-cancel]')){document.querySelector('#dlg').close();return;}
 if(e.target.closest('[data-meal-save]')){saveMealEditor();return;}
 if(e.target.closest('[data-meal-day-options]')){openMealDayOptions();return;}
 if(mealEditor.applied)return;
 if(e.target.closest('[data-meal-balance]')){try{if(mealEditor.autoWhey){mealEditor.autoWhey=false;renderMealEditor();}else{mealEditorBalanceWhey();renderMealEditor();}}catch(error){mealEditorError(error.message);}return;}
 if(e.target.closest('[data-meal-suggest]')){try{mealEditorSuggestDay();renderMealEditor();}catch(error){mealEditorError(error.message);}return;}
 const tab=e.target.closest('[data-meal-tab]'),page=e.target.closest('[data-meal-page]'),egg=e.target.closest('[data-meal-egg]');
 if(tab){mealEditor.m=tab.dataset.mealTab;mealEditor.added={};mealEditor.page=0;renderMealEditor();}
 if(page){mealEditor.page=Number(page.dataset.mealPage);fitMealEditor();}
 if(egg){try{mealEditorSet('quantity',mealEditorCurrent().quantity+Number(egg.dataset.mealEgg));renderMealEditor();}catch(error){mealEditorError(error.message);}}
});
document.addEventListener('input',e=>{const el=e.target.closest?.('[data-meal-field]');if(!el||!el.checkValidity())return;try{mealEditorSet(el.dataset.mealField,Number(el.value));mealEditorRefreshSummary();}catch(error){mealEditorError(error.message);}});
document.addEventListener('change',e=>{const el=e.target;if(!el.closest?.('#dlg.simple-meal-dialog')||mealEditor.applied||mealEditor.saving)return;try{
 if(el.matches('[data-meal-recipe]')){mealEditorPick(el.value);renderMealEditor();}
 if(el.matches('[data-meal-preparation]')){mealEditorCurrent().eggPreparation=el.value;if(mealEditor.p==='h'&&mealEditor.autoWhey)mealEditorBalanceWhey();mealEditorRefreshSummary();}
 if(el.matches('[data-meal-person]')){mealEditor.p=el.value;mealEditor.added={};mealEditor.page=0;renderMealEditor();}
 if(el.matches('[data-meal-add]')&&el.value){const k=el.value;mealEditor.added[k]=true;renderMealEditor();const fields=[...document.querySelectorAll('[data-meal-item]')],n=fields.findIndex(x=>x.querySelector(`[data-meal-field="${k}"]`));if(n>=0){const shown=fields.filter(x=>!x.hidden).length;mealEditor.page=Math.floor(n/Math.max(1,shown));fitMealEditor();document.querySelector(`[data-meal-field="${k}"]`)?.focus();}}
 }catch(error){mealEditorError(error.message);}
});
window.addEventListener('resize',fitMealEditor);
document.addEventListener('DOMContentLoaded',()=>document.querySelector('#dlg').addEventListener('close',()=>{document.querySelector('#dlg').classList.remove('simple-meal-dialog');}));
