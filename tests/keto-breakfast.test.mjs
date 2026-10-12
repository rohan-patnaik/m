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
function ready(){const run=app();run("householdDiets={w:'balanced',h:'keto'};state.days.forEach(d=>{d.off=false;d.skip={b:false,l:false,d:false};d.wheyH=true});ketoMeals[ketoMealKey(0,'h','b')]={...ketoConfig(state.days[0],'h','b'),paneerType:'paneerMM',curdType:'curd'}");return run;}
test('breakfast recipes count every ingredient, cooking oil, whey and available carbs from actual profiles',()=>{
 const run=ready(),options=JSON.parse(run('JSON.stringify(ketoBreakfastOptions(0,"h"))'));
 const wanted={omelette:[638.7535,62.8005,12.4211],eggAvocado:[665.2535,62.218,8.1236],paneerBhurji:[656.4135,56.0475,15.6655],chickenBowl:[685.6635,73.4975,11.18],dahiBowl:[591.6,55.276,13.127],boiledEggs:[711.3,56.9375,8.3575],eggPoach:[752.1135,56.9375,8.3575]};
 for(const o of options){const expected=wanted[o.id];near(o.nutrition.k,expected[0]);near(o.nutrition.p,expected[1]);near(o.nutrition.a,expected[2]);assert.equal(o.config.spinach,0);assert.equal(o.config.cucumber,0);records.validateRecord('keto/template/day/0/h/b',o.config);}
 near(run("comparisonSum([L('avocado',100)]).a"),1.83);near(run("comparisonSum([L('avocado',100)]).k"),160);
});
test('applying a breakfast replaces the old meal only, preserves Wife and other meals, and round trips',()=>{
 const run=ready();run("ketoMeals[ketoMealKey(0,'h','b')]={...ketoConfig(state.days[0],'h','b'),spinach:200,flax:10,soya:15,milk:100}");
 const wife=run("JSON.stringify(state.days.map((_,i)=>assignedDayNutrition(i,'w')))"),later=run("JSON.stringify(['l','d','e'].map(m=>meal(state.days[0],m,'h')))"),days=run('JSON.stringify(state.days)');
 assert.equal(run("applyKetoBreakfast(0,'h','eggAvocado')"),true);assert.equal(run("ketoConfig(state.days[0],'h','b').breakfastRecipe"),'eggAvocado');assert.equal(run("meal(state.days[0],'b','h').some(x=>x.q>0&&['palak','flax','soyN','milk'].includes(x.id))"),false);
 assert.equal(run("JSON.stringify(state.days.map((_,i)=>assignedDayNutrition(i,'w')))"),wife);assert.equal(run("JSON.stringify(['l','d','e'].map(m=>meal(state.days[0],m,'h')))"),later);assert.equal(run('JSON.stringify(state.days)'),days);
 const before=run("JSON.stringify(meal(state.days[0],'b','h'))");run('snapshotDraft();ketoMeals={};hydrateDraft()');assert.equal(run("JSON.stringify(meal(state.days[0],'b','h'))"),before);
 run("updateKetoPortion(ketoMealKey(0,'h','b'),'quantity',2)");assert.equal(run("ketoConfig(state.days[0],'h','b').breakfastRecipe"),undefined);
});
test('breakfast choices enforce vegetarian assignment, whole-day carb budget, weekly chicken and whey caps',()=>{
 const run=ready();assert.deepEqual(JSON.parse(run("JSON.stringify(ketoBreakfastOptions(0,'w').map(x=>x.id))")),['paneerBhurji','dahiBowl']);assert.throws(()=>run("applyKetoBreakfast(0,'w','eggAvocado')"),/unavailable/);
 run("ketoOptions.carbBudget=15");assert.throws(()=>run("applyKetoBreakfast(0,'h','omelette')"),/budget/);run('ketoOptions.carbBudget=50');
 run("ketoMeals[ketoMealKey(0,'h','l')]={...ketoConfig(state.days[0],'h','l'),whey:2};ketoMeals[ketoMealKey(0,'h','d')]={...ketoConfig(state.days[0],'h','d'),whey:.5}");assert.throws(()=>run("applyKetoBreakfast(0,'h','omelette')"),/3 whey/);
 run("ketoMeals[ketoMealKey(0,'h','l')].whey=0;ketoMeals[ketoMealKey(0,'h','d')].whey=0;state.days.forEach((d,i)=>ketoMeals[ketoMealKey(i,'h','d')]={...ketoConfig(d,'h','d',i),protein:[1,5].includes(i)?'chicken':'eggs',quantity:[1,5].includes(i)?250:2})");assert.throws(()=>run("applyKetoBreakfast(0,'h','chickenBowl')"),/1–2/);
 run("ketoMeals[ketoMealKey(1,'h','d')].protein='eggs';ketoMeals[ketoMealKey(1,'h','d')].quantity=2");assert.equal(run("applyKetoBreakfast(0,'h','chickenBowl')"),true);assert.equal(run("householdShopping().supermarket.find(x=>x.id==='chicken').needed"),400);assert.equal(run("householdShopping().supermarket.find(x=>x.id==='chicken').largeLeftover"),100);
});
test('avocado shopping uses edible flesh and yield changes cannot change a meal',()=>{
 const run=ready();run("applyKetoBreakfast(0,'h','eggAvocado')");const before=run("JSON.stringify(assignedDayNutrition(0,'h'))");assert.equal(run("householdShopping().market.find(x=>x.id==='avocado').needed"),100);
 run("updateProduceYield('avocado',50)");assert.equal(run("householdShopping().market.find(x=>x.id==='avocado').buy"),200);assert.equal(run("JSON.stringify(assignedDayNutrition(0,'h'))"),before);
 records.validateRecord('keto/template/day/0/h/b',{oil:5,protein:'eggs',quantity:1,soya:0,avocado:100,breakfastRecipe:'eggAvocado'});assert.throws(()=>records.validateRecord('keto/template/day/0/w/b',{oil:5,protein:'paneer',quantity:1,soya:0,breakfastRecipe:'eggAvocado'}),/breakfast/);
});

