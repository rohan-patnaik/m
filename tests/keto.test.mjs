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
 const listeners={},document={addEventListener(type,fn){(listeners[type]||=[]).push(fn);},querySelector(sel){return sel==='#keto'?root:sel==='#shopping'?shopping:sel==='#regularPlan'?regular:null;},querySelectorAll(){return[];}};
 const ctx=vm.createContext({document,window:{addEventListener(){}},BatchMath:math,WeighMath:weighMath,MealCloud:records,crypto:webcrypto,structuredClone,console,TextEncoder,setInterval(){},navigator:{onLine:true}});
  vm.runInContext(browserBundle,ctx);
 ctx.MealCloud=ctx.window.MealCloud;ctx.ActivityMath=ctx.window.ActivityMath;
 for(const file of ['batch-runtime.js','weigh-runtime.js','cloud-runtime.js','nutrition-runtime.js','household-runtime.js','shopping-runtime.js','keto-runtime.js'])vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),ctx);
 if(withUX)vm.runInContext(readFileSync(new URL('../ux-runtime.js',import.meta.url),'utf8'),ctx);
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 vm.runInContext(script.slice(0,script.indexOf("document.addEventListener('input'")),ctx);
 vm.runInContext("state.weekKey='2026-10-05';templateDays=structuredClone(state.days);templateUtensils=structuredClone(state.utDay);cloudReady=true;householdDiets={w:'balanced',h:'balanced'};balancedCurdType='curd';render=renderKeto;",ctx);
 return {root,shopping,regular,listeners,run:expression=>vm.runInContext(expression,ctx)};
}
test('pantry draft reports nutrition gaps without inserting filler foods or changing Wife',()=>{
 const {run}=app();run("state.weekKey=null;householdDiets={w:'balanced',h:'keto'};state.days.forEach(d=>{d.off=false;d.skip={b:false,l:false,d:false};d.wheyH=true});render=()=>{}");
 const wife=run("JSON.stringify(state.days.map((_,i)=>assignedDayNutrition(i,'w')))");
 assert.equal(run('applyKetoInventoryPlan()'),true);
 assert.equal(run("JSON.stringify(state.days.map((_,i)=>assignedDayNutrition(i,'w')))"),wife);
 const days=JSON.parse(run("JSON.stringify(state.days.map((d,i)=>({n:assignedDayNutrition(i,'h'),whey:ketoWheyDailyTotal(d,'h'),checks:dailyPlanChecks(assignedDayNutrition(i,'h'),'h')})))"));
 for(const {n,whey,checks}of days){assert.ok(n.k>0);assert.ok(whey<=3);if(n.k<1900||n.k>2100)assert.ok(checks.some(x=>/kcal vs/.test(x)));if(n.p<120||n.p>165)assert.ok(checks.some(x=>/g protein vs/.test(x)));if(n.fb<25)assert.ok(checks.some(x=>/fibre/.test(x)));if(n.aHi>50)assert.ok(checks.some(x=>/exceed/.test(x)));if(n.sat*9/n.k>.1)assert.ok(checks.some(x=>/Saturated fat/.test(x)));assert.equal(n.carbUnknown,true,'Spices remain uncertain');}
 assert.equal(run("state.days.reduce((n,d)=>n+['b','l','d'].filter(m=>ketoConfig(d,'h',m).protein==='chicken'&&ketoConfig(d,'h',m).quantity>0).length,0)"),4);
 assert.equal(run("ledger().flax||0"),0);assert.equal(run("ledger().chicken"),1000);
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
test('explicit whites and pan spinach count alongside bhurji and remain outside a frozen sabzi',()=>{
 const {run}=app();run("householdDiets.h='keto';sharedRecipes[sharedKey(0)]={recipe:'S12'};ketoMeals[ketoMealKey(0,'h','d')]={...ketoConfig(state.days[0],'h','d'),eggWhites:3,spinach:100,oil:5}");
 assert.equal(run("ketoActualMeal(state.days[0],'h','d').find(x=>x.id==='eggWhite').q"),3);
 run("batchDraft={recipe:'S12',cookedOn:'2026-10-05',vessel:'pan',includeVessel:false,gross:400,oil:null,roles:{'2026-10-05/d':'sabzi'},selected:{'2026-10-05/d/h':true}};savedBatches['fixture-bhurji-extras']=buildBatchPreview(true)");
 const lines=JSON.parse(run("JSON.stringify(ketoActualMeal(state.days[0],'h','d'))"));assert.equal(lines.find(x=>x.id==='eggWhite').q,3);assert.equal(lines.find(x=>x.id==='palak'&&!x.n).q,100);assert.ok(Math.abs(lines.find(x=>x.id==='oil'&&!x.n).q-5)<1e-8);
});
test('saving a calendar week clones the actual keto portions and person recipes without rewriting history',()=>{
 const {run}=app();run("state.weekKey=null;householdDiets={w:'balanced',h:'keto'};state.days.forEach(d=>{d.off=false;d.skip={b:false,l:false,d:false};d.wheyH=true});render=()=>{};applyKetoInventoryPlan()");
 const before=run("JSON.stringify(state.days.map((_,i)=>assignedDayNutrition(i,'h')))");
 run("copyDietScope('template','2026-10-12');lockedWeeks['2026-10-12']={days:structuredClone(state.days),utDay:structuredClone(state.utDay),savedAt:1};save();selectWeek('2026-10-12')");
 assert.equal(run("JSON.stringify(state.days.map((_,i)=>assignedDayNutrition(i,'h')))"),before);assert.equal(run("ketoConfig(state.days[1],'h','l').whey"),.5);assert.equal(run("personRecipe(state.days[1],'w')"),'S2');assert.equal(run("personRecipe(state.days[1],'h')"),'K2');
 run("ketoMeals[ketoMealKey(0,'h','b')].eggWhites=6");assert.equal(run("ketoMeals['keto/template/day/0/h/b'].eggWhites"),0);
 assert.equal(run("Object.keys(ketoMeals).filter(k=>k.includes('2026-10-05')).length"),0);
 run("snapshotDraft();ketoMeals={};sharedRecipes={};hydrateDraft()");assert.equal(run("ketoConfig(state.days[0],'h','b').eggWhites"),6);
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
 run("ketoMeals[ketoMealKey(0,'h','b')]={protein:'paneer',quantity:75,soya:0,oil:0,walnuts:33};updateKetoPortion(ketoMealKey(0,'h','b'),'cashews',10)");assert.equal(run("ketoConfig(state.days[0],'h','b').walnuts"),33);
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
  assert.match(run('uxWeekRow(state.days[1],1)'),/Palak-corn sabzi/);
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
  assert.match(html,/title="[^"]*35 g powder"><b>1 scoop<\/b><\/button>/);assert.doesNotMatch(html,/<small>35 g powder<\/small>/);
  assert.equal(run('JSON.stringify(ledger())'),ledger);
 }
 run("householdDiets={w:'balanced',h:'keto'}");
 assert.ok(run("uxServingRows(0,'l','w').some(x=>x.label==='Moong dal')"));
 assert.equal(run("uxServingRows(0,'l','h').some(x=>x.label==='Moong dal')"),false);
 assert.ok(run("uxServingRows(0,'l','w').some(x=>x.label==='Roti atta'&&x.quantity.endsWith('dry'))"));
 assert.equal(run("uxServingRows(0,'e','h').length"),0);
 assert.ok(run("uxServingRows(0,'e','w').some(x=>x.label==='Milk')"));
 assert.equal(run("uxFoodRow(L('chicken',250)).quantity"),'250 g');assert.equal(run("uxFoodRow(L('atta',20)).quantity"),'20 g dry');
});

test('breakfast, lunch and dinner share one action band with the same slot order',()=>{
 const {run}=app(true);
 for(const w of ['balanced','keto'])for(const h of ['balanced','keto']){
  run(`householdDiets={w:'${w}',h:'${h}'}`);
  const keto=[w,h].filter(x=>x==='keto').length;
  const bands=['b','l','d'].map(m=>{const html=run(`uxMealHTML(0,'${m}')`),band=html.slice(html.indexOf('<div class="meal-actions">'),html.indexOf('>Details</button></div></div>')+29);
   assert.ok(html.indexOf('<div class="meal-actions">')>html.indexOf('</h3>'));
   assert.equal((band.match(/data-keto-edit=/g)||[]).length,keto);
   assert.match(band,/data-ing="0,[bld]"[^>]*>Details<\/button><\/div><\/div>/);
   if(m==='b')assert.match(band,/<span class="meal-action-slot" aria-hidden="true"><\/span><button class="ing meal-details-link"/);else assert.match(band,new RegExp(`data-weigh="0" data-weigh-meal="${m}">Weigh &amp; serve</button><button class="ing meal-details-link"`));
   return band.replace(/<details[\s\S]*?<\/details>/g,'D').replace(/<button class="ing" data-weigh[^<]*<\/button>|<span class="meal-action-slot"[^<]*<\/span>/,'S').replace(/data-ing="[^"]*"/,'');});
  assert.equal(bands[1],bands[0]);assert.equal(bands[2],bands[0]);
  assert.doesNotMatch(run("uxMealHTML(0,'e')"),/meal-actions/);
 }
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
 assert.ok(run("uxServingRows(0,'l','h').find(x=>x.label==='Palak-corn sabzi').unweighed"));
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

test('meal cards show generic food names while product surfaces keep brands',()=>{
 const {run,shopping}=app(true);run("householdDiets={w:'keto',h:'keto'}");
 const days=Array.from({length:7},(_,i)=>run(`uxDayHTML(${i})`)).join(''),cards=days.match(/<p class="meal-menu">[\s\S]*?<\/p>|<table class="meal-table">[\s\S]*?<\/table>/g).join('');
 assert.match(days,/data-keto-value="paneerMM" aria-pressed="true">Milky Mist<\/button>/);
 assert.match(cards,/<p class="meal-menu">Paneer breakfast/);assert.match(cards,/<th scope="row">Paneer<\/th>/);
 assert.doesNotMatch(cards,/Heritage|Milky Mist|Nutrela|Saffola|Amul|ATOM|Pillsbury|Tata|Borges|DMart/);
 assert.deepEqual(['curd','curdH','paneer','paneerMM','paneerHP','soyN','soyS','butter','butterH','milk','whey','atta','oats','arhar','oil','pasta','egg','eggWhite','almonds'].map(id=>run(`uxFoodRow(L('${id}',1)).label`)),['Curd','Curd','Paneer','Paneer','High-protein paneer','Soya chunks','Soya chunks','Butter','Butter','Milk','Whey','Roti atta','Oats','Toor dal','Oil','Pasta','Whole eggs','Extra whites','Almonds']);
 assert.equal(run("uxMealText('Ready portions + high-protein paneer')"),'Ready portions + High-protein paneer');assert.equal(run("uxMealText('Soya sabzi · Nutrela')"),'Soya sabzi');
 assert.equal(run("ketoSuggestion(state.days[0],'w','b').name"),'Paneer breakfast');
 assert.match(run('uxProductChoicesHTML()'),/Milky Mist paneer[\s\S]*Amul salted butter/);assert.equal(run('UX_FOOD_NAMES.curdH'),'Heritage curd');
 run('renderShopping()');assert.match(shopping.innerHTML,/Milky Mist regular paneer|Heritage/);
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
 assert.equal(run("ketoSuggestion(state.days[0],'w','b').name"),'Paneer breakfast');
 assert.equal(run("ketoSuggestion({...state.days[0],eggH:true},'h','b').name"),'Paneer breakfast');
 assert.equal(run("ketoSuggestion({...state.days[0],eggH:false},'h','b').name"),'Paneer breakfast');
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
 assert.match(shopping.innerHTML,/Farmers’ market/);assert.match(shopping.innerHTML,/DMart \/ Walmart/);assert.match(shopping.innerHTML,/Wife <b>Balanced/);assert.match(shopping.innerHTML,/Husband <b>Keto<\/b>/);
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

test('round 2 UI: sticky header theme switch, product selectors, buying assumptions and honest unknowns',()=>{
 const css=readFileSync(new URL('../ux.css',import.meta.url),'utf8'),html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 // The theme switch lives in the opaque sticky header row, never floating over content; #syncBar parks below the header.
 assert.match(css,/\.ux-app-header\{position:sticky;top:0;z-index:40;background:var\(--bg\)\}/);assert.doesNotMatch(css,/position:fixed|--theme-(top|right|reserve)/);
 assert.match(css,/#syncBar\{position:sticky;top:var\(--header-h\);z-index:30/);
 assert.match(html,/<div class="ux-app-header">[\s\S]*?id="settingsLink"[\s\S]*?id="themeBtn" class="ux-theme-btn"[\s\S]*?<\/div>/);
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
 run("ketoMeals[ketoMealKey(0,'h','l')]={...ketoConfig(state.days[0],'h','l'),whey:1.5};globalThis.savedWheyDailyTotal=globalThis.ketoWheyDailyTotal;globalThis.ketoWheyDailyTotal=()=>3.5");
 const lunch=run("ketoEditHTML(state.days[0],0,'h','l')");assert.match(lunch,/value="1.5"[^>]*data-keto-field="whey"><small class="keto-hint keto-over">today 3.5 of 3 scoops · over 3/);
 assert.match(run("ketoSuggestion(state.days[0],'h','l').note"),/Plus 1\.5 scoops whey with water\./);
 run('globalThis.ketoWheyDailyTotal=globalThis.savedWheyDailyTotal');assert.match(run("ketoEditHTML(state.days[0],0,'h','l')"),/today 2\.5 of 3 scoops/);
 // Apply button appears only when Root provides an available plan.
 assert.doesNotMatch(run('ketoReviewHTML()'),/data-keto-apply-plan/);
 run("globalThis.applyKetoInventoryPlan=()=>true;globalThis.ketoInventoryPlanAvailable=()=>false");assert.doesNotMatch(run('ketoReviewHTML()'),/data-keto-apply-plan/);
 run("globalThis.ketoInventoryPlanAvailable=()=>true");assert.match(run('ketoReviewHTML()'),/data-keto-apply-plan>Load example husband plan<\/button><small>Draft only; adjust daily calorie and protein gaps before saving\./);
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
 assert.match(h,/Spinach in protein pan \(g, before cooking\)<input[^>]*min="0" max="1000" step="1" value="0"[^>]*data-keto-field="spinach"><small class="keto-hint">cooked in the same egg\/protein pan/);
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
 assert.match(run('trialHTML()'),/at most 20 g total nuts for the evening/);
 assert.doesNotMatch(info,/10 g once a day|10 g cashew/);
});

test('weigh & serve: one full-width dish select replaces the scrolling dish tabs',()=>{
 const {run}=app(true),css=readFileSync(new URL('../ux.css',import.meta.url),'utf8');
 run("var dlg={innerHTML:'',textContent:'',open:true,classList:{add(){},remove(){}}};const q=document.querySelector;document.querySelector=s=>['#dlgBody','#dlgTitle','#dlg'].includes(s)?dlg:q(s);refreshServeCard=()=>{}");
 const i=run("state.days.findIndex((d,i)=>serveDishes(i).length>1)");assert.ok(i>=0);
 const dishes=JSON.parse(run(`JSON.stringify(serveDishes(${i}))`));
 for(const current of dishes){
  run(`weighContext={i:${i},date:dateForDay(${i}),meal:'l',guided:true};serveDish='${current}';serveRecord=null;serveStep=1;drawServe()`);
  const html=run('dlg.innerHTML'),select=html.match(/<label class="ux-dish-select">Dish<select data-serve-dish-select aria-label="Dish">([\s\S]*?)<\/select><\/label>/);
  assert.ok(select);assert.doesNotMatch(html,/ux-dish-tabs|data-serve-dish=|aria-pressed/);
  const options=[...select[1].matchAll(/<option value="([^"]+)"( selected)?>([^<]*)<\/option>/g)];
  assert.deepEqual(options.map(o=>o[1]),dishes);assert.deepEqual(options.filter(o=>o[2]).map(o=>o[1]),[current]);
  for(const o of options)assert.equal(o[3],run(`esc(serveTitle(${i},'${o[1]}'))`));
 }
 assert.doesNotMatch(css,/ux-dish-tabs|overflow-x:auto/);assert.match(css,/\.ux-dish-select select\{width:100%;min-width:0;max-width:100%/);
});

test('day carbs: totals strip, warning actions and the read-only breakdown dialog',()=>{
 const {run}=app(true);
 run("householdDiets={w:'balanced',h:'keto'};uxMacros.w.c=uxMacros.h.c=true");
 const day=run('uxDayHTML(0)'),link=p=>day.match(new RegExp(`<button type="button" class="ux-carbs-link" data-ux-carbs="0,${p}"[^>]*>([\\s\\S]*?)</button>`));
 for(const p of ['w','h']){const t=JSON.parse(run(`JSON.stringify(assignedDayNutrition(0,'${p}'))`));assert.ok(link(p),p);assert.match(link(p)[1],new RegExp('^'+run(`comparisonRange(${t.a},${t.aHi})`)+' g carbs'));}
 assert.match(link('h')[1],/<small> \/ 50 g<\/small>$/);assert.doesNotMatch(link('w')[1],/\/ 50 g|budget/);
 assert.equal((day.match(/data-ux-carbs="0,[wh]"/g)||[]).length>=4,true,'strip + nutrition disclosure');
 const warn=run('uxWarning(0)');assert.match(warn,/carb check unverified|carb budget needs review/);
 assert.match(warn,/<button type="button" class="text-btn" data-ux-carbs="0,h">View carbs<\/button> <a class="ux-diet-review" href="#keto">Diet review<\/a>/);assert.doesNotMatch(warn,/>Review</);
 // Without Root's function: totals still show, with an honest unavailable note.
 run('dayCarbBreakdown=undefined');
 let html=run("uxCarbsHTML(0,'h')");
 assert.match(html,/Per-food breakdown unavailable until the next update\./);assert.match(html,/subtract documented fibre only from USDA total-carb or IFCT total estimates\. Packets keep their full declared carbohydrate/);
 assert.match(html,/data-ux-carbs="0,h" aria-pressed="true"/);assert.match(html,/data-ux-carbs="0,w" aria-pressed="false"/);assert.match(html,/Keto budget 50 g/);
 assert.match(run("uxCarbsHTML(0,'w')"),/Balanced · no carb budget/);assert.doesNotMatch(run("uxCarbsHTML(0,'w')"),/Keto budget/);
 // Contract mock, held only in the vm context.
 run(`globalThis.dayCarbBreakdown=(i,p)=>{const n=o=>({...comparisonEmpty(),...o}),totals=n({k:1900,a:46,aHi:49,c:60,cHi:63,fb:14,carbUnknown:true});return {dayIndex:i,person:p,totals,
  foods:[{id:'paneerMM',quantity:150,unit:'g',kind:'live',source:'Milky Mist regular 500 g packet image, audited 2026-10-12',basis:'100 g as sold',carbConvention:'full declared carbs',reasons:[],nutrition:n({a:7.65,aHi:7.65,c:7.65,cHi:7.65}),meals:{l:n({a:7.65,aHi:7.65})}},
   {id:'spice',quantity:3,unit:'g',kind:'live',source:'Unspecified spice mixture; unknown macros',basis:'100 g',carbConvention:'full declared carbs',reasons:['missing-carbohydrate-profile'],nutrition:n({a:0,aHi:3,c:0,cHi:3,carbUnknown:true}),meals:{d:n({aHi:3,carbUnknown:true})}},
   {id:'gobi',quantity:200,unit:'g',kind:'frozen',source:'USDA SR Legacy (generic estimate)',basis:'100 g raw edible',carbConvention:'documented fibre counted once',reasons:['frozen-carbohydrate-data-incomplete'],nutrition:n({a:5,aHi:38,c:9,cHi:42,carbUnknown:true}),meals:{d:n({a:5,aHi:38})}},
   {id:'oil',quantity:10,unit:'ml',kind:'live',source:'Matched public packet panel, audited 2026-10-04',basis:'100 g',reasons:[],nutrition:n({}),meals:{l:n({})}}],
  meals:[{meal:'b',nutrition:n({a:1,aHi:1,c:1,cHi:1})},{meal:'l',nutrition:n({a:20,aHi:20,c:25,cHi:25})},{meal:'d',nutrition:n({a:25,aHi:28,c:34,cHi:37,carbUnknown:true})},{meal:'e',nutrition:n({})}]};}`);
 html=run("uxCarbsHTML(0,'h')");
 assert.doesNotMatch(html,/unavailable until/);assert.match(html,/<strong>46–49 g<\/strong><small>Keto budget 50 g<\/small>/);assert.match(html,/Estimated total carbs<\/span><strong>60–63 g/);assert.match(html,/≥14 g/);
 assert.match(html,/Unknown data — upper bound is conservative, not a measured amount\./);assert.doesNotMatch(html.replace('prevent a verified carb pass',''),/within|\bpass|✓/i,'informational only, never a pass state');
 assert.match(html,/Counted available carbs subtract documented fibre only/);assert.doesNotMatch(html.replace('not guaranteed physiological net carbs',''),/net.carb/i,'net carbs only with its qualification');
 const rows=[...html.matchAll(/<tr><th scope="row">([^<]*)<small>([^<]*)/g)].map(m=>m[1]);
 assert.deepEqual(rows.slice(0,4),['gobi','paneerMM','spice','oil'].map(id=>run(`esc(uxCarbFood({id:'${id}'}))`)),'sorted by counted upper bound');
 assert.match(html,/150 g · <span class="ux-carbs-badge" title="full declared carbs">Current<\/span> Milky Mist regular 500 g packet image<\/small><\/th><td>7.7 g<\/td>/);
 assert.match(html,/Frozen batch<\/span> USDA SR Legacy<\/small><\/th><td>unknown<small>up to 38 g<\/small><\/td><td>unknown<small>up to 42 g<\/small><\/td>/);
 assert.match(html,/<th scope="row">Dinner<\/th><td>25–28 g<small>incl. unknown<\/small><\/td>/);assert.match(html,/Snacks &amp; milk|Snacks & milk/);assert.match(html,/<tr class="ux-carbs-day"><th scope="row">Day<\/th><td>46–49 g/);
 assert.match(html,/<summary>Why some carbs are unknown<\/summary>/);assert.match(html,/<h4>Missing carbohydrate profile<\/h4>/);assert.match(html,/<h4>Frozen snapshot with incomplete carb data<\/h4>/);
 assert.match(html,/Unspecified spice mixture; unknown macros · 100 g<\/li>/);assert.match(html,/Unknown spices or frozen historical label differences prevent a verified carb pass\./);
 run('dayCarbBreakdown=undefined');assert.match(run("uxCarbsHTML(0,'h')"),/unavailable until the next update/);
});

test('dialogs close only when both the press and the click land outside the box',()=>{
 const {run}=app(true);
 const r='({left:10,top:20,right:410,bottom:520})';
 assert.equal(run(`uxPointerOutside(${r},12,22)`),false,'inner padding');assert.equal(run(`uxPointerOutside(${r},405,300)`),false,'scrollbar gutter');
 for(const [x,y]of [[5,300],[500,300],[200,10],[200,600]])assert.equal(run(`uxPointerOutside(${r},${x},${y})`),true);
 run(`globalThis.HTMLDialogElement=class{};var box=Object.assign(new HTMLDialogElement(),{open:true,closed:0,getBoundingClientRect:()=>${r},close(){this.closed++;}}),inner={}`);
 assert.equal(run("uxDialogOutside({target:box,button:0,isPrimary:false,clientX:5,clientY:300})===box"),true,'Chrome click events report isPrimary:false');
 assert.equal(run("uxDialogOutside({target:box,button:0,clientX:200,clientY:300})"),null,'padding hit on the dialog element');
 assert.equal(run("uxDialogOutside({target:inner,button:0,clientX:5,clientY:300})"),null,'press started on a child');
 assert.equal(run("uxDialogOutside({target:box,button:2,clientX:5,clientY:300})"),null,'secondary button');
 run('box.open=false');assert.equal(run("uxDialogOutside({target:box,button:0,clientX:5,clientY:300})"),null);
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8'),ux=readFileSync(new URL('../ux-runtime.js',import.meta.url),'utf8');
 assert.doesNotMatch(html,/e\.target\.id==='dlg'/);assert.equal((ux.match(/addEventListener\('pointerdown'/g)||[]).length,1);
});

test('Show macros: one toolbar menu, view-only, applied to the totals strip and meal footers',()=>{
 const {run}=app(true);
 run("householdDiets={w:'balanced',h:'keto'}");
 assert.equal(run('JSON.stringify(uxMacros)'),JSON.stringify({w:{k:true,p:true,c:null},h:{k:true,p:true,c:null}}));
 assert.equal(run("uxMacroOn('w','c')"),false);assert.equal(run("uxMacroOn('h','c')"),true,'carbs start on for the Keto person');
 // The rest of this test checks the Balanced-style defaults explicitly.
 run("uxMacros.h.c=false");
 run("uxMacros.h.c=false");const menu=run('uxMacrosHTML()');
 assert.match(menu,/<button type="button" class="meal-macros-btn" data-ux-macros-toggle aria-expanded="false" aria-controls="mealMacrosMenu">Show macros <small data-ux-macros-count>[45]\/6<\/small><\/button>/);
 assert.match(menu,/id="mealMacrosMenu" role="group" aria-label="Show macros" hidden>/);
 assert.equal((menu.match(/<input type="checkbox" data-ux-macro="/g)||[]).length,6);
 const groups=[...menu.matchAll(/<fieldset><legend>([^<]+)<\/legend>([\s\S]*?)<\/fieldset>/g)];
 assert.deepEqual(groups.map(g=>g[1]),[run("PERSON_NAMES.w"),run("PERSON_NAMES.h")]);
 for(const [n,p]of [[0,'w'],[1,'h']])assert.deepEqual([...groups[n][2].matchAll(/data-ux-macro="(\w),(\w)"( checked)?> (\w+)/g)].map(m=>[m[1],m[2],!!m[3],m[4]]),[[p,'k',true,'Calories'],[p,'p',true,'Protein'],[p,'c',false,'Carbs']]);
 // Defaults: kcal + protein, no carbs figure in the strip; carbs stay reachable from the warning and the disclosure.
 const strip=d=>d.slice(d.indexOf('<div class="meal-day-totals">'),d.indexOf('<div class="day-actions">')>d.indexOf('<div class="meal-day-totals">')?d.indexOf('<div class="day-actions">'):d.indexOf('<div class="meal-cards">'));
 let day=run('uxDayHTML(0,true)');const t=p=>JSON.parse(run(`JSON.stringify(assignedDayNutrition(0,'${p}'))`));
 for(const p of ['w','h'])assert.ok(strip(day).includes(`<strong>${run(`R(${t(p).k})`)}<small> kcal</small></strong><span>${run(`F(${t(p).p})`)} g protein</span>`));
 assert.doesNotMatch(strip(day),/ux-carbs-link|data-ux-carbs|g carbs/);
 assert.match(day,/View carbs<\/button>/);assert.match(day,/<summary>Nutrition &amp; carb checks<\/summary>/);assert.match(day,/data-ux-carbs="0,w">Carbs breakdown/);assert.match(day,/data-ux-carbs="0,h">Carbs breakdown/);
 assert.doesNotMatch(run("uxMealTable(0,'l')"),/<tr class="meal-c-row">/);
 // Husband carbs on: strip button with budget, and a Carbs footer row in Day and Week markup.
 run("uxMacros.h.c=true");day=run('uxDayHTML(0,true)');
 const h=t('h'),range=run(`comparisonRange(${h.a},${h.aHi})`);
 assert.ok(strip(day).includes(`data-ux-carbs="0,h"`));assert.match(strip(day),new RegExp(`>${range} g carbs<small> / 50 g</small></button>`));assert.doesNotMatch(strip(day),/data-ux-carbs="0,w"/);
 const lunch=JSON.parse(run("JSON.stringify(comparisonSum(meal(state.days[0],'l','h')))")),carbRow=`<tr class="meal-c-row"><th scope="row" title="Counted available carbs">Carbs<span class="sr-only"> (counted available)</span></th><td></td><td>${run(`comparisonRange(${lunch.a},${lunch.aHi})`)} g</td></tr>`;
 assert.ok(run("uxMealTable(0,'l')").includes(carbRow));assert.ok(day.includes(carbRow));assert.ok(run('uxDayHTML(0)').includes(carbRow),'Week day card');
 assert.doesNotMatch(run("uxMealTable(0,'l')"),/net.carb/i);
 // Wife protein off: her protein cell goes, her name and every food row stay.
 const foods=run("uxMealRows(0,'l').length"),before=run("uxMealTable(0,'l')").match(/<tbody>[\s\S]*<\/tbody>/)[0];
 run("uxMacros.w.p=false");day=run('uxDayHTML(0,true)');const table=run("uxMealTable(0,'l')");
 assert.equal(table.match(/<tbody>[\s\S]*<\/tbody>/)[0],before);assert.equal((table.match(/<tbody>[\s\S]*<\/tbody>/)[0].match(/<tr>/g)||[]).length,foods);
 assert.match(table,new RegExp(`<tr class="meal-p-row"><th scope="row">Protein</th><td></td><td>`));
 const wStrip=strip(day).split('</div>')[0];assert.ok(wStrip.includes(run('PERSON_NAMES.w')));assert.doesNotMatch(wStrip,/g protein/);assert.match(wStrip,/kcal/);
 // All off for Wife: name and diet only, no numbers; all off for both drops the footer, not the foods.
 run("uxMacros.w={k:false,p:false,c:false}");assert.equal(strip(run('uxDayHTML(0,true)')).split('</div>')[0],`<div class="meal-day-totals"><div><span>${run('PERSON_NAMES.w')} <small>Balanced</small></span>`);
 run("uxMacros.h={k:false,p:false,c:false}");assert.doesNotMatch(run("uxMealTable(0,'l')"),/<tfoot>/);assert.equal(run("uxMealTable(0,'l')").match(/<tbody>[\s\S]*<\/tbody>/)[0],before);
 // Survives a full UI render, never touches the plan, and the carbs dialog is still available.
 run("uxMacros={w:{k:true,p:false,c:true},h:{k:false,p:true,c:true}}");const ledger=run('JSON.stringify(ledger())');
 run("var controls={innerHTML:''};const q=document.querySelector;document.querySelector=s=>s==='#mealControls'?controls:q(s);renderMealControls()");
 assert.equal(run('JSON.stringify(uxMacros)'),JSON.stringify({w:{k:true,p:false,c:true},h:{k:false,p:true,c:true}}));
 assert.match(run('controls.innerHTML'),/<div class="meal-toolbar">[\s\S]*class="meal-view-switch"[\s\S]*<div class="meal-macros">[\s\S]*Show macros <small data-ux-macros-count>4\/6/);
 // Household diets moved out of the view toolbar into Settings.
 assert.doesNotMatch(run('controls.innerHTML'),/meal-assignments|data-ux-diet/);assert.match(run('uxDietControlsHTML()'),/<select id="mealDiet-w" data-ux-diet="w">[\s\S]*<option value="keto"/);
 assert.match(run('controls.innerHTML'),/data-ux-macro="w,p"> Protein/);assert.match(run('controls.innerHTML'),/data-ux-macro="w,c" checked> Carbs/);
 assert.equal(run('JSON.stringify(ledger())'),ledger);assert.match(run("uxCarbsHTML(0,'h')"),/Counted available carbs/);
 // Outside rule: a press inside the menu or with the menu closed never closes it.
 run("uxMacrosOpen=true;var inside={isConnected:true,closest:s=>s==='.meal-macros'?{}:null},away={isConnected:true,closest:()=>null}");
 assert.equal(run("uxMacrosOutside({target:inside,button:0})"),false);assert.equal(run("uxMacrosOutside({target:away,button:0})"),true);
 assert.equal(run("uxMacrosOutside({target:away,button:2})"),false);assert.equal(run("uxMacrosOutside({target:{isConnected:false,closest:()=>null},button:0})"),false,'re-rendered node');
 run("uxMacrosOpen=false");assert.equal(run("uxMacrosOutside({target:away,button:0})"),false);
 const ux=readFileSync(new URL('../ux-runtime.js',import.meta.url),'utf8');assert.doesNotMatch(ux.slice(ux.indexOf('function uxMacrosCount'),ux.indexOf('function initializeUX')),/localStorage|save\(|saveChanges|queueUXSave|MealCloud/);
 const css=readFileSync(new URL('../ux.css',import.meta.url),'utf8');assert.match(css,/\.meal-macros-menu\{position:absolute;right:0;[^}]*z-index:20;[^}]*max-width:calc\(100vw - 24px\)/);
});

test('details popup, dinner-protein field, carb banner threshold, breakfast recipes and equal-height cards',()=>{
 const {run}=app(true);
 // Details: one row per generic food from meal(), both quantities, no product brands or joined strings.
 for(const [w,h] of [['keto','keto'],['balanced','keto'],['balanced','balanced']]){
  run(`householdDiets={w:'${w}',h:'${h}'}`);
  for(const m of ['b','l','d']){
   const html=run(`inspect(0,'${m}')`),rows=JSON.parse(run(`JSON.stringify(uxIngredientRows(0,'${m}'))`));
   const table=html.match(/<table class="meal-table meal-ingredients">[\s\S]*?<\/table>/)[0];
   assert.equal((table.match(/<tr><th scope="row">/g)||[]).length,rows.length,`${w}/${h} ${m}`);
   assert.equal(new Set(rows.map(r=>r.label)).size,rows.length,'merged by generic label');
   const foods=new Set(JSON.parse(run(`JSON.stringify(['w','h'].flatMap(p=>{const ls=meal(state.days[0],'${m}',p).filter(x=>x.q>0&&!['oil','spice'].includes(x.id)),white=ls.some(x=>x.id==='eggWhite');return ls.map(x=>UX_NUTS.includes(x.id)?'Nuts':white&&['egg','eggWhite'].includes(x.id)?'Eggs':uxMealLabel(x.id));}))`)));
   assert.deepEqual([...foods].sort(),rows.map(r=>r.label).sort());
   assert.doesNotMatch(html,/Heritage|Milky Mist|Nutrela|Saffola|Amul|ATOM/);assert.doesNotMatch(html,/Keto trial<\/td>|Balanced<\/td>/);
   assert.match(html,/<p class="hintline">This meal \(oil included\): W \d+ kcal · H \d+ kcal\.<\/p>/);
   assert.match(html,/<details class="ux-disclosure"><summary>How portions work<\/summary><div>[\s\S]*Portion method:/);
   assert.doesNotMatch(html.slice(0,html.indexOf('<details')),/Portion method|Fibre excludes|editable in Packet labels/);
  }
 }
 const both=JSON.parse(run("JSON.stringify(uxIngredientRows(0,'d').find(r=>r.w&&r.h))"));assert.ok(both.w.quantity&&both.h.quantity);
 const lunch=run("inspect(0,'l')");assert.match(lunch,/data-split[\s\S]*data-tare[\s\S]*data-out/);assert.match(lunch,/<p class="hintline">Oil included: W [\d.]+ ml · H [\d.]+ ml/);
 assert.match(lunch,/<details class="ux-disclosure"><summary>How portions work<\/summary><div><table><thead><tr><th>Split<\/th>/,'Balanced split ratios move into the disclosure');
 assert.match(run("inspect(0,'b')"),/<td title="35 g powder"><b>1 scoop<\/b><\/td>[\s\S]*one level scoop is 35 g powder/);
 // Dinner protein: hidden for protein sabzis, value carried through collectEdit and shown again.
 run("state.days[0].s='S1';state.days[0].p='Y'");
 assert.match(run("editFormHTML(editValsFromState(0))"),/<label>(Wife |Husband )?[Dd]inner protein<select data-ek="p"><option value="P">P · Paneer<\/option><option value="Y" selected>/);
 for(const s of ['S12','S3'])assert.doesNotMatch(run(`editFormHTML({...editValsFromState(0),s:'${s}'})`),/data-ek="p"|Dinner protein/);
 run(`editSnap=JSON.stringify(editValsFromState(0));editP='Y';var els={'[data-ek="s"]':{value:'S12'}};const q0=document.querySelector;document.querySelector=s=>els[s]||q0(s)`);
 assert.equal(run('collectEdit().p'),'Y','missing select falls back to the previous value');
 run(`els['[data-ek="s"]'].value='S1'`);assert.match(run('editFormHTML(collectEdit())'),/data-ek="p"><option value="P">P · Paneer<\/option><option value="Y" selected>/);
 run(`els['[data-ek="p"]']={value:'P'}`);assert.equal(run('collectEdit().p'),'P');delete run('els')['[data-ek="p"]'];assert.equal(run('collectEdit().p'),'P');
 run("editP=null");assert.equal(run('collectEdit().p'),'Y','snapshot fallback');
 // Carb banner: only at or over the budget, unknown data alone does not raise it.
 run("householdDiets={w:'balanced',h:'keto'};globalThis.realDay=assignedDayNutrition;globalThis.assignedDayNutrition=(i,p)=>({...realDay(i,p),a:30,aHi:49.9,carbUnknown:true})");
 assert.equal(run('uxWarning(0)'),'');assert.match(run('uxDayHTML(0)'),/data-ux-carbs="0,h">Carbs breakdown/);assert.match(run("uxCarbsHTML(0,'h')"),/Unknown data — upper bound is conservative/);
 run("globalThis.assignedDayNutrition=(i,p)=>({...realDay(i,p),aHi:ketoOptions.carbBudget,carbUnknown:false})");assert.match(run('uxWarning(0)'),/Husband: carb budget needs review <button type="button" class="text-btn" data-ux-carbs="0,h">View carbs<\/button>/);
 run("globalThis.assignedDayNutrition=realDay");
 // Breakfast recipe picker: nothing without Root's helper; "Current / Custom" first; ineligible options disabled with the reason.
 run("householdDiets={w:'keto',h:'keto'};state.days[0].off=false;state.days[0].skip={};globalThis.ketoBreakfastOptions=undefined");
 assert.doesNotMatch(run("ketoEditHTML(state.days[0],0,'h','b')"),/data-keto-breakfast|data-keto-field="avocado"/);assert.match(run("ketoEditHTML(state.days[0],0,'h','b')"),/<p class="keto-hint keto-recipe-hint">Change the breakfast recipe in <b>Edit meals<\/b>/);
 run(`globalThis.ketoBreakfastOptions=(i,p)=>[{id:'omelette',name:'Mushroom omelette',nutrition:{k:520,p:38,a:5,aHi:7},dayNutrition:{a:40,aHi:46},eligible:true},{id:'chickenBowl',name:'Chicken & mushroom bowl',nutrition:{k:610,p:55,a:4,aHi:6},dayNutrition:{a:39,aHi:45},eligible:false,reason:'Chicken already planned twice this week'}]`);
 let b=run("ketoEditHTML(state.days[0],0,'h','b')");assert.doesNotMatch(b,/data-keto-breakfast/,'no picker in Adjust portions even when options exist');
 run(`globalThis.ketoBreakfastOptions=(i,p)=>[{id:'omelette',name:'Mushroom omelette',nutrition:{k:520,p:38,a:5,aHi:7},dayNutrition:{a:40,aHi:46},eligible:true}];ketoMeals[ketoMealKey(0,'h','b')]={...ketoConfig(state.days[0],'h','b'),breakfastRecipe:'omelette',mushroom:120}`);
 b=run("ketoEditHTML(state.days[0],0,'h','b')");assert.doesNotMatch(b,/data-keto-breakfast/);
 assert.match(b,/Mushroom \(g\)<input[^>]*min="0" max="500" step="1" value="120"[^>]*data-keto-field="mushroom">/);assert.match(b,/Avocado \(g\)<input[^>]*value="0"[^>]*data-keto-field="avocado">/);
 assert.doesNotMatch(b,/\bseeds?\b|tofu|brinjal|loki/i);
 run("ketoMeals[ketoMealKey(0,'h','b')]={...ketoConfig(state.days[0],'h','b'),avocado:50};delete ketoMeals[ketoMealKey(0,'h','b')].breakfastRecipe;delete ketoMeals[ketoMealKey(0,'h','b')].mushroom");
 b=run("ketoEditHTML(state.days[0],0,'h','b')");assert.match(b,/data-keto-field="avocado"/);assert.doesNotMatch(b,/data-keto-field="mushroom"/);
 // Breakfast card title uses Root's recipe name when available.
 run("globalThis.ketoBreakfastName=cfg=>cfg.avocado?'Eggs & avocado':'Mushroom omelette'");const card=run("uxMealTable(0,'b')");
 assert.match(card,/<p class="meal-menu">(<b>Wife<\/b> )?(Mushroom omelette|Eggs &amp; avocado)/);assert.doesNotMatch(card,/Ready portions/);assert.equal(run("uxFoodRow({id:'avocado',q:50}).label"),'Avocado');
 // Equal-height laptop cards with the totals table pinned; phone stacks at natural height.
 const css=readFileSync(new URL('../ux.css',import.meta.url),'utf8');
 assert.match(css,/@media\(min-width:1001px\)\{\n \.meal-cards\{align-items:stretch\}\n \.meal-card:not\(\.meal-snacks\)\{display:flex;flex-direction:column\}\n \.meal-body\{display:contents\}\n \.meal-card:not\(\.meal-snacks\)>\.meal-body>\.meal-table-foot\{margin-top:auto\}/);
 assert.match(css,/@media\(max-width:1000px\)\{\n \.meal-cards\{grid-template-columns:1fr;align-items:start\}\n \.meal-card\{display:block\}/);
 assert.match(run("uxMealTable(0,'l')"),/<\/tbody><\/table>(<p class="meal-foot">[^<]*<\/p>)?<table class="meal-table meal-table-foot"><caption class="sr-only">Lunch totals: Wife, Husband<\/caption><colgroup><col><col class="meal-col"><col class="meal-col"><\/colgroup><tfoot><tr class="meal-k-row">/);
});
test('Edit meals breakfast recipes: per-assignment selects, form-only until Save, prepared via Root helper',async()=>{
 const {run}=app();
 run(`var els={},calls=[],order=[];document.querySelector=s=>els[s]||null;state.days.forEach(d=>{d.off=false;d.skip={b:false,l:false,d:false}});save=()=>order.push('save');saveChanges=async()=>{order.push('saveChanges');return true};render=()=>{};var dlg={open:true,close(){this.open=false}}`);
 const optCount=html=>(html.match(/<option/g)||[]).length;
 // Both Balanced: single "Breakfast", no keto selects.
 let f=run('editFormHTML(editValsFromState(0),0)');assert.match(f,/<label>Breakfast recipe \(both\)<select data-ek="b">/);assert.doesNotMatch(f,/data-ek="b[hw]"/);assert.match(f,/<label>Wife breakfast<select data-ek="rw"><option value="cook">Cooked recipe<\/option><option value="__nocook">No cooked breakfast<\/option>/);
 // Husband Keto: Balanced select labelled for Wife plus the Husband recipe select from the real helper.
 run("householdDiets={w:'balanced',h:'keto'}");const n=run("ketoBreakfastOptions(0,'h').length");assert.equal(n,7);
 f=run('editFormHTML(editValsFromState(0),0)');assert.match(f,/<label>Wife breakfast<select data-ek="b">/);
 const bh=f.match(/<label>Husband breakfast dish<select data-ek="bh">[\s\S]*?<\/select>/)[0];assert.equal(optCount(bh),n+2);assert.match(bh,/^<label>Husband breakfast dish<select data-ek="bh"><option value="" selected>Current \/ Custom<\/option><option value="__nocook">No cooked breakfast<\/option><option value="omelette"[^>]*>Mushroom omelette · 5 ml oil · (dish|breakfast total) \d+ kcal/);assert.match(bh,/<option value="eggAvocado">Eggs &amp; avocado · 5 ml oil · (dish|breakfast total) \d+ kcal<\/option>/);assert.doesNotMatch(f,/data-ek="bw"/);
 // Both Keto: no common select; chicken disabled with the reason once two chicken meals exist.
 run("householdDiets={w:'keto',h:'keto'};for(const j of [1,2])ketoMeals[ketoMealKey(j,'h','l')]={...ketoConfig(state.days[j],'h','l'),protein:'chicken',quantity:150}");
 f=run('editFormHTML(editValsFromState(0),0)');assert.doesNotMatch(f,/data-ek="b"/);
 assert.equal(optCount(f.match(/data-ek="bh">[\s\S]*?<\/select>/)[0]),n+2);assert.equal(optCount(f.match(/data-ek="bw">[\s\S]*?<\/select>/)[0]),run("ketoBreakfastOptions(0,'w').length")+2);
 assert.match(f,/<label>Wife breakfast dish<select data-ek="bw">/);assert.doesNotMatch(f.match(/data-ek="bw">[\s\S]*?<\/select>/)[0],/chicken|omelette|eggAvocado/i);
 assert.doesNotMatch(f,/Swap an existing chicken meal first/);
 // Existing recipe preselects; selection is dirty, survives the sabzi re-render and touches nothing until Save.
 run("ketoMeals[ketoMealKey(0,'h','b')]={...ketoConfig(state.days[0],'h','b'),breakfastRecipe:'paneerBhurji'}");
 assert.equal(run('editValsFromState(0).bh'),'paneerBhurji');assert.equal(run('editValsFromState(0).bw'),'');
 run("editCtx={i:0,iso:null};editSnap=JSON.stringify(editValsFromState(0));editP=editValsFromState(0).p;els={'[data-ek=\"s\"]':{value:state.days[0].s},'[data-ek=\"dal\"]':{value:state.days[0].dal},'[data-ek=\"bh\"]':{value:'paneerBhurji'},'[data-ek=\"bw\"]':{value:''},'[data-editsave]':{disabled:true},'#dlg':dlg};const sv=JSON.parse(editSnap);for(const k of ['wheyW','wheyH','eggH','cardioW','off','skipB','skipL','skipD'])els['[data-et=\"'+k+'\"]']={checked:sv[k]}");
 assert.equal(run('collectEdit().b'),run('state.days[0].b'),'missing common select keeps the saved breakfast');run('refreshEditDirty()');assert.equal(run("els['[data-editsave]'].disabled"),true);
 const before=run('JSON.stringify([state.days,ketoMeals])');
 run("els['[data-ek=\"bh\"]'].value='eggAvocado';refreshEditDirty()");assert.equal(run("els['[data-editsave]'].disabled"),false);
 run("els['[data-ek=\"s\"]'].value='S12'");assert.match(run('editFormHTML(collectEdit())'),/data-ek="bh">[\s\S]*<option value="eggAvocado" selected>/);
 assert.equal(run('JSON.stringify([state.days,ketoMeals])'),before,'selecting is pure form state; Cancel leaves nothing behind');
 // Helper absent: inline message, no mutation.
 run("globalThis.prepareKetoBreakfasts=undefined;els['[data-et=\"wheyH\"]']={checked:false};var box={dataset:{},textContent:''};els['#dlgBody .editbtns']={after(m){els['#dlgBody [data-editmessage]']=m}};document.createElement=()=>box");
 await run('saveEdit()');assert.equal(run('box.textContent'),'Breakfast recipes need the latest update.');assert.equal(run('JSON.stringify([state.days,ketoMeals])'),before);assert.equal(run('dlg.open'),true);assert.equal(run('order.length'),0);
 // Helper throws: message shown, dialog open, nothing changed.
 run("globalThis.prepareKetoBreakfasts=(i,sel,day)=>{calls.push({i,sel,day:structuredClone(day),sNow:state.days[0].s});throw Error('This would exceed 3 whey scoops today.')}");
 await run('saveEdit()');assert.equal(run('box.textContent'),'This would exceed 3 whey scoops today.');assert.equal(run('JSON.stringify([state.days,ketoMeals])'),before);assert.equal(run('dlg.open'),true);assert.equal(run('order.length'),0);
 assert.equal(run('JSON.stringify(calls[0].sel)'),'{"h":"eggAvocado"}');assert.equal(run('calls[0].i'),0);assert.equal(run('calls[0].day.wheyH'),false,'tentative day carries the whey toggle');assert.equal(run('state.days[0].wheyH'),true);assert.equal(run('calls[0].day.s'),'S12');assert.equal(run('calls[0].sNow'),'S1','called before state mutation');
 // Success: called before mutation, map applied once, one save + saveChanges.
 run("calls=[];var key=ketoMealKey(0,'h','b'),cfg={...ketoConfig(state.days[0],'h','b'),breakfastRecipe:'eggAvocado'};globalThis.prepareKetoBreakfasts=(i,sel,day)=>{calls.push({sel,s:state.days[0].s,k:ketoMeals[key].breakfastRecipe});order.push('prepare');return {[key]:cfg}}");
 await run('saveEdit()');assert.equal(run('calls.length'),1);assert.equal(run('calls[0].s'),JSON.parse(before)[0][0].s);assert.equal(run('calls[0].k'),'paneerBhurji');
 assert.equal(run('ketoMeals[key].breakfastRecipe'),'eggAvocado');assert.equal(run('state.days[0].s'),'S12');assert.equal(run('state.days[0].wheyH'),false);assert.equal(run("order.join()"),'prepare,save,saveChanges');assert.equal(run('dlg.open'),false);
 // Unchanged recipe is not re-prepared (keeps hand-tuned portions).
 run("calls=[];order=[];editSnap=JSON.stringify(editValsFromState(0));editP=editValsFromState(0).p;els['[data-ek=\"s\"]'].value=state.days[0].s");await run('saveEdit()');assert.equal(run('calls.length'),0);assert.equal(run("order.join()"),'save,saveChanges');
 // New calendar week: the map lands in the current scope before copyDietScope.
 run("order=[];var cds=copyDietScope;copyDietScope=(a,b)=>{order.push('copy:'+ketoMeals[key].breakfastRecipe);cds(a,b)};lockedWeeks={};persistWeeks=()=>{};ensureUtDay=()=>{};ensureOilUse=()=>{};cfg={...cfg,breakfastRecipe:'dahiBowl'};els['[data-ek=\"bh\"]'].value='dahiBowl';editCtx={i:0,iso:'2026-10-14'}");
 await run('saveEdit()');assert.equal(run("order.join()"),'prepare,copy:eggAvocado,save,saveChanges');assert.equal(run("ketoMeals[ketoMealKey(0,'h','b','2026-10-12')].breakfastRecipe"),'dahiBowl');assert.equal(run('ketoMeals[key].breakfastRecipe'),'eggAvocado','original scope portions stay unchanged');
});

test('overhaul: whole-number pot parts, no-cooked breakfast, kitchen egg/nut rows and week-first Day edits',()=>{
 const {run}=app(true);
 // Parts: small whole numbers, only for shared pots, never decimals or percentages.
 const r=JSON.parse(run('JSON.stringify(uxParts([0.217,0.304,0.174,0.304]))'));
 assert.ok(r.parts.every(Number.isInteger)&&r.total<=24&&r.parts.reduce((a,b)=>a+b,0)===r.total);
 assert.deepEqual(JSON.parse(run('JSON.stringify(uxParts([1,1]))')),{parts:[1,1],total:2,exact:true});
 // Zero shares stay zero; exact simple ratios win; otherwise the best rounding is flagged approximate and still sums.
 assert.deepEqual(JSON.parse(run('JSON.stringify(uxParts([0,1]))')),{parts:[0,1],total:1,exact:true});assert.equal(run('ratioText(0,1,1)'),'W : H = 0 : 1');
 assert.deepEqual(JSON.parse(run('JSON.stringify(uxParts([.25,.2,.3,.3]))')),{parts:[5,4,6,6],total:21,exact:true});
 const ap=JSON.parse(run('JSON.stringify(uxParts([0.217,0.304,0.174,0.305]))'));assert.equal(ap.exact,false);assert.equal(ap.parts.reduce((a,b)=>a+b,0),ap.total);assert.ok(ap.total<=24&&ap.parts.every(Number.isInteger));
 assert.equal(run(`uxPartsText(${ap.parts[0]},${ap.total},false)`),`≈ ${ap.parts[0]} of ${ap.total} parts`);assert.match(run('ratioText(0.217,0.304,1)'),/^W : H = (≈ )?\d+ : \d+$/);
 assert.equal(run("uxPartsText(1,2)"),'Half the pot');assert.equal(run("uxPartsText(1,2,false)"),'≈ 1 of 2 parts');assert.equal(run("uxPartsText(5,23)"),'5 of 23 parts');
 for(const [w,h] of [['balanced','keto'],['keto','keto'],['balanced','balanced']]){
  run(`householdDiets={w:'${w}',h:'${h}'}`);
  for(const m of ['l','d'])for(const p of ['w','h'])for(const row of JSON.parse(run(`JSON.stringify(uxServingRows(0,'${m}','${p}'))`))){
   assert.doesNotMatch(row.quantity,/%|\d\.\d+ (of|parts)/,`${w}/${h} ${m} ${p} ${row.label}`);
   if(row.unweighed)assert.match(row.quantity,/^((≈ )?\d+ of \d+ parts|Half the pot|Whole pot)$/);
  }
 }
 assert.doesNotMatch(run("uxMealTable(0,'l')"),/% of batch|Batch shares become/);
 assert.match(run("ratioText(0.4,0.6,1)"),/^W : H = 2 : 3$/);
 // Eggs read as one kitchen action; nuts collapse into one row per meal with the split in the detail.
 assert.deepEqual(JSON.parse(run("JSON.stringify(uxLineRows([L('egg',1),L('eggWhite',3),L('almonds',20),L('walnuts',25)]))")),[{label:'Eggs',quantity:'4 eggs',detail:'keep 1 yolk'},{label:'Nuts',quantity:'45 g',detail:'20 g almonds · 25 g walnuts'}]);
 assert.deepEqual(JSON.parse(run("JSON.stringify(uxLineRows([L('egg',2)]))")),[{label:'Whole eggs',quantity:'2 eggs'}]);
 // No cooked breakfast: per person, whey (if ticked) and ready foods only; the other person is unchanged.
 run("householdDiets={w:'balanced',h:'keto'};state.days[0].off=false;state.days[0].skip={b:false,l:false,d:false};state.days[0].wheyH=true;state.days[0].wheyW=true");
 const wBefore=run("JSON.stringify(meal(state.days[0],'b','w'))");
 run("state.days[0].readyB={w:false,h:true}");
 const ids=JSON.parse(run("JSON.stringify(meal(state.days[0],'b','h').map(x=>x.id))"));
 assert.ok(ids.every(id=>['whey','curd','curdH','milk','almonds','cashews','walnuts'].includes(id)),ids.join());
 assert.equal(run("JSON.stringify(meal(state.days[0],'b','w'))"),wBefore,'wife untouched');
 assert.equal(run("uxMealName(0,'h','b')"),'No cooked breakfast');assert.match(run("uxMealTable(0,'b')"),/<b>Husband<\/b> No cooked breakfast/);
 run("state.days[0].readyB={w:true,h:true}");assert.deepEqual(JSON.parse(run("JSON.stringify(breakfast(state.days[0].b,'w',state.days[0]))")),[{id:'whey',q:1}]);
 run("state.days[0].wheyW=false");assert.equal(run("breakfast(state.days[0].b,'w',state.days[0]).length"),0);
 assert.throws(()=>run("MealCloud.validateRecord('template/day/0',{meal:{...state.days[0],readyB:{w:false,h:false}},utensils:state.utDay[0]})"),/no-cooking breakfast/);
 run("MealCloud.validateRecord('template/day/0',{meal:{...state.days[0],readyB:{w:false,h:true}},utensils:state.utDay[0]})");
 run("state.days[0].readyB={w:false,h:false};normalizeState()");assert.equal(run("'readyB' in state.days[0]"),false,'false flags are not stored');
 run("state.days[1].readyB={w:false,h:true};normalizeState()");assert.equal(run("JSON.stringify(state.days[1].readyB)"),'{"w":false,"h":true}');
 // Edit meals offers the toggles and a line saying what the edit changes.
 assert.match(run("editFormHTML(editValsFromState(1))"),/<select data-ek="bh"><option value="">Current \/ Custom<\/option><option value="__nocook" selected>No cooked breakfast<\/option>/);assert.doesNotMatch(run("editFormHTML(editValsFromState(1))"),/data-et="ready[WH]"/);
 assert.match(run("ketoEditHTML(state.days[1],1,'h','b')"),/No cooked breakfast today: only whey, curd, milk and nuts below are counted/);
 // Day page: the first meal change saves the calendar week from the template instead of editing the template.
 run("state.weekKey=null;state.view='day';ketoMeals['keto/template/day/0/h/l']={...ketoConfig(state.days[0],'h','l'),almonds:20};delete lockedWeeks[mondayOf(dayViewISO())]");
 const mon=run('uxEnsureWeek()');assert.equal(mon,run('mondayOf(dayViewISO())'));assert.equal(run('state.weekKey'),mon);
 assert.ok(run(`!!lockedWeeks['${mon}']`));assert.equal(run(`ketoMeals['keto/${mon}/day/0/h/l'].almonds`),20,'keto portions copied into the new week');
 assert.equal(run('uxEnsureWeek()'),false,'already a saved week: nothing to do');
 // Header save status, toolbar without household diets, and the new wire format.
 assert.deepEqual(JSON.parse(run("JSON.stringify(['All changes saved','Saving…','Unsaved changes','Connection lost — drafts are only in this open tab.'].map(t=>uxSaveLabel(t)[0]))")),['Saved','Saving…','Unsaved','Offline']);
 assert.match(readFileSync(new URL('../cloud-runtime.js',import.meta.url),'utf8'),/formatVersion:15\}/);
 assert.match(readFileSync(new URL('../convex/household.js',import.meta.url),'utf8'),/c\.value\?\.meal\?\.readyB!==undefined\)&&!\[13,14,15\]\.includes\(formatVersion\)/);
 assert.match(run('uxDayHTML(0)'),/<div class="day-actions"><button data-cook="0">1 · Cook list<\/button><button class="primary" data-weigh="0">2 · Serve<\/button><button data-edit="0">Edit meals<\/button><\/div>/);
 assert.match(run('uxWeekOverview()'),/data-ux-jump="0"[\s\S]*data-ux-jump="6"/);
 // Phone: a closed adjust control is a flex row (no float), so the action group wraps instead of overlapping it.
 const css=readFileSync(new URL('../ux.css',import.meta.url),'utf8'),phone=css.slice(css.lastIndexOf('@media(max-width:600px){'));
 assert.match(phone,/\.meal-adjust:not\(:has\(>\.keto-adjust\[open\]\)\)\{display:flex;align-items:center;flex-wrap:nowrap\}/);assert.match(phone,/\.meal-adjust:not\(:has\(>\.keto-adjust\[open\]\)\)>span\{float:none\}/);assert.match(phone,/\.meal-card-actions\{flex:0 0 auto;flex-wrap:wrap\}/);
 assert.match(css,/\.meal-adjust:has\(>\.keto-adjust\[open\]\)\{flex:1 1 100%/,'open form stays full width');
});

test('pot ratios follow the chosen cooking scope instead of reserving an uncooked meal',()=>{
 const {run}=app(true);run("householdDiets={w:'balanced',h:'balanced'};state.days[0].off=false;state.days[0].skip={b:false,l:false,d:false}");
 assert.equal(run("uxPotParts(0,'dal','all').length"),4);assert.equal(run("uxPotParts(0,'dal','l').length"),2);assert.equal(run("uxPotParts(0,'dal','l').every(x=>x.meal==='l')"),true);
 const html=run("uxServePartsHTML(0,'dal','l','l')");assert.match(html,/<h4>Lunch/);assert.doesNotMatch(html,/<h4>Dinner/);
});

test('breakfast dropdowns carry No cooked breakfast; cook list shows only what the cook prepares',async()=>{
 const {run}=app(true);
 run(`var els={},calls=[],order=[];document.querySelector=s=>els[s]||null;state.days.forEach(d=>{d.off=false;d.skip={b:false,l:false,d:false};delete d.readyB});save=()=>order.push('save');saveChanges=async()=>{order.push('saveChanges');return true};render=()=>{};var dlg={open:true,close(){this.open=false}};var box={dataset:{},textContent:''};document.createElement=()=>box`);
 const form=(i=0)=>run(`editFormHTML(editValsFromState(${i}),${i})`);
 // Wife Balanced + Husband Keto: each person's own dropdown has the no-cooking choice; no separate checkboxes.
 run("householdDiets={w:'balanced',h:'keto'}");let f=form();
 assert.match(f,/<label>Wife breakfast<select data-ek="b"><option value="__nocook">No cooked breakfast<\/option><option value="B\d"/);
 assert.match(f,/<label>Husband breakfast dish<select data-ek="bh"><option value="" selected>Current \/ Custom<\/option><option value="__nocook">No cooked breakfast<\/option>/);
 assert.doesNotMatch(f,/data-et="ready|<div class="lbl">No cooked breakfast/);
 run("state.days[0].readyB={w:true,h:false}");f=form();assert.match(f,/data-ek="b"><option value="__nocook" selected>No cooked breakfast/);
 // Both Keto / both Balanced render without pretending per-person Balanced recipes.
 run("householdDiets={w:'keto',h:'keto'}");f=form();assert.match(f,/data-ek="bw"><option value="">Current \/ Custom<\/option><option value="__nocook" selected>/);assert.doesNotMatch(f,/data-ek="b"/);
 run("householdDiets={w:'balanced',h:'balanced'}");f=form();assert.equal((f.match(/data-ek="b"/g)||[]).length,1);assert.match(f,/data-ek="rw"><option value="cook">Cooked recipe<\/option><option value="__nocook" selected>/);assert.match(f,/data-ek="rh"><option value="cook">Cooked recipe<\/option><option value="__nocook">/);
 // Save: No cooked bypasses prepareKetoBreakfasts; a cooked pick clears only that person's flag and is validated with it cleared.
 run("householdDiets={w:'balanced',h:'keto'};state.days[0].readyB={w:true,h:false};delete ketoMeals[ketoMealKey(0,'h','b')]");
 const setup=(bh,b)=>run(`editCtx={i:0,iso:null};editSnap=JSON.stringify(editValsFromState(0));editP=editValsFromState(0).p;els={'[data-ek="s"]':{value:state.days[0].s},'[data-ek="dal"]':{value:state.days[0].dal},'[data-ek="b"]':{value:${JSON.stringify(b)}},'[data-ek="bh"]':{value:${JSON.stringify(bh)}},'[data-editsave]':{disabled:true},'#dlg':dlg,'#dlgBody .editbtns':{after(m){els['#dlgBody [data-editmessage]']=m}}};{const sv=JSON.parse(editSnap);for(const k of ['wheyW','wheyH','eggH','cardioW','off','skipB','skipL','skipD'])els['[data-et="'+k+'"]']={checked:sv[k]};}calls=[];order=[];dlg.open=true`);
 run("globalThis.prepareKetoBreakfasts=(i,sel,day)=>{calls.push({sel,ready:structuredClone(day.readyB||null)});return {}}");
 setup('__nocook','__nocook');await run('saveEdit()');
 assert.equal(run('calls.length'),0,'sentinel never reaches the helper');assert.equal(run('JSON.stringify(state.days[0].readyB)'),'{"w":true,"h":true}');assert.equal(run("order.join()"),'save,saveChanges');
 const hand=run("JSON.stringify(ketoConfig(state.days[0],'h','b'))");
 setup('','__nocook');await run('saveEdit()');assert.equal(run('calls.length'),0,'Current / Custom keeps hand-tuned portions');assert.equal(run('JSON.stringify(state.days[0].readyB)'),'{"w":true,"h":false}','only the Husband flag cleared');assert.equal(run("JSON.stringify(ketoConfig(state.days[0],'h','b'))"),hand);
 setup('eggAvocado','__nocook');await run('saveEdit()');assert.equal(run('JSON.stringify(calls[0].sel)'),'{"h":"eggAvocado"}');assert.equal(run('JSON.stringify(calls[0].ready)'),'{"w":true,"h":false}','validated on the tentative day with his flag cleared');
 run("state.days[0].readyB={w:true,h:false}");setup('','B2');await run('saveEdit()');assert.equal(run("'readyB' in state.days[0]"),false,'Wife cooked pick clears her flag');assert.equal(run('state.days[0].b'),'B2');
 // Helper throws: nothing mutated.
 run("state.days[0].readyB={w:false,h:true};globalThis.prepareKetoBreakfasts=()=>{throw Error('Over the carb budget.')}");const before=run('JSON.stringify([state.days,ketoMeals])');
 setup('omelette','B1');await run('saveEdit()');assert.equal(run('JSON.stringify([state.days,ketoMeals])'),before);assert.equal(run('box.textContent'),'Over the carb budget.');
 // Cook list: dishes the cook prepares; nutrition and shopping unchanged.
 run("state.days[0].readyB=undefined;delete state.days[0].readyB;state.days[0].wheyW=true;householdDiets={w:'balanced',h:'keto'}");const ledger=run('JSON.stringify(ledger())');
 const groups=JSON.parse(run('JSON.stringify(uxCookGroups(0))')),text=groups.flat(2).join('\n');
 assert.equal(run('JSON.stringify(ledger())'),ledger);
 assert.ok(groups.some(([t])=>/^Sabzi · /.test(t)));assert.ok(groups.some(([t])=>/^Dal · /.test(t)));assert.ok(groups.some(([t])=>t==='Rice / roti'));assert.ok(groups.some(([t])=>/^Breakfast · .*\(Wife\)$/.test(t)));
 for(const id of ['oil','spice','whey','curd','curdH','milk','almonds','cashews','walnuts','cucumber','avocado'])if(run(`DB['${id}']?1:0`))assert.ok(!text.includes(run(`DB['${id}'][0]`)+' —'),id);
 assert.doesNotMatch(text,/self-cooked|Husband protein|Chicken breast —/,'Keto husband protein is self-cooked');
 assert.match(run('cookCard(0)'),/<h4[^>]*>Sabzi · /);
 // Batch cook list and Combined cook list hide oil/spices/whey by id; the batch record, dates and servings keep everything.
 run("state.days[0].off=false;var bt={recipe:'S1',cookedOn:dateForDay(0),vessel:'kadhai',tare:0,netWeight:600,createdAt:1,ingredients:[{id:'bhindi',q:475,n:{k:150,p:9,fb:15}},{id:'onion',q:100,n:{k:40,p:1,fb:2}},{id:'oil',q:14,n:{k:114,p:0,fb:0}},{id:'spice',q:2,n:{k:6,p:0,fb:0}}],servings:[{date:dateForDay(0),meal:'l',person:'w',component:'sabzi',share:1,grams:600}]};savedBatches.cl=bt");
 const bg=JSON.parse(run('JSON.stringify(batchCookGroups(0))')),cooked=bg.find(([t])=>t.startsWith('Cooked batch'))[1].join('\n'),tbl=run('batchIngredientTable(bt)');
 for(const id of ['oil','spice'])assert.ok(!cooked.includes(run(`DB['${id}'][0]`))&&!tbl.includes(run(`DB['${id}'][0]`)),id);
 assert.match(cooked,/Bhindi — 475 g/);assert.match(cooked,/Cooked food: 600 g · Covers: /);assert.ok(bg.some(([t])=>t.startsWith('Already prepared')));
 assert.equal(run('savedBatches.cl.ingredients.length'),4,'record unchanged');assert.equal(run("savedBatches.cl.ingredients.find(x=>x.id==='oil').q"),14);
 assert.match(readFileSync(new URL('../batch-runtime.js',import.meta.url),'utf8'),/data-batch-oil/,'measured-oil field still in the batch editor');
 run("householdDiets={w:'balanced',h:'balanced'};state.days[0].off=false;state.days[0].cardioW=false");assert.match(run('cookCard(0)'),/Rest day \(Wife skipped cardio\): no dinner roti — the atta below is already reduced\./);assert.doesNotMatch(run('cookCard(0)'),/nuts below/);
 run("state.days[0].off=true");assert.match(JSON.stringify(run('JSON.stringify(uxCookGroups(0))')),/Eating out/);
});

test('Edit meals offers Spinach corn (K5) via a shared-recipe intent; phone meal cards are a one-open accordion',async()=>{
 const {run}=app(true);
 run(`var els={},order=[],hook=[];document.querySelector=s=>els[s]||null;state.days.forEach(d=>{d.off=false;d.skip={b:false,l:false,d:false};delete d.readyB});save=()=>order.push('save');saveChanges=async()=>{order.push('saveChanges');return true};render=()=>{};var dlg={open:true,close(){this.open=false}};var box={dataset:{},textContent:''};document.createElement=()=>box`);
 run("householdDiets={w:'balanced',h:'keto'};state.days[0].s='S1';delete sharedRecipes[sharedKey(0)]");
 let f=run('editFormHTML(editValsFromState(0),0)');const sel=f.match(/data-ek="s">[\s\S]*?<\/select>/)[0];
 assert.match(sel,/<option value="K5">K5 · Palak-corn sabzi \(spinach corn\)<\/option>/);assert.match(sel,/<option value="S1" selected>/);assert.doesNotMatch(sel,/value="K3"/);
 // The editor shows the sabzi actually planned when a shared override is active.
 run("sharedRecipes[sharedKey(0)]={recipe:'K5'}");assert.equal(run('editValsFromState(0).s'),'K5');f=run('editFormHTML(editValsFromState(0),0)');
 assert.match(f,/<option value="K5" selected>K5 · Palak-corn sabzi \(spinach corn\)<\/option>/);assert.match(f,/<label>Wife dinner protein<select data-ek="p">/,'K5 has no protein inside');
 run("sharedRecipes[sharedKey(0)]={recipe:'S12'}");assert.doesNotMatch(run('editFormHTML(editValsFromState(0),0)'),/data-ek="p"/,'effective protein sabzi hides dinner protein');
 run("sharedRecipes[sharedKey(0)]={recipe:'K4'}");assert.match(run('editFormHTML(editValsFromState(0),0)'),/<option value="K4" selected>K4 · Bhindi<\/option>/);
 // Save uses the existing validated shared record; K ids never enter the legacy day.s field.
 run("delete sharedRecipes[sharedKey(0)]");
 const setup=s=>run(`editCtx={i:0,iso:null};editSnap=JSON.stringify(editValsFromState(0));editP=editValsFromState(0).p;els={'[data-ek="s"]':{value:${JSON.stringify(s)}},'[data-ek="dal"]':{value:state.days[0].dal},'[data-ek="b"]':{value:state.days[0].b},'[data-ek="bh"]':{value:''},'[data-editsave]':{disabled:true},'#dlg':dlg,'#dlgBody .editbtns':{after(m){els['#dlgBody [data-editmessage]']=m}}};{const sv=JSON.parse(editSnap);for(const k of ['wheyW','wheyH','eggH','cardioW','off','skipB','skipL','skipD'])els['[data-et="'+k+'"]']={checked:sv[k]};}order=[];dlg.open=true`);
 setup('K5');await run('saveEdit()');
 assert.equal(run('sharedRecipe(state.days[0])'),'K5');assert.equal(run('state.days[0].s'),'S1');assert.equal(run("order.join()"),'save,saveChanges');
 setup('S7');await run('saveEdit()');assert.equal(run('sharedRecipe(state.days[0])'),'S7');assert.equal(run('state.days[0].s'),'S7');
 const before=run('JSON.stringify([state.days,sharedRecipes,ketoMeals])');setup('invalid');await run('saveEdit()');assert.equal(run('JSON.stringify([state.days,sharedRecipes,ketoMeals])'),before);assert.match(run('box.textContent'),/recipe/);
 // Phone accordion: collapsed headers, one open meal per day, tap again closes, wide screens unchanged.
 run("globalThis.matchMedia=q=>({matches:q==='(max-width:600px)',addEventListener(){}});uxOpenMeal={}");
 let day=run('uxDayHTML(0)');
 for(const m of ['b','l','d','e'])assert.match(day,new RegExp(`data-ux-meal-toggle="0,${m}" aria-expanded="false" aria-controls="meal-body-week-0-${m}"`));
 assert.equal((day.match(/class="meal-body" id="meal-body-week-0-[blde]" hidden>/g)||[]).length,4);
 run(`uxOpenMeal[uxMealKey(0)]='l'`);day=run('uxDayHTML(0)');
 assert.match(day,/data-ux-meal-toggle="0,l" aria-expanded="true"/);assert.match(day,/id="meal-body-week-0-l">/);assert.equal((day.match(/aria-expanded="true"/g)||[]).length,1);
 assert.match(day.slice(day.indexOf('id="meal-body-week-0-l"')),/data-weigh="0" data-weigh-meal="l"[\s\S]*data-ing="0,l"/,'Weigh & serve and Details live inside the opened body');
 assert.match(run('uxMealSummary(0,"b")'),/^W (\d+ kcal|—) · H (\d+ kcal|—)$/);
 run("globalThis.matchMedia=q=>({matches:false,addEventListener(){}})");day=run('uxDayHTML(0)');assert.doesNotMatch(day,/data-ux-meal-toggle| hidden>/);
 assert.equal(run("JSON.stringify(uxOpenMeal)"),JSON.stringify({[run('uxMealKey(0)')]:'l'}),'view-only state, no records');
});

test('stable phone header, no-cooked breakfast shows only counted ready foods, and no visible "raw" wording',()=>{
 const {run,shopping}=app(true);
 // The header no longer hides on scroll (that height change caused the flicker).
 const css=readFileSync(new URL('../ux.css',import.meta.url),'utf8'),ux=readFileSync(new URL('../ux-runtime.js',import.meta.url),'utf8');
 assert.doesNotMatch(css,/ux-scrolled/);assert.doesNotMatch(ux,/addEventListener\('scroll'/);
 // No cooked breakfast: only whey, curd, milk and nuts are adjustable; stored cooked fields stay untouched.
 run("householdDiets={w:'balanced',h:'keto'};state.days[0].off=false;state.days[0].skip={b:false,l:false,d:false};state.days[0].wheyH=true;ketoMeals[ketoMealKey(0,'h','b')]={...ketoConfig(state.days[0],'h','b'),protein:'eggs',quantity:3,eggWhites:3,avocado:50,mushroom:120,cucumber:100,oil:5,almonds:20,curd:100}");
 const stored=run("JSON.stringify(ketoMeals[ketoMealKey(0,'h','b')])");
 run("state.days[0].readyB={w:false,h:true}");const ready=run("ketoEditHTML(state.days[0],0,'h','b')");
 const fields=[...ready.matchAll(/data-keto-field="(\w+)"/g)].map(m=>m[1]);
 assert.deepEqual(fields,['whey','curd','milk','almonds','walnuts','cashews']);
 assert.doesNotMatch(ready,/data-keto-choice="(protein|paneerType)"|eggWhites|avocado|mushroom|cucumber|data-keto-field="oil"|flax|butter/);
 assert.match(ready,/data-keto-choice="curdType"/);assert.equal(run("JSON.stringify(ketoMeals[ketoMealKey(0,'h','b')])"),stored,'stored portions untouched');
 run("delete state.days[0].readyB");const cooked=run("ketoEditHTML(state.days[0],0,'h','b')");assert.match(cooked,/data-keto-field="avocado"[\s\S]*data-keto-field="oil"/,'cooked choice shows the old portions again');
 // Visible wording: food rows, cook list, Adjust, shopping, batch and carbs evidence never say "raw".
 assert.equal(run("uxDisplayText('Chicken breast · raw boneless skinless')"),'Chicken breast · boneless skinless');
 assert.equal(run("uxDisplayText('Arbi (raw)')"),'Arbi');assert.equal(run("uxDisplayText('Cabbage · raw')"),'Cabbage');assert.equal(run("uxBasisText('100 g raw edible')"),'100 g edible (before cooking)');assert.equal(run("uxBasisText('100 g dry')"),'100 g dry');assert.equal(run("uxDisplayText('Kaju · plain raw cashews (estimate)')"),'Kaju · plain cashews (estimate)');
 const strip=h=>h.replace(/<[^>]*>/g,' ');
 for(const [w,h] of [['balanced','keto'],['keto','keto'],['balanced','balanced']]){
  run(`householdDiets={w:'${w}',h:'${h}'}`);
  for(let i=0;i<7;i++){assert.doesNotMatch(strip(run(`uxDayHTML(${i})`)),/\braw\b/i,`day ${i} ${w}/${h}`);assert.doesNotMatch(strip(run(`cookCard(${i})`)),/\braw\b/i,`cook ${i}`);for(const m of ['b','l','d'])assert.doesNotMatch(strip(run(`inspect(${i},'${m}')`)),/\braw\b/i,`details ${i}${m}`);}
 }
 run("renderShopping()");assert.doesNotMatch(strip(shopping.innerHTML),/\braw\b/i);assert.match(shopping.innerHTML,/data-raw-need=/,'data attribute kept');
 assert.doesNotMatch(run("batchIngredientTable({ingredients:[{id:'chicken',q:250},{id:'gobi',q:300}]})"),/\braw\b/i);
 assert.match(run("uxFoodRow(L('mushroom',250)).quantity"),/^250 g$/);assert.match(run("uxFoodRow(L('moong',25)).quantity"),/^25 g dry$/);
});

test('breakfast dish vs sides, honest breakfast line, cleaned Edit labels and quiet day status',async()=>{
 const {run}=app(true);
 run(`var els={},order=[],calls=[];document.querySelector=s=>els[s]||null;document.querySelectorAll=()=>[];state.days.forEach(d=>{d.off=false;d.skip={b:false,l:false,d:false};delete d.readyB});save=()=>order.push('save');saveChanges=async()=>{order.push('saveChanges');return true};render=()=>{};var dlg={open:true,close(){this.open=false}};var box={dataset:{},textContent:''};document.createElement=()=>box`);
 run("householdDiets={w:'balanced',h:'keto'};state.days[0].wheyH=true;state.days[0].s='S1';delete sharedRecipes[sharedKey(0)];ketoMeals[ketoMealKey(0,'h','b')]={...ketoConfig(state.days[0],'h','b'),breakfastRecipe:'eggPoach',protein:'eggs',quantity:3,oil:5,whey:1,avocado:50,almonds:20,walnuts:25,cashews:0,curd:0,milk:0}");
 const stored=run("JSON.stringify(ketoMeals[ketoMealKey(0,'h','b')])");
 // Breakfast line names the dish and its counted sides; the 5 ml oil hint is only for the 3 Egg Poach method.
 assert.equal(run("uxBreakfastLine(0,'h')"),'3 Egg Poach (5 ml oil) · avocado 50 g + whey + nuts 45 g');
 assert.match(run("uxMealTable(0,'b')"),/<b>Husband<\/b> 3 Egg Poach \(5 ml oil\) · avocado 50 g \+ whey \+ nuts 45 g/);
 // Edit form: dish select plus a separate sides disclosure showing the saved sides; opening changes nothing.
 let v=JSON.parse(run('JSON.stringify(editValsFromState(0))'));assert.deepEqual(v.sidesH,{whey:1,avocado:50,almonds:20,walnuts:25,cashews:0,curd:0,milk:0});assert.equal(v.sidesW,undefined);
 let f=run('editFormHTML(editValsFromState(0),0)');
 assert.match(f,/<label>Husband breakfast dish<select data-ek="bh">/);assert.match(f,/<h4 class="edit-sides-sum">Husband breakfast sides · avocado 50 g \+ whey \+ nuts 45 g<\/h4>/);
 for(const k of ['whey','avocado','almonds','walnuts','cashews','curd','milk'])assert.match(f,new RegExp(`data-es="h\\.${k}"`));
 assert.match(f,/data-bf-preview="h">[^<]*kcal/);assert.equal(run("JSON.stringify(ketoMeals[ketoMealKey(0,'h','b')])"),stored);
 // Labels: breakfast whey, no H eggs for a Keto husband, Wife-only dal and dinner protein; hidden when not needed.
 assert.match(f,/data-et="wheyW"[^>]*> W breakfast whey/);assert.match(f,/data-et="wheyH"[^>]*> H breakfast whey/);assert.doesNotMatch(f,/data-et="eggH"/);
 assert.match(f,/<label>Wife dal<select data-ek="dal">/);assert.match(f,/<label>Wife dinner protein<select data-ek="p">/);
 run("state.days[0].s='S12'");assert.doesNotMatch(run('editFormHTML(editValsFromState(0),0)'),/data-ek="p"/);run("state.days[0].s='S1'");
 run("householdDiets={w:'keto',h:'keto'}");f=run('editFormHTML(editValsFromState(0),0)');assert.doesNotMatch(f,/data-ek="(p|dal)"/);
 run("householdDiets={w:'balanced',h:'balanced'}");f=run('editFormHTML(editValsFromState(0),0)');assert.match(f,/data-et="eggH"/);assert.match(f,/<label>Dal<select/);
 // Real helpers: options show dish-only kcal; a different non-avocado dish starts with no avocado, eggAvocado with 100 g.
 run("householdDiets={w:'balanced',h:'keto'}");
 assert.match(run('editFormHTML(editValsFromState(0),0)'),/<option value="boiledEggs"[^>]*>3 boiled eggs · dish \d+ kcal/);
 run("editCtx={i:0,iso:null};editSnap=JSON.stringify(editValsFromState(0))");
 assert.equal(run(`editSidesForPick({...editValsFromState(0),bh:'omelette'},0,'h').avocado`),0,'old avocado not carried into a non-avocado dish');assert.equal(run(`editSidesForPick({...editValsFromState(0),bh:'boiledEggs'},0,'h').avocado`),50,'boiled ↔ poach keeps the saved sides');
 assert.equal(run(`editSidesForPick({...editValsFromState(0),bh:'eggAvocado'},0,'h').avocado`),100);
 // No cooked: avocado input hidden but its saved value is kept (not silently deleted); dahi hides intrinsic whey/curd.
 run("householdDiets={w:'balanced',h:'keto'}");v=JSON.parse(run('JSON.stringify(editValsFromState(0))'));
 f=run(`editFormHTML({...editValsFromState(0),bh:'__nocook'},0)`);assert.doesNotMatch(f,/data-es="h\.avocado"/);assert.match(f,/sides · whey \+ nuts 45 g/);
 // Picking a different dish seeds its sides from that dish's config (no old avocado carried over); dahi shows its actual bowl curd/whey.
 run("editCtx={i:0,iso:null};editSnap=JSON.stringify(editValsFromState(0))");
 const seeded=JSON.parse(run(`JSON.stringify(editSidesForPick({...editValsFromState(0),bh:'dahiBowl'},0,'h'))`)),opt=JSON.parse(run(`JSON.stringify(editKetoOptions(0,'h').find(o=>o.id==='dahiBowl').config)`));
 assert.equal(seeded.curd,opt.curd||0);assert.equal(seeded.whey,opt.whey||0);
 assert.deepEqual(JSON.parse(run(`JSON.stringify(editSidesForPick({...editValsFromState(0),bh:'eggPoach'},0,'h'))`)),v.sidesH,'same saved dish keeps its saved sides');
 f=run(`editFormHTML({...editValsFromState(0),bh:'dahiBowl',sidesH:${JSON.stringify(seeded)}},0)`);assert.doesNotMatch(f,/data-es="h\.(whey|curd)"/);assert.match(f,new RegExp(`Bowl uses curd ${seeded.curd} g \\+ whey ${seeded.whey} scoops`));
 const setup=(bh,sides)=>run(`editCtx={i:0,iso:null};editSnap=JSON.stringify(editValsFromState(0));editP=editValsFromState(0).p;els={'[data-ek="s"]':{value:state.days[0].s},'[data-ek="dal"]':{value:state.days[0].dal},'[data-ek="b"]':{value:state.days[0].b},'[data-ek="bh"]':{value:${JSON.stringify(bh)}},'[data-editsave]':{disabled:true},'#dlg':dlg,'#dlgBody .editbtns':{after(m){els['#dlgBody [data-editmessage]']=m}}};{const sv=JSON.parse(editSnap);for(const k of ['wheyW','wheyH','cardioW','off','skipB','skipL','skipD'])els['[data-et="'+k+'"]']={checked:sv[k]};for(const [k,val] of Object.entries(${JSON.stringify(sides)}))els['[data-es="h.'+k+'"]']={value:String(val)};}order=[];calls=[];dlg.open=true`);
 run("globalThis.prepareKetoBreakfasts=(i,sel,day,recipe,sides)=>{calls.push({sel,sides:sides||null,ready:day.readyB||null});return {}}");
 setup('__nocook',{whey:1,almonds:20,walnuts:25,cashews:0,curd:0,milk:0});assert.equal(run('collectEdit().sidesH.avocado'),50,'hidden avocado keeps the saved value');
 // Unchanged sides and dish: the helper is not called and nothing is staged.
 setup('eggPoach',{whey:1,avocado:50,almonds:20,walnuts:25,cashews:0,curd:0,milk:0});await run('saveEdit()');assert.equal(run('calls.length'),0);assert.equal(run("order.join()"),'save,saveChanges');
 // Changed sides only: staged through prepareKetoBreakfasts' sideOverrides, dish untouched.
 setup('eggPoach',{whey:1,avocado:0,almonds:20,walnuts:25,cashews:0,curd:0,milk:0});await run('saveEdit()');
 assert.equal(run('JSON.stringify(calls[0].sel)'),'{}');assert.deepEqual(JSON.parse(run('JSON.stringify(calls[0].sides)')),{h:{whey:1,avocado:0,almonds:20,walnuts:25,cashews:0,curd:0,milk:0}});
 // No cooked → the same saved dish is still sent as a selection so it is revalidated.
 run("state.days[0].readyB={w:false,h:true}");setup('eggPoach',{whey:1,avocado:50,almonds:20,walnuts:25,cashews:0,curd:0,milk:0});await run('saveEdit()');
 assert.equal(run('JSON.stringify(calls[0].sel)'),'{"h":"eggPoach"}');assert.equal(run('calls[0].ready'),null,'flag cleared on the tentative day');
 // Adjust portions: a side-only change keeps the chosen dish; a dish field change turns it Custom.
 run("delete state.days[0].readyB;cloudReady=true;cloudSaving=false;ketoMeals[ketoMealKey(0,'h','b')]=JSON.parse(globalThis.storedBf=JSON.stringify({...ketoConfig(state.days[0],'h','b'),breakfastRecipe:'eggPoach'}))");
 run("updateKetoPortion(ketoMealKey(0,'h','b'),'avocado',0)");assert.equal(run("ketoMeals[ketoMealKey(0,'h','b')].breakfastRecipe"),'eggPoach');assert.equal(run("ketoMeals[ketoMealKey(0,'h','b')].avocado"),0);
 run("updateKetoPortion(ketoMealKey(0,'h','b'),'quantity',2)");assert.equal(run("'breakfastRecipe' in ketoMeals[ketoMealKey(0,'h','b')]"),false);
 // Helper missing: inline message, no mutation.
 run("globalThis.prepareKetoBreakfasts=undefined");const before=run('JSON.stringify([state.days,ketoMeals])');setup('eggPoach',{avocado:10});await run('saveEdit()');assert.equal(run('box.textContent'),'Breakfast recipes need the latest update.');assert.equal(run('JSON.stringify([state.days,ketoMeals])'),before);
 // Quiet day status: Husband's shortfall vs the working range, and nuts today with kcal; no orange warning class.
 run("globalThis.realDay=assignedDayNutrition;globalThis.assignedDayNutrition=(i,p)=>p==='h'?{...realDay(i,p),k:1531,p:104}:realDay(i,p)");
 const st=run('uxDayStatus(0)');assert.match(st,/^<p class="ux-day-status">Husband: 1531 kcal below 1900–2100 · 104 g protein below 120 g working target\./);assert.match(st,/Husband nuts today: \d+ g \(\d+ kcal\)\./);assert.doesNotMatch(st,/ux-warning/);
 run("globalThis.assignedDayNutrition=(i,p)=>p==='h'?{...realDay(i,p),k:2000,p:140}:realDay(i,p)");assert.doesNotMatch(run('uxDayStatus(0)'),/below/);
 run("globalThis.assignedDayNutrition=realDay");assert.match(run('uxDayHTML(0)'),/<p class="ux-day-status">/);
});

test('meal quantities toggle per person via Root groups; Edit meals splits into sections without horizontal overflow',()=>{
 const {run,listeners}=app(true);
 // The integrated backend exposes actual quantity controls.
 assert.match(run("uxMealTable(0,'l')"),/data-ux-qty/);
 run(`globalThis.toggles=[];globalThis.skipped={};globalThis.mealQuantityGroups=(day,m,p)=>m!=='l'?[]:[
  {key:'sabzi',component:'sabzi',lines:originalComponent(day,m,p,'sabzi'),excluded:!!skipped[p+'sabzi']},
  {key:'eggs',lines:[L('egg',1),L('eggWhite',2)],excluded:!!skipped[p+'eggs']},
  {key:'nuts',lines:[L('almonds',20),L('walnuts',25)],excluded:!!skipped[p+'nuts']},
  ...(p==='w'?[{key:'food:curd',lines:[L('curd',100)],excluded:false}]:[])];
 globalThis.toggleMealQuantity=(i,m,p,key)=>{toggles.push([i,m,p,key].join(','));skipped[p+key]=!skipped[p+key];return true;};
 globalThis.queued=0;globalThis.queueUXSave=()=>{queued++;};skipped.weggs=true;`);
 const t=run("uxMealTable(0,'l')");
 // Eggs + whites and the nuts are one toggle each; excluded amounts stay visible, pressed and struck through.
 assert.match(t,/<td class="meal-qty meal-excluded"><button type="button" class="meal-qty-btn" data-ux-qty="0\|l\|w\|eggs" aria-pressed="true" aria-label="Skip Eggs, 3 eggs, for Wife"[^>]*><b>3 eggs<\/b><small>keep 1 yolk<\/small><\/button><\/td>/);
 assert.match(t,/data-ux-qty="0\|l\|h\|eggs" aria-pressed="false"/);
 assert.match(t,/data-ux-qty="0\|l\|w\|nuts" aria-pressed="false"[^>]*><b>45 g<\/b><small>20 g almonds · 25 g walnuts<\/small>/);
 assert.match(t,/data-ux-qty="0\|l\|w\|sabzi"/);assert.match(t,/data-ux-qty="0\|l\|w\|food:curd"/);
 // No toggle on a person's missing food (the dash) or on the totals.
 assert.match(t,/<td class="meal-empty">—<\/td>/);assert.equal((t.match(/data-ux-qty=/g)||[]).length,7);
 assert.doesNotMatch(t.slice(t.indexOf('meal-table-foot')),/data-ux-qty/);
 // Clicking calls Root's toggle once with the full key and queues a cloud save.
 const btn={dataset:{uxQty:'0|l|w|food:curd'}},target={closest:s=>s==='[data-ux-qty]'?btn:null,matches:()=>false};
 for(const fn of listeners.click||[])try{fn({target,preventDefault(){}});}catch{}
 assert.equal(run('toggles.join(";")'),'0,l,w,food:curd');assert.equal(run('queued'),1);
 run('cloudSaving=true');for(const fn of listeners.click||[])try{fn({target,preventDefault(){}});}catch{}
 assert.equal(run('toggles.length'),1,'no toggle while a save is in flight');run('cloudSaving=false');
 // Edit meals: three labelled sections in the DOM at once (so unsaved picks survive), tabs for phones.
 run("householdDiets={w:'balanced',h:'keto'}");
 let f=run('editFormHTML(editValsFromState(0),0)');
 assert.deepEqual([...f.matchAll(/data-edit-tab="(\w+)"/g)].map(m=>m[1]),['meals','sides','day']);
 assert.match(f,/class="editform" data-sec="meals"/);assert.match(f,/data-edit-tab="meals" aria-controls="edit-sec-meals" aria-selected="true" tabindex="0"/);
 const sec=k=>f.slice(f.indexOf(`data-edit-sec="${k}"`),f.indexOf('</section>',f.indexOf(`data-edit-sec="${k}"`)));
 assert.match(sec('meals'),/data-ek="bh"/);assert.match(sec('meals'),/data-ek="s"/);assert.match(sec('meals'),/data-bf-preview="h"/);
 assert.match(sec('sides'),/data-es="h\.whey"/);assert.doesNotMatch(sec('meals'),/data-es=/);
 assert.match(sec('day'),/data-et="skipB"/);assert.match(f,/<\/section>\s*<div class="editbtns">/);
 // The chosen section survives a re-render; nobody Keto means no sides tab.
 run("editSection='day'");assert.match(run('editFormHTML(editValsFromState(0),0)'),/data-sec="day"/);
 run("householdDiets={w:'balanced',h:'balanced'};editSection='sides'");f=run('editFormHTML(editValsFromState(0),0)');
 assert.match(f,/class="editform edit-nosides" data-sec="meals"/);assert.doesNotMatch(f,/data-edit-tab="sides"/);
 const css=readFileSync(new URL('../ux.css',import.meta.url),'utf8');
 assert.match(css,/\.editform select,\.editform input\[type=number\]\{width:100%;min-width:0;max-width:100%\}/);
 assert.match(css,/#dlg\.ux-edit-dialog\{width:min\(1080px,calc\(100vw - 32px\)\);max-width:calc\(100vw - 32px\);overflow-x:hidden\}/);
 assert.match(css,/@media\(max-width:700px\),\(max-height:560px\)\{[^@]*\.edit-tabs\{display:flex\}[^@]*#dlg\.ux-edit-dialog\[open\]\{height:calc\(100dvh - 20px\)\}|@media\(max-width:700px\),\(max-height:560px\)\{[^@]*#dlg\.ux-edit-dialog\[open\]\{height:calc\(100dvh - 20px\)\}[^@]*\.edit-tabs\{display:flex\}/);
 assert.match(css,/\.editform \.editbtns\{[^}]*position:sticky;bottom:0\}/);
 // Fit: a Keto dish and its preview page together; the measured pager needs a real layout, so the vm only checks it
 // is a safe no-op here, plus the short-screen compaction and landscape rules exist.
 run("householdDiets={w:'keto',h:'keto'}");f=run('editFormHTML(editValsFromState(0),0)');
 assert.match(f,/<div class="edit-item"><label>Wife breakfast dish<select data-ek="bw">[\s\S]*?data-bf-preview="w">[^<]*<\/small><\/div>/);
 assert.equal((f.match(/class="edit-sides"/g)||[]).length,2);assert.equal(run('editFit()'),undefined);
 assert.match(css,/@media\(max-width:700px\) and \(max-height:740px\),\(max-height:560px\)\{/);
 assert.match(css,/@media\(max-height:560px\) and \(min-width:520px\)\{[^@]*grid-template-areas:"tabs btns" "sec sec"/);
});
