// Food-first suggestions are previews. No read or render writes a household record.
function ketoSuggestedTargets(){const max=ketoOptions.targetK;return {kMin:Math.min(max,Math.max(1600,max-200)),kMax:max,pMin:ketoOptions.pMin,pMax:ketoOptions.pMax,carbs:ketoOptions.carbBudget};}
function withKetoDayConfigs(i,configs,fn){const before=ketoMeals;ketoMeals={...ketoMeals};for(const [m,cfg]of Object.entries(configs))ketoMeals[ketoMealKey(i,'h',m)]=cfg;try{return fn();}finally{ketoMeals=before;}}
function ketoSuggestionIsPast(i){return !!state.weekKey&&dateForDay(i)<dayViewISO();}
function ketoWheySuggestion(i,{maxScoops=3}={}){
 const day=state.days[i],targets=ketoSuggestedTargets(),parts=['b','l','d'],original=Object.fromEntries(parts.map(m=>[m,structuredClone(ketoConfig(day,'h',m,i))]));
 const all=parts.concat('e').flatMap(m=>meal(day,m,'h')),food=comparisonSum(all.filter(x=>x.id!=='whey')),current=all.filter(x=>x.id==='whey').reduce((n,x)=>n+x.q,0);
 const eligible=parts.filter(m=>kept(day,m)&&(m!=='b'||day.wheyH)&&!coveredComponent(day,m,'h','protein')&&!mealQuantityGroups(day,m,'h').some(g=>g.excluded&&g.lines.some(x=>x.id==='whey')));
 const zero=structuredClone(original);for(const m of eligible)zero[m].whey=0;
 const base=withKetoDayConfigs(i,zero,()=>assignedDayNutrition(i,'h')),fixed=withKetoDayConfigs(i,zero,()=>parts.concat('e').flatMap(m=>meal(day,m,'h')).filter(x=>x.id==='whey').reduce((n,x)=>n+x.q,0));
 const scoop=comparisonSum([L('whey',1)]),candidates=[];
 for(let q=0;q<=Math.max(0,maxScoops-fixed)+1e-8;q+=.5){
  if(q>0&&(!eligible.length||!Number.isFinite(scoop.p)||scoop.p<=0))continue;
  const n=comparisonAdd(comparisonAdd(comparisonEmpty(),base),comparisonSum([L('whey',q)]));
  const allowed=n.k<=targets.kMax+1e-7&&n.aHi<=targets.carbs+1e-7&&n.p<=targets.pMax+1e-7;
  candidates.push({q,n,allowed,protein:n.p>=targets.pMin-1e-7&&n.p<=targets.pMax+1e-7});
 }
 // Never add shakes to fill calories once protein is sufficient.
 const chosen=base.p>=targets.pMin?candidates[0]:candidates.find(c=>c.allowed&&c.protein)||candidates.filter(c=>c.allowed&&c.n.p<targets.pMin).at(-1)||candidates[0];
 const configs=structuredClone(zero);let remaining=chosen.q;
 // Keep existing meal placement where practical, then use the first available meal.
 const order=[...eligible.filter(m=>original[m].whey>0),...eligible.filter(m=>!original[m].whey)];
 for(const m of order){const take=Math.min(remaining,original[m].whey||0);configs[m].whey=take;remaining-=take;}
 for(const m of order){const take=Math.min(remaining,3-configs[m].whey);configs[m].whey+=take;remaining-=take;}
 const nutrition=withKetoDayConfigs(i,configs,()=>assignedDayNutrition(i,'h')),issues=[];
 if(nutrition.p<targets.pMin-1e-7)issues.push(`Protein ${F(nutrition.p)} g: add or change whole foods; whey cannot close the gap within these limits.`);
 if(nutrition.p>targets.pMax+1e-7)issues.push(`Food already exceeds ${targets.pMax} g protein; review food portions.`);
 if(nutrition.k>targets.kMax+1e-7)issues.push(`Food exceeds ${targets.kMax} kcal; review the meals.`);
 if(nutrition.k<targets.kMin-1e-7)issues.push(`Below ${targets.kMin} kcal: add whole food, not extra whey just for calories.`);
 if(nutrition.aHi>targets.carbs+1e-7)issues.push(`Counted carbs exceed ${targets.carbs} g; change the food choices.`);
 if(fixed>maxScoops)issues.push('Fixed whey already exceeds this suggestion’s scoop limit.');
 if(!eligible.length&&base.p<targets.pMin)issues.push('No editable, unskipped whey slot is available.');
 return {configs,foodProtein:food.p,fixedScoops:fixed,scoops:fixed+chosen.q,currentScoops:current,nutrition,targets,issues,compatible:!issues.length,label:scoop};
}
// Different protein pans across the week; breakfast, shared vegetables and evening nuts stay as chosen.
const KETO_FOOD_FIRST_MAINS=[['chickenPan','eggCurry'],['eggMushroom','chickenAvocado'],['chickenDahi','eggSpinach'],['chickenAvocado','paneerPan'],['boiledEggMeal','chickenPan'],['eggSpinach','chickenDahi'],['chickenPan','eggAvocadoPlate']];
function ketoSuggestedDay(i){
 const day=state.days[i],parts=['b','l','d'],blocked=ketoSuggestionIsPast(i)||!isKeto('h')||parts.some(m=>!kept(day,m))||['l','d'].some(m=>['sabzi','protein'].some(c=>coveredComponent(day,m,'h',c)))||parts.concat('e').some(m=>Object.keys(mealExclusions[exclusionKey(day,m,'h')]?.items||{}).length)||['sabzi','sabzi-h','prot'].some(d=>baselineWeigh(i,d));
 if(blocked)return {blocked:true,reason:'Keep this day’s skipped foods, prepared or weighed portions and history. Balance whey separately, or edit individual meals.'};
 const nuts=parts.concat('e').flatMap(m=>meal(day,m,'h').filter(x=>KETO_NUT_IDS.includes(x.id)).map(x=>({...x,meal:m})));
 if(nuts.reduce((n,x)=>n+x.q,0)>20+1e-8||nuts.some(x=>x.meal!=='e'))return {blocked:true,reason:'Set at most 20 g nuts, evening only, in Day options before suggesting this day.'};
 if(['K4','K1','S13','S14','S15','S16','S17'].includes(personRecipe(day,'h')))return sharedMenuProteinSuggestion(i);
 const ids=KETO_FOOD_FIRST_MAINS[i],hasAvocado=ids.some(id=>KETO_MAINS[id].portion.avocado>0);
 const variants=(m,j)=>{
  const cfg=ketoMainConfig(i,'h',m,ids[j]),quantities=cfg.protein==='chicken'?[175,200,225,250,275,300]:cfg.protein==='eggs'?[3,4,5]:[100,125,150];
  const avocados=cfg.avocado?[75,125,175,225]:!hasAvocado&&cfg.protein==='chicken'?[0,75,125,175,225]:[0];
  const list=quantities.flatMap(quantity=>avocados.map(avocado=>({...cfg,quantity,avocado,whey:0})));
  // Bhurji already supplies paneer: a substantial shared serving needs no duplicate top-up.
  if(personRecipe(day,'h')==='S12'&&cfg.sabziFraction>=.25)list.push({...ketoMainConfig(i,'h',m,'paneerPan'),mealRecipe:'custom',quantity:0,mushroom:0,oil:0,whey:0});
  return list;
 };
 let best=null;
 for(const l of variants('l',0))for(const d of variants('d',1)){
  const result=withKetoDayConfigs(i,{l,d},()=>ketoWheySuggestion(i,{maxScoops:1.5}));
  // Whole-food portions have a floor; prefer a feasible day near the calorie ceiling, with less whey.
  const n=result.nutrition,t=result.targets,penalty=Math.max(0,t.pMin-n.p)*100+Math.max(0,n.p-t.pMax)*100+Math.max(0,n.aHi-t.carbs)*100+Math.max(0,n.k-t.kMax)*10+Math.max(0,t.kMin-n.k)*10;
  const score=(result.compatible?0:100000)+penalty+Math.abs(t.kMax-n.k)+result.scoops*20;
  if(!best||score<best.score)best={...result,score,mains:ids};
 }
 return best;
}

