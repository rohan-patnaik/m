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
 for(const [records,prefix]of [[ketoMeals,'keto/'],[sharedRecipes,'keto/shared/'],[mealExclusions,'exclude/']]){
  const from=prefix+source+'/',to=prefix+target+'/';
  const copied=Object.entries(records).filter(([k])=>k.startsWith(from)).map(([k,v])=>[to+k.slice(from.length),structuredClone(v)]);
  for(const key of Object.keys(records))if(key.startsWith(to))delete records[key];
  for(const [key,value]of copied)records[key]=value;
 }
}
const KETO_SHARED={K1:'Cabbage',K2:'Cauliflower',K3:'Spinach',K4:'Bhindi',K5:'Palak-corn sabzi'};
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
  const extras=[...(cfg.eggWhites?[L('eggWhite',cfg.eggWhites)]:[]),...(cfg.spinach?[L('palak',cfg.spinach)]:[]),...((m==='b'||cfg.mealRecipe)?['mushroom','tomato','onion'].filter(id=>cfg[id]>0).map(id=>L(id,cfg[id])):[])];
  if(m!=='b'&&personRecipe(day,p)==='S12'&&!cfg.mealRecipe)return [...extras,...(extras.length&&cfg.oil?[L('oil',cfg.oil)]:[])];
  return [...extras,L(cfg.protein==='eggs'?'egg':cfg.protein==='paneer'?cfg.paneerType:'chicken',cfg.quantity),...(cfg.soya?[L(soyaId(),cfg.soya)]:[]),...(cfg.oil?[L('oil',cfg.oil)]:[])];
 }
 return [];
}
function householdKetoBase(day,p,m,cfg=ketoConfig(day,p,m)){
 if(!kept(day,m))return [];
 if(m==='e')return p==='h'?['almonds','walnuts','cashews'].filter(id=>cfg[id]>0).map(id=>L(id,cfg[id])):[];
 const h=p==='h';
 // No cooked breakfast: only the ticked whey and ready-to-eat foods (curd, milk, nuts) from that breakfast's portions.
 if(m==='b'&&day.readyB&&day.readyB[p])return [...(cfg.whey&&(h?day.wheyH:day.wheyW)?[L('whey',cfg.whey)]:[]),...(cfg.curd?[L(cfg.curdType,cfg.curd)]:[]),...(cfg.milk?[L('milk',cfg.milk)]:[]),...['almonds','cashews','walnuts'].filter(id=>cfg[id]>0).map(id=>L(id,cfg[id]))];
 const a=[...ketoComponent(day,p,m,'protein',cfg),...ketoComponent(day,p,m,'sabzi',cfg),L('cucumber',cfg.cucumber)];
 if(cfg.avocado)a.push(L('avocado',cfg.avocado));
 if(cfg.whey&&(m!=='b'||(h?day.wheyH:day.wheyW)))a.push(L('whey',cfg.whey));
 if(cfg.curd)a.push(L(cfg.curdType,cfg.curd));
 if(cfg.milk)a.push(L('milk',cfg.milk));if(cfg.butter)a.push(L(butterId(),cfg.butter));
 if(cfg.almonds)a.push(L('almonds',cfg.almonds));
 if(cfg.cashews)a.push(L('cashews',cfg.cashews));
 if(cfg.walnuts)a.push(L('walnuts',cfg.walnuts));if(cfg.flax)a.push(L('flax',cfg.flax));
 if(m!=='b')a.push(L('spice',1));return a;
}
const KETO_NUT_IDS=['almonds','walnuts','cashews'];
function ketoEveningOnly(i,p='h'){return p==='h'&&!!ketoMeals[ketoMealKey(i,p,'e')];}
const KETO_MAINS={
 eggSpinach:{name:'Egg & spinach scramble',portion:{protein:'eggs',quantity:4,eggWhites:2,spinach:150,oil:7}},
 eggMushroom:{name:'Mushroom omelette',portion:{protein:'eggs',quantity:4,eggWhites:2,mushroom:150,tomato:50,oil:7}},
 eggCurry:{name:'Egg curry',portion:{protein:'eggs',quantity:4,tomato:80,onion:40,oil:8}},
 boiledEggMeal:{name:'4 boiled eggs & cucumber',portion:{protein:'eggs',quantity:4,cucumber:150,oil:0}},
 chickenAvocado:{name:'Chicken & avocado plate',portion:{protein:'chicken',quantity:200,avocado:200,cucumber:150,oil:10}},
 eggAvocadoPlate:{name:'Egg & avocado plate',portion:{protein:'eggs',quantity:4,avocado:150,cucumber:150,oil:5}},
 chickenPan:{name:'Chicken, mushroom & spinach pan',portion:{protein:'chicken',quantity:250,mushroom:100,spinach:100,oil:5}},
 chickenDahi:{name:'Chicken & dahi plate',portion:{protein:'chicken',quantity:250,curd:75,cucumber:150,oil:5}},
 paneerPan:{name:'Paneer & mushroom pan',portion:{protein:'paneer',quantity:150,mushroom:150,oil:5}},
 highProteinPaneer:{name:'High-protein paneer & spinach',portion:{protein:'paneer',paneerType:'paneerHP',quantity:200,spinach:150,oil:5}},
 eggSoya:{name:'Egg & soya scramble',portion:{protein:'eggs',quantity:2,soya:25,spinach:100,oil:5}}
};
function ketoMainConfig(i,p,m,id,day=state.days[i]){
 if(p!=='h'||!['l','d'].includes(m)||!KETO_MAINS[id])throw Error('Invalid lunch or dinner choice.');
 return {...ketoConfig(day,p,m,i),eggWhites:0,spinach:0,mushroom:0,tomato:0,onion:0,soya:0,curd:0,milk:0,butter:0,flax:0,cucumber:100,avocado:0,almonds:0,walnuts:0,cashews:0,paneerType:paneerId(),...KETO_MAINS[id].portion,mealRecipe:id};
}
function ketoMainPortion(cfg){return [cfg.protein==='eggs'?`${cfg.quantity} whole eggs`:`${cfg.quantity} g ${cfg.protein==='chicken'?'raw chicken':'paneer'}`,cfg.eggWhites?`${cfg.eggWhites} extra whites`:null,cfg.soya?`${cfg.soya} g dry soya`:null,...[['spinach','spinach'],['mushroom','mushrooms'],['tomato','tomato']].filter(([k])=>cfg[k]>0).map(([k,l])=>`${cfg[k]} g raw ${l}`),cfg.avocado?`${cfg.avocado} g avocado flesh`:null,cfg.curd?`${cfg.curd} g curd`:null,cfg.cucumber?`${cfg.cucumber} g cucumber`:null,`${cfg.oil} ml cooking oil`].filter(Boolean).join(' · ');}
// Stage all picks together so previews and Save use the same combined day, exclusions and batch ledger.
function prepareKetoMains(i,selections,day=state.days[i]){
 const out={};for(const m of ['l','d']){const id=selections[m];if(!id)continue;
  if(!isKeto('h'))throw Error('Choose Keto for Husband first.');
  if(coveredComponent(state.days[i],m,'h','protein')||coveredComponent(state.days[i],m,'h','sabzi'))throw Error('This meal has a prepared batch. Remove its batch before changing the dish.');
  const cfg=ketoMainConfig(i,'h',m,id,day),key=ketoMealKey(i,'h',m);MealCloud.validateRecord(key,cfg);out[key]=cfg;
 }return out;
}
function withKetoEditPreview(i,day,recipe,prepared,fn){
 const oldDay=state.days[i],oldMeals=ketoMeals,rk=sharedKey(i),oldRecipe=sharedRecipes[rk];
 state.days[i]=day;ketoMeals={...ketoMeals,...prepared};if(recipe!==undefined)sharedRecipes[rk]=recipe;
 try{return fn();}finally{state.days[i]=oldDay;ketoMeals=oldMeals;if(oldRecipe===undefined)delete sharedRecipes[rk];else sharedRecipes[rk]=oldRecipe;}
}
function ketoMainOptions(i,m,day=state.days[i],recipe,prepared={}){
 return withKetoEditPreview(i,day,recipe,prepared,()=>Object.entries(KETO_MAINS).map(([id,x])=>{
  const old=ketoConfig(day,'h',m,i),cfg=old.mealRecipe===id?old:ketoMainConfig(i,'h',m,id,day),nutrition=comparisonSum(ketoMealWithConfig(day,'h',m,cfg));
  const reason=coveredComponent(day,m,'h','protein')||coveredComponent(day,m,'h','sabzi')?'Prepared batch: remove it before changing this dish.':'';
  return {id,name:x.name,config:cfg,nutrition,reason};
 }));
}
const KETO_BREAKFASTS={
 omelette:{name:'Mushroom omelette',prep:'Cook the whole egg, extra whites, mushrooms and tomato in measured oil. Whey is a separately counted side.',portion:{protein:'eggs',quantity:1,eggWhites:4,mushroom:150,tomato:50,oil:5,whey:1,almonds:0,walnuts:0}},
 eggAvocado:{name:'Eggs & avocado',prep:'Cook the eggs and whites in measured oil; serve with weighed avocado flesh. Whey is a separately counted side.',portion:{protein:'eggs',quantity:2,eggWhites:4,avocado:100,oil:5,whey:1,almonds:0}},
 paneerBhurji:{name:'Paneer bhurji',prep:'Scramble paneer with mushrooms, tomato and onion in measured oil. Whey is a separately counted side.',portion:{protein:'paneer',quantity:125,mushroom:100,tomato:50,onion:20,oil:5,whey:1,almonds:0}},
 chickenBowl:{name:'Chicken & mushroom bowl',prep:'Cook raw boneless chicken with mushrooms and tomato in measured oil. Whey is a separate side.',portion:{protein:'chicken',quantity:150,mushroom:150,tomato:50,oil:5,whey:1,almonds:0}},
 boiledEggs:{name:'3 boiled eggs',prep:'Boil three whole eggs. No cooking oil. Whey and other sides are selected separately.',portion:{protein:'eggs',quantity:3,oil:0,whey:1,almonds:0,walnuts:0}},
 eggPoach:{name:'3 Egg Poach',prep:'Sunny-side-up eggs (your requested label): cook three whole eggs in 5 ml measured oil. Sides are selected separately. Water-poached eggs need no oil; edit oil to zero for that method.',portion:{protein:'eggs',quantity:3,oil:5,whey:1,almonds:0,walnuts:0}},
 dahiBowl:{name:'Dahi protein bowl',prep:'Mix plain dahi with whey. Other sides are selected separately. No added oil.',portion:{protein:'paneer',quantity:0,curd:100,whey:1.5,almonds:0,walnuts:0}}
};
function ketoBreakfastName(cfg){return KETO_BREAKFASTS[cfg.breakfastRecipe]?.name||(cfg.protein==='eggs'?(cfg.spinach?'Egg & spinach scramble':'Egg breakfast'):cfg.protein==='chicken'?'Chicken breakfast':cfg.quantity?'Paneer breakfast':'Protein breakfast');}
// A dish selection and its explicit sides share one ingredient ledger. Saved portions are never migrated on read.
const KETO_BREAKFAST_SIDE_KEYS=['whey','curd','milk','avocado','almonds','walnuts','cashews'];
function ketoBreakfastSides(cfg){return Object.fromEntries(KETO_BREAKFAST_SIDE_KEYS.map(k=>[k,cfg[k]||0]));}
function breakfastSideOverride(cfg,overrides){
 if(!overrides)return cfg;
 for(const [k,v]of Object.entries(overrides)){
  if(!KETO_BREAKFAST_SIDE_KEYS.includes(k)||typeof v!=='number'||!Number.isFinite(v)||v<0)throw Error('Invalid breakfast side: '+k);
  cfg[k]=v;
 }
 return cfg;
}
// Candidate previews use the same exclusions as meal cards, without changing the stored recipe.
function ketoMealWithConfig(day,p,m,cfg){
 const i=state.days.indexOf(day);if(i<0||!isKeto(p))return householdKetoBase(day,p,m,cfg);
 const key=ketoMealKey(i,p,m),before=ketoMeals[key];ketoMeals[key]=cfg;
 try{return meal(day,m,p);}finally{if(before===undefined)delete ketoMeals[key];else ketoMeals[key]=before;}
}
function ketoBreakfastBreakdown(day,p,cfg){
 const lines=ketoMealWithConfig(day,p,'b',cfg).filter(x=>x.q>0);
 const intrinsic=new Set(cfg.breakfastRecipe==='dahiBowl'?['whey',cfg.curdType]:cfg.breakfastRecipe==='eggAvocado'?['avocado']:[]);
 const sideIds=new Set(['whey','curd','curdH','milk','avocado','almonds','walnuts','cashews']);
 const sideLines=lines.filter(x=>sideIds.has(x.id)&&!intrinsic.has(x.id));
 const dishLines=lines.filter(x=>!sideIds.has(x.id)||intrinsic.has(x.id));
 return {dishLines,sideLines,dishNutrition:comparisonSum(dishLines),sidesNutrition:comparisonSum(sideLines)};
}
function ketoBreakfastOptions(i,p,dayOverride=state.days[i],sideOverride=null,recipeOverride){
 const original=state.days[i],rk=sharedKey(i),originalRecipe=sharedRecipes[rk];if(recipeOverride!==undefined)sharedRecipes[rk]=recipeOverride;
 // Alternatives are cooked breakfasts even when the currently saved choice is No cooked breakfast.
 const day={...dayOverride,readyB:{...dayOverride.readyB,[p]:false}};state.days[i]=day;
 try{
  const old=ketoConfig(day,p,'b',i),rest=comparisonEmpty();
  for(const m of ['l','d','e'])comparisonAdd(rest,comparisonSum(meal(day,m,p)));
  return Object.entries(KETO_BREAKFASTS).filter(([,x])=>p==='h'||x.portion.protein==='paneer').map(([id,x])=>{
   const eggMethod=['boiledEggs','eggPoach'].includes(id)&&['boiledEggs','eggPoach'].includes(old.breakfastRecipe);
   // Named avocado dish includes avocado. Other newly selected dishes start without it; saved/current sides stay explicit.
   const sides={...ketoBreakfastSides(old),avocado:id==='eggAvocado'?x.portion.avocado:0};
   const config=old.breakfastRecipe===id?{...old}:eggMethod?{...old,oil:x.portion.oil,breakfastRecipe:id}:{...old,spinach:0,eggWhites:0,soya:0,cucumber:0,butter:0,flax:0,mushroom:0,tomato:0,onion:0,sabziFraction:0,oil:0,...x.portion,...sides,...(id==='dahiBowl'?{curd:x.portion.curd,whey:x.portion.whey}:{}),breakfastRecipe:id};
   breakfastSideOverride(config,sideOverride);
   if(ketoEveningOnly(i,p))for(const id of KETO_NUT_IDS)config[id]=0;
   MealCloud.validateRecord(ketoMealKey(i,p,'b'),config);
   const nutrition=comparisonSum(ketoMealWithConfig(day,p,'b',config)),dayNutrition=comparisonAdd(comparisonAdd(comparisonEmpty(),rest),nutrition);
   const whey=(day[p==='h'?'wheyH':'wheyW']?config.whey:0)+['l','d'].reduce((q,m)=>q+(kept(day,m)?ketoConfig(day,p,m,i).whey||0:0),0);
   const reason=!isKeto(p)?'Choose Keto for this person first.':!kept(day,'b')?'Breakfast is skipped.':id==='dahiBowl'&&(!day[p==='h'?'wheyH':'wheyW']||!config.whey||!config.curd)?'Dahi protein bowl needs curd and breakfast whey.':whey>3?'This would exceed 3 whey scoops today.':dayNutrition.aHi>ketoOptions.carbBudget?`This day would reach ${F(dayNutrition.aHi)} g counted carbs (budget ${ketoOptions.carbBudget} g).`:'';
   const custom=Object.entries(x.portion).some(([k,v])=>!KETO_BREAKFAST_SIDE_KEYS.includes(k)&&config[k]!==v);
   return {id,name:x.name,prep:x.prep,config,nutrition,dayNutrition,...ketoBreakfastBreakdown(day,p,config),custom,eligible:!reason,reason};
  });
 }finally{state.days[i]=original;if(recipeOverride!==undefined){if(originalRecipe===undefined)delete sharedRecipes[rk];else sharedRecipes[rk]=originalRecipe;}}
}
function ketoBreakfastPreview(i,p,dayOverride=state.days[i],sides=null,recipeOverride){
 const original=state.days[i],rk=sharedKey(i),originalRecipe=sharedRecipes[rk];state.days[i]=dayOverride;if(recipeOverride!==undefined)sharedRecipes[rk]=recipeOverride;
 try{const cfg=breakfastSideOverride(ketoConfig(dayOverride,p,'b',i),sides),nutrition=comparisonSum(ketoMealWithConfig(dayOverride,p,'b',cfg)),dayNutrition=comparisonAdd(comparisonEmpty(),nutrition);for(const m of ['l','d','e'])comparisonAdd(dayNutrition,comparisonSum(meal(dayOverride,m,p)));return {nutrition,dayNutrition,...ketoBreakfastBreakdown(dayOverride,p,cfg)};}finally{state.days[i]=original;if(recipeOverride!==undefined){if(originalRecipe===undefined)delete sharedRecipes[rk];else sharedRecipes[rk]=originalRecipe;}}
}
// Explicit breakfast examples. Review daily totals; never fill energy or fibre gaps with unchosen food.
const KETO_WEEK_BREAKFASTS=[['boiledEggs',{}],['omelette',{whey:.5,eggWhites:3,mushroom:250}],['dahiBowl',{curd:75,almonds:0}],['eggAvocado',{avocado:150}],['eggPoach',{}],['dahiBowl',{curd:75,almonds:0}],['eggAvocado',{avocado:150}]];
function recommendedKetoBreakfast(i){
 const [id,portion]=KETO_WEEK_BREAKFASTS[i],cfg={...ketoBreakfastOptions(i,'h').find(x=>x.id===id).config,...portion};
 MealCloud.validateRecord(ketoMealKey(i,'h','b'),cfg);
 // Calorie/protein gaps are surfaced for review rather than secretly changing the ingredients.
 return cfg;
}
// Validate Edit meal choices against its tentative day before touching any saved/draft meal.
function prepareKetoBreakfasts(i,selections,dayOverride=state.days[i],recipeOverride,sideOverrides={}){
 const original=state.days[i],prepared={},recipeKey=sharedKey(i),originalRecipe=sharedRecipes[recipeKey];state.days[i]=dayOverride;
 if(recipeOverride!==undefined)sharedRecipes[recipeKey]=recipeOverride;
 try{
  for(const p of new Set([...Object.keys(selections),...Object.keys(sideOverrides)])){
   const id=selections[p],sides=sideOverrides[p];if(!id&&!sides)continue;
   if(!['w','h'].includes(p)||!isKeto(p))throw Error('Invalid breakfast person.');
   let config;
   if(id){const option=ketoBreakfastOptions(i,p,dayOverride,sides).find(x=>x.id===id);if(!option)throw Error('Breakfast is unavailable for this person.');if(!option.eligible)throw Error(option.reason);config=option.config;}
   else config=breakfastSideOverride(ketoConfig(dayOverride,p,'b',i),sides);
   if(ketoEveningOnly(i,p))for(const nut of KETO_NUT_IDS)config[nut]=0;
   const key=ketoMealKey(i,p,'b');MealCloud.validateRecord(key,config);
   const whey=(kept(dayOverride,'b')&&dayOverride[p==='h'?'wheyH':'wheyW']?config.whey:0)+['l','d'].reduce((q,m)=>q+(kept(dayOverride,m)?ketoConfig(dayOverride,p,m,i).whey||0:0),0);
   if(whey>3)throw Error('This would exceed 3 whey scoops today.');
   prepared[key]=config;
  }
  return prepared;
 }finally{state.days[i]=original;if(recipeOverride!==undefined){if(originalRecipe===undefined)delete sharedRecipes[recipeKey];else sharedRecipes[recipeKey]=originalRecipe;}}
}
// The Edit menu can choose an existing vegetable-base recipe without putting a K id in the legacy day.s field.
// Keep explicit per-person sabzis and stage the shared record until Save has validated every choice.
function prepareEditedSabzi(i,recipe){
 if(recipe===sharedRecipe(state.days[i]))return null;
 const key=sharedKey(i),value={...sharedRecipes[key],recipe};MealCloud.validateRecord(key,value);
 return {key,value};
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
 const picks=[['paneerPan','eggAvocadoPlate'],['paneerPan','chickenAvocado'],['chickenAvocado','eggAvocadoPlate'],['paneerPan','eggAvocadoPlate'],['boiledEggMeal','eggAvocadoPlate'],['paneerPan','chickenAvocado'],['chickenAvocado','paneerPan']];
 for(let i=0;i<7;i++){
  if(state.weekKey&&dateForDay(i)<'2026-10-14')continue;
  const day=state.days[i];
  ketoMeals[ketoMealKey(i,'h','b')]={...ketoConfig(day,'h','b',i),almonds:0,walnuts:0,cashews:0};
  ketoMeals[ketoMealKey(i,'h','e')]={almonds:10,walnuts:10,cashews:0};
  for(const [j,m]of ['l','d'].entries())ketoMeals[ketoMealKey(i,'h',m)]=ketoMainConfig(i,'h',m,picks[i][j]);
 }
 save();render();return true;
}

