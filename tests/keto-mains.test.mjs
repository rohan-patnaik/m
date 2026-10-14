import test from 'node:test';
import assert from 'node:assert/strict';
import {app} from './helpers/app.mjs';
import {validateRecord,validateKetoNuts} from '../records.js';
const json=(run,s)=>JSON.parse(run('JSON.stringify('+s+')'));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} vs ${b}`);
function setup(){const run=app();run("householdDiets={w:'balanced',h:'keto'};state.days.forEach(d=>{d.off=false;d.skip={b:false,l:false,d:false};d.wheyH=true});applyKetoInventoryPlan()");return run;}
test('new husband plan has exactly 20 g evening nuts, four chicken meals and no daytime nuts',()=>{
 const run=setup();for(let i=0;i<7;i++){
  assert.equal(run(`['b','l','d'].flatMap(m=>meal(state.days[${i}],m,'h')).filter(x=>KETO_NUT_IDS.includes(x.id)&&x.q>0).length`),0);
  assert.equal(run(`meal(state.days[${i}],'e','h').reduce((n,x)=>n+x.q,0)`),20);
 }
 near(run('ledger().almonds'),70);near(run('ledger().walnuts'),70);near(run('ledger().chicken'),1000);
 run('snapshotDraft()');assert.doesNotThrow(()=>validateKetoNuts(Object.entries(json(run,'cloudDraft')).map(([key,value])=>({key,value}))));
});
test('nut transaction validation rejects combined excess and nuts sneaking back into main meals',()=>{
 const e='keto/template/day/0/h/e',v={almonds:10,walnuts:10,cashews:0};validateRecord(e,v);
 assert.throws(()=>validateRecord(e,{...v,cashews:1}),/20 g/);
 assert.throws(()=>validateRecord(e,{...v,almonds:-1}),/20 g/);
 assert.throws(()=>validateRecord(e.replace('/h/','/w/'),v),/20 g/);
 assert.throws(()=>validateKetoNuts([{key:e,value:v},{key:e.slice(0,-1)+'l',value:{almonds:1}}]),/evening only/);
 validateKetoNuts([{key:e.slice(0,-1)+'l',value:{almonds:20}}]); // legacy days without the new rule remain readable
});
test('main previews are pure, respect combined selections and match committed ingredient totals',()=>{
 const run=setup(),before=run('JSON.stringify([state.days,ketoMeals,sharedRecipes,mealExclusions])');
 assert.equal(run("ketoMainOptions(0,'l').length"),11);
 const opts=json(run,"ketoMainOptions(0,'l')");assert.equal(run('JSON.stringify([state.days,ketoMeals,sharedRecipes,mealExclusions])'),before);
 for(const o of opts){run(`var cfg=(${JSON.stringify(o.config)});`);const n=json(run,"comparisonSum(ketoMealWithConfig(state.days[0],'h','l',cfg))");near(n.k,o.nutrition.k);near(n.p,o.nutrition.p);near(n.aHi,o.nutrition.aHi);validateRecord('keto/template/day/0/h/l',o.config);}
 run("var picks=prepareKetoMains(0,{l:'eggCurry',d:'chickenPan'});Object.assign(ketoMeals,picks)");
 assert.equal(run("ketoConfig(state.days[0],'h','l').mealRecipe"),'eggCurry');assert.equal(run("ketoConfig(state.days[0],'h','d').quantity"),250);
 assert.ok(run("meal(state.days[0],'l','h').some(x=>x.id==='onion'&&x.q>=40)"));
});
test('evening quantity skip and undo change daily macros, shopping and prep exactly once',()=>{
 const run=setup(),before=json(run,"assignedDayNutrition(0,'h')"),snack=json(run,"comparisonSum(meal(state.days[0],'e','h'))"),shop=run('ledger().almonds');
 assert.equal(run("toggleMealQuantity(0,'e','h','nuts')"),true);const after=json(run,"assignedDayNutrition(0,'h')");for(const k of ['k','p','a','fb'])near(before[k]-after[k],snack[k]);near(shop-run('ledger().almonds'),10);
 assert.equal(run("meal(state.days[0],'e','h').length"),0);run("toggleMealQuantity(0,'e','h','nuts')");near(run("assignedDayNutrition(0,'h').k"),before.k);
 assert.match(run("JSON.stringify(householdPrep(0))"),/Almonds/);
});
test('new main includes its explicit protein alongside bhurji without changing Wife',()=>{
 const run=setup();run("sharedRecipes[sharedKey(0)]={recipe:'S12'}");const wife=run("JSON.stringify(meal(state.days[0],'l','w'))");
 run("ketoMeals[ketoMealKey(0,'h','l')]=ketoMainConfig(0,'h','l','eggCurry')");assert.equal(run("ketoComponent(state.days[0],'h','l','protein').find(x=>x.id==='egg').q"),4);
 assert.equal(run("JSON.stringify(meal(state.days[0],'l','w'))"),wife);
});
test('main batches freeze gravy and mixed protein once and reject incompatible mixtures',()=>{
 const run=setup();run("state.weekKey='2026-10-12';ketoMeals[ketoMealKey(0,'h','d')]=ketoMainConfig(0,'h','d','eggCurry');batchDraft={recipe:'E',cookedOn:'2026-10-12',vessel:'pan',includeVessel:false,gross:400,oil:null,roles:{'2026-10-12/d':'protein'},selected:{'2026-10-12/d/h':true}}");
 const before=json(run,"comparisonSum(ketoComponent(state.days[0],'h','d','protein'))"),batch=json(run,'buildBatchPreview(true)');
 assert.equal(batch.ingredients.find(x=>x.id==='tomato').q,80);assert.equal(batch.ingredients.find(x=>x.id==='onion').q,40);
 run("savedBatches['test-main-batch']=buildBatchPreview(true)");const frozen=json(run,"comparisonSum(BatchMath.portionLines(savedBatches['test-main-batch'],savedBatches['test-main-batch'].servings[0]))");near(frozen.k,before.k);near(frozen.a,before.a);
 assert.throws(()=>run("prepareKetoMains(0,{d:'chickenPan'})"),/prepared batch/);
 run("savedBatches={};ketoMeals[ketoMealKey(1,'h','d')]=ketoMainConfig(1,'h','d','eggSpinach');batchDraft.roles['2026-10-13/d']='protein';batchDraft.selected['2026-10-13/d/h']=true");assert.throws(()=>run('buildBatchPreview(true)'),/different ingredient ratios/);
});
test('scope copying and hydration preserve evening record and edited main portions',()=>{
 const run=setup();run("ketoMeals[ketoMealKey(0,'h','l')].quantity=175;copyDietScope('template','2026-10-19');snapshotDraft();ketoMeals={};hydrateDraft()");
 assert.equal(run("ketoMeals['keto/2026-10-19/day/0/h/e'].almonds"),10);assert.equal(run("ketoMeals['keto/2026-10-19/day/0/h/l'].quantity"),175);
 assert.equal(run("editMainSelections(editValsFromState(0),0).l"),undefined,'unchanged recipe keeps custom amount');
});
