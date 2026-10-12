import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import * as math from '../batch-math.js';
import * as weighMath from '../weigh-math.js';
import * as records from '../records.js';
import {buildSync} from 'esbuild';
const browserBundle=buildSync({entryPoints:[new URL('../convex-browser.js',import.meta.url).pathname],bundle:true,format:'iife',write:false}).outputFiles[0].text;

test('UX progress round trips without changing ingredients and lists every sabzi',()=>{
 const {run}=app(true);
 for(const w of ['balanced','keto'])for(const h of ['balanced','keto']){
  run(`householdDiets={w:'${w}',h:'${h}'}`);
  const before=run('JSON.stringify(ledger())');
  run("activityRecords={'buy/2026-10-05/gobi':{checked:true,updatedAt:1},'done/2026-10-07/b':{basis:'meal',complete:true,updatedAt:1}};snapshotDraft();activityRecords={};hydrateDraft()");
  assert.equal(run("activityRecords['buy/2026-10-05/gobi'].checked"),true);
  assert.equal(run('JSON.stringify(ledger())'),before);
 }
 run("sharedRecipes[sharedKey(5)]={recipe:'K1',w:'S12'}");
 assert.match(run('uxWeekRow(state.days[5],5)'),/Paneer bhurji/);
 assert.match(run("uxRecipeOptions('S12')"),/value="S12" selected/);
 assert.equal((run("uxRecipeOptions('S12')").match(/<option/g)||[]).length,16);
 assert.doesNotMatch(run("uxRecipeOptions('S12')"),/value="K3"/);assert.match(run("uxRecipeOptions('K3')"),/value="K3" selected/);
 assert.doesNotMatch(run('recipeSelectorsHTML(state.days[5],5)'),/value="K3"/);
});

