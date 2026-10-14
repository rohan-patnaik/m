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
test('breakfast recipes count every ingredient, cooking oil, whey and available carbs from actual profiles',()=>{
 const run=ready(),options=JSON.parse(run('JSON.stringify(ketoBreakfastOptions(0,"h"))'));
 const boiled=options.find(o=>o.id==='boiledEggs'),poach=options.find(o=>o.id==='eggPoach');
 // Three whole eggs use 72 kcal each. The separate sides total 415.3 kcal; poach counts 5 ml oil.
 near(boiled.dishNutrition.k,216);near(boiled.sidesNutrition.k,415.3);near(boiled.nutrition.k,631.3);
 near(poach.dishNutrition.k,256.8135);near(poach.nutrition.k,672.1135);
 for(const o of options){near(o.nutrition.k,o.dishNutrition.k+o.sidesNutrition.k);near(o.nutrition.p,o.dishNutrition.p+o.sidesNutrition.p);near(o.nutrition.a,o.dishNutrition.a+o.sidesNutrition.a);assert.equal(o.config.spinach,0);assert.equal(o.config.cucumber,0);records.validateRecord('keto/template/day/0/h/b',o.config);if(o.id!=='eggAvocado')assert.equal(o.config.avocado,0,'unnamed avocado must not be inserted');}
 near(run("comparisonSum([L('avocado',100)]).a"),1.83);near(run("comparisonSum([L('avocado',100)]).k"),160);
});
test('applying a breakfast replaces the old meal only, preserves Wife and other meals, and round trips',()=>{
 const run=ready();run("ketoMeals[ketoMealKey(0,'h','b')]={...ketoConfig(state.days[0],'h','b'),spinach:200,flax:10,soya:15,milk:100};ketoOptions.carbBudget=100");
 const wife=run("JSON.stringify(state.days.map((_,i)=>assignedDayNutrition(i,'w')))"),later=run("JSON.stringify(['l','d','e'].map(m=>meal(state.days[0],m,'h')))"),days=run('JSON.stringify(state.days)');
 assert.equal(run("applyKetoBreakfast(0,'h','eggAvocado')"),true);assert.equal(run("ketoConfig(state.days[0],'h','b').breakfastRecipe"),'eggAvocado');assert.equal(run("meal(state.days[0],'b','h').some(x=>x.q>0&&['palak','flax','soyN'].includes(x.id))"),false);
 assert.equal(run("JSON.stringify(state.days.map((_,i)=>assignedDayNutrition(i,'w')))"),wife);assert.equal(run("JSON.stringify(['l','d','e'].map(m=>meal(state.days[0],m,'h')))"),later);assert.equal(run('JSON.stringify(state.days)'),days);
 const before=run("JSON.stringify(meal(state.days[0],'b','h'))");run('snapshotDraft();ketoMeals={};hydrateDraft()');assert.equal(run("JSON.stringify(meal(state.days[0],'b','h'))"),before);
 run("updateKetoPortion(ketoMealKey(0,'h','b'),'quantity',2)");assert.equal(run("ketoConfig(state.days[0],'h','b').breakfastRecipe"),undefined);
});
test('breakfast choices enforce vegetarian assignment, whole-day carb budget, weekly chicken and whey caps',()=>{
 const run=ready();assert.deepEqual(JSON.parse(run("JSON.stringify(ketoBreakfastOptions(0,'w').map(x=>x.id))")),['paneerBhurji','dahiBowl']);assert.throws(()=>run("applyKetoBreakfast(0,'w','eggAvocado')"),/unavailable/);
 run("ketoOptions.carbBudget=15");assert.throws(()=>run("applyKetoBreakfast(0,'h','omelette')"),/budget/);run('ketoOptions.carbBudget=50');
 run("ketoMeals[ketoMealKey(0,'h','l')]={...ketoConfig(state.days[0],'h','l'),whey:2};ketoMeals[ketoMealKey(0,'h','d')]={...ketoConfig(state.days[0],'h','d'),whey:.5}");assert.throws(()=>run("applyKetoBreakfast(0,'h','omelette')"),/3 whey/);
 run("ketoMeals[ketoMealKey(0,'h','l')].whey=0;ketoMeals[ketoMealKey(0,'h','d')].whey=0;state.days.forEach((d,i)=>ketoMeals[ketoMealKey(i,'h','d')]={...ketoConfig(d,'h','d',i),protein:[1,5].includes(i)?'chicken':'eggs',quantity:[1,5].includes(i)?250:2})");assert.equal(run("ketoBreakfastOptions(0,'h').find(x=>x.id==='chickenBowl').reason.includes('1–2')"),false);
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

test('Edit sabzi stages palak-corn in the existing shared record and validates without mutating the household',()=>{
 const run=ready();run("sharedRecipes[sharedKey(0)]={recipe:'K2',w:'S12'};ketoOptions.carbBudget=100");
 const before=run('JSON.stringify({days:state.days,sharedRecipes,ketoMeals})');
 const next=JSON.parse(run("JSON.stringify(prepareEditedSabzi(0,'K5'))"));
 assert.equal(next.key,'keto/shared/template/day/0');assert.deepEqual(next.value,{recipe:'K5',w:'S12'});
 assert.equal(run("prepareEditedSabzi(0,'K2')"),null);
 assert.throws(()=>run("prepareEditedSabzi(0,'missing')"),/recipe/);
 run("prepareKetoBreakfasts(0,{h:'boiledEggs'},state.days[0],prepareEditedSabzi(0,'K5').value)");
 assert.equal(run('JSON.stringify({days:state.days,sharedRecipes,ketoMeals})'),before);
 run("ketoOptions.carbBudget=1");assert.throws(()=>run("prepareKetoBreakfasts(0,{h:'boiledEggs'},state.days[0],{recipe:'K5'})"),/budget/);
 assert.equal(run('JSON.stringify({days:state.days,sharedRecipes,ketoMeals})'),before);
 const raw=JSON.parse(run("JSON.stringify(ketoVegetableBase('K5'))"));
 assert.equal(raw.find(x=>x.id==='palak').q,500);assert.equal(raw.find(x=>x.id==='corn').q,100);
});

test('No cooked breakfast previews the complete cooked choice and preserves state',()=>{
 const run=ready();run("state.days[0].readyB={w:true,h:true}");
 const before=run('JSON.stringify({state,ketoMeals,sharedRecipes})');
 const options=JSON.parse(run("JSON.stringify(ketoBreakfastOptions(0,'h'))"));
 near(options.find(x=>x.id==='boiledEggs').nutrition.k,631.3);
 near(options.find(x=>x.id==='omelette').nutrition.k,638.7535);
 const staged=JSON.parse(run("JSON.stringify(prepareKetoBreakfasts(0,{h:'boiledEggs'},{...state.days[0],readyB:{w:true,h:false}}))"));
 assert.equal(Object.values(staged)[0].quantity,3);assert.equal(run('JSON.stringify({state,ketoMeals,sharedRecipes})'),before);
});
test('explicit breakfast sides preview, stage, persist and shop exactly once',()=>{
 const run=ready();run("applyKetoBreakfast(0,'h','eggPoach');ketoMeals[ketoMealKey(0,'h','b')].avocado=50");
 const before=run('JSON.stringify({state,ketoMeals,sharedRecipes})');
 const preview=JSON.parse(run("JSON.stringify(ketoBreakfastOptions(0,'h',state.days[0],{avocado:0}).find(x=>x.id==='eggPoach'))"));
 near(preview.nutrition.k,672.1135);near(preview.sidesNutrition.k,415.3);
 const staged=JSON.parse(run("JSON.stringify(prepareKetoBreakfasts(0,{},state.days[0],undefined,{h:{avocado:0}}))"));
 assert.equal(Object.values(staged)[0].avocado,0);assert.equal(run('JSON.stringify({state,ketoMeals,sharedRecipes})'),before);
 run("Object.assign(ketoMeals,prepareKetoBreakfasts(0,{},state.days[0],undefined,{h:{avocado:0}}))");
 assert.equal(run("meal(state.days[0],'b','h').some(x=>x.id==='avocado'&&x.q>0)"),false);
 assert.equal(run("householdShopping().market.some(x=>x.id==='avocado'&&x.needed>0)"),false);
 assert.equal(run("ketoConfig(state.days[0],'h','b').breakfastRecipe"),'eggPoach');
 assert.throws(()=>run("prepareKetoBreakfasts(0,{},state.days[0],undefined,{h:{whey:4}})"),/whey/);
 assert.throws(()=>run("prepareKetoBreakfasts(0,{},state.days[0],undefined,{h:{avocado:NaN}})"),/Invalid breakfast side/);
});
test('tentative breakfast whey and no-cook side edits do not count excluded food or alter dormant portions',()=>{
 const run=ready();run("ketoMeals[ketoMealKey(0,'h','b')].avocado=160;state.days[0].readyB={h:true}");
 const before=run('JSON.stringify({state,ketoMeals})');
 const o=JSON.parse(run("JSON.stringify(ketoBreakfastOptions(0,'h',{...state.days[0],wheyH:false}).find(x=>x.id==='boiledEggs'))"));near(o.nutrition.k,495.3);
 const c=JSON.parse(run("JSON.stringify(prepareKetoBreakfasts(0,{},state.days[0],undefined,{h:{almonds:10}}))"));
 assert.equal(Object.values(c)[0].avocado,160);assert.equal(Object.values(c)[0].almonds,10);assert.equal(run('JSON.stringify({state,ketoMeals})'),before);
});
test('breakfast suggestions never top up calories or fibre with unchosen avocado',()=>{
 const run=ready();run("ketoOptions.carbBudget=100");
 for(const i of [0,1,2,4,5])assert.equal(run(`recommendedKetoBreakfast(${i}).avocado`),0);
});

test('custom and ready previews use explicit sides and a staged recipe without changing stored data',()=>{
 const run=ready();run("state.days[0].s='S1';sharedRecipes[sharedKey(0)]={recipe:'K2'};delete ketoMeals[ketoMealKey(0,'h','b')].breakfastRecipe;ketoOptions.carbBudget=100");
 const before=run('JSON.stringify({state,ketoMeals,sharedRecipes})');
 const preview=JSON.parse(run("JSON.stringify(ketoBreakfastPreview(0,'h',state.days[0],{avocado:0,almonds:10},{recipe:'K5'}))"));
 const options=JSON.parse(run("JSON.stringify(ketoBreakfastOptions(0,'h',state.days[0],{almonds:10},{recipe:'K5'}))"));
 assert.notEqual(options[0].dayNutrition.k,JSON.parse(run("JSON.stringify(ketoBreakfastOptions(0,'h',state.days[0],{almonds:10},{recipe:'K2'}))"))[0].dayNutrition.k);
 const readyPreview=JSON.parse(run("JSON.stringify(ketoBreakfastPreview(0,'h',{...state.days[0],readyB:{h:true}},{almonds:10,avocado:160},{recipe:'K5'}))"));
 near(readyPreview.nutrition.k,357.4);assert.ok(preview.dayNutrition.k>preview.nutrition.k);
 assert.equal(run('JSON.stringify({state,ketoMeals,sharedRecipes})'),before);
});
