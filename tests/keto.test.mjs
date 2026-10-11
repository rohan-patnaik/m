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

function app(){
 const root={innerHTML:'',querySelector(){return null;},querySelectorAll(){return[];}};
 const shopping={innerHTML:'',hidden:true},regular={hidden:false};
 const document={addEventListener(){},querySelector(sel){return sel==='#keto'?root:sel==='#shopping'?shopping:sel==='#regularPlan'?regular:null;},querySelectorAll(){return[];}};
 const ctx=vm.createContext({document,window:{addEventListener(){}},BatchMath:math,WeighMath:weighMath,MealCloud:records,crypto:webcrypto,structuredClone,console,TextEncoder,setInterval(){},navigator:{onLine:true}});
  vm.runInContext(browserBundle,ctx);
 ctx.MealCloud=ctx.window.MealCloud;
 for(const file of ['batch-runtime.js','weigh-runtime.js','cloud-runtime.js','nutrition-runtime.js','household-runtime.js','shopping-runtime.js','keto-runtime.js'])vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),ctx);
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 vm.runInContext(script.slice(0,script.indexOf("document.addEventListener('input'")),ctx);
 vm.runInContext("state.weekKey='2026-10-05';templateDays=structuredClone(state.days);templateUtensils=structuredClone(state.utDay);cloudReady=true;householdDiets={w:'balanced',h:'balanced'};balancedCurdType='curd';render=renderKeto;",ctx);
 return {root,shopping,regular,run:expression=>vm.runInContext(expression,ctx)};
}
test('keto proposals respect off meals and separate vegetarian/egg defaults',()=>{
 const {run}=app();
 assert.equal(run("ketoSuggestion(state.days[0],'w','b').name"),'Ready portions + high-protein paneer');
 assert.equal(run("ketoSuggestion({...state.days[0],eggH:true},'h','b').name"),'Ready portions + high-protein paneer');
 assert.equal(run("ketoSuggestion({...state.days[0],eggH:false},'h','b').name"),'Ready portions + high-protein paneer');
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
  assert.ok(Math.abs(t.balanced.k-t.keto.k)>100);
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
 run("batchDraft={recipe:'Q',cookedOn:'2026-10-05',vessel:'pan',includeVessel:false,gross:60,oil:null,roles:{'2026-10-05/d':'protein'},selected:{'2026-10-05/d/h':true}};ketoMeals[ketoMealKey(0,'h','d')]={...ketoConfig(state.days[0],'h','d'),protein:'paneer',quantity:75,oil:0};");
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
 assert.match(shopping.innerHTML,/Farmers’ market/);assert.match(shopping.innerHTML,/Supermarket \/ DMart \/ Walmart/);assert.match(shopping.innerHTML,/Wife: <b>Balanced/);assert.match(shopping.innerHTML,/Husband: <b>Strict keto/);
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