function app(withUX=false){
 const root={innerHTML:'',querySelector(){return null;},querySelectorAll(){return[];}};
 const shopping={innerHTML:'',hidden:true},regular={hidden:false};
 const document={addEventListener(){},querySelector(sel){return sel==='#keto'?root:sel==='#shopping'?shopping:sel==='#regularPlan'?regular:null;},querySelectorAll(){return[];}};
 const ctx=vm.createContext({document,window:{addEventListener(){}},BatchMath:math,WeighMath:weighMath,MealCloud:records,crypto:webcrypto,structuredClone,console,TextEncoder,setInterval(){},navigator:{onLine:true}});
  vm.runInContext(browserBundle,ctx);
 ctx.MealCloud=ctx.window.MealCloud;ctx.ActivityMath=ctx.window.ActivityMath;
 for(const file of ['batch-runtime.js','weigh-runtime.js','cloud-runtime.js','nutrition-runtime.js','household-runtime.js','shopping-runtime.js','keto-runtime.js'])vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),ctx);
 if(withUX)vm.runInContext(readFileSync(new URL('../ux-runtime.js',import.meta.url),'utf8'),ctx);
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 vm.runInContext(script.slice(0,script.indexOf("document.addEventListener('input'")),ctx);
 vm.runInContext("state.weekKey='2026-10-05';templateDays=structuredClone(state.days);templateUtensils=structuredClone(state.utDay);cloudReady=true;householdDiets={w:'balanced',h:'balanced'};balancedCurdType='curd';render=renderKeto;",ctx);
 return {root,shopping,regular,run:expression=>vm.runInContext(expression,ctx)};
}
test('pantry trial meets the reviewed daily energy, protein, fibre and 50 g budget without changing Wife',()=>{
 const {run}=app();run("state.weekKey=null;householdDiets={w:'balanced',h:'keto'};state.days.forEach(d=>{d.off=false;d.skip={b:false,l:false,d:false};d.wheyH=true});render=()=>{}");
 const wife=run("JSON.stringify(state.days.map((_,i)=>assignedDayNutrition(i,'w')))");
 assert.equal(run('applyKetoInventoryPlan()'),true);
 assert.equal(run("JSON.stringify(state.days.map((_,i)=>assignedDayNutrition(i,'w')))"),wife);
 const days=JSON.parse(run("JSON.stringify(state.days.map((d,i)=>({n:assignedDayNutrition(i,'h'),whey:ketoWheyDailyTotal(d,'h'),checks:dailyPlanChecks(assignedDayNutrition(i,'h'),'h')})))"));
 for(const {n,whey,checks}of days){assert.ok(n.k>=1900&&n.k<=2100);assert.ok(n.p>=120&&n.p<=165);assert.ok(n.aHi<=50);assert.ok(n.fb>=25);assert.ok(whey<=2);assert.ok(checks.some(x=>/Saturated fat|saturated fat/.test(x)),'Do not hide the saturated-fat limitation');assert.equal(n.carbUnknown,true,'Spices remain uncertain');}
 assert.equal(run("state.days.reduce((n,d)=>n+['b','l','d'].filter(m=>ketoConfig(d,'h',m).protein==='chicken'&&ketoConfig(d,'h',m).quantity>0).length,0)"),2);
 assert.equal(run("ledger().flax||0"),0);assert.equal(run("ledger().chicken"),500);
 const weights=run('JSON.stringify(dailyWeights)');run('snapshotDraft();ketoMeals={};hydrateDraft()');assert.equal(run('JSON.stringify(dailyWeights)'),weights);assert.equal(run('ketoOptions.carbBudget'),50);
 run("state.weekKey='2026-10-05'");assert.equal(run('ketoInventoryPlanAvailable()'),false);
});
test('whey cap survives transaction edits and whites buy separate eggs without duplicate rows',()=>{
 const {run}=app();run("householdDiets.h='keto';render=()=>{};ketoMeals[ketoMealKey(0,'h','b')]={...ketoConfig(state.days[0],'h','b'),whey:1.5};");
 assert.equal(run("updateKetoPortion(ketoMealKey(0,'h','l'),'whey',1.5)"),true);assert.equal(run("ketoWheyDailyTotal(state.days[0],'h')"),3);
 assert.throws(()=>run("updateKetoPortion(ketoMealKey(0,'h','d'),'whey',.5)"),/Maximum 3/);
 run("ketoMeals[ketoMealKey(0,'h','d')]={...ketoConfig(state.days[0],'h','d'),protein:'eggs',quantity:2,eggWhites:3,spinach:200};snapshotDraft()");
 const draft=JSON.parse(run('JSON.stringify(cloudDraft)'));records.validateKetoWheyTotals(Object.entries(draft).map(([key,value])=>({key,value})));
 assert.throws(()=>records.validateKetoWheyTotals(Object.entries({...draft,[run("ketoMealKey(0,'h','d')")]:{...draft[run("ketoMealKey(0,'h','d')")],whey:.5}}).map(([key,value])=>({key,value}))),/Maximum 3/);
 assert.equal(run("comparisonSum([L('eggWhite',1)]).k"),17.16);assert.equal(run("comparisonSum([L('eggWhite',1)]).p"),3.597);
 const q=run('ledger().egg+ledger().eggWhite'),shop=JSON.parse(run('JSON.stringify(householdShopping().supermarket)'));assert.equal(shop.find(x=>x.id==='egg').needed,q);assert.equal(shop.filter(x=>x.id==='eggWhite').length,0);
});
test('prepared egg batches freeze whole eggs, extra whites, spinach and oil once',()=>{
 const {run}=app();run("householdDiets.h='keto';ketoMeals[ketoMealKey(0,'h','d')]={...ketoConfig(state.days[0],'h','d'),protein:'eggs',quantity:2,eggWhites:3,spinach:200,oil:5};batchDraft={recipe:'E',cookedOn:'2026-10-05',vessel:'pan',includeVessel:false,gross:400,oil:null,roles:{'2026-10-05/d':'protein'},selected:{'2026-10-05/d/h':true}}");
 const before=run("JSON.stringify(comparisonSum(ketoComponent(state.days[0],'h','d','protein')))");
 const batch=JSON.parse(run('JSON.stringify(buildBatchPreview(true))'));math.validateBatch(batch);
 assert.equal(batch.ingredients.find(x=>x.id==='egg').q,2);assert.equal(batch.ingredients.find(x=>x.id==='eggWhite').q,3);assert.equal(batch.ingredients.find(x=>x.id==='palak').q,200);assert.equal(batch.ingredients.find(x=>x.id==='oil').q,5);
 run("savedBatches['fixture-extra-whites']=buildBatchPreview(true)");assert.equal(run("JSON.stringify(comparisonSum(BatchMath.portionLines(savedBatches['fixture-extra-whites'],savedBatches['fixture-extra-whites'].servings[0])))"),before);
});
test('audited products keep separate identities and correct scoop, milk and oil units',()=>{
 const {run}=app();
 for(const [id,q,k,p,c]of [['paneerMM',100,283,16.1,5.1],['paneerMM',500,1415,80.5,25.5],['milk',100,59.74,3.193,4.738],['whey',1,136,29,2.8],['oil',10,81.627,0,0]]){
  const n=JSON.parse(run(`JSON.stringify(comparisonSum([L('${id}',${q})]))`));for(const [field,wanted]of Object.entries({k,p,c}))assert.ok(Math.abs(n[field]-wanted)<1e-8,`${id} ${field}`);
 }
 assert.equal(run("comparisonSum([L('paneerHP',100)]).p"),25);
 assert.equal(run("comparisonSum([L('paneer',100)]).k"),274);
 assert.equal(run("state.days.reduce((q,d)=>q+['b','l','d'].reduce((a,m)=>a+ketoDraftMeal(d,'h',m).filter(x=>x.id==='cashews').reduce((n,x)=>n+x.q,0),0),0)"),70);
 assert.equal(run("state.days.flatMap(d=>['w','h'].flatMap(p=>['b','l','d','e'].flatMap(m=>meal(d,m,p)))).some(x=>['walnuts','nuts'].includes(x.id)&&x.q>0)"),false);
 run("ketoMeals[ketoMealKey(0,'h','l')]={...ketoConfig(state.days[0],'h','l'),butter:10}");
 assert.equal(run("ketoDraftMeal(state.days[0],'h','l').find(x=>x.id==='butter').q"),10);
 assert.equal(run("ketoDraftMeal(state.days[0],'h','l').some(x=>x.id==='butterH')"),false);
});
test('purchase yield changes only buying; mushroom packets use one exact net size',()=>{
 const {run}=app();run("householdDiets={w:'balanced',h:'keto'};sharedRecipes[sharedKey(0)]={recipe:'K2'};render=()=>{}");
 const before=run('JSON.stringify({meals:state.days.map((d,i)=>assignedDayNutrition(i,"h")),ledger:ledger(),batch:sharedSabzi(state.days[0])})');
 assert.equal(run("householdShopping().market.find(x=>x.id==='gobi').needed"),run("ledger().gobi"));
 run("state.days.forEach((d,i)=>{if(i!==0)d.off=true})");
 assert.equal(run("ledger().gobi"),575);
 assert.equal(run("householdShopping().market.find(x=>x.id==='gobi').buy"),1000);
 const meals=run('JSON.stringify({ledger:ledger(),n:assignedDayNutrition(0,"h")})');
 run("updateProduceYield('gobi',30)");assert.equal(run("householdShopping().market.find(x=>x.id==='gobi').buy"),2000);
 assert.equal(run('JSON.stringify({ledger:ledger(),n:assignedDayNutrition(0,"h")})'),meals);
 run("updateProduceYield('gobi',100)");assert.equal(run("householdShopping().market.find(x=>x.id==='gobi').buy"),600);
 run("sharedRecipes[sharedKey(0)]={recipe:'S5'}");
 for(const size of [180,200]){run(`updateMushroomPacketSize(${size})`);const r=JSON.parse(run("JSON.stringify(householdShopping().market.find(x=>x.id==='mushroom'))"));assert.equal(r.needed,460);assert.equal(r.packs,3);assert.equal(r.buy,3*size);assert.equal(r.leftover,r.buy*r.yield-r.needed);}
 assert.throws(()=>run("updateProduceYield('gobi',0)"));assert.throws(()=>run('updateMushroomPacketSize(190)'));
});
test('effective K recipes determine Balanced shares and dinner top-up before allocation',()=>{
 const {run}=app();run("householdDiets={w:'balanced',h:'keto'};state.days[1].s='S8';state.days[1].b='B4';state.days[1].p='P';sharedRecipes[sharedKey(1)]={recipe:'K5'}");
 assert.equal(run("meal(state.days[1],'d','w').find(x=>x.id==='paneerMM').q"),80);
 assert.equal(run("meal(state.days[1],'l','w').find(x=>x.id==='corn').q"),25);
 run("state.days[1].s='S3'");assert.equal(run("meal(state.days[1],'l','w').find(x=>x.id==='palak').q"),125);
 assert.equal(run("meal(state.days[1],'d','w').find(x=>x.id==='paneerMM').q"),80);
});
test('complete nutrient snapshots freeze all macros while legacy missing macros stay unknown',()=>{
 const {run}=app();run("householdDiets={w:'balanced',h:'keto'};sharedRecipes[sharedKey(0)]={recipe:'K2'};batchDraft={recipe:'K2',cookedOn:'2026-10-05',vessel:'pan',includeVessel:false,gross:600,oil:10,roles:{'2026-10-05/l':'sabzi'},selected:{'2026-10-05/l/h':true}}");
 const b=JSON.parse(run('JSON.stringify(buildBatchPreview(true))'));math.validateBatch(b);assert.ok(b.ingredients.every(x=>x.n.version===2));
 run("savedBatches['fixture-nutrients']=buildBatchPreview(true)");const before=run("JSON.stringify(comparisonSum(BatchMath.portionLines(savedBatches['fixture-nutrients'],savedBatches['fixture-nutrients'].servings[0])))");
 run("COMPARE_NUTRIENTS.gobi.c=99;COMPARE_NUTRIENTS.gobi.f=99;COMPARE_NUTRIENTS.gobi.sat=99;state.labels.gobi=[999,99];foodChoices.paneer='paneerHP'");
 assert.equal(run("JSON.stringify(comparisonSum(BatchMath.portionLines(savedBatches['fixture-nutrients'],savedBatches['fixture-nutrients'].servings[0])))"),before);
 const legacy=JSON.parse(run("JSON.stringify(comparisonSum([{id:'gobi',q:500,n:{k:125,p:9.6,fb:10}}]))"));assert.equal(legacy.k,125);assert.equal(legacy.c,0);assert.equal(legacy.cHi,500);assert.equal(legacy.carbUnknown,true);assert.equal(legacy.satUnknown,true);
 assert.throws(()=>math.validateBatch({...b,ingredients:b.ingredients.map((x,i)=>i?x:{...x,n:{...x.n,cHi:-1}})}));
});
test('manual partial macros cannot create verified carb/saturated-fat/added-sugar passes',()=>{
 const {run}=app();run("state.labels.paneerMM=[283,16.1]");const n=JSON.parse(run("JSON.stringify(comparisonSum([L('paneerMM',100)]))"));
 assert.equal(n.carbUnknown,true);assert.equal(n.satUnknown,true);assert.equal(n.addedUnknown,true);assert.equal(n.cHi,100);
 run("state.labels={}");assert.equal(run("comparisonSum([L('spice',1)]).addedUnknown"),true);
 for(const id of ['rice','poha','chickpea','kalachana','besan','rajma','maida'])assert.equal(run(`FIB['${id}']`),run(`COMPARE_NUTRIENTS['${id}'].fb`));
});
test('K3 retirement is stable across calendar navigation and new batch initialization',()=>{
 const {run}=app();run("state.weekKey='2026-10-05';sharedRecipes[sharedKey(0)]={recipe:'K3'}");
 for(const offset of [-14,0,14]){run(`dayOff=${offset}`);assert.equal(run('sharedRecipe(state.days[0])'),'K3');assert.equal(run("personRecipe(state.days[0],'h')"),'K3');}
 run("state.weekKey='2026-10-12';sharedRecipes[sharedKey(0)]={recipe:'K3'}");
 for(const offset of [-14,0,14]){run(`dayOff=${offset}`);assert.equal(run('sharedRecipe(state.days[0])'),'K5');assert.equal(run("personRecipe(state.days[0],'h')"),'K5');assert.equal(run("sharedSabzi(state.days[0]).find(x=>x.id==='corn').q"),100);}
 run("householdDiets={w:'balanced',h:'keto'};drawBatchEditor=()=>{};document.querySelector=s=>s==='#dlg'?{showModal(){}}:null;openBatch(0)");
 assert.equal(run('batchDraft.recipe'),'K5');assert.equal(run("batchDraft.selected['2026-10-12/l/h']"),true);
 run("batchDraft.gross=700");assert.ok(run("buildBatchPreview(true).ingredients.some(x=>x.id==='corn'&&x.q>0)"));
});
test('wife Keto defaults resolve exact scope recipe and preserve explicit share overrides',()=>{
 const {run}=app();run("state.days[2].s='S3';sharedRecipes['keto/shared/2026-10-12/day/2']={recipe:'K5'}");
 assert.equal(run("ketoConfig(state.days[2],'w','l',2,'2026-10-12').sabziFraction"),.25);
 assert.equal(run("ketoConfig(state.days[2],'w','d',2,'2026-10-12').sabziFraction"),.2);
 run("sharedRecipes['keto/shared/2026-10-12/day/2'].w='S3'");assert.equal(run("ketoConfig(state.days[2],'w','l',2,'2026-10-12').sabziFraction"),2/9);
 run("ketoMeals['keto/2026-10-12/day/2/w/l']={protein:'paneer',quantity:75,soya:0,oil:0,sabziFraction:.17}");assert.equal(run("ketoConfig(state.days[2],'w','l',2,'2026-10-12').sabziFraction"),.17);
});
test('legacy walnut overrides neither duplicate nuts nor block unrelated edits',()=>{
 const {run}=app();
 for(const amount of [0,33]){run(`ketoMeals[ketoMealKey(0,'h','b')]={protein:'paneer',quantity:75,soya:0,oil:0,paneerType:'paneerHP',walnuts:${amount}}`);assert.equal(run("ketoConfig(state.days[0],'h','b').cashews"),0);assert.equal(run("ketoConfig(state.days[0],'h','b').walnuts"),amount);assert.doesNotThrow(()=>run("updateKetoPortion(ketoMealKey(0,'h','b'),'quantity',80)"));}
 run("ketoMeals[ketoMealKey(0,'h','b')]={protein:'paneer',quantity:75,soya:0,oil:0,walnuts:33};updateKetoPortion(ketoMealKey(0,'h','b'),'cashews',10)");assert.equal(run("ketoConfig(state.days[0],'h','b').walnuts"),0);
 run('ketoMeals={}');assert.equal(run("ketoConfig(state.days[0],'h','b').cashews"),10);
});
test('P and Y batches conserve default fresh oil with chilla boosts and portion modes',()=>{
 const {run}=app();run("householdDiets={w:'balanced',h:'balanced'}");
 for(const recipe of ['P','Y'])for(const breakfast of ['B1','B4'])for(const mode of ['easy','medium','hard']){
  run(`savedBatches={};state.days[0].b='${breakfast}';state.days[0].s='S1';state.days[0].p='${recipe}';state.personModes.w='${mode}';batchDraft={recipe:'${recipe}',cookedOn:'2026-10-05',vessel:'pan',includeVessel:false,gross:250,oil:null,roles:{'2026-10-05/d':'protein'},selected:{'2026-10-05/d/w':true}}`);
  const before=JSON.parse(run("JSON.stringify({ledger:ledger(),n:comparisonSum(meal(state.days[0],'d','w'))})"));
  run("savedBatches['fixture-oil']=buildBatchPreview(true)");const after=JSON.parse(run("JSON.stringify({ledger:ledger(),n:comparisonSum(meal(state.days[0],'d','w'))})"));
  for(const [id,q]of Object.entries(before.ledger))assert.ok(Math.abs(q-(after.ledger[id]||0))<1e-8,`${recipe} ${breakfast} ${mode} ${id}`);
  for(const field of ['k','p','c','a','oil','sat'])assert.ok(Math.abs(before.n[field]-after.n[field])<1e-8,field);
 }
});
test('cross-week protein batch oil resolves the serving date rather than the viewed week',()=>{
 const {run}=app();run("householdDiets={w:'balanced',h:'keto'};lockedWeeks['2026-10-12']={days:structuredClone(state.days),utDay:structuredClone(state.utDay),savedAt:1};lockedWeeks['2026-10-12'].days[0].s='S8';lockedWeeks['2026-10-12'].days[0].b='B1';lockedWeeks['2026-10-12'].days[0].p='P';sharedRecipes['keto/shared/2026-10-12/day/0']={recipe:'K5'};batchDraft={recipe:'P',cookedOn:'2026-10-11',vessel:'pan',includeVessel:false,gross:250,oil:null,roles:{'2026-10-12/d':'protein'},selected:{'2026-10-12/d/w':true}}");
 const oil=run("buildBatchPreview(true).ingredients.find(x=>x.id==='oil').q");assert.ok(Math.abs(oil-4*100/275)<1e-8);
 run("state.weekKey='2026-10-12';state.days=structuredClone(lockedWeeks['2026-10-12'].days)");assert.ok(Math.abs(run("buildBatchPreview(true).ingredients.find(x=>x.id==='oil').q")-oil)<1e-8);
});
test('individual paneer changes stale weights; purchasing-yield edits leave weights valid',()=>{
 const {run}=app();run("householdDiets={w:'balanced',h:'keto'};ketoMeals[ketoMealKey(0,'h','d')]={...ketoConfig(state.days[0],'h','d'),protein:'paneer',paneerType:'paneerHP',quantity:75};render=()=>{}");
 const before=run("weighBasis(0,'prot','all')");run("updateProduceYield('gobi',30)");assert.equal(run("weighBasis(0,'prot','all')"),before);
 run("ketoMeals[ketoMealKey(0,'h','d')].paneerType='paneerMM'");assert.notEqual(run("weighBasis(0,'prot','all')"),before);
});
test('shopping quantity increases invalidate purchased check while retaining the record',()=>{
 const {run}=app(true);run("householdDiets={w:'balanced',h:'keto'};sharedRecipes[sharedKey(0)]={recipe:'K2'};render=()=>{};activityRecords={};const r=householdShopping().market.find(x=>x.id==='gobi');activityRecords['buy/2026-10-05/gobi']=shoppingPurchaseRecord('gobi',true)");
 assert.equal(run("shoppingChecked(householdShopping().market.find(x=>x.id==='gobi'))"),true);
 run("updateProduceYield('gobi',30)");assert.equal(run("shoppingChecked(householdShopping().market.find(x=>x.id==='gobi'))"),false);assert.equal(run("activityRecords['buy/2026-10-05/gobi'].checked"),true);
});
test('calendar dialog shows Monday–Sunday ranges and asks before replacing or deleting a saved week',()=>{
 const {run}=app(true);
 run("lockedWeeks={'2026-10-05':{days:structuredClone(state.days),utDay:structuredClone(state.utDay),savedAt:1}};state.weekKey='2026-10-05';calConfirm=null");
 const day=(iso,year)=>run(`new Date('${iso}T12:00:00').toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'${year?",year:'numeric'":''}})`);
 const range=day('2026-10-05')+' – '+day('2026-10-11',true);
 assert.equal(run("weekRangeText('2026-10-05')"),range);
 assert.equal(run("weekRangeText('2026-12-28')"),day('2026-12-28',true)+' – '+day('2027-01-03',true));
 for(const iso of ['2026-10-05','2026-10-08','2026-10-11'])assert.equal(run(`mondayOf('${iso}')`),'2026-10-05');
 const viewing=run("calPickMon=mondayOf('2026-10-08');calCard()");
 assert.ok(viewing.includes(`<b>${range}</b> <span class="cal-tag is-saved">Saved · viewing</span>`));
 assert.match(viewing,/data-calload="2026-10-05">View saved week/);assert.doesNotMatch(viewing,/data-calsave/);
 assert.ok(viewing.includes(`Viewing saved week <b>${range}</b>`));
 run('state.weekKey=null');
 const template=run('calCard()');
 assert.match(template,/data-calload="2026-10-05">View saved week<\/button><button data-calsave>Replace with current plan…/);assert.doesNotMatch(template,/data-calconfirm/);
 assert.match(template,/Viewing the weekly template/);
 const confirm=run("calConfirm={kind:'save',mon:'2026-10-05'};calCard()");
 assert.ok(confirm.includes(`This replaces the saved week <b>${range}</b> with the seven days of the weekly template.`));
 assert.match(confirm,/<button class="primary" data-calsave data-calconfirm="2026-10-05">Replace saved week<\/button><button data-calcancel>Cancel<\/button>/);
 const other=run("calConfirm=null;calPickMon='2026-10-12';calCard()");
 assert.match(other,/Not saved yet/);assert.match(other,/<button class="primary" data-calsave>Save week<\/button>/);assert.doesNotMatch(other,/data-calconfirm/);
 assert.ok(other.includes(`<div class="calrow"><span><b>${range}</b></span>`));
 assert.match(run("calConfirm={kind:'del',mon:'2026-10-05'};calCard()"),/data-caldel="2026-10-05" data-calconfirm="2026-10-05">Delete<\/button><button data-calcancel>Cancel/);
 assert.equal(run("Object.keys(lockedWeeks).join()"),'2026-10-05');
});

