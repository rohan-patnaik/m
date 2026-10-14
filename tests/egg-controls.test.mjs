import test from 'node:test';
import assert from 'node:assert/strict';
import {app} from './helpers/app.mjs';
import {validateRecord} from '../records.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} vs ${b}`);
function setup(){const run=app(true);run("state.view='week';householdDiets={w:'balanced',h:'keto'};state.days[0].off=false;state.days[0].skip={b:false,l:false,d:false};ketoMeals[ketoMealKey(0,'h','b')]={...ketoConfig(state.days[0],'h','b'),protein:'eggs',quantity:3,eggWhites:2,breakfastRecipe:'boiledEggs',oil:0};ketoMeals[ketoMealKey(0,'h','d')]=ketoMainConfig(0,'h','d','eggMushroom')");return run;}
test('egg step changes one whole egg in meal, day and shopping while preserving whites and other meals',()=>{
 const run=setup();const before=run("assignedDayNutrition(0,'h').k"),shop=run('ledger().egg'),other=run("JSON.stringify([meal(state.days[0],'l','h'),meal(state.days[0],'d','h'),assignedDayNutrition(0,'w')])");
 assert.equal(run("changeMealEggs(0,'b','h','quantity',4)"),true);near(run("assignedDayNutrition(0,'h').k")-before,72);near(run('ledger().egg')-shop,1);
 assert.equal(run("ketoConfig(state.days[0],'h','b').eggWhites"),2);assert.equal(run("ketoConfig(state.days[0],'h','b').breakfastRecipe"),'boiledEggs');
 assert.equal(run("JSON.stringify([meal(state.days[0],'l','h'),meal(state.days[0],'d','h'),assignedDayNutrition(0,'w')])"),other);
 assert.match(run("uxMealTable(0,'b')"),/>4 eggs</);assert.match(run("uxMealTable(0,'b')"),/\+ 2 extra whites/);
});
test('zero eggs stays editable and can be incremented without leaving invisible eggs in totals',()=>{
 const run=setup();run("ketoMeals[ketoMealKey(0,'h','b')].eggWhites=0;changeMealEggs(0,'b','h','quantity',0)");
 assert.equal(run("meal(state.days[0],'b','h').some(x=>x.id==='egg'&&x.q>0)"),false);assert.match(run("uxMealTable(0,'b')"),/>0 eggs</);assert.match(run("uxMealTable(0,'b')"),/data-egg-step="0\|b\|h\|1"/);
 assert.equal(run("changeMealEggs(0,'b','h','quantity',1)"),true);assert.equal(run("meal(state.days[0],'b','h').find(x=>x.id==='egg').q"),1);
});
test('skipped eggs retain skip/restore and cannot silently return through quantity editing',()=>{
 const run=setup();run("toggleMealQuantity(0,'b','h','eggs')");const before=run("assignedDayNutrition(0,'h').k");assert.equal(run("changeMealEggs(0,'b','h','quantity',4)"),false);near(run("assignedDayNutrition(0,'h').k"),before);
 assert.match(run("uxMealTable(0,'b')"),/Restore eggs/);run("toggleMealQuantity(0,'b','h','eggs')");assert.equal(run("changeMealEggs(0,'b','h','quantity',4)"),true);
});
test('preparation survives cloud hydration without inventing oil or changing nutrition',()=>{
 const run=setup(),before=run("JSON.stringify(meal(state.days[0],'d','h'))");run("changeMealEggs(0,'d','h','eggPreparation','poached');snapshotDraft();ketoMeals={};hydrateDraft()");
 assert.equal(run("ketoConfig(state.days[0],'h','d').eggPreparation"),'poached');assert.equal(run("JSON.stringify(meal(state.days[0],'d','h'))"),before);assert.match(run("uxMealTable(0,'d')"),/value="poached" selected/);assert.match(run("uxMealTable(0,'d')"),/Oil 7 ml/);
 run("ketoMeals[ketoMealKey(0,'h','d')]=ketoMainConfig(0,'h','d','boiledEggMeal')");assert.equal(run("ketoConfig(state.days[0],'h','d').eggPreparation"),'planned');
});
test('day edits create a dated record without changing the template',()=>{
 const run=setup();run("state.view='day';var old=JSON.stringify(ketoMeals[ketoMealKey(0,'h','b')]);changeMealEggs(0,'b','h','quantity',4)");
 assert.equal(run('state.weekKey'),run('mondayOf(dayViewISO())'));assert.equal(run("JSON.stringify(ketoMeals['keto/template/day/0/h/b'])"),run('old'));
 assert.equal(run("ketoConfig(state.days[0],'h','b').quantity"),4);
});
test('frozen portions, skipped meals and non-egg dishes have no editable egg controls',()=>{
 const run=setup();run("state.weekKey='2026-10-12';var ingredients=ketoComponent(state.days[0],'h','d','protein');savedBatches.testbatch={recipe:'E',cookedOn:'2026-10-12',vessel:'pan',tare:0,netWeight:400,createdAt:1,ingredients:ingredients.map(x=>({...x,n:nutrientSnapshot(x)})),servings:[{date:'2026-10-12',meal:'d',person:'h',component:'protein',share:1,grams:400}]}");
 const before=run('JSON.stringify(savedBatches)');assert.equal(run("changeMealEggs(0,'d','h','quantity',3)"),false);assert.doesNotMatch(run("uxMealTable(0,'d')"),/data-egg-step/);assert.equal(run('JSON.stringify(savedBatches)'),before);
 run("state.days[0].skip.b=true");assert.equal(run("editableMealEggs(0,'b','h')"),null);assert.equal(run("editableMealEggs(0,'l','w')"),null);
});
test('invalid counts and preparation values are rejected without state mutation',()=>{
 const run=setup(),before=run('JSON.stringify(ketoMeals)');for(const q of [-1,1.5,7])assert.throws(()=>run(`changeMealEggs(0,'b','h','quantity',${q})`),/portion/);
 assert.throws(()=>run("changeMealEggs(0,'b','h','eggPreparation','invalid')"),/preparation/);assert.equal(run('JSON.stringify(ketoMeals)'),before);
 assert.doesNotThrow(()=>validateRecord('keto/template/day/0/h/b',{protein:'eggs',quantity:2,oil:0,soya:0,eggPreparation:'omelette'}));
});
