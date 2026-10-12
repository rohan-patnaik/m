// Household assignments are independent of the comparison route and Balanced templates.
const KETO_OPTION_DEFAULTS={targetK:2000,pMin:120,pMax:150,carbBudget:30,baselineWeight:75,baselineWaist:0,startDate:'2026-10-11',reviewWeeks:6};
let householdDiets={w:'balanced',h:'keto'},ketoOptions={...KETO_OPTION_DEFAULTS},sharedRecipes={},trialChecks={},balancedCurdType='curdH';
const FOOD_CHOICE_DEFAULTS={paneer:'paneerMM',butter:'butter',nuts:'cashews'};
let foodChoices={...FOOD_CHOICE_DEFAULTS};
const paneerId=()=>foodChoices.paneer;
const butterId=()=>foodChoices.butter;
const nutsId=()=>foodChoices.nuts;
function updateFoodChoice(field,value){if(!cloudReady||cloudSaving)return false;const next={...foodChoices,[field]:value};MealCloud.validateRecord('setting/foodChoices',next);foodChoices=next;save();render();return true;}
function plannedRecipe(recipe,scope){return recipe==='K3'&&(scope==='template'||scope>=mondayOf(dayViewISO()))?'K5':recipe;}
const isKeto=p=>householdDiets[p]==='keto';
const sharedKey=i=>`keto/shared/${state.weekKey||'template'}/day/${i}`;
const KETO_SHARED={K1:'Cabbage',K2:'Cauliflower',K3:'Spinach',K4:'Bhindi',K5:'Spinach corn sabzi'};
// Historical recipes stay readable but are not offered for new selections.
const KETO_RETIRED=['K3'];
function sharedRecipe(day,date=mealDate(day)){const i=date?(new Date(date+'T12:00:00Z').getUTCDay()+6)%7:Math.max(0,state.days.indexOf(day)),scope=date?mondayOf(date):state.weekKey||'template';return sharedRecipes[`keto/shared/${scope}/day/${i}`]?.recipe||day.s;}
function recipeRecordKey(day,date=mealDate(day)){const i=date?(new Date(date+'T12:00:00Z').getUTCDay()+6)%7:Math.max(0,state.days.indexOf(day));return `keto/shared/${date?mondayOf(date):state.weekKey||'template'}/day/${i}`;}
function personRecipe(day,p,date=mealDate(day)){const scope=date?mondayOf(date):state.weekKey||'template';return plannedRecipe(sharedRecipes[recipeRecordKey(day,date)]?.[p]||sharedRecipe(day,date),scope);}
function recipeName(recipe){return KETO_SHARED[recipe]||SABZIS[recipe]||recipe;}
function assignedRecipesChanged(day){return ['w','h'].some(p=>personRecipe(day,p)!==day.s);}
function differentSabzis(day){return personRecipe(day,'w')!==personRecipe(day,'h');}
function assignedBalancedDay(day,p){return {...day,s:personRecipe(day,p)};}
function ketoVegetableBase(recipe){if(recipe==='K5')return [L('palak',500),L('corn',100),L('onion',20),L('tomato',40)];const id={K1:'cabbage',K2:'gobi',K3:'palak',K4:'bhindi'}[recipe];return id?[L(id,500),L('onion',20),L('tomato',40)]:sabziBase(recipe);}
function sharedSabzi(day){return [...ketoVegetableBase(sharedRecipe(day)),L('oil',oilUse().sabzi)];}
function personSabzi(day,p){return [...ketoVegetableBase(personRecipe(day,p)),L('oil',oilUse().sabzi)];}
function assignedDalShare(p){return isKeto(p)?0:dalShare(p);}
function ketoComponent(day,p,m,component){
 if(!kept(day,m))return [];
 const cfg=ketoConfig(day,p,m);
 if(component==='sabzi'&&['l','d'].includes(m))return personSabzi(day,p).map(x=>L(x.id,x.q*cfg.sabziFraction));
 if(component==='protein'){if(m!=='b'&&personRecipe(day,p)==='S12')return [];return [L(cfg.protein==='eggs'?'egg':cfg.protein==='paneer'?cfg.paneerType:'chicken',cfg.quantity),...(cfg.soya?[L(soyaId(),cfg.soya)]:[]),...(cfg.oil?[L('oil',cfg.oil)]:[])];}
 return [];
}
function householdKetoBase(day,p,m){
 if(!kept(day,m)||m==='e')return [];
 const cfg=ketoConfig(day,p,m),h=p==='h';
 const a=[...ketoComponent(day,p,m,'protein'),...ketoComponent(day,p,m,'sabzi'),L('cucumber',cfg.cucumber)];
 if(m==='b'&&(h?day.wheyH:day.wheyW))a.push(L('whey',1));
 if(cfg.curd)a.push(L(cfg.curdType,cfg.curd));
 if(cfg.milk)a.push(L('milk',cfg.milk));if(cfg.butter)a.push(L(butterId(),cfg.butter));
 if(cfg.cashews)a.push(L('cashews',cfg.cashews));
 if(cfg.walnuts)a.push(L('walnuts',cfg.walnuts));if(cfg.flax)a.push(L('flax',cfg.flax));
 if(m!=='b')a.push(L('spice',1));return a;
}
function assignedBaseMeal(day,m,p){
 if(isKeto(p))return householdKetoBase(day,p,m);
 const effective=assignedBalancedDay(day,p);let a=baseMeal(effective,m,p);
 if(kept(day,m)&&['l','d'].includes(m)&&personRecipe(day,p)!==effective.s){a=subtractIngredients(a,balancedOriginalComponent(effective,m,p,'sabzi'));a.push(...personSabzi(day,p).map(x=>L(x.id,x.q*balancedSabShare(effective,p,m))));}
 return a;
}
function ketoActualMeal(day,p,m){let a=householdKetoBase(day,p,m);const date=mealDate(day);if(date&&kept(day,m)&&['l','d'].includes(m))for(const c of ['sabzi','protein'])if(coveredComponent(day,m,p,c)){a=subtractIngredients(a,ketoComponent(day,p,m,c));const link=batchLink(date,m,p,c);if(link)a.push(...BatchMath.portionLines(link.batch,link.serving));}return a;}
function assignedDayNutrition(i,p){const t=comparisonEmpty();for(const m of ['b','l','d','e'])comparisonAdd(t,comparisonSum(meal(state.days[i],m,p)));return t;}
function ketoDayNutrition(i,p){const t=comparisonEmpty();for(const m of ['b','l','d','e'])comparisonAdd(t,comparisonSum(ketoActualMeal(state.days[i],p,m)));return t;}
function dailyPlanChecks(t,p){
 const issues=[];if(!t.k)return ['Home meals not counted; restaurant intake unknown'];
 if(p==='h'){if(t.k<ketoOptions.targetK-100||t.k>ketoOptions.targetK+100)issues.push(`${R(t.k)} kcal vs ${ketoOptions.targetK-100}–${ketoOptions.targetK+100} working range`);if(t.p<ketoOptions.pMin||t.p>ketoOptions.pMax)issues.push(`${F(t.p)} g protein vs ${ketoOptions.pMin}–${ketoOptions.pMax} g`);}else issues.push('Wife calorie/protein targets unconfirmed');
 if(t.aHi>ketoOptions.carbBudget)issues.push(`Counted available carbs up to ${F(t.aHi)} g exceed ${ketoOptions.carbBudget} g budget`);else if(t.carbUnknown)issues.push('Carb check unverified: ingredient data missing');else issues.push('Within counted carb budget; ketosis is not confirmed');
 if(t.fb<25)issues.push(`Counted fibre ${F(t.fb)} g below 25 g benchmark; undeclared fibre unknown`);
 if(t.sat*9/t.k>.1)issues.push(`Saturated fat ≥${F(t.sat*9/t.k*100)}% of energy, above 10% reference`);return issues;
}
function householdPrep(i){
 const d=state.days[i];if(d.off)return [['Note',['Eating out — no home meals planned']]];
 const format=a=>aggregateBatchLines(a).map(x=>`${DB[x.id]?.[0]||x.id} — ${F(x.q)} ${DB[x.id]?.[3]||'g'}`);
 const groups=[];
 if(differentSabzis(d)){for(const p of ['w','h']){const lines=['l','d'].flatMap(m=>coveredComponent(d,m,p,'sabzi')?[]:originalComponent(d,m,p,'sabzi'));if(lines.length)groups.push(['Cook · '+PERSON_NAMES[p]+' '+recipeName(personRecipe(d,p))+' (once for lunch + dinner)',format(lines)]);}}
 else{const sab=freshSabziLines(d);if(sab.length)groups.push(['Cook · one shared '+recipeName(sharedRecipe(d))+' batch',format(sab)]);}
 const dal=[];for(const p of ['w','h'])if(!isKeto(p))for(const m of ['l','d'])if(kept(d,m))dal.push(L(d.dal,150*dalShare(p)),L('oil',oilUse().dal*dalShare(p)));if(dal.length)groups.push(['Cook · one dal batch for Balanced portions',format(dal)]);
 for(const p of ['w','h']){
  if(!isKeto(p)){const bf=kept(d,'b')?freshMeal(d,'b',p):[];if(bf.length)groups.push(['Cook · '+PERSON_NAMES[p]+' Balanced breakfast',format(bf)]);const extras=[];for(const m of ['l','d','e']){let rest=freshMeal(d,m,p);if(['l','d'].includes(m)){if(!coveredComponent(d,m,p,'sabzi'))rest=subtractIngredients(rest,originalComponent(d,m,p,'sabzi'));rest=subtractIngredients(rest,[L(d.dal,150*dalShare(p)),L('oil',oilUse().dal*dalShare(p))]);}extras.push(...rest);}if(extras.length)groups.push([PERSON_NAMES[p]+' · Balanced starch / protein / dairy / extras',format(extras)]);continue;}
  const ready=[],cook=[];for(const m of ['b','l','d']){if(!kept(d,m))continue;const cfg=ketoConfig(d,p,m);const extra=subtractIngredients(freshMeal(d,m,p),coveredComponent(d,m,p,'sabzi')?[]:ketoComponent(d,p,m,'sabzi'));for(const x of extra)(['egg','chicken','soyN','soyS'].includes(x.id)||x.id==='oil'?cook:ready).push(x);}
  if(cook.length)groups.push([PERSON_NAMES[p]+' · self-cooked protein (one batch; reserve portions if needed)',format(cook)]);
  if(ready.length)groups.push([PERSON_NAMES[p]+' · ready portions / no extra cooked recipe',format(ready)]);
 }
 return groups;
}
function assignedBalancedTitle(day,p,m){
 if(!kept(day,m)||m==='b'||m==='e')return ketoBefore(day,p,m);
 const date=mealDate(day),prepared=date&&batchLink(date,m,p,'sabzi'),recipe=personRecipe(day,p);
 return (prepared?batchName(prepared.batch):recipeName(recipe))+' + '+DALNAMES[day.dal]+' dal + '+(m==='l'&&p==='h'?'rice':'roti')+(m==='l'?' + curd':NO_EXTRA(recipe)?'':' + dinner protein');
}
function recipeSelectorsHTML(day,i){
 const record=sharedRecipes[sharedKey(i)]||{};
 const options=selected=>`<optgroup label="All sabzis">${Object.entries(SABZIS).map(([id,n])=>`<option value="${id}"${selected===id?' selected':''}>${esc(n)}</option>`).join('')}</optgroup><optgroup label="Vegetable bases">${Object.entries(KETO_SHARED).filter(([id])=>!KETO_RETIRED.includes(id)||id===selected).map(([id,n])=>`<option value="${id}"${selected===id?' selected':''}>${esc(n)}</option>`).join('')}</optgroup>`;
 return `<div class="keto-fields recipe-selectors"><label>Shared sabzi<select aria-label="${DAYS[i]} shared sabzi" data-recipe-day="${i}" data-recipe-person="shared"><option value="original"${record.recipe?'':' selected'}>Saved menu: ${esc(SABZIS[day.s])}</option>${options(record.recipe)}</select></label>${['w','h'].map(p=>`<label>${PERSON_NAMES[p]} sabzi<select aria-label="${DAYS[i]} ${PERSON_NAMES[p]} sabzi" data-recipe-day="${i}" data-recipe-person="${p}"><option value="shared"${record[p]?'':' selected'}>Use shared: ${esc(recipeName(sharedRecipe(day)))}</option>${options(record[p])}</select></label>`).join('')}</div>`;
}
function householdAssignmentHTML(){return `<section class="keto-review"><h3>Household diets</h3><div class="household-assignments">${['w','h'].map(p=>`<div><b>${PERSON_NAMES[p]}</b><div class="keto-protein-choices" role="group" aria-label="${PERSON_NAMES[p]} diet">${['balanced','keto'].map(x=>`<button data-person-diet="${p}" data-assignment="${x}" aria-pressed="${householdDiets[p]===x}">${x==='keto'?'Strict keto':'Balanced'}</button>`).join('')}</div></div>`).join('')}</div><p>Diet choices update meals, shopping and prep. Your saved Balanced menus remain available.</p></section>`;}
function trialHTML(){const mon=state.weekKey||mondayOf(dayViewISO()),r=trialChecks[mon]||{};const field=(key,label,value,min,max,step=1)=>`<label>${label}<input type="number" min="${min}" max="${max}" step="${step}" value="${value||''}" data-trial-field="${key}"></label>`;
 return `<details class="keto-info"><summary>Fullness and 4–6 week trial review</summary><div>${r.hunger>=4?'<p class="keto-plan-status">High hunger recorded: review meal portions and the calorie target before cutting food further. If satisfying portions cannot fit the carb budget, reconsider the trial or use Balanced.</p>':''}<p>Protein at every meal, the shared vegetable batch, cucumber, measured curd, 10 g of cashews once a day at breakfast and ground flax support fullness. Nuts and seeds are counted foods, not unlimited snacks. You can keep part of the planned cashews or curd for between meals instead of adding extra food. Cashews and flax are generic USDA estimates. Increase fibre gradually with fluids if these foods are new to you. Persistent hunger means review portions or the diet; zero cravings cannot be promised.</p><p>Husband: 75 kg · 172.72 cm · 29 years · 45 min daily strength training. Resting-energy estimate 1689.5 kcal; maintenance is unconfirmed. Starting intake ${ketoOptions.targetK} kcal and ${ketoOptions.pMin}–${ketoOptions.pMax} g protein are editable planning estimates, not measured needs. No exercise calories added. <a href="https://pubmed.ncbi.nlm.nih.gov/2305711/" target="_blank" rel="noopener">Energy equation</a> · <a href="https://pubmed.ncbi.nlm.nih.gov/28642676/" target="_blank" rel="noopener">Protein evidence</a></p><div class="keto-fields">${field('weight','Weekly average weight (kg)',r.weight,30,250,.1)}${field('waist','Waist (cm)',r.waist,30,200,.1)}${field('hunger','Hunger / cravings (1 low – 5 high)',r.hunger,1,5)}</div><div class="keto-fields">${['strength','energy','bowel'].map(k=>`<label>${{strength:'Strength',energy:'Energy',bowel:'Bowel comfort'}[k]}<select data-trial-field="${k}"><option value="">Not recorded</option>${['good','stable','worse'].map(v=>`<option value="${v}"${r[k]===v?' selected':''}>${v}</option>`).join('')}</select></label>`).join('')}</div><p>Baseline: ${ketoOptions.baselineWeight} kg${ketoOptions.baselineWaist?' · '+ketoOptions.baselineWaist+' cm waist':' · waist not set'}. Planned start ${esc(ketoOptions.startDate)}; review by ${fmtMon(addDate(ketoOptions.startDate,ketoOptions.reviewWeeks*7))}. First-week water loss is not measured fat loss. Compare weekly weight/waist with strength, energy, hunger and bowel comfort.</p><div class="keto-fields">${[['targetK','Husband kcal target',1000,3500],['pMin','Protein minimum (g)',60,200],['pMax','Protein maximum (g)',60,250],['carbBudget','Counted available-carb budget (g)',15,100],['baselineWeight','Baseline weight (kg)',30,250],['baselineWaist','Baseline waist (cm)',0,200],['reviewWeeks','Review after weeks',4,6]].map(([key,label,min,max])=>`<label>${label}<input type="number" min="${min}" max="${max}" value="${ketoOptions[key]}" data-keto-option="${key}"></label>`).join('')}<label>Trial start<input type="date" value="${ketoOptions.startDate}" data-keto-option="startDate"></label></div></div></details>`;
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-person-diet]');if(b&&cloudReady&&!cloudSaving){householdDiets[b.dataset.personDiet]=b.dataset.assignment;save();render();}
});
function updateRecipe(i,p,recipe){
 if(!cloudReady||cloudSaving||!Number.isInteger(i)||i<0||i>6)return false;
 if(!['shared','w','h'].includes(p)||recipe!=='original'&&recipe!=='shared'&&!Object.hasOwn({...SABZIS,...KETO_SHARED},recipe))throw Error('Invalid sabzi selection');
 const key=sharedKey(i),next={...sharedRecipes[key]};
 if(p==='shared'){if(recipe==='original')delete next.recipe;else next.recipe=recipe;}else{if(recipe==='shared')delete next[p];else next[p]=recipe;}
 if(Object.keys(next).length){MealCloud.validateRecord(key,next);sharedRecipes[key]=next;}else delete sharedRecipes[key];
 save();render();return true;
}
document.addEventListener('change',e=>{const t=e.target;if(!cloudReady||cloudSaving)return;
 if(t.hasAttribute('data-recipe-person')){updateRecipe(Number(t.dataset.recipeDay),t.dataset.recipePerson,t.value);return;}
 if(t.hasAttribute('data-balanced-curd')){balancedCurdType=t.value==='curd'?'curd':'curdH';save();render();return;}
 if(t.dataset.ketoOption){t.setCustomValidity('');if(!t.checkValidity()){t.reportValidity();return;}const next={...ketoOptions,[t.dataset.ketoOption]:t.dataset.ketoOption==='startDate'?t.value:Number(t.value)};try{MealCloud.validateRecord('setting/ketoOptions',next);}catch(error){t.setCustomValidity(error.message);t.reportValidity();return;}ketoOptions=next;save();renderKeto();}
 if(t.dataset.trialField){t.setCustomValidity('');if(!t.checkValidity()){t.reportValidity();return;}const mon=state.weekKey||mondayOf(dayViewISO()),next={...trialChecks[mon]},k=t.dataset.trialField;if(t.value==='')delete next[k];else next[k]=['weight','waist','hunger'].includes(k)?Number(t.value):t.value;try{MealCloud.validateRecord('keto/trial/'+mon,next);}catch(error){t.setCustomValidity(error.message);t.reportValidity();return;}trialChecks[mon]=next;save();renderKeto();}
});