test('palak corn counts raw corn, shared portions and shopping under every diet assignment',()=>{
 const {run}=app(true);
 assert.equal(run("comparisonSum([L('corn',100)]).k"),86);
 assert.equal(run("comparisonSum([L('corn',100)]).c"),18.7);
 assert.equal(run("comparisonSum([L('corn',100)]).aHi"),16.7);
 for(const w of ['balanced','keto'])for(const h of ['balanced','keto']){
  run(`householdDiets={w:'${w}',h:'${h}'};state.days[1].s='S8';sharedRecipes[sharedKey(1)]={recipe:'K3'}`);
  const before=run('ledger()');
  run("sharedRecipes[sharedKey(1)]={recipe:'K5'}");
  const after=run('ledger()');
  const expected=run("['w','h'].reduce((sum,p)=>sum+['l','d'].reduce((n,m)=>n+originalComponent(state.days[1],m,p,'sabzi').filter(x=>x.id==='corn').reduce((q,x)=>q+x.q,0),0),0)");
  assert.ok(expected>0);assert.ok(Math.abs(after.corn-expected)<1e-8);
  for(const [id,q] of Object.entries(before))assert.ok(Math.abs(after[id]-q)<1e-8,`${w}/${h}: ${id} unchanged`);
  assert.equal(run("householdShopping().market.find(x=>x.id==='corn').buy"),Math.ceil(expected/100-1e-8)*100);
  assert.match(run('uxWeekRow(state.days[1],1)'),/Spinach corn sabzi/);
  run('snapshotDraft();sharedRecipes={};hydrateDraft()');
  assert.equal(run("personRecipe(state.days[1],'w')"),'K5');
 }
 run("householdDiets={w:'balanced',h:'keto'}");
 assert.match(run('uxWarning(1)'),/carb budget needs review/);
 assert.equal(run("NO_EXTRA('K5')"),false);
 assert.equal(run("recipeName('S3')"),'Palak paneer');
});