// Approved household rotation: one vegetarian sabzi plus dal OR beans. No silent application.
const SHARED_MENU=[
 {recipe:'K4',dal:'moong'},
 {recipe:'S13',dal:'masoor'},
 {recipe:'S16',dal:'moong'},
 {recipe:'S14',dal:'moong'},
 {recipe:'S17',dal:'masoor'},
 {recipe:'K1',dal:'rajma'},
 {recipe:'S15',dal:'moong'}
];
function sharedMenuProteinSuggestion(i){
 const variants=m=>{
  const blank={...ketoMainConfig(i,'h',m,'sharedOnly'),whey:0};
  const list=[blank];
  for(const quantity of [150,175,200,225,250,275,300])for(const oil of [5,10])list.push({...ketoMainConfig(i,'h',m,'simpleChicken'),quantity,oil,cucumber:m==='l'?50:0,whey:0});
  for(const quantity of [3,4,5])for(const eggWhites of [0,2])list.push({...ketoMainConfig(i,'h',m,'boiledEggMeal'),quantity,eggWhites,cucumber:m==='l'?50:0,whey:0});
  // Optional whole-food fat is a measured side, never hidden cooking oil.
  return list.flatMap(c=>m==='l'?[0,50,100,150,200,250,300].map(avocado=>({...c,avocado})):[c]);
 };
 // Cache each independent meal once; the candidate search then adds numeric totals only.
 const day=state.days[i],b=structuredClone(ketoConfig(day,'h','b',i));
 if(!coveredComponent(day,'b','h','protein'))b.whey=0;
 const breakfast=withKetoDayConfigs(i,{b},()=>meal(day,'b','h'));
 const base=comparisonSum([...breakfast,...meal(day,'e','h')]),fixed=breakfast.filter(x=>x.id==='whey').reduce((n,x)=>n+x.q,0),scoop=comparisonSum([L('whey',1)]),t=ketoSuggestedTargets();
 const cached=m=>variants(m).map(cfg=>({cfg,n:withKetoDayConfigs(i,{[m]:cfg},()=>comparisonSum(meal(day,m,'h')))}));
 const lunches=cached('l'),dinners=cached('d');let best=null;
 for(const l of lunches)for(const d of dinners){
  const food={k:base.k+l.n.k+d.n.k,p:base.p+l.n.p+d.n.p,aHi:base.aHi+l.n.aHi+d.n.aHi},candidates=[];
  for(let q=0;q<=Math.max(0,1.5-fixed)+1e-8;q+=.5){const n={k:food.k+q*scoop.k,p:food.p+q*scoop.p,aHi:food.aHi+q*scoop.aHi};candidates.push({q,n,allowed:n.k<=t.kMax+1e-7&&n.p<=t.pMax+1e-7&&n.aHi<=t.carbs+1e-7,protein:n.p>=t.pMin-1e-7&&n.p<=t.pMax+1e-7});}
  const chosen=food.p>=t.pMin?candidates[0]:candidates.find(c=>c.allowed&&c.protein)||candidates.filter(c=>c.allowed&&c.n.p<t.pMin).at(-1)||candidates[0],n=chosen.n;
  const compatible=chosen.allowed&&chosen.protein&&n.k>=t.kMin-1e-7&&fixed<=1.5;
  const penalty=Math.max(0,t.pMin-n.p)*100+Math.max(0,n.p-t.pMax)*100+Math.max(0,n.aHi-t.carbs)*100+Math.max(0,n.k-t.kMax)*10+Math.max(0,t.kMin-n.k)*10;
  const cooks=[l.cfg,d.cfg].filter(c=>c.quantity>0),different=new Set(cooks.map(c=>c.protein)).size;
  const emptyBreakfast=day.readyB?.h&&day.wheyH&&!breakfast.some(x=>x.q>0)&&chosen.q===0;
  const score=(compatible?0:100000)+(emptyBreakfast?50000:0)+penalty+Math.abs(t.kMax-n.k)+(chosen.q+fixed)*20+different*15;
  if(!best||score<best.score)best={score,l:l.cfg,d:d.cfg};
 }
 const result=withKetoDayConfigs(i,{l:best.l,d:best.d},()=>ketoWheySuggestion(i,{maxScoops:1.5}));
 return {...result,score:best.score,mains:[best.l.mealRecipe,best.d.mealRecipe]};
}
