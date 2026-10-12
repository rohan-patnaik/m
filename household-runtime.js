// Household assignments are independent of the comparison route and Balanced templates.
const KETO_OPTION_DEFAULTS={targetK:2000,pMin:120,pMax:165,carbBudget:50,baselineWeight:75,baselineWaist:0,startDate:'2026-10-11',reviewWeeks:6};
let householdDiets={w:'balanced',h:'keto'},ketoOptions={...KETO_OPTION_DEFAULTS},sharedRecipes={},trialChecks={},balancedCurdType='curdH';
const FOOD_CHOICE_DEFAULTS={paneer:'paneerMM',butter:'butter',nuts:'cashews'};
let foodChoices={...FOOD_CHOICE_DEFAULTS};
const paneerId=()=>foodChoices.paneer;
const butterId=()=>foodChoices.butter;
const nutsId=()=>foodChoices.nuts;
function updateFoodChoice(field,value){if(!cloudReady||cloudSaving)return false;const next={...foodChoices,[field]:value};MealCloud.validateRecord('setting/foodChoices',next);foodChoices=next;save();render();return true;}
const NUTRITION_EFFECTIVE_WEEK='2026-10-12';
function plannedRecipe(recipe,scope){return recipe==='K3'&&(scope==='template'||scope>=NUTRITION_EFFECTIVE_WEEK)?'K5':recipe;}
const isKeto=p=>householdDiets[p]==='keto';
const sharedKey=i=>`keto/shared/${state.weekKey||'template'}/day/${i}`;
function copyDietScope(source,target){
 if(source===target)return;
 for(const [records,prefix]of [[ketoMeals,'keto/'],[sharedRecipes,'keto/shared/']]){
  const from=prefix+source+'/',to=prefix+target+'/';
  const copied=Object.entries(records).filter(([k])=>k.startsWith(from)).map(([k,v])=>[to+k.slice(from.length),structuredClone(v)]);
  for(const key of Object.keys(records))if(key.startsWith(to))delete records[key];
  for(const [key,value]of copied)records[key]=value;
 }
}
const KETO_SHARED={K1:'Cabbage',K2:'Cauliflower',K3:'Spinach',K4:'Bhindi',K5:'Spinach corn sabzi'};
// Historical recipes stay readable but are not offered for new selections.
const KETO_RETIRED=['K3'];
function sharedRecipe(day,date=mealDate(day)){const i=date?(new Date(date+'T12:00:00Z').getUTCDay()+6)%7:Math.max(0,state.days.indexOf(day)),scope=date?mondayOf(date):state.weekKey||'template';return plannedRecipe(sharedRecipes[`keto/shared/${scope}/day/${i}`]?.recipe||day.s,scope);}
function recipeRecordKey(day,date=mealDate(day)){const i=date?(new Date(date+'T12:00:00Z').getUTCDay()+6)%7:Math.max(0,state.days.indexOf(day));return `keto/shared/${date?mondayOf(date):state.weekKey||'template'}/day/${i}`;}
function personRecipe(day,p,date=mealDate(day)){const scope=date?mondayOf(date):state.weekKey||'template';return plannedRecipe(sharedRecipes[recipeRecordKey(day,date)]?.[p]||sharedRecipe(day,date),scope);}
function recipeName(recipe){return KETO_SHARED[recipe]||SABZIS[recipe]||recipe;}
function assignedRecipesChanged(day){return ['w','h'].some(p=>personRecipe(day,p)!==day.s);}
function differentSabzis(day){return personRecipe(day,'w')!==personRecipe(day,'h');}
function assignedBalancedDay(day,p,date=mealDate(day)){return {...day,s:personRecipe(day,p,date)};}
function ketoVegetableBase(recipe){if(recipe==='K5')return [L('palak',500),L('corn',100),L('onion',20),L('tomato',40)];const id={K1:'cabbage',K2:'gobi',K3:'palak',K4:'bhindi'}[recipe];return id?[L(id,500),L('onion',20),L('tomato',40)]:sabziBase(recipe);}
function sharedSabzi(day){return [...ketoVegetableBase(sharedRecipe(day)),L('oil',oilUse().sabzi)];}
function personSabzi(day,p,date=mealDate(day)){return [...ketoVegetableBase(personRecipe(day,p,date)),L('oil',oilUse().sabzi)];}
function assignedDalShare(p){return isKeto(p)?0:dalShare(p);}
function ketoComponent(day,p,m,component,cfg=ketoConfig(day,p,m)){
 if(!kept(day,m))return [];
 if(component==='sabzi'&&['l','d'].includes(m))return personSabzi(day,p).map(x=>L(x.id,x.q*cfg.sabziFraction));
 if(component==='protein'){
  const extras=[...(cfg.eggWhites?[L('eggWhite',cfg.eggWhites)]:[]),...(cfg.spinach?[L('palak',cfg.spinach)]:[]),...(m==='b'?['mushroom','tomato','onion'].filter(id=>cfg[id]>0).map(id=>L(id,cfg[id])):[])];
  if(m!=='b'&&personRecipe(day,p)==='S12')return [...extras,...(extras.length&&cfg.oil?[L('oil',cfg.oil)]:[])];
  return [...extras,L(cfg.protein==='eggs'?'egg':cfg.protein==='paneer'?cfg.paneerType:'chicken',cfg.quantity),...(cfg.soya?[L(soyaId(),cfg.soya)]:[]),...(cfg.oil?[L('oil',cfg.oil)]:[])];
 }
 return [];
}
function householdKetoBase(day,p,m,cfg=ketoConfig(day,p,m)){
 if(!kept(day,m)||m==='e')return [];
 const h=p==='h';
 const a=[...ketoComponent(day,p,m,'protein',cfg),...ketoComponent(day,p,m,'sabzi',cfg),L('cucumber',cfg.cucumber)];
 if(m==='b'&&cfg.avocado)a.push(L('avocado',cfg.avocado));
 if(cfg.whey&&(m!=='b'||(h?day.wheyH:day.wheyW)))a.push(L('whey',cfg.whey));
 if(cfg.curd)a.push(L(cfg.curdType,cfg.curd));
 if(cfg.milk)a.push(L('milk',cfg.milk));if(cfg.butter)a.push(L(butterId(),cfg.butter));
 if(cfg.almonds)a.push(L('almonds',cfg.almonds));
 if(cfg.cashews)a.push(L('cashews',cfg.cashews));
 if(cfg.walnuts)a.push(L('walnuts',cfg.walnuts));if(cfg.flax)a.push(L('flax',cfg.flax));
 if(m!=='b')a.push(L('spice',1));return a;
}
const KETO_BREAKFASTS={
 omelette:{name:'Mushroom omelette',prep:'Cook the whole egg, extra whites, mushrooms and tomato in measured oil. Whey and weighed nuts are included sides.',portion:{protein:'eggs',quantity:1,eggWhites:4,mushroom:150,tomato:50,oil:5,whey:1,almonds:20,walnuts:25}},
 eggAvocado:{name:'Eggs & avocado',prep:'Cook the eggs and whites in measured oil; serve with weighed avocado flesh. Whey and almonds are included.',portion:{protein:'eggs',quantity:2,eggWhites:4,avocado:100,oil:5,whey:1,almonds:20}},
 paneerBhurji:{name:'Paneer bhurji',prep:'Scramble paneer with mushrooms, tomato and onion in measured oil. Whey and almonds are included.',portion:{protein:'paneer',quantity:125,mushroom:100,tomato:50,onion:20,oil:5,whey:1,almonds:15}},
 chickenBowl:{name:'Chicken & mushroom bowl',prep:'Cook raw boneless chicken with mushrooms and tomato in measured oil. Avocado, whey and almonds are included; this counts toward occasional chicken meals.',portion:{protein:'chicken',quantity:150,mushroom:150,tomato:50,avocado:125,oil:5,whey:1,almonds:15}},
 boiledEggs:{name:'3 boiled eggs',prep:'Boil three whole eggs. Whey, weighed nuts and avocado are counted sides; no cooking oil.',portion:{protein:'eggs',quantity:3,oil:0,whey:1,almonds:20,walnuts:25,avocado:50}},
 eggPoach:{name:'3 Egg Poach',prep:'Sunny-side-up eggs (your requested label): cook three whole eggs in 5 ml measured oil. Whey, weighed nuts and avocado are counted sides. Water-poached eggs need no oil; edit oil to zero for that method.',portion:{protein:'eggs',quantity:3,oil:5,whey:1,almonds:20,walnuts:25,avocado:50}},
 dahiBowl:{name:'Dahi protein bowl',prep:'Mix plain dahi with whey; add the weighed nuts. Avocado is a separate side. No added oil.',portion:{protein:'paneer',quantity:0,curd:100,whey:1.5,avocado:50,almonds:20,walnuts:20}}
};
function ketoBreakfastName(cfg){return KETO_BREAKFASTS[cfg.breakfastRecipe]?.name||(cfg.protein==='eggs'?(cfg.spinach?'Egg & spinach scramble':'Egg breakfast'):cfg.protein==='chicken'?'Chicken breakfast':cfg.quantity?'Paneer breakfast':'Protein breakfast');}
function ketoBreakfastOptions(i,p){
 const day=state.days[i],old=ketoConfig(day,p,'b',i),rest=comparisonEmpty();
 for(const m of ['l','d','e'])comparisonAdd(rest,comparisonSum(meal(day,m,p)));
 return Object.entries(KETO_BREAKFASTS).filter(([,x])=>p==='h'||x.portion.protein==='paneer').map(([id,x])=>{
  const config={...old,spinach:0,eggWhites:0,soya:0,cucumber:0,curd:0,milk:0,butter:0,almonds:0,walnuts:0,cashews:0,flax:0,avocado:0,mushroom:0,tomato:0,onion:0,sabziFraction:0,oil:0,whey:0,...x.portion,breakfastRecipe:id};
  const nutrition=comparisonSum(householdKetoBase(day,p,'b',config)),dayNutrition=comparisonAdd(comparisonAdd(comparisonEmpty(),rest),nutrition);
  const whey=(day[p==='h'?'wheyH':'wheyW']?config.whey:0)+['l','d'].reduce((q,m)=>q+(kept(day,m)?ketoConfig(day,p,m,i).whey||0:0),0);
  const otherChicken=state.days.reduce((n,d,j)=>n+['b','l','d'].filter(m=>!(j===i&&m==='b')&&meal(d,m,p).some(x=>x.id==='chicken'&&x.q>0)).length,0);
  const reason=!isKeto(p)?'Choose Keto for this person first.':!kept(day,'b')?'Breakfast is skipped.':id==='chickenBowl'&&otherChicken>=2?'Swap an existing chicken meal first to keep chicken to 1–2 meals this week.':id==='dahiBowl'&&!day[p==='h'?'wheyH':'wheyW']?'Enable breakfast whey for this recipe.':whey>3?'This would exceed 3 whey scoops today.':dayNutrition.aHi>ketoOptions.carbBudget?`This day would reach ${F(dayNutrition.aHi)} g counted carbs (budget ${ketoOptions.carbBudget} g).`:'';
  return {id,name:x.name,prep:x.prep,config,nutrition,dayNutrition,eligible:!reason,reason};
 });
}
// Reviewed breakfast rotation: real dishes, with weighed avocado to support energy and fibre.
const KETO_WEEK_BREAKFASTS=[['boiledEggs',{}],['omelette',{whey:.5,eggWhites:3,mushroom:250,avocado:25}],['dahiBowl',{curd:75,avocado:125,almonds:15}],['eggAvocado',{avocado:150}],['eggPoach',{}],['dahiBowl',{curd:75,avocado:125,almonds:15}],['eggAvocado',{avocado:150}]];
function recommendedKetoBreakfast(i){
 const [id,portion]=KETO_WEEK_BREAKFASTS[i],cfg={...ketoBreakfastOptions(i,'h').find(x=>x.id===id).config,...portion},rest=comparisonEmpty();
 for(const m of ['l','d','e'])comparisonAdd(rest,comparisonSum(meal(state.days[i],m,'h')));
 const totals=()=>comparisonAdd(comparisonAdd(comparisonEmpty(),rest),comparisonSum(householdKetoBase(state.days[i],'h','b',cfg)));
 const n=totals(),extra=Math.max(0,(2000-n.k)/1.6,(25-n.fb)/.067);
 cfg.avocado=(cfg.avocado||0)+Math.ceil(extra/5)*5;
 MealCloud.validateRecord(ketoMealKey(i,'h','b'),cfg);const t=totals();
 if(t.aHi>ketoOptions.carbBudget||t.k>2100||t.k<1900)throw Error('Breakfast rotation needs portion review for '+DAYS[i]+'.');
 return cfg;
}
// Validate Edit meal choices against its tentative day before touching any saved/draft meal.
function prepareKetoBreakfasts(i,selections,dayOverride=state.days[i]){
 const original=state.days[i],prepared={};state.days[i]=dayOverride;
 try{for(const [p,id]of Object.entries(selections)){if(!id)continue;if(!['w','h'].includes(p))throw Error('Invalid breakfast person.');const option=ketoBreakfastOptions(i,p).find(x=>x.id===id);if(!option)throw Error('Breakfast is unavailable for this person.');if(!option.eligible)throw Error(option.reason);const key=ketoMealKey(i,p,'b');MealCloud.validateRecord(key,option.config);prepared[key]=option.config;}return prepared;}finally{state.days[i]=original;}
}
function applyKetoBreakfast(i,p,id){
 if(!cloudReady||cloudSaving)return false;
 const option=ketoBreakfastOptions(i,p).find(x=>x.id===id);if(!option)throw Error('Breakfast is unavailable for this person.');if(!option.eligible)throw Error(option.reason);
 MealCloud.validateRecord(ketoMealKey(i,p,'b'),option.config);ketoMeals[ketoMealKey(i,p,'b')]=option.config;save();render();return true;
}
function ketoWheyDailyTotal(day,p){return ['b','l','d'].reduce((q,m)=>q+(!kept(day,m)||m==='b'&&!(p==='h'?day.wheyH:day.wheyW)?0:ketoConfig(day,p,m).whey||0),0);}
// Reviewed pantry-based trial. Targets describe intake; they do not confirm ketosis.
function ketoInventoryPlanAvailable(){
 return isKeto('h')&&(state.weekKey===null||!state.weekKey||state.weekKey>=NUTRITION_EFFECTIVE_WEEK)&&!state.days.some(d=>['l','d'].some(m=>['sabzi','protein'].some(c=>coveredComponent(d,m,'h',c))));
}
function applyKetoInventoryPlan(){
 if(!cloudReady||cloudSaving||!ketoInventoryPlanAvailable())return false;
 const recipes=['S1','K2','S3','K5','S12','K1','K1'];
 for(let i=0;i<7;i++){
  const day=state.days[i],recipe=recipes[i],inside=['S3','S12'].includes(recipe),chicken=[1,5].includes(i);
  if(personRecipe(day,'h')!==recipe)sharedRecipes[sharedKey(i)]={...sharedRecipes[sharedKey(i)],w:personRecipe(day,'w'),h:recipe};
  for(const m of ['b','l','d']){
   const cfg={...ketoConfig(day,'h',m,i),whey:m==='b'?1:m==='l'?(chicken?.5:1):0,
    flax:0,spinach:0,
    cashews:m==='b'&&[1,5].includes(i)?5:0,almonds:20,
    walnuts:m==='b'?([0,4].includes(i)?25:i===6?22.5:20):m==='l'?20:15,
    curd:m==='l'?(i===0?0:[2,3,4,6].includes(i)?50:75):0,curdType:'curd',
    cucumber:m==='d'?150:0,milk:0,butter:0,soya:0,paneerType:'paneerMM',
    quantity:m==='b'?(recipe==='S12'?4:1):m==='l'?(inside?0:100):(recipe==='S12'?0:chicken?250:2),
    protein:m==='b'?'eggs':m==='d'&&chicken?'chicken':m==='d'?'eggs':'paneer',
    eggWhites:m==='b'?(chicken?0:4):0,oil:m==='b'?5:m==='d'&&recipe!=='S12'?5:0,
    sabziFraction:m==='b'?0:inside?.3:i===0?.30:i===3?.26:.35};
   MealCloud.validateRecord(ketoMealKey(i,'h',m),cfg);ketoMeals[ketoMealKey(i,'h',m)]=cfg;
  }
 }
 ketoOptions={...ketoOptions,targetK:2000,pMin:120,pMax:165,carbBudget:50};
 for(let i=0;i<7;i++)ketoMeals[ketoMealKey(i,'h','b')]=recommendedKetoBreakfast(i);
 save();render();return true;
}
function assignedBaseMeal(day,m,p){
 if(isKeto(p))return householdKetoBase(day,p,m);
 const effective=assignedBalancedDay(day,p);let a=baseMeal(effective,m,p);
 if(kept(day,m)&&['l','d'].includes(m)&&personRecipe(day,p)!==effective.s){a=subtractIngredients(a,balancedOriginalComponent(effective,m,p,'sabzi'));a.push(...personSabzi(day,p).map(x=>L(x.id,x.q*balancedSabShare(effective,p,m))));}
 return a;
}
function ketoActualMeal(day,p,m){let a=householdKetoBase(day,p,m);const date=mealDate(day);if(date&&kept(day,m)&&['l','d'].includes(m))for(const c of ['sabzi','protein'])if(coveredComponent(day,m,p,c)){a=subtractIngredients(a,originalComponent(day,m,p,c,date));const link=batchLink(date,m,p,c);if(link)a.push(...BatchMath.portionLines(link.batch,link.serving));}return a;}
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
  const ready=[],cook=[];for(const m of ['b','l','d']){if(!kept(d,m))continue;const cfg=ketoConfig(d,p,m);const extra=subtractIngredients(freshMeal(d,m,p),coveredComponent(d,m,p,'sabzi')?[]:ketoComponent(d,p,m,'sabzi'));for(const x of extra)(['egg','eggWhite','palak','mushroom','tomato','onion','chicken','soyN','soyS'].includes(x.id)||x.id==='oil'?cook:ready).push(x);}
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
 // Show the recipe the math counts for this week, not a retired raw value.
 const record=Object.fromEntries(Object.entries(sharedRecipes[sharedKey(i)]||{}).map(([k,v])=>[k,v&&typeof plannedRecipe==='function'?plannedRecipe(v,state.weekKey||'template'):v]));
 const options=selected=>`<optgroup label="All sabzis">${Object.entries(SABZIS).map(([id,n])=>`<option value="${id}"${selected===id?' selected':''}>${esc(n)}</option>`).join('')}</optgroup><optgroup label="Vegetable bases">${Object.entries(KETO_SHARED).filter(([id])=>!KETO_RETIRED.includes(id)||id===selected).map(([id,n])=>`<option value="${id}"${selected===id?' selected':''}>${esc(n)}</option>`).join('')}</optgroup>`;
 return `<div class="keto-fields recipe-selectors"><label>Shared sabzi<select aria-label="${DAYS[i]} shared sabzi" data-recipe-day="${i}" data-recipe-person="shared"><option value="original"${record.recipe?'':' selected'}>Saved menu: ${esc(SABZIS[day.s])}</option>${options(record.recipe)}</select></label>${['w','h'].map(p=>`<label>${PERSON_NAMES[p]} sabzi<select aria-label="${DAYS[i]} ${PERSON_NAMES[p]} sabzi" data-recipe-day="${i}" data-recipe-person="${p}"><option value="shared"${record[p]?'':' selected'}>Use shared: ${esc(recipeName(sharedRecipe(day)))}</option>${options(record[p])}</select></label>`).join('')}</div>`;
}
function householdAssignmentHTML(){return `<section class="keto-review"><h3>Household diets</h3><div class="household-assignments">${['w','h'].map(p=>`<div><b>${PERSON_NAMES[p]}</b><div class="keto-protein-choices" role="group" aria-label="${PERSON_NAMES[p]} diet">${['balanced','keto'].map(x=>`<button data-person-diet="${p}" data-assignment="${x}" aria-pressed="${householdDiets[p]===x}">${x==='keto'?'Keto trial':'Balanced'}</button>`).join('')}</div></div>`).join('')}</div><p>Diet choices update meals, shopping and prep. Your saved Balanced menus remain available.</p></section>`;}
function trialHTML(){const mon=state.weekKey||mondayOf(dayViewISO()),r=trialChecks[mon]||{};const field=(key,label,value,min,max,step=1)=>`<label>${label}<input type="number" min="${min}" max="${max}" step="${step}" value="${value||''}" data-trial-field="${key}"></label>`;
 return `<details class="keto-info"><summary>Fullness and 4–6 week trial review</summary><div>${r.hunger>=4?'<p class="keto-plan-status">High hunger recorded: review meal portions and the calorie target before cutting food further. If satisfying portions cannot fit the carb budget, reconsider the trial or use Balanced.</p>':''}<p>Protein at every meal, the shared vegetable batch, cucumber, measured curd and measured nuts support fullness. Ground flaxseed is an optional historical field. Measured nuts are a substantial counted part of the plan (about 120 g/day in the current draft), counted foods, not free snacks. You can keep part of the planned nuts or curd for between meals instead of adding extra food. Nut values are generic USDA estimates. Increase fibre gradually with fluids if these foods are new to you. Persistent hunger means review portions or the diet; zero cravings cannot be promised.</p><p>Husband: 75 kg · 172.72 cm · 29 years · 4–5 strength sessions/week. Resting-energy estimate 1689.5 kcal; maintenance is unconfirmed. Starting intake ${ketoOptions.targetK} kcal and ${ketoOptions.pMin}–${ketoOptions.pMax} g protein are editable planning estimates, not measured needs. No exercise calories added. <a href="https://pubmed.ncbi.nlm.nih.gov/2305711/" target="_blank" rel="noopener">Energy equation</a> · <a href="https://pubmed.ncbi.nlm.nih.gov/28642676/" target="_blank" rel="noopener">Protein evidence</a></p><div class="keto-fields">${field('weight','Weekly average weight (kg)',r.weight,30,250,.1)}${field('waist','Waist (cm)',r.waist,30,200,.1)}${field('hunger','Hunger / cravings (1 low – 5 high)',r.hunger,1,5)}</div><div class="keto-fields">${['strength','energy','bowel'].map(k=>`<label>${{strength:'Strength',energy:'Energy',bowel:'Bowel comfort'}[k]}<select data-trial-field="${k}"><option value="">Not recorded</option>${['good','stable','worse'].map(v=>`<option value="${v}"${r[k]===v?' selected':''}>${v}</option>`).join('')}</select></label>`).join('')}</div><p>Baseline: ${ketoOptions.baselineWeight} kg${ketoOptions.baselineWaist?' · '+ketoOptions.baselineWaist+' cm waist':' · waist not set'}. Planned start ${esc(ketoOptions.startDate)}; review by ${fmtMon(addDate(ketoOptions.startDate,ketoOptions.reviewWeeks*7))}. First-week water loss is not measured fat loss. Compare weekly weight/waist with strength, energy, hunger and bowel comfort.</p><div class="keto-fields">${[['targetK','Husband kcal target',1000,3500],['pMin','Protein minimum (g)',60,200],['pMax','Protein maximum (g)',60,250],['carbBudget','Counted available-carb budget (g)',15,100],['baselineWeight','Baseline weight (kg)',30,250],['baselineWaist','Baseline waist (cm)',0,200],['reviewWeeks','Review after weeks',4,6]].map(([key,label,min,max])=>`<label>${label}<input type="number" min="${min}" max="${max}" value="${ketoOptions[key]}" data-keto-option="${key}"></label>`).join('')}<label>Trial start<input type="date" value="${ketoOptions.startDate}" data-keto-option="startDate"></label></div></div></details>`;
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