test('open meal cards preserve all four diet assignments and expose dry, raw and snack quantities',()=>{
 const {run}=app(true);
 for(const w of ['balanced','keto'])for(const h of ['balanced','keto']){
  run(`householdDiets={w:'${w}',h:'${h}'}`);
  const ledger=run('JSON.stringify(ledger())');
  const html=run('uxDayHTML(0)');
  assert.equal((html.match(/<section class="meal-card/g)||[]).length,4);
  assert.match(html,/Snacks &amp; milk|Snacks & milk/);
  assert.doesNotMatch(html,/<details[^>]*data-ux-meal/);
  assert.match(html,/<b>1 scoop<\/b><small>35 g powder<\/small>/);
  assert.equal(run('JSON.stringify(ledger())'),ledger);
 }
 run("householdDiets={w:'balanced',h:'keto'}");
 assert.ok(run("uxServingRows(0,'l','w').some(x=>x.label==='Moong dal')"));
 assert.equal(run("uxServingRows(0,'l','h').some(x=>x.label==='Moong dal')"),false);
 assert.ok(run("uxServingRows(0,'l','w').some(x=>x.label==='Roti atta'&&x.quantity.endsWith('dry'))"));
 assert.equal(run("uxServingRows(0,'e','h').length"),0);
 assert.ok(run("uxServingRows(0,'e','w').some(x=>x.label==='Milk')"));
 assert.equal(run("uxFoodRow(L('chicken',250)).quantity"),'250 g raw');
});

test('meal cards reuse measured lunch and dinner portions and reject stale cooked weights',()=>{
 const {run}=app(true);run("householdDiets={w:'balanced',h:'keto'};sharedRecipes[sharedKey(0)]={recipe:'K4'}");
 const before=run('JSON.stringify(ledger())');
 assert.ok(run("uxServingRows(0,'l','h').find(x=>x.label==='Bhindi').unweighed"));
 run("dailyWeights[dateForDay(0)+'/sabzi']={gross:1600,tare:1000,vessel:'kadhai',scope:'all',...WeighMath.allocateFood(1600,1000,weighSpecs(0,'sabzi')),basis:weighBasis(0,'sabzi','all'),savedAt:1}");
 for(const m of ['l','d'])for(const p of ['w','h']){
  const expected=run(`currentWeigh(0,'sabzi').portions.find(x=>x.meal==='${m}'&&x.person==='${p}').grams`);
  assert.equal(run(`uxServingRows(0,'${m}','${p}').find(x=>x.label==='Bhindi').quantity`),expected+' g cooked');
 }
 assert.equal(run('JSON.stringify(ledger())'),before);
 run("sharedRecipes[sharedKey(0)]={recipe:'K5'}");
 assert.ok(run("uxServingRows(0,'l','h').find(x=>x.label==='Spinach corn sabzi').unweighed"));
});

test('compact quantity tables retain every person’s food and distinguish shared from individual portions',()=>{
 const {run}=app(true);
 for(const w of ['balanced','keto'])for(const h of ['balanced','keto']){
  run(`householdDiets={w:'${w}',h:'${h}'}`);
  const ledger=run('JSON.stringify(ledger())');
  for(const m of ['b','l','d','e']){
   const rows=JSON.parse(run(`JSON.stringify(uxMealRows(0,'${m}'))`));
   for(const p of ['w','h']){
    const original=JSON.parse(run(`JSON.stringify(uxServingRows(0,'${m}','${p}'))`));
    const sort=xs=>xs.toSorted((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
    assert.deepEqual(sort(rows.flatMap(r=>r[p]?[r[p]]:[])),sort(original),`${w}/${h} ${m} ${p}: food not lost or duplicated`);
   }
  }
  assert.equal(run('JSON.stringify(ledger())'),ledger);
 }
 run("householdDiets={w:'balanced',h:'keto'}");
 const breakfast=JSON.parse(run("JSON.stringify(uxMealRows(0,'b'))"));
 const whey=breakfast.filter(r=>r.label==='Whey');assert.equal(whey.length,1);
 for(const p of ['w','h']){assert.equal(whey[0][p].quantity,'1 scoop');assert.equal(whey[0][p].detail,'35 g powder');}
 assert.deepEqual(['0.5','1','2'].map(q=>run(`JSON.stringify(uxFoodRow(L('whey',${q})))`)),[{quantity:'0.5 scoop',detail:'17.5 g powder'},{quantity:'1 scoop',detail:'35 g powder'},{quantity:'2 scoops',detail:'70 g powder'}].map(x=>JSON.stringify({label:'Whey',...x})));
 const lunch=JSON.parse(run("JSON.stringify(uxMealRows(0,'l'))"));
 const dal=lunch.find(r=>r.label==='Moong dal');assert.ok(dal.w);assert.equal(dal.h,undefined);
 run("sharedRecipes[sharedKey(5)]={recipe:'K1',w:'S12'}");
 const different=JSON.parse(run("JSON.stringify(uxMealRows(5,'l'))"));
 assert.ok(different.find(r=>r.label==='Paneer bhurji').w);assert.equal(different.find(r=>r.label==='Paneer bhurji').h,undefined);
 assert.ok(different.find(r=>r.label==='Cabbage').h);assert.equal(different.find(r=>r.label==='Cabbage').w,undefined);
});

test('prepared batch serving appears once using its frozen cooked weight',()=>{
 const {run}=app(true);run("householdDiets={w:'balanced',h:'keto'};savedBatches.test={recipe:'K4',cookedOn:dateForDay(0),vessel:'kadhai',tare:0,netWeight:300,createdAt:1,ingredients:[{id:'bhindi',q:175,n:{k:57.75,p:3.3775,fb:5.6}}],servings:[{date:dateForDay(0),meal:'l',person:'h',component:'sabzi',share:1,grams:300}]}");
 const rows=run("uxServingRows(0,'l','h')");
 assert.equal(rows.filter(x=>x.label==='Bhindi').length,1);
 assert.equal(rows.find(x=>x.label==='Bhindi').quantity,'300 g cooked');
 assert.equal(rows.some(x=>x.label==='Bhindi'&&x.quantity.includes('raw')),false);
});

test('keto proposals respect off meals and separate vegetarian/egg defaults',()=>{
 const {run}=app();
 assert.equal(run("ketoSuggestion(state.days[0],'w','b').name"),'Ready portions + Milky Mist paneer');
 assert.equal(run("ketoSuggestion({...state.days[0],eggH:true},'h','b').name"),'Ready portions + Milky Mist paneer');
 assert.equal(run("ketoSuggestion({...state.days[0],eggH:false},'h','b').name"),'Ready portions + Milky Mist paneer');
 assert.equal(run("ketoSuggestion({...state.days[0],wheyW:false},'w','b').note.includes('whey')"),false);
 assert.equal(run("ketoSuggestion({...state.days[0],off:true},'w','b').skipped"),true);
 assert.equal(run("ketoSuggestion({...state.days[0],skip:{l:true}},'h','l').skipped"),true);
});
test('comparison uses prepared recipes and cannot change plan, calories, shopping or saved records',()=>{
 const {run,root}=app();
 run("batchDraft={recipe:'S8',cookedOn:'2026-10-05',vessel:'pan',includeVessel:false,gross:600,oil:12,roles:{'2026-10-05/l':'sabzi'},selected:{'2026-10-05/l/w':true}};savedBatches['fixture-keto']=buildBatchPreview(true);");
 const snapshot=()=>run("JSON.stringify({state,lockedWeeks,savedBatches,dailyWeights,cloudDraft,ledger:ledger(),w:daily(0,'w'),h:daily(0,'h')})");
 const before=snapshot();run('renderKeto()');
 assert.equal(snapshot(),before);
 assert.match(root.innerHTML,/Soya chunks sabzi/);
 assert.match(root.innerHTML,/prepared portions stay frozen/i);
 assert.match(root.innerHTML,/Soya chunks sabzi/);
 assert.match(root.innerHTML,/Undeclared sugars/);
 assert.match(root.innerHTML,/not a verified global/);
 assert.equal((root.innerHTML.match(/data-keto-day="/g)||[]).length,7);
 assert.equal(run('KETO_VIDEOS.length'),5);
 assert.equal(run('KETO_PACKETS[0].carbs'),2.8);
 assert.equal(run("KETO_PACKETS.find(x=>x.name==='Nutrela chunks').fibre"),null);
 assert.match(root.innerHTML,/100 g, NOT per 100 ml/);
 assert.match(root.innerHTML,/ND = not declared, not zero/);
 run("ketoPerson='w';renderKeto()");assert.equal(snapshot(),before);
 assert.doesNotMatch(root.innerHTML,/class="keto-person">Husband/);
});
test('comparison uses unscaled raw portions, oil units and one scoop/egg allocation',()=>{
 const {run}=app();
 for(const p of ['w','h']){
  const t=JSON.parse(run(`JSON.stringify(comparisonWeek('${p}'))`));
  assert.equal(t.scale,1);
  assert.equal(t.keto.k,run(`state.days.reduce((n,d)=>n+['b','l','d','e'].reduce((a,m)=>a+comparisonSum(ketoActualMeal(d,'${p}',m)).k,0)/7,0)`));
  assert.ok(t.balanced.c>t.keto.c);
  assert.ok(t.keto.sHi>=t.keto.s);
  for(const n of Object.values(t.keto))if(typeof n==='number')assert.ok(Number.isFinite(n));
 }
 assert.equal(run("comparisonSum([L('whey',1)]).c"),2.8);
 assert.equal(run("comparisonSum([L('milk',100)]).c"),4.6*1.03);
 assert.equal(run("comparisonSum([L('oil',10)]).f"),99.7*.1*.91);
 assert.equal(run("ketoPortionedMeal({...state.days[0],wheyH:true,eggH:true},'h','b').find(x=>x.id==='whey').q"),1);
 assert.equal(run("ketoDraftMeal(state.days[0],'h','d').find(x=>x.id==='egg').q"),4);
 assert.equal(run("comparisonSum([L('paneer',100)]).s"),0);
 assert.equal(run("comparisonSum([L('paneer',100)]).sHi"),3);
});
test('keto draft meets household exclusions and brands; skips do not invent intake',()=>{
 const {run}=app();
 assert.equal(run("state.days.flatMap(d=>['w','h'].flatMap(p=>['b','l','d','e'].flatMap(m=>ketoDraftMeal(d,p,m)))).some(x=>['tofu','brinjal','lauki','zucchini','capsicum'].includes(x.id))"),false);
 assert.equal(run("ketoDraftMeal({...state.days[0],off:true},'h','e').length"),0);
 assert.equal(run("ketoDraftMeal({...state.days[0],skip:{l:true}},'w','l').length"),0);
 run("ketoMeals[ketoMealKey(0,'w','l')]={...ketoConfig(state.days[0],'w','l'),soya:10}");assert.equal(run("ketoDraftMeal(state.days[0],'w','l').find(x=>x.id==='soyN').q"),10);
 run("state.soya='S'");
 assert.equal(run("ketoDraftMeal(state.days[0],'w','l').find(x=>x.id==='soyS').q"),10);
 run("state.days.forEach(d=>d.off=true)");
 assert.equal(run("comparisonWeek('w').keto.k"),0);
 assert.equal(run("Number.isFinite(comparisonWeek('w').scale)"),true);
});

test('chicken replaces paneer, uses raw grams, counts oil once and wife stays vegetarian',()=>{
 const {run}=app();
 const lines=JSON.parse(run("JSON.stringify(ketoDraftMeal(state.days[1],'h','d'))"));
 assert.equal(lines.find(x=>x.id==='chicken').q,250);
 assert.equal(lines.filter(x=>x.id==='oil').reduce((n,x)=>n+x.q,0),run("3+oilUse().sabzi*.35"));
 assert.ok(!lines.some(x=>['paneer','egg','soyN'].includes(x.id)));
 assert.equal(run("comparisonSum([L('chicken',250)]).k"),300);
 assert.equal(run("comparisonSum([L('chicken',125)]).p"),28.125);
 assert.equal(run("comparisonSum([L('chicken',250)]).c"),0);
 assert.equal(run("ketoDraftMeal(state.days[0],'h','d').filter(x=>x.id==='egg').length"),1);
 assert.equal(run("ketoDraftMeal(state.days[0],'h','d').some(x=>['paneer','paneerHP'].includes(x.id))"),false);
 assert.equal(run("state.days.flatMap(d=>['b','l','d'].flatMap(m=>ketoDraftMeal(d,'w',m))).some(x=>['chicken','egg'].includes(x.id))"),false);
});
test('keto overrides round trip per week/person/meal without changing Balanced or weights',()=>{
 const {run}=app();
 const balanced=run('JSON.stringify({state,ledger:ledger(),savedBatches,dailyWeights})');
 run("ketoMeals[ketoMealKey(1,'h','d')]={protein:'chicken',quantity:125,soya:0,oil:4};snapshotDraft();");
 assert.equal(run("cloudDraft['keto/2026-10-05/day/1/h/d'].quantity"),125);
 run("ketoMeals={};hydrateDraft();householdDiets={w:'balanced',h:'balanced'};balancedCurdType='curd'");
 assert.equal(run("ketoDraftMeal(state.days[1],'h','d').find(x=>x.id==='chicken').q"),125);
 assert.equal(run('JSON.stringify({state,ledger:ledger(),savedBatches,dailyWeights})'),balanced);
 run("state.weekKey='2026-10-12'");
 assert.equal(run("ketoConfig(state.days[1],'h','d').quantity"),250);
 run("state.weekKey=null");
 assert.equal(run("ketoConfig(state.days[1],'h','d').quantity"),250);
 run("ketoMeals[ketoMealKey(0,'w','d')]={protein:'paneer',quantity:60,soya:15,oil:3};renderKeto()");
 assert.equal(run("ketoConfig(state.days[0],'w','d').quantity"),60);
});

test('protein and quantity edit flow writes only the keto record and updates totals',()=>{
 const {run}=app();
 const balanced=run('JSON.stringify({state,savedBatches,dailyWeights,ledger:ledger()})');
 const before=run("comparisonWeek('h').keto.k");
 run("updateKetoPortion(ketoMealKey(0,'h','b'),'protein','chicken')");
 assert.equal(run("ketoConfig(state.days[0],'h','b').quantity"),250);
 run("updateKetoPortion(ketoMealKey(0,'h','b'),'quantity',125)");
 assert.equal(run("ketoConfig(state.days[0],'h','b').quantity"),125);
 assert.notEqual(run("comparisonWeek('h').keto.k"),before);
 assert.equal(run('JSON.stringify({state,savedBatches,dailyWeights,ledger:ledger()})'),balanced);
 assert.throws(()=>run("updateKetoPortion(ketoMealKey(0,'w','b'),'protein','chicken')"));
 assert.equal(run("updateKetoPortion('keto/2026-10-12/day/0/h/b','quantity',125)"),false);
 run("updateKetoPortion(ketoMealKey(0,'h','d'),'protein','eggs')");
 assert.equal(run("ketoDraftMeal(state.days[0],'h','d').filter(x=>x.id==='egg').length"),1);
});

test('all four assignments preserve Balanced portions and give independent actual keto totals',()=>{
 const {run}=app();const original=run('JSON.stringify(state.days)');
 for(const w of ['balanced','keto'])for(const h of ['balanced','keto']){
  run(`householdDiets={w:'${w}',h:'${h}'}`);
  for(const p of ['w','h']){
   const balanced=(p==='w'?w:h)==='balanced';
   assert.equal(run(`meal(state.days[0],'l','${p}').some(x=>x.id===state.days[0].dal)`),balanced);
   assert.equal(run(`meal(state.days[0],'l','${p}').some(x=>['atta','rice'].includes(x.id))`),balanced);
   if(balanced)assert.equal(run(`JSON.stringify(meal(state.days[0],'l','${p}'))===JSON.stringify(balancedMeal(state.days[0],'l','${p}'))`),true);
  }
  assert.equal(run('JSON.stringify(state.days)'),original);
 }
 run("householdDiets={w:'balanced',h:'keto'}");
 const before=run("JSON.stringify(assignedDayNutrition(0,'h'))");run('state.days[0].cardioH=false');assert.equal(run("JSON.stringify(assignedDayNutrition(0,'h'))"),before);
 assert.equal(run("state.days.reduce((n,d)=>n+['b','l','d'].filter(m=>meal(d,m,'h').some(x=>x.id==='chicken')).length,0)"),2);
 assert.equal(run("ledger().chicken"),500);
});
test('actual shared recipe, exact oil, conservative carbs and fullness checks stay honest',()=>{
 const {run}=app();run("householdDiets={w:'balanced',h:'keto'}");
 const baseline=run("JSON.stringify(balancedMeal(state.days[3],'l','w'))");
 assert.equal(run("meal(state.days[3],'l','h').some(x=>x.id==='arbi')"),true);
 assert.ok(run("dailyPlanChecks(assignedDayNutrition(3,'h'),'h').some(x=>x.includes('exceed'))"));
 run("sharedRecipes[sharedKey(3)]={recipe:'K3'}");
 assert.equal(run("meal(state.days[3],'l','h').some(x=>x.id==='arbi')"),false);
 assert.equal(run("JSON.stringify(balancedMeal(state.days[3],'l','w'))"),baseline);
 const oil=run("['w','h'].flatMap(p=>['l','d'].flatMap(m=>originalComponent(state.days[3],m,p,'sabzi'))).filter(x=>x.id==='oil').reduce((n,x)=>n+x.q,0)");
 assert.ok(Math.abs(oil-run("oilUse().sabzi*sabBatch(state.days[3])"))<1e-8);
 assert.equal(run("comparisonSum([L('paneerHP',100)]).a"),5.4);
 assert.ok(Math.abs(run("comparisonSum([L('curdH',150)]).c")-6.45)<1e-10);
 assert.ok(Math.abs(run("comparisonSum([L('flax',100)]).a")-1.58)<1e-10);
 assert.ok(Math.abs(run("comparisonSum([L('walnuts',100)]).a")-7.01)<1e-10);
 assert.ok(run("dailyPlanChecks(comparisonSum([L('whey',1)]),'h').some(x=>x.includes('working range'))"));
 assert.ok(run("dailyPlanChecks(comparisonSum([L('spice',1)]),'h').some(x=>x.includes('unverified'))"));
 if(process.env.MEAL_REPORT)console.log(run("JSON.stringify(state.days.map((d,i)=>({day:DAYS[i],...assignedDayNutrition(i,'h'),checks:dailyPlanChecks(assignedDayNutrition(i,'h'),'h')})))"));
});
test('household assignments, shared swaps and hunger trial round trip independently by week',()=>{
 const {run}=app();run("householdDiets={w:'balanced',h:'keto'};sharedRecipes[sharedKey(2)]={recipe:'K3'};trialChecks['2026-10-05']={weight:75,waist:85,hunger:4,strength:'stable'};snapshotDraft();householdDiets={w:'keto',h:'balanced'};sharedRecipes={};trialChecks={};hydrateDraft();");
 assert.equal(run("householdDiets.w+'|'+householdDiets.h"),'balanced|keto');
 assert.equal(run("sharedRecipe(state.days[2])"),'K3');assert.equal(run("trialChecks['2026-10-05'].hunger"),4);
 run("state.weekKey='2026-10-12'");assert.equal(run("sharedRecipe(state.days[2])"),run('state.days[2].s'));
});


test('keto chicken and high-protein paneer batches freeze exact raw quantities and replace fresh oil',()=>{
 const {run}=app();run("householdDiets={w:'balanced',h:'keto'};batchDraft={recipe:'C',cookedOn:'2026-10-06',vessel:'pan',includeVessel:false,gross:380,oil:null,roles:{'2026-10-06/d':'protein','2026-10-09/d':'protein'},selected:{'2026-10-06/d/h':true,'2026-10-09/d/h':true,'2026-10-06/d/w':true}};");
 const before=run('JSON.stringify(ledger())'),b=JSON.parse(run('JSON.stringify(buildBatchPreview(true))'));
 math.validateBatch(b);assert.equal(b.ingredients.find(x=>x.id==='chicken').q,500);assert.equal(b.ingredients.find(x=>x.id==='oil').q,6);assert.equal(b.servings.length,2);assert.equal(b.servings.reduce((n,x)=>n+x.grams,0),380);
 run("savedBatches['fixture-chicken']=buildBatchPreview(true)");const after=JSON.parse(run('JSON.stringify(ledger())')),a=JSON.parse(before);for(const id of Object.keys(a))assert.ok(Math.abs(a[id]-(after[id]||0))<1e-7,id);
 assert.equal(run("meal(state.days[1],'d','h').find(x=>x.id==='chicken').q"),250);
 assert.ok(run("ketoSuggestion(state.days[1],'h','d').name.includes('Chicken breast')"));
 run("ketoMeals[ketoMealKey(1,'h','d')]={...ketoConfig(state.days[1],'h','d'),quantity:125,oil:20}");assert.equal(run("meal(state.days[1],'d','h').find(x=>x.id==='chicken').q"),250);
 run("batchDraft={recipe:'Q',cookedOn:'2026-10-05',vessel:'pan',includeVessel:false,gross:60,oil:null,roles:{'2026-10-05/d':'protein'},selected:{'2026-10-05/d/h':true}};ketoMeals[ketoMealKey(0,'h','d')]={...ketoConfig(state.days[0],'h','d'),protein:'paneer',paneerType:'paneerHP',quantity:75,oil:0};");
 const q=JSON.parse(run('JSON.stringify(buildBatchPreview(true))'));math.validateBatch(q);assert.equal(q.ingredients.find(x=>x.id==='paneerHP').q,75);assert.ok(!q.ingredients.some(x=>x.id==='paneer'));
});
test('mixed prep lists account for every fresh ingredient and oil once',()=>{
 const {run}=app();run("householdDiets={w:'balanced',h:'keto'}");
 for(let i=0;i<7;i++){
  const groups=JSON.parse(run(`JSON.stringify(householdPrep(${i}))`)),expected=JSON.parse(run(`JSON.stringify(aggregateBatchLines(['w','h'].flatMap(p=>['b','l','d','e'].flatMap(m=>freshMeal(state.days[${i}],m,p)))))`));
  for(const x of expected){const name=run(`DB['${x.id}'][0]`),qty=groups.flatMap(g=>g[1]).filter(s=>s.startsWith(name+' — ')).reduce((n,s)=>n+Number(s.slice(name.length+3).split(' ')[0]),0);assert.ok(Math.abs(qty-x.q)<.31,`${i} ${x.id}: ${qty} vs ${x.q}`);}
 }
});

test('high hunger prompts review and Heritage curd is a distinct shared default',()=>{
 const {run,root}=app();run("trialChecks['2026-10-05']={hunger:4};renderKeto()");assert.match(root.innerHTML,/High hunger recorded/);assert.match(root.innerHTML,/before cutting food further/);
 run("balancedCurdType='curdH'");assert.equal(run("meal(state.days[0],'l','w').find(x=>x.id==='curdH').q"),200);assert.equal(run("comparisonSum([L('curdH',200)]).k"),116);
 run('snapshotDraft();balancedCurdType="curd";hydrateDraft()');assert.equal(run('balancedCurdType'),'curdH');
});

test('one shopping route is available in every diet/day view without changing the plan',()=>{
 const {run,shopping,regular,root}=app();run("householdDiets={w:'balanced',h:'keto'};state.view='day'");
 const before=run('JSON.stringify({state,householdDiets,cloudDraft,ledger:ledger()})');
 run("showKetoRoute('#shopping')");assert.equal(shopping.hidden,false);assert.equal(regular.hidden,true);assert.equal(root.hidden,true);
 assert.match(shopping.innerHTML,/Farmers’ market/);assert.match(shopping.innerHTML,/DMart \/ Walmart/);assert.match(shopping.innerHTML,/Wife <b>Balanced/);assert.match(shopping.innerHTML,/Husband <b>Keto draft/);
 assert.match(shopping.innerHTML,/data-shopping-item="cucumber"/);
 run("showKetoRoute('#keto')");assert.equal(shopping.hidden,true);assert.equal(root.hidden,false);
 run("showKetoRoute('#planner')");assert.equal(regular.hidden,false);assert.equal(shopping.hidden,true);
 assert.equal(run('JSON.stringify({state,householdDiets,cloudDraft,ledger:ledger()})'),before);
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.equal((html.match(/href="#shopping"/g)||[]).length,1);assert.ok(html.indexOf('id="shopping"')>html.indexOf('id="labels"'));assert.doesNotMatch(html,/body\[data-view=day\] #shopping/);
});
test('shopping includes every assigned ingredient, respects skips, and rounds purchase quantities upward',()=>{
 const {run}=app();
 for(const w of ['balanced','keto'])for(const h of ['balanced','keto']){
  run(`householdDiets={w:'${w}',h:'${h}'}`);
  const list=JSON.parse(run('JSON.stringify(householdShopping())')),led=JSON.parse(run('JSON.stringify(ledger())'));
  const rows=[...list.market,...list.supermarket];assert.equal(rows.length,Object.values(led).filter(q=>q>1e-8).length);
  for(const row of rows){assert.equal(row.needed,led[row.id]);assert.ok(row.buy+1e-8>=row.needed);}
  assert.equal(rows.find(x=>x.id==='cucumber').needed,run("ledger().cucumber"));
  assert.equal(rows.some(x=>x.id==='chicken'),h==='keto');
  if(h==='keto'){const chicken=rows.find(x=>x.id==='chicken');assert.equal(chicken.needed,500);assert.equal(chicken.packs,2);assert.equal(chicken.largePacks,1);assert.equal(chicken.largeLeftover,0);}
 }
 run("state.days.forEach(d=>d.off=true)");assert.equal(run('householdShopping().market.length+householdShopping().supermarket.length'),0);
 run("state.days[0].off=false;state.days[0].skip={b:true,l:true,d:true}");assert.equal(run('householdShopping().market.length+householdShopping().supermarket.length'),0);
 assert.equal(run("shoppingQuantity(1015,'g')"),'1.015 kg');assert.equal(run("shoppingQuantity(1400,'ml')"),'1.4 L');
});
test('shopping follows protein/brand edits and frozen cooking batches without counting twice',()=>{
 const {run}=app();run("householdDiets={w:'balanced',h:'keto'}");
 const before=run('JSON.stringify(householdShopping())');
 run("batchDraft={recipe:'C',cookedOn:'2026-10-06',vessel:'pan',includeVessel:false,gross:380,oil:null,roles:{'2026-10-06/d':'protein','2026-10-09/d':'protein'},selected:{'2026-10-06/d/h':true,'2026-10-09/d/h':true}};savedBatches['fixture-shop-chicken']=buildBatchPreview(true)");
 const after=JSON.parse(run('JSON.stringify(householdShopping())'));
 assert.equal(after.supermarket.find(x=>x.id==='chicken').needed,500);
 const old=JSON.parse(before);for(const row of [...old.market,...old.supermarket]){const newer=[...after.market,...after.supermarket].find(x=>x.id===row.id);assert.ok(Math.abs(row.needed-newer.needed)<1e-8,row.id);}
 run("ketoMeals[ketoMealKey(1,'h','d')]={...ketoConfig(state.days[1],'h','d'),quantity:125};");assert.equal(run("householdShopping().supermarket.find(x=>x.id==='chicken').needed"),500);
 run("savedBatches={};ketoMeals[ketoMealKey(4,'h','d')]={...ketoConfig(state.days[4],'h','d'),quantity:125}");
 assert.equal(run("householdShopping().supermarket.find(x=>x.id==='chicken').needed"),250);
 run("balancedCurdType='curd'");assert.equal(run("householdShopping().supermarket.find(x=>x.id==='curd').needed"),1400);assert.equal(run("householdShopping().supermarket.find(x=>x.id==='curdH').needed"),700);
 run("renderShopping()");
});

test('wife bhurji replaces cabbage and dinner soya without changing husband or saved menu',()=>{
 const {run,root}=app();run("householdDiets={w:'balanced',h:'keto'};state.days[5].s='S5';state.days[5].p='Y';sharedRecipes[sharedKey(5)]={recipe:'K1'}");
 const husband=run("JSON.stringify(['l','d'].flatMap(m=>meal(state.days[5],m,'h')))"),menu=run('JSON.stringify(state.days)'),before=JSON.parse(run('JSON.stringify(ledger())'));
 run("sharedRecipes[sharedKey(5)].w='S12'");
 assert.equal(run("JSON.stringify(['l','d'].flatMap(m=>meal(state.days[5],m,'h')))"),husband);assert.equal(run('JSON.stringify(state.days)'),menu);
 const wife=JSON.parse(run("JSON.stringify(['l','d'].flatMap(m=>meal(state.days[5],m,'w')))"));assert.ok(wife.some(x=>x.id==='paneerMM'));assert.ok(!wife.some(x=>['cabbage','soyN','soyS'].includes(x.id)));assert.ok(wife.some(x=>x.id==='arhar'));
 const after=JSON.parse(run('JSON.stringify(ledger())'));
 assert.ok(Math.abs(after.cabbage-before.cabbage+225)<1e-8);assert.ok(Math.abs(after.paneerMM-before.paneerMM-101.25)<1e-8);assert.ok(Math.abs(after.soyN-before.soyN+48)<1e-8);
 assert.equal(run("householdShopping().market.find(x=>x.id==='cabbage').buy"),500);
 assert.match(run("assignedBalancedTitle(state.days[5],'w','d')"),/Paneer bhurji/);assert.doesNotMatch(run("assignedBalancedTitle(state.days[5],'w','d')"),/dinner protein/);
 run('renderKeto()');assert.match(root.innerHTML,/Wife: Paneer bhurji · Husband: Cabbage/);
 for(const group of JSON.parse(run('JSON.stringify(householdPrep(5))')).slice(0,2))assert.ok(group[0].includes('once for lunch + dinner'));
 const groups=JSON.parse(run('JSON.stringify(householdPrep(5))')),expected=JSON.parse(run("JSON.stringify(aggregateBatchLines(['w','h'].flatMap(p=>['b','l','d','e'].flatMap(m=>freshMeal(state.days[5],m,p)))))"));
 for(const x of expected){const name=run(`DB['${x.id}'][0]`),q=groups.flatMap(g=>g[1]).filter(s=>s.startsWith(name+' — ')).reduce((n,s)=>n+Number(s.slice(name.length+3).split(' ')[0]),0);assert.ok(Math.abs(q-x.q)<.31,x.id);}
});
test('full recipe options and person overrides round trip; changing shared preserves exceptions',()=>{
 const {run}=app();run("render=()=>{};updateRecipe(5,'shared','K1');updateRecipe(5,'w','S12');snapshotDraft();sharedRecipes={};hydrateDraft();");
 assert.equal(run("personRecipe(state.days[5],'w')"),'S12');assert.equal(run("personRecipe(state.days[5],'h')"),'K1');
 const controls=run('recipeSelectorsHTML(state.days[5],5)');for(const name of ['Paneer bhurji','Palak paneer','Soya chunks sabzi','Beans + carrot + aloo','Cabbage','Mushroom'])assert.ok(controls.includes(name));
 run("updateRecipe(5,'shared','S3')");assert.equal(run("personRecipe(state.days[5],'w')"),'S12');assert.equal(run("personRecipe(state.days[5],'h')"),'S3');
 run("updateRecipe(5,'shared','original')");assert.equal(run("personRecipe(state.days[5],'w')"),'S12');
 run("updateRecipe(5,'w','shared')");assert.equal(run("personRecipe(state.days[5],'w')"),run('state.days[5].s'));
 assert.throws(()=>run("updateRecipe(5,'w','tofu')"));
 for(const w of ['balanced','keto'])for(const h of ['balanced','keto']){run(`householdDiets={w:'${w}',h:'${h}'};sharedRecipes[sharedKey(5)]={recipe:'K1',w:'S12'}`);assert.equal(run("meal(state.days[5],'d','w').some(x=>['soyN','egg','chicken'].includes(x.id))"),false);assert.equal(run("meal(state.days[5],'d','w').some(x=>x.id==='cabbage')"),false);}
});
test('separate sabzis have separate weighing records and recipe-matched batch selections',()=>{
 const {run}=app();run("householdDiets={w:'balanced',h:'keto'};state.days[5].s='S5';state.days[5].p='Y';sharedRecipes[sharedKey(5)]={recipe:'K1',w:'S12'}");
 assert.equal(run("weighSpecs(5,'sabzi').length"),0);
 for(const p of ['w','h']){
  const specs=JSON.parse(run(`JSON.stringify(weighSpecs(5,'sabzi-${p}'))`));assert.equal(specs.length,2);assert.ok(specs.every(s=>s.person===p));const allocated=weighMath.allocateFood(600,0,specs);assert.equal(allocated.portions.reduce((n,s)=>n+s.grams,0),600);
  const r={gross:600,tare:0,netWeight:600,vessel:'pan',scope:'all',basis:run(`weighBasis(5,'sabzi-${p}','all')`),savedAt:Date.now(),portions:allocated.portions};assert.doesNotThrow(()=>records.validateRecord(`weigh/2026-10-10/sabzi-${p}`,r));
 }
 assert.equal(run("weighSpecs(5,'prot').some(x=>x.person==='w')"),false);
 run("batchDraft={recipe:'S12',cookedOn:'2026-10-10',vessel:'pan',includeVessel:false,gross:230,oil:null,roles:{},selected:{}};prefillBatchServings()");
 assert.equal(run("batchDraft.selected['2026-10-10/l/w']"),true);assert.equal(run("batchDraft.selected['2026-10-10/l/h']"),false);
 run("Object.keys(batchDraft.selected).forEach(k=>{if(!k.startsWith('2026-10-10/'))batchDraft.selected[k]=false})");const b=JSON.parse(run('JSON.stringify(buildBatchPreview(true))'));math.validateBatch(b);assert.ok(b.servings.every(s=>s.person==='w'));assert.ok(math.claimsFor(b,b.servings.find(s=>s.meal==='d')).some(k=>k.endsWith('/protein')));
 const before=JSON.parse(run('JSON.stringify(ledger())'));run("savedBatches['fixture-bhurji']=buildBatchPreview(true)");const after=JSON.parse(run('JSON.stringify(ledger())'));for(const id of Object.keys(before))assert.ok(Math.abs(before[id]-(after[id]||0))<1e-7,id);
 run("sharedRecipes[sharedKey(5)].w='S5'");assert.equal(run("meal(state.days[5],'d','w').some(x=>x.id==='paneerMM')"),true);assert.equal(run("meal(state.days[5],'d','w').some(x=>x.id==='soyN')"),false);
});

test('round 2 UI: fixed theme switch, product selectors, buying assumptions and honest unknowns',()=>{
 const css=readFileSync(new URL('../ux.css',import.meta.url),'utf8'),html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(css,/\.ux-theme-btn\{position:fixed;top:var\(--theme-top\);right:var\(--theme-right\);z-index:35/);
 assert.match(css,/#syncBar\{position:sticky;top:0;z-index:30;margin:0 var\(--theme-reserve\)/);assert.match(css,/\.ux-app-header\{padding-right:var\(--theme-reserve\)\}/);
 assert.match(html,/id="themeBtn"/);assert.match(html,/id="settingsLink"/);assert.match(html,/id="productRow"/);
 const {run,shopping,root}=app(true);
 const products=run('uxProductChoicesHTML()');
 assert.match(products,/<option value="paneerMM" selected>Milky Mist paneer · 500 g \(default\)/);assert.match(products,/<option value="butter" selected>Amul salted butter \(default\)/);
 assert.match(products,/value="paneerHP">Heritage NOURISH\+ high-protein paneer/);assert.match(products,/value="butterH">Heritage table butter/);
 run("foodChoices={paneer:'paneerHP',butter:'butterH',nuts:'cashews'}");assert.match(run('uxProductChoicesHTML()'),/value="paneerHP" selected/);
 run("householdDiets={w:'balanced',h:'keto'}");
 assert.match(run("ketoEditHTML(state.days[0],0,'h','b')"),/Optional Heritage butter/);
 run("foodChoices.butter='butter'");assert.match(run("ketoEditHTML(state.days[0],0,'h','b')"),/Optional Amul butter/);
 run('renderShopping()');
 assert.match(shopping.innerHTML,/<details class="ux-disclosure ux-buying" data-shopping-assumptions><summary>Buying assumptions<\/summary>/);
 assert.match(shopping.innerHTML,/data-ux-yield="corn"/);assert.match(shopping.innerHTML,/data-ux-mushroom-size/);assert.match(shopping.innerHTML,/never|always use the trimmed edible weight/);
 assert.equal(run("shoppingBuy({id:'mushroom',needed:300,buy:360,packs:2,size:180})"),'2 × 180 g<small>360 g in packets</small>');
 assert.equal(run("shoppingForm({id:'corn',yield:1,form:'Loose kernels'},{})"),'Loose kernels · 100% usable');
 assert.equal(run("addedSugarText({})"),'Unknown');
 assert.equal(run("addedSugarText({added:2,addedHi:6,addedUnknown:true})"),'2–6 g · incomplete data');
 assert.equal(run("addedSugarText({added:0,addedUnknown:false})"),'0 g');
 run('renderKeto()');
 assert.doesNotMatch(root.innerHTML,/<td>0 g<\/td><td>0 g<\/td>/);assert.doesNotMatch(run('trialHTML()+ketoReviewHTML()'),/walnut/i);
 const evidence=root.innerHTML.slice(root.innerHTML.indexOf('Packaged products and evidence'));assert.doesNotMatch(evidence.slice(0,evidence.indexOf('Five doctor')),/walnut/i);
 run("ketoMeals[ketoMealKey(0,'h','b')]={...ketoConfig(state.days[0],'h','b'),cashews:10}");assert.match(run("ketoEditHTML(state.days[0],0,'h','b')"),/Cashews \(g\)<input[^>]*value="10"/);assert.match(run("ketoEditHTML(state.days[0],0,'h','b')"),/Walnuts \(g\)<input[^>]*data-keto-field="walnuts"/);
 assert.match(root.innerHTML,/my\.clevelandclinic\.org\/health\/treatments\/24003-ketosis/);assert.ok(root.innerHTML.includes(`${run('F(COMPARE_NUTRIENTS.milk.c*milkDensity())')} g carbs per 100 ml (the 4.6 g per 100 g panel × the 1.03 g/ml density set in Settings)`));
 assert.match(root.innerHTML,/Milky Mist paneer \(500 g pouch\) 283 kcal/);assert.match(root.innerHTML,/Keto draft/);
});

test('round 3 UI: retired K3 pickers, resolved selections, purchase records, milk density and editable walnuts',()=>{
 const {run,shopping}=app(true);
 // New batches never offer retired K3; a historical K3 draft stays readable.
 run("var dlg={innerHTML:'',textContent:''};const q=document.querySelector;document.querySelector=s=>s==='#dlgBody'||s==='#dlgTitle'?dlg:q(s)");
 run("batchDraft={recipe:'K5',cookedOn:'2026-10-12',vessel:'none',includeVessel:false,gross:0,oil:null,servings:[],roles:{},selected:{}};try{drawBatchEditor()}catch(e){globalThis.batchErr=String(e)}");
 assert.equal(run('globalThis.batchErr'),undefined);assert.match(run('dlg.innerHTML'),/value="K5" selected/);assert.doesNotMatch(run('dlg.innerHTML'),/value="K3"/);
 // Resolved selection: Root's plannedRecipe decides what the picker shows.
 run("sharedRecipes[sharedKey(2)]={recipe:'K3',h:'K3'};globalThis.plannedRecipe=(v,scope)=>v==='K3'&&scope!=='2026-10-05'?'K5':v");
 assert.match(run('recipeSelectorsHTML(state.days[2],2)'),/value="K3" selected/);assert.match(run('uxWeekRow(state.days[2],2)'),/value="K3" selected/);
 run("state.weekKey=null;sharedRecipes[sharedKey(2)]={recipe:'K3',h:'K3'}");
 for(const html of [run('recipeSelectorsHTML(state.days[2],2)'),run('uxWeekRow(state.days[2],2)')]){assert.doesNotMatch(html,/value="K3"/);assert.equal((html.match(/value="K5" selected/g)||[]).length,2);assert.match(html,/Palak paneer/);}
 run("delete globalThis.plannedRecipe;state.weekKey='2026-10-05'");
 assert.match(run('uxWeekRow(state.days[2],2)'),/value="K3" selected/);
 // Purchase state: fallback reads the stored record; Root's helper can force a re-check.
 run("householdDiets={w:'balanced',h:'keto'};activityRecords={'buy/2026-10-05/gobi':shoppingPurchaseRecord('gobi',true)};renderShopping()");
 assert.match(shopping.innerHTML,/data-ux-buy="gobi"[^>]*checked/);assert.doesNotMatch(shopping.innerHTML,/re-check/);
 run("globalThis.shoppingChecked=row=>false;renderShopping();delete globalThis.shoppingChecked");
 assert.doesNotMatch(shopping.innerHTML,/data-ux-buy="gobi"[^>]*checked/);assert.match(shopping.innerHTML,/quantity changed — re-check/);
 // Milk evidence follows the editable density.
 run("state.density=1.1;renderKeto()");assert.match(run('document.querySelector("#keto").innerHTML'),/5\.1 g carbs per 100 ml \(the 4\.6 g per 100 g panel × the 1\.1 g\/ml/);
 // An explicit old walnut record stays visible as an editable field; no separate legacy note.
 run("ketoMeals[ketoMealKey(0,'h','b')]={...ketoConfig(state.days[0],'h','b'),cashews:0,walnuts:20}");
 const edit=run("ketoEditHTML(state.days[0],0,'h','b')");assert.match(edit,/Walnuts \(g\)<input[^>]*value="20" data-keto-key="keto\/2026-10-05\/day\/0\/h\/b" data-keto-field="walnuts"/);assert.doesNotMatch(edit,/Older record|data-keto-use-cashews/);
});

test('husband keto controls: whey scoops, extra egg whites, almonds and guarded Root helpers',()=>{
 const {run,root}=app(true);run("householdDiets={w:'keto',h:'keto'};state.days[0].wheyH=true;state.days[0].off=false;state.days[0].skip={}");
 const h=run("ketoEditHTML(state.days[0],0,'h','b')"),w=run("ketoEditHTML(state.days[0],0,'w','b')");
 assert.match(h,/Whey scoops<input[^>]*min="0" max="3" step="0.5" value="1"[^>]*data-keto-field="whey"><small class="keto-hint">today 1 of 3 scoops<\/small>/);
 assert.match(h,/Extra egg whites<input[^>]*min="0" max="12" step="1" value="0"[^>]*data-keto-field="eggWhites"><small class="keto-hint">whole eggs keep yolks/);
 assert.match(h,/Almonds \(g\)<input[^>]*max="150"[^>]*data-keto-field="almonds"/);assert.match(h,/Ground flaxseed \(optional, historical\)/);
 assert.doesNotMatch(w,/eggWhites/);assert.match(w,/data-keto-field="whey"/);
 assert.match(run("ketoSuggestion(state.days[0],'h','b').note"),/plus 1 scoop whey with water\./);
 // Root's per-meal scoops and daily total drive the text; over 3 is flagged, not blocked.
 run("ketoMeals[ketoMealKey(0,'h','l')]={...ketoConfig(state.days[0],'h','l'),whey:1.5};globalThis.ketoWheyDailyTotal=()=>3.5");
 const lunch=run("ketoEditHTML(state.days[0],0,'h','l')");assert.match(lunch,/value="1.5"[^>]*data-keto-field="whey"><small class="keto-hint keto-over">today 3.5 of 3 scoops · over 3/);
 assert.match(run("ketoSuggestion(state.days[0],'h','l').note"),/Plus 1\.5 scoops whey with water\./);
 run('delete globalThis.ketoWheyDailyTotal');assert.match(run("ketoEditHTML(state.days[0],0,'h','l')"),/today 2\.5 of 3 scoops/);
 // Apply button appears only when Root provides an available plan.
 assert.doesNotMatch(run('ketoReviewHTML()'),/data-keto-apply-plan/);
 run("globalThis.applyKetoInventoryPlan=()=>true;globalThis.ketoInventoryPlanAvailable=()=>false");assert.doesNotMatch(run('ketoReviewHTML()'),/data-keto-apply-plan/);
 run("globalThis.ketoInventoryPlanAvailable=()=>true");assert.match(run('ketoReviewHTML()'),/data-keto-apply-plan>Apply suggested husband plan to draft<\/button><small>Fills the draft only; review each day, then save\./);
 const trial=run('trialHTML()');assert.match(trial,/4–5 strength sessions\/week/);assert.doesNotMatch(trial,/45 min|no seeds|flax[^.]*fullness/);assert.match(trial,/Ground flaxseed is an optional historical field\./);assert.match(trial,/maintenance is unconfirmed/);assert.match(trial,/not measured needs/);
 // Egg display: whites are separate eggs; whole eggs keep their own label; guarded while DB.eggWhite is absent.
 assert.deepEqual(JSON.parse(run("JSON.stringify(uxFoodRow(L('eggWhite',3)))")),{label:'Extra whites',quantity:'3 whites',detail:'extra eggs needed'});
 assert.equal(run("uxFoodRow(L('eggWhite',1)).quantity"),'1 white');
 assert.deepEqual(JSON.parse(run("JSON.stringify(uxFoodRow(L('egg',2)))")),{label:'Whole eggs',quantity:'2 eggs'});
 assert.equal(run("uxFoodRow(L('almonds',20)).label"),'Almonds');
 assert.match(run("shoppingBuy({id:'egg',unit:'egg',needed:10,buy:10})"),/^10 eggs<small class="ux-buy-note">Whole eggs plus any extra eggs bought only for their whites; those yolks go unused<\/small>$/);
 assert.doesNotMatch(run("shoppingBuy({id:'chicken',unit:'g',needed:250,buy:250,packs:1,largePacks:1,largeLeftover:250})"),/ux-buy-note/);
 assert.doesNotMatch(run('ketoApplyPlanHTML()'),/strict|keto-ready/i);
 // Spinach in the protein pan: husband field, empty config renders 0, non-zero values always render.
 assert.match(h,/Spinach in protein pan \(raw g\)<input[^>]*min="0" max="1000" step="1" value="0"[^>]*data-keto-field="spinach"><small class="keto-hint">cooked in the same egg\/protein pan/);
 assert.doesNotMatch(w,/data-keto-field="spinach"/);
 run("ketoMeals[ketoMealKey(0,'w','b')]={...ketoConfig(state.days[0],'w','b'),spinach:150}");assert.match(run("ketoEditHTML(state.days[0],0,'w','b')"),/value="150"[^>]*data-keto-field="spinach"/);
 // Carb-budget info cites ISSN and interpolates Root's budget.
 run('ketoOptions.carbBudget=47');run('renderKeto()');const info=root.innerHTML;
 assert.match(info,/20–50 g carbs\/day is a common keto guideline, but 47 g of counted carbs does not guarantee ketosis[^<]*no blanket net-carb subtraction\. <a href="https:\/\/pubmed\.ncbi\.nlm\.nih\.gov\/38934469\/"/);
 assert.match(info,/g estimated total carbs/);assert.match(info,/counted available carbs/);
 // "Keto trial" labels replace "Strict keto" in keto, assignment and index markup.
 const assign=run('householdAssignmentHTML()');assert.match(assign,/>Keto trial<\/button>/);
 const indexSrc=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const html of [info,assign,indexSrc])assert.doesNotMatch(html,/Strict keto/i);
 assert.equal((indexSrc.match(/'Keto trial':'Balanced'/g)||[]).length,2);
 assert.match(info,/Husband · Keto trial/);
 // Fullness: nuts are a substantial counted part of the plan; no fixed 10 g cashew default.
 assert.match(run('trialHTML()'),/Measured nuts are a substantial counted part of the plan \(about 120 g\/day in the current draft\), counted foods, not free snacks\./);
 assert.doesNotMatch(info,/10 g once a day|10 g cashew/);
});
