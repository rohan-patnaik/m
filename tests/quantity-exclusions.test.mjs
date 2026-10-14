import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {buildSync} from 'esbuild';
import * as batches from '../batch-math.js';
import * as weighing from '../weigh-math.js';
import * as records from '../records.js';

const bundle=buildSync({entryPoints:[new URL('../convex-browser.js',import.meta.url).pathname],bundle:true,format:'iife',write:false}).outputFiles[0].text;
function app(){
 const document={addEventListener(){},querySelector(){return null;},querySelectorAll(){return[];}};
 const ctx=vm.createContext({document,window:{addEventListener(){}},BatchMath:batches,WeighMath:weighing,MealCloud:records,crypto:webcrypto,structuredClone,console,TextEncoder,setInterval(){},navigator:{onLine:true}});
 vm.runInContext(bundle,ctx);ctx.MealCloud=ctx.window.MealCloud;ctx.ActivityMath=ctx.window.ActivityMath;
 for(const file of ['batch-runtime.js','weigh-runtime.js','cloud-runtime.js','nutrition-runtime.js','household-runtime.js','shopping-runtime.js','keto-runtime.js'])vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),ctx);
 const script=readFileSync(new URL('../index.html',import.meta.url),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
 vm.runInContext(script.slice(0,script.indexOf("document.addEventListener('input'")),ctx);
 vm.runInContext("state.weekKey=null;templateDays=structuredClone(state.days);templateUtensils=structuredClone(state.utDay);cloudReady=true;render=()=>{}",ctx);
 return s=>vm.runInContext(s,ctx);
}

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function ready(){const run=app();run("householdDiets={w:'balanced',h:'keto'};state.days.forEach(d=>{d.off=false;d.skip={b:false,l:false,d:false};d.wheyH=true});ketoMeals[ketoMealKey(0,'h','b')]={...ketoConfig(state.days[0],'h','b'),paneerType:'paneerMM',curdType:'curd',whey:1,almonds:20,walnuts:25,cashews:0}");return run;}