function assignedBaseMeal(day,m,p){
 if(isKeto(p))return householdKetoBase(day,p,m);
 const effective=assignedBalancedDay(day,p);let a=baseMeal(effective,m,p);
 if(kept(day,m)&&['l','d'].includes(m)&&personRecipe(day,p)!==effective.s){a=subtractIngredients(a,balancedOriginalComponent(effective,m,p,'sabzi'));a.push(...personSabzi(day,p).map(x=>L(x.id,x.q*balancedSabShare(effective,p,m))));}
 return a;
}
function ketoActualMeal(day,p,m){if(isKeto(p))return meal(day,m,p);let a=householdKetoBase(day,p,m);const date=mealDate(day);if(date&&kept(day,m)&&['l','d'].includes(m))for(const c of ['sabzi','protein'])if(coveredComponent(day,m,p,c)){a=subtractIngredients(a,originalComponent(day,m,p,c,date));const link=batchLink(date,m,p,c);if(link)a.push(...BatchMath.portionLines(link.batch,link.serving));}return a;}
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
 if(differentSabzis(d)){for(const p of ['w','h']){const lines=['l','d'].flatMap(m=>coveredComponent(d,m,p,'sabzi')?[]:includedComponent(d,m,p,'sabzi'));if(lines.length)groups.push(['Cook · '+PERSON_NAMES[p]+' '+recipeName(personRecipe(d,p))+' (once for lunch + dinner)',format(lines)]);}}
 else{const sab=freshSabziLines(d);if(sab.length)groups.push(['Cook · one shared '+recipeName(sharedRecipe(d))+' batch',format(sab)]);}
 const dal=[];for(const p of ['w','h'])if(!isKeto(p))for(const m of ['l','d'])if(kept(d,m))dal.push(...includedComponent(d,m,p,'dal'));if(dal.length)groups.push(['Cook · one dal batch for Balanced portions',format(dal)]);
 for(const p of ['w','h']){
  if(!isKeto(p)){const bf=kept(d,'b')?freshMeal(d,'b',p):[];if(bf.length)groups.push(['Cook · '+PERSON_NAMES[p]+' Balanced breakfast',format(bf)]);const extras=[];for(const m of ['l','d','e']){let rest=freshMeal(d,m,p);if(['l','d'].includes(m)){if(!coveredComponent(d,m,p,'sabzi'))rest=subtractIngredients(rest,originalComponent(d,m,p,'sabzi'));rest=subtractIngredients(rest,[L(d.dal,150*dalShare(p)),L('oil',oilUse().dal*dalShare(p))]);}extras.push(...rest);}if(extras.length)groups.push([PERSON_NAMES[p]+' · Balanced starch / protein / dairy / extras',format(extras)]);continue;}
  const ready=[],cook=[];for(const m of ['b','l','d','e']){if(!kept(d,m))continue;const cfg=ketoConfig(d,p,m);const extra=subtractIngredients(freshMeal(d,m,p),coveredComponent(d,m,p,'sabzi')?[]:ketoComponent(d,p,m,'sabzi'));for(const x of extra)(['egg','eggWhite','palak','mushroom','tomato','onion','chicken','soyN','soyS'].includes(x.id)||x.id==='oil'?cook:ready).push(x);}
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
 return `<details class="keto-info"><summary>Fullness and 4–6 week trial review</summary><div>${r.hunger>=4?'<p class="keto-plan-status">High hunger recorded: review meal portions and the calorie target before cutting food further. If satisfying portions cannot fit the carb budget, reconsider the trial or use Balanced.</p>':''}<p>Protein at every meal, the shared vegetable batch, cucumber, measured curd and measured nuts support fullness. Ground flaxseed is an optional historical field. Husband’s updated plan reserves at most 20 g total nuts for the evening. Breakfast, lunch and dinner use real food portions; nuts are not meal replacements. Lunch/dinner dishes can be chosen in Edit meals. Review daily calories after changing portions. Nut values are generic USDA estimates. Increase fibre gradually with fluids if these foods are new to you. Persistent hunger means review portions or the diet; zero cravings cannot be promised.</p><p>Husband: 75 kg · 172.72 cm · 29 years · 4–5 strength sessions/week. Resting-energy estimate 1689.5 kcal; maintenance is unconfirmed. Starting intake ${ketoOptions.targetK} kcal and ${ketoOptions.pMin}–${ketoOptions.pMax} g protein are editable planning estimates, not measured needs. No exercise calories added. <a href="https://pubmed.ncbi.nlm.nih.gov/2305711/" target="_blank" rel="noopener">Energy equation</a> · <a href="https://pubmed.ncbi.nlm.nih.gov/28642676/" target="_blank" rel="noopener">Protein evidence</a></p><div class="keto-fields">${field('weight','Weekly average weight (kg)',r.weight,30,250,.1)}${field('waist','Waist (cm)',r.waist,30,200,.1)}${field('hunger','Hunger / cravings (1 low – 5 high)',r.hunger,1,5)}</div><div class="keto-fields">${['strength','energy','bowel'].map(k=>`<label>${{strength:'Strength',energy:'Energy',bowel:'Bowel comfort'}[k]}<select data-trial-field="${k}"><option value="">Not recorded</option>${['good','stable','worse'].map(v=>`<option value="${v}"${r[k]===v?' selected':''}>${v}</option>`).join('')}</select></label>`).join('')}</div><p>Baseline: ${ketoOptions.baselineWeight} kg${ketoOptions.baselineWaist?' · '+ketoOptions.baselineWaist+' cm waist':' · waist not set'}. Planned start ${esc(ketoOptions.startDate)}; review by ${fmtMon(addDate(ketoOptions.startDate,ketoOptions.reviewWeeks*7))}. First-week water loss is not measured fat loss. Compare weekly weight/waist with strength, energy, hunger and bowel comfort.</p><div class="keto-fields">${[['targetK','Husband kcal target',1000,3500],['pMin','Protein minimum (g)',60,200],['pMax','Protein maximum (g)',60,250],['carbBudget','Counted available-carb budget (g)',15,100],['baselineWeight','Baseline weight (kg)',30,250],['baselineWaist','Baseline waist (cm)',0,200],['reviewWeeks','Review after weeks',4,6]].map(([key,label,min,max])=>`<label>${label}<input type="number" min="${min}" max="${max}" value="${ketoOptions[key]}" data-keto-option="${key}"></label>`).join('')}<label>Trial start<input type="date" value="${ketoOptions.startDate}" data-keto-option="startDate"></label></div></div></details>`;
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