test('Edit breakfast validation uses tentative flags without touching the draft on failure',()=>{
 const run=ready(),before=run('JSON.stringify({days:state.days,ketoMeals,cloudDraft})');
 const cfg=JSON.parse(run("JSON.stringify(prepareKetoBreakfasts(0,{h:'boiledEggs'}))"));assert.equal(Object.values(cfg)[0].quantity,3);assert.equal(run('JSON.stringify({days:state.days,ketoMeals,cloudDraft})'),before);
 run("ketoMeals[ketoMealKey(0,'h','l')]={...ketoConfig(state.days[0],'h','l'),whey:2.5}");assert.throws(()=>run("prepareKetoBreakfasts(0,{h:'boiledEggs'},{...state.days[0],wheyH:true})"),/3 whey/);run('ketoOptions.carbBudget=100');const without=JSON.parse(run("JSON.stringify(prepareKetoBreakfasts(0,{h:'boiledEggs'},{...state.days[0],wheyH:false}))"));assert.equal(Object.values(without)[0].quantity,3);
});

test('a selected breakfast shows the saved portions and their actual macros',()=>{
 const run=ready();run("ketoMeals[ketoMealKey(0,'h','b')]={...ketoBreakfastOptions(0,'h').find(x=>x.id==='boiledEggs').config,avocado:160}");
 const offered=JSON.parse(run("JSON.stringify(ketoBreakfastOptions(0,'h').find(x=>x.id==='boiledEggs'))"));near(offered.nutrition.k,run("comparisonSum(meal(state.days[0],'b','h')).k"));assert.equal(offered.config.avocado,160);
});

test('three-egg method comparison keeps identical sides and differs only by measured oil',()=>{
 const run=ready();run("ketoMeals[ketoMealKey(0,'h','b')]={...ketoBreakfastOptions(0,'h').find(x=>x.id==='boiledEggs').config,avocado:160}");
 const choices=JSON.parse(run("JSON.stringify(ketoBreakfastOptions(0,'h').filter(x=>['boiledEggs','eggPoach'].includes(x.id)))")),b=choices.find(x=>x.id==='boiledEggs'),p=choices.find(x=>x.id==='eggPoach');
 near(b.nutrition.k,887.3);near(p.nutrition.k,928.1135);near(p.nutrition.k-b.nutrition.k,40.8135);for(const k of ['p','a','aHi','c','fb'])near(p.nutrition[k],b.nutrition[k]);const strip=({oil,breakfastRecipe,...x})=>x;assert.deepEqual(strip(p.config),strip(b.config));
 const before=JSON.parse(run('JSON.stringify(ledger())'));assert.equal(run("applyKetoBreakfast(0,'h','eggPoach')"),true);const after=JSON.parse(run('JSON.stringify(ledger())'));for(const k of Object.keys(before).filter(k=>k!=='oil'))near(after[k],before[k]);near(after.oil-before.oil,5);
 const back=JSON.parse(run("JSON.stringify(prepareKetoBreakfasts(0,{h:'boiledEggs'}))"));assert.equal(Object.values(back)[0].avocado,160);assert.equal(Object.values(back)[0].oil,0);
});