test('individual quantities exclude all macros and shopping once, preserve plans, and restore exactly',()=>{
 const run=ready();run("state.view='week';var day=state.days[0];ketoMeals[ketoMealKey(0,'h','b')]={...ketoConfig(day,'h','b'),breakfastRecipe:'boiledEggs',quantity:3,protein:'eggs',eggWhites:0,avocado:50,oil:0,spinach:0}");
 const before=JSON.parse(run("JSON.stringify({meal:meal(day,'b','h'),total:assignedDayNutrition(0,'h'),shop:ledger(),wife:assignedDayNutrition(0,'w'),cfg:ketoConfig(day,'h','b')})"));
 for(const key of ['food:avocado','eggs','nuts','food:whey']){
  const group=JSON.parse(run(`JSON.stringify(mealQuantityGroups(day,'b','h').find(x=>x.key==='${key}'))`));
  const n=JSON.parse(run(`JSON.stringify(comparisonSum(mealQuantityGroups(day,'b','h').find(x=>x.key==='${key}').lines))`));
  assert.equal(run(`toggleMealQuantity(0,'b','h','${key}')`),true);
  const after=JSON.parse(run("JSON.stringify(assignedDayNutrition(0,'h'))"));
  for(const metric of ['k','p','a','aHi','c','cHi','f','sat','fb','s','added'])near(before.total[metric]-after[metric],n[metric]);
  assert.equal(run(`mealQuantityGroups(day,'b','h').find(x=>x.key==='${key}').excluded`),true);
  assert.deepEqual(JSON.parse(run("JSON.stringify(ketoConfig(day,'h','b'))")),before.cfg);
  assert.deepEqual(JSON.parse(run("JSON.stringify(assignedDayNutrition(0,'w'))")),before.wife);
  for(const x of group.lines)near(before.shop[x.id]-(run(`ledger()['${x.id}']`)||0),x.q);
  run('snapshotDraft();mealExclusions={};hydrateDraft();day=state.days[0]');
  assert.equal(run(`mealQuantityGroups(day,'b','h').find(x=>x.key==='${key}').excluded`),true);
  assert.equal(run(`toggleMealQuantity(0,'b','h','${key}')`),true);
  assert.deepEqual(JSON.parse(run("JSON.stringify(meal(day,'b','h'))")),before.meal);
 }
});
test('all diet assignments keep excluded sabzi and dal isolated to person and meal including recipe oil',()=>{
 for(const w of ['balanced','keto'])for(const h of ['balanced','keto']){
 const run=ready();run(`state.view='week';householdDiets={w:'${w}',h:'${h}'};var day=state.days[0]`);
 for(const p of ['w','h'])for(const m of ['l','d']){
  const baseline=run("JSON.stringify(state.days.map(d=>['w','h'].map(p=>['b','l','d','e'].map(m=>meal(d,m,p)))))");
  for(const component of ['sabzi',...(run(`isKeto('${p}')`)?[]:['dal'])]){
   const original=JSON.parse(run(`JSON.stringify(comparisonSum(meal(day,'${m}','${p}')))`));
   const remove=JSON.parse(run(`JSON.stringify(comparisonSum(mealQuantityGroups(day,'${m}','${p}').find(g=>g.component==='${component}').lines))`));
   assert.equal(run(`toggleMealQuantity(0,'${m}','${p}','component:${component}')`),true);
   const after=JSON.parse(run(`JSON.stringify(comparisonSum(meal(day,'${m}','${p}')))`));near(original.k-after.k,remove.k);near(original.oil-after.oil,remove.oil);
   assert.equal(run(`includedComponent(day,'${m}','${p}','${component}').length`),0);
   run(`toggleMealQuantity(0,'${m}','${p}','component:${component}')`);
   assert.equal(run("JSON.stringify(state.days.map(d=>['w','h'].map(p=>['b','l','d','e'].map(m=>meal(d,m,p)))))"),baseline);
  }
 }
 }
});
test('day toggles create a dated scope and do not change the template; recipe/quantity changes do not inherit stale exclusions',()=>{
 const run=ready();run("state.view='day';state.weekKey=null;var mon=mondayOf(dayViewISO());ketoMeals[ketoMealKey(0,'h','b')]={...ketoConfig(state.days[0],'h','b'),avocado:50};var old=JSON.stringify(ketoMeals)");
 run("toggleMealQuantity(0,'b','h','food:avocado')");assert.equal(run('state.weekKey'),run('mon'));
 assert.equal(run("Object.keys(mealExclusions).some(k=>k.startsWith('exclude/template/'))"),false);
 assert.equal(run("ketoMeals['keto/template/day/0/h/b'].avocado"),50);
 run("snapshotDraft();selectWeek(null)");assert.equal(run("meal(state.days[0],'b','h').some(x=>x.id==='avocado'&&x.q===50)"),true);
 run("selectWeek(mon)");assert.equal(run("meal(state.days[0],'b','h').some(x=>x.id==='avocado')"),false);
 run("ketoMeals[ketoMealKey(0,'h','b')].avocado=60");assert.equal(run("meal(state.days[0],'b','h').find(x=>x.id==='avocado').q"),60);
});
test('frozen prepared portion exclusion preserves snapshot and original batch purchase quantities',()=>{
 const run=ready();run("state.view='week';state.weekKey='2026-10-12';var day=state.days[0];var ingredient=L('bhindi',500);var batch={recipe:'S1',cookedOn:dateForDay(0),vessel:'kadhai',tare:0,netWeight:600,createdAt:1,ingredients:[{...ingredient,n:nutrientSnapshot(ingredient)}],servings:[{date:dateForDay(0),meal:'l',person:'h',component:'sabzi',share:1,grams:600}]};savedBatches.testbatch=batch");
 const frozen=run('JSON.stringify(savedBatches)'),shop=run('JSON.stringify(ledger())'),before=run("comparisonSum(meal(day,'l','h')).k"),n=run("comparisonSum(BatchMath.portionLines(batch,batch.servings[0])).k");
 run("toggleMealQuantity(0,'l','h','component:sabzi')");near(before-run("comparisonSum(meal(day,'l','h')).k"),n);assert.equal(run('JSON.stringify(savedBatches)'),frozen);assert.equal(run('JSON.stringify(ledger())'),shop);
 run("toggleMealQuantity(0,'l','h','component:sabzi')");near(run("comparisonSum(meal(day,'l','h')).k"),before);
});
test('invalid exclusions are rejected and records merge independently across meals',()=>{
 for(const key of ['exclude/template/day/0/h/b','exclude/2026-10-12/day/6/w/e'])assert.doesNotThrow(()=>records.validateRecord(key,{items:{eggs:'signature'}}));
 for(const key of ['exclude/2026-10-13/day/0/h/b','exclude/template/day/8/h/b','exclude/template/day/0/x/b'])assert.throws(()=>records.validateRecord(key,{items:{eggs:'signature'}}));
 for(const value of [{items:{}},{items:{eggs:3}},{items:{'<img>':'x'}},{items:{eggs:'x'},other:true}])assert.throws(()=>records.validateRecord('exclude/template/day/0/h/b',value));
 assert.deepEqual(records.mergeRecords({}, {'exclude/template/day/0/h/b':{items:{eggs:'x'}}},{'exclude/template/day/0/w/l':{value:{items:{nuts:'y'}},revision:1}}).conflicts,[]);
});

