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
const near=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<1e-8,`${label}: ${actual} != ${expected}`);

test('food and meal carbohydrate attribution conserves every daily nutrient in all diet assignments without changing data',()=>{
 const run=app(),numbers=JSON.parse(run('JSON.stringify(COMPARISON_NUMBERS)')),flags=JSON.parse(run('JSON.stringify(COMPARISON_FLAGS)'));
 for(const w of ['balanced','keto'])for(const h of ['balanced','keto']){
  run(`householdDiets={w:'${w}',h:'${h}'};state.days[2].skip.l=true;state.days[6].off=true`);
  const before=run('JSON.stringify({state,ketoMeals,savedBatches,sharedRecipes,cloudDraft})');
  for(let i=0;i<7;i++)for(const p of ['w','h']){
   const d=JSON.parse(run(`JSON.stringify(dayCarbBreakdown(${i},'${p}'))`));
   for(const field of numbers){
    near(d.foods.reduce((n,r)=>n+r.nutrition[field],0),d.totals[field],`foods ${i}/${p}/${field}`);
    near(d.meals.reduce((n,r)=>n+r.nutrition[field],0),d.totals[field],`meals ${i}/${p}/${field}`);
    for(const row of d.foods)near(Object.values(row.meals).reduce((n,r)=>n+r[field],0),row.nutrition[field],`food meals ${row.id}/${field}`);
   }
   for(const flag of flags)assert.equal(d.foods.some(r=>r.nutrition[flag]),d.totals[flag]);
   assert.ok(d.foods.every(r=>r.quantity>0));
  }
  assert.equal(run('JSON.stringify({state,ketoMeals,savedBatches,sharedRecipes,cloudDraft})'),before);
 }
});

test('packet and plant carb conventions, milk density and unknown spice bounds remain distinguishable',()=>{
 const run=app();run("meal=(_d,m)=>m==='b'?[L('milk',100),L('almonds',100),L('paneerMM',100),L('spice',2),L('oil',10)]:[]");
 const d=JSON.parse(run("JSON.stringify(dayCarbBreakdown(0,'h'))")),food=id=>d.foods.find(r=>r.id===id);
 near(food('milk').nutrition.a,4.738,'milk density');
 near(food('almonds').nutrition.a,9.05,'USDA fibre subtracted once');
 near(food('paneerMM').nutrition.a,5.1,'packet full carbs');
 assert.equal(food('oil').nutrition.carbUnknown,false);near(food('oil').nutrition.a,0,'known zero oil');
 assert.equal(food('spice').nutrition.carbUnknown,true);near(food('spice').nutrition.aHi,2,'conservative spice bound');
 assert.deepEqual(food('spice').reasons,['missing-carbohydrate-profile']);
 assert.equal(d.totals.carbUnknown,true);
});

test('frozen nutrients keep their values and source while legacy batches and manual labels stay unknown',()=>{
 const run=app();run("var frozen={...L('paneerMM',100),n:nutrientSnapshot(L('paneerMM',100))};var legacy={id:'paneerMM',q:25,n:{k:70,p:4,fb:0}};COMPARE_NUTRIENTS.paneerMM.c=99;state.labels.curd=[61,3.5];meal=(_d,m)=>m==='l'?[frozen,legacy,L('paneerMM',100),L('curd',100)]:[]");
 const d=JSON.parse(run("JSON.stringify(dayCarbBreakdown(0,'h'))")),frozen=d.foods.find(r=>r.kind==='frozen'),legacy=d.foods.find(r=>r.kind==='legacy'),live=d.foods.find(r=>r.id==='paneerMM'&&r.kind==='live'),override=d.foods.find(r=>r.kind==='override');
 near(frozen.nutrition.a,5.1,'saved paneer');near(live.nutrition.a,99,'current paneer');
 assert.equal(frozen.nutrition.carbUnknown,false);assert.match(frozen.source,/Milky Mist/);
 assert.deepEqual(legacy.reasons,['legacy-batch-missing-carbohydrates']);assert.equal(legacy.nutrition.carbUnknown,true);
 assert.deepEqual(override.reasons,['manual-label-missing-carbohydrates']);assert.equal(override.nutrition.carbUnknown,true);
 run('frozen.n.carbUnknown=true');assert.deepEqual(JSON.parse(run("JSON.stringify(dayCarbBreakdown(0,'h').foods.find(r=>r.kind==='frozen').reasons)")),['frozen-carbohydrate-data-incomplete']);
});
