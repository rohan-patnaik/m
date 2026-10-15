import test from 'node:test';import assert from 'node:assert/strict';import {app} from './helpers/app.mjs';import {validateRecord} from '../records.js';import {validateBatch,claimsFor} from '../batch-math.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} vs ${b}`);
test('approved rotation contains one vegetarian shared recipe and a bean alternative to dal',()=>{
 const run=app(true);assert.equal(run("JSON.stringify(SHARED_MENU.map(x=>x.recipe))"),'["K4","S13","S16","S14","S17","K1","S15"]');assert.equal(run('SHARED_MENU[5].dal'),'rajma');
 for(let i=0;i<7;i++){
  run(`sharedRecipes[sharedKey(${i})]={recipe:SHARED_MENU[${i}].recipe};state.days[${i}].dal=SHARED_MENU[${i}].dal`);
  assert.equal(run(`personRecipe(state.days[${i}],'w')===personRecipe(state.days[${i}],'h')`),true);
  const lines=JSON.parse(run(`JSON.stringify(personSabzi(state.days[${i}],'w'))`));assert.ok(lines.every(x=>!['egg','eggWhite','chicken','tofu','potato'].includes(x.id)));
  validateRecord(`keto/shared/template/day/${i}`,{recipe:run(`SHARED_MENU[${i}].recipe`)});
 }
 assert.ok(run("personSabzi(state.days[1],'h').some(x=>x.id==='carrot')"));assert.equal(run("personSabzi(state.days[2],'h').some(x=>x.id.startsWith('paneer'))"),false);assert.ok(run("personSabzi(state.days[6],'h').some(x=>x.id==='capsicum')"));
});
test('bean pulse swaps count dry beans, gravy and oil once in meal, shopping, prep and exclusions',()=>{
 const run=app(true);run("state.weekKey=null;state.days[5].off=false;state.days[5].skip={};householdDiets={w:'balanced',h:'keto'}");
 for(const id of ['rajma','chickpea','kalachana']){
  run(`state.days[5].dal='${id}';mealExclusions={}`);
  const lines=JSON.parse(run("JSON.stringify(includedComponent(state.days[5],'l','w','dal'))"));near(lines.find(x=>x.id===id).q,35);near(lines.find(x=>x.id==='onion').q,100*7/30);assert.ok(lines.find(x=>x.id==='oil').q>0);
  assert.equal(run("includedComponent(state.days[5],'l','h','dal').length"),0);
  assert.ok(run('cookCard(5)').includes(id==='chickpea'?'Chhole':id==='kalachana'?'Kala chana':'Rajma'));
  const before=run(`ledger()['${id}']`);run("toggleMealQuantity(5,'l','w','component:dal')");near(before-run(`ledger()['${id}']||0`),35);
  run('snapshotDraft()');validateRecord('template/day/5',JSON.parse(run("JSON.stringify(cloudDraft['template/day/5'])")));
 }
});
test('new shared paneer batch freezes vegetables without removing husband’s separate chicken',()=>{
 const run=app(true);run("state.weekKey='2099-01-05';state.days[1].off=false;state.days[1].skip={};sharedRecipes[sharedKey(1)]={recipe:'S13'};ketoMeals[ketoMealKey(1,'h','d')]={...ketoMainConfig(1,'h','d','simpleChicken'),whey:0};batchDraft={recipe:'S13',cookedOn:'2099-01-06',vessel:'kadhai',includeVessel:false,gross:800,oil:null,roles:{'2099-01-06/l':'sabzi','2099-01-06/d':'sabzi'},selected:{'2099-01-06/l/w':true,'2099-01-06/l/h':true,'2099-01-06/d/w':true,'2099-01-06/d/h':true}}");
 const before=JSON.parse(run('JSON.stringify(ledger())')),batch=JSON.parse(run('JSON.stringify(buildBatchPreview(true))'));validateBatch(batch);assert.equal(claimsFor(batch,batch.servings.find(s=>s.meal==='d'&&s.person==='h')).length,1);
 run(`savedBatches.fixture=${JSON.stringify(batch)}`);const after=JSON.parse(run('JSON.stringify(ledger())'));for(const id of Object.keys(before))near(after[id]||0,before[id]);assert.equal(run("meal(state.days[1],'d','h').find(x=>x.id==='chicken').q"),200);
});
test('cached suggestions are pure and actual ledger agrees with strict-carb checks',()=>{
 const run=app(true);run("state.weekKey=null;householdDiets={w:'balanced',h:'keto'};state.days[1].off=false;state.days[1].skip={};sharedRecipes[sharedKey(1)]={recipe:'S13'};ketoOptions={...ketoOptions,targetK:1800,pMin:150,pMax:165,carbBudget:30};ketoMeals[ketoMealKey(1,'h','e')]={almonds:10,walnuts:10,cashews:0};for(const m of ['l','d'])ketoMeals[ketoMealKey(1,'h',m)]={...ketoConfig(state.days[1],'h',m,1),sabziFraction:.25};");
 const before=run('JSON.stringify({state,ketoMeals,sharedRecipes})'),r=JSON.parse(run('JSON.stringify(ketoSuggestedDay(1))'));assert.equal(run('JSON.stringify({state,ketoMeals,sharedRecipes})'),before);
 run(`for(const [m,c]of Object.entries(${JSON.stringify(r.configs)}))ketoMeals[ketoMealKey(1,'h',m)]=c`);for(const k of ['k','p','aHi'])near(run(`assignedDayNutrition(1,'h').${k}`),r.nutrition[k]);if(r.compatible){assert.ok(r.nutrition.p>=150&&r.nutrition.p<=165&&r.nutrition.k<=1800&&r.nutrition.aHi<=30);}
});
test('version 16 gate prevents old readers and writers from corrupting new menu data',async()=>{
 const {read,commit}=await import('../convex/household.js');const rows=[{key:'setting/nutritionVersion',value:16,revision:1}];let writes=0;const query=()=>({collect:async()=>rows,withIndex:()=>({unique:async()=>rows[0]})}),ctx={db:{query,patch:()=>writes++,insert:()=>writes++}};
 await assert.rejects(read._handler(ctx,{formatVersion:15}),/Reload/);assert.deepEqual(await read._handler(ctx,{formatVersion:16}),rows);
 await assert.rejects(commit._handler(ctx,{changes:[],formatVersion:15}),/Reload/);assert.equal(writes,0);
});