test('breakfast edit preview and carb breakdown follow active quantities',()=>{
 const run=ready();run("state.view='week';ketoMeals[ketoMealKey(0,'h','b')].avocado=50;toggleMealQuantity(0,'b','h','food:avocado')");
 near(run("ketoBreakfastPreview(0,'h').nutrition.k"),run("comparisonSum(meal(state.days[0],'b','h')).k"));
 near(run("dayCarbBreakdown(0,'h').totals.aHi"),run("assignedDayNutrition(0,'h').aHi"));
 assert.equal(run("dayCarbBreakdown(0,'h').foods.some(x=>x.id==='avocado')"),false);
});
test('excluding fresh pot shares invalidates old weights; remaining ingredient amounts do not increase',()=>{
 const run=ready();run("state.view='week';state.weekKey='2026-10-12';var day=state.days[0],dish=differentSabzis(day)?'sabzi-h':'sabzi';var specs=weighSpecs(0,dish);dailyWeights[dateForDay(0)+'/'+dish]={scope:'all',basis:weighBasis(0,dish,'all'),gross:600,tare:0,netWeight:600,portions:WeighMath.allocateFood(600,0,specs).portions};var oldDinner=JSON.stringify(meal(day,'d','h'));var oldPot=JSON.stringify(dailyWeights)");
 assert.ok(run('currentWeigh(0,dish)'));
 run("toggleMealQuantity(0,'l','h','component:sabzi')");
 assert.equal(run('currentWeigh(0,dish)'),null,'must reweigh instead of silently reallocating old cooked output');
 assert.equal(run("activeWeighSpecs(0,dish).some(s=>s.meal==='l'&&s.person==='h')"),false);
 assert.equal(run("JSON.stringify(meal(day,'d','h'))"),run('oldDinner'));
 assert.equal(run('JSON.stringify(dailyWeights)'),run('oldPot'));
 run("toggleMealQuantity(0,'l','h','component:sabzi')");assert.ok(run('currentWeigh(0,dish)'));
});
test('paneer food toggle stays excluded before weighing; a weighed component remains excluded after reweigh',()=>{
 const run=ready();run("state.view='week';state.weekKey='2026-10-12';var day=state.days[0];sharedRecipes[sharedKey(0)]={recipe:'K4'};ketoMeals[ketoMealKey(0,'h','d')]={...ketoConfig(day,'h','d'),protein:'paneer',paneerType:'paneerMM',quantity:100,soya:0,eggWhites:0,spinach:0}");
 run("toggleMealQuantity(0,'d','h','food:paneerMM')");assert.equal(run("meal(day,'d','h').some(x=>x.id==='paneerMM')"),false);assert.equal(run("activeWeighSpecs(0,'prot').some(x=>x.person==='h')"),false);
 run("toggleMealQuantity(0,'d','h','food:paneerMM');dailyWeights[dateForDay(0)+'/prot']={scope:'all',basis:weighBasis(0,'prot','all'),gross:300,tare:0,netWeight:300,portions:WeighMath.allocateFood(300,0,weighSpecs(0,'prot')).portions}");
 assert.equal(run("toggleMealQuantity(0,'d','h','component:protein')"),true);
 assert.equal(run("meal(day,'d','h').some(x=>x.id==='paneerMM')"),false);
 run("var specs=activeWeighSpecs(0,'prot');dailyWeights[dateForDay(0)+'/prot']={scope:'all',basis:weighBasis(0,'prot','all'),gross:200,tare:0,netWeight:200,portions:specs.length?WeighMath.allocateFood(200,0,specs).portions:[]}");
 assert.equal(run("mealQuantityGroups(day,'d','h').find(x=>x.key==='component:protein').excluded"),true);
 assert.equal(run("meal(day,'d','h').some(x=>x.id==='paneerMM')"),false);
});
