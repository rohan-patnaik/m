import test from 'node:test';
import assert from 'node:assert/strict';
import {app} from './helpers/app.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} vs ${b}`);
function setup(){const run=app(true);run(`state.view='week';householdDiets={w:'balanced',h:'keto'};state.days[0].off=false;state.days[0].skip={};state.days[0].wheyH=true;state.days[0].readyB={h:true};ketoOptions={...ketoOptions,targetK:1800,pMin:150,pMax:165,carbBudget:50};ketoMeals[ketoMealKey(0,'h','e')]={almonds:10,walnuts:10,cashews:0};for(const m of ['b','l','d'])ketoMeals[ketoMealKey(0,'h',m)]={...ketoConfig(state.days[0],'h',m,0),protein:'chicken',quantity:m==='b'?0:200,soya:0,oil:5,whey:m==='b'?3:0,flax:0,almonds:0,walnuts:0,cashews:0,curd:0,spinach:0,eggWhites:0,avocado:0,sabziFraction:m==='b'?0:.3,...(m==='b'?{}:{mealRecipe:'custom'})};`);return run;}
const result=run=>JSON.parse(run('JSON.stringify(ketoWheySuggestion(0))'));
const snap=run=>run('JSON.stringify({state,ketoMeals,mealExclusions,cloudDraft,savedBatches,dailyWeights})');
test('half-scoop recommendation counts food first and all meal whey without mutating the plan',()=>{
 const run=setup(),before=snap(run),r=result(run);assert.equal(snap(run),before);
 near(r.foodProtein+r.scoops*29,r.nutrition.p);near(r.label.k,136);near(r.label.p,29);near(r.label.aHi,2.8);near(r.label.f,1);
 assert.equal(r.scoops*2,Math.round(r.scoops*2));assert.ok(r.nutrition.p>=150&&r.nutrition.p<=165);assert.ok(r.nutrition.k<=1800);assert.ok(r.nutrition.aHi<=50);
 const totals=Object.values(r.configs).reduce((n,c)=>n+c.whey,0);near(totals,r.scoops);assert.ok(r.scoops<r.currentScoops);
 run("ketoMeals[ketoMealKey(0,'h','l')].quantity=300;ketoMeals[ketoMealKey(0,'h','d')].quantity=300");const more=result(run);assert.ok(more.scoops<r.scoops);
 run("ketoMeals[ketoMealKey(0,'h','l')].quantity=350;ketoMeals[ketoMealKey(0,'h','d')].quantity=350");assert.equal(result(run).scoops,0);
});
test('saved label overrides change scoop arithmetic and incompatible energy/carbs never get hidden',()=>{
 const run=setup(),original=result(run);run("state.labels.whey=[150,20,0];ketoOptions.carbBudget=100");const changed=result(run);assert.equal(changed.label.p,20);assert.equal(changed.label.k,150);near(changed.foodProtein+changed.scoops*20,changed.nutrition.p);assert.notEqual(changed.nutrition.p,original.nutrition.p);assert.equal(changed.compatible,false);assert.ok(changed.nutrition.aHi<=100);
 run("ketoOptions.carbBudget=50;ketoMeals[ketoMealKey(0,'h','l')].oil=50;ketoMeals[ketoMealKey(0,'h','d')].oil=50;ketoMeals[ketoMealKey(0,'h','d')].avocado=500");const high=result(run);assert.equal(high.compatible,false);assert.equal(high.scoops,0);assert.match(high.issues.join(' '),/exceeds 1800/);
 run('ketoOptions.carbBudget=5');assert.match(result(run).issues.join(' '),/carbs exceed/);
});
test('skipped food lowers counted protein, skipped whey is neither restored nor moved silently',()=>{
 const run=setup(),before=result(run);run("toggleMealQuantity(0,'l','h','food:chicken')");const skipped=result(run);assert.ok(skipped.foodProtein<before.foodProtein);assert.ok(skipped.scoops>=before.scoops);const snapshot=snap(run);result(run);assert.equal(snap(run),snapshot);
 run("toggleMealQuantity(0,'b','h','food:whey')");const r=result(run);assert.equal(r.configs.b.whey,3);assert.ok(r.configs.l.whey+r.configs.d.whey>0);assert.equal(run("mealQuantityGroups(state.days[0],'b','h').find(g=>g.key==='food:whey').excluded"),true);run(`withKetoDayConfigs(0,${JSON.stringify(r.configs)},()=>{snapshotDraft();MealCloud.validateKetoWheyTotals(Object.entries(cloudDraft).map(([key,value])=>({key,value})))})`);
});
test('whole-food suggestions keep breakfast, wife, vegetables, nuts and weighed/prepared history untouched',()=>{
 const run=setup(),before=snap(run),r=JSON.parse(run('JSON.stringify(ketoSuggestedDay(0))'));assert.equal(snap(run),before);assert.equal(r.blocked,undefined);
 const old=JSON.parse(run("JSON.stringify(ketoConfig(state.days[0],'h','b',0))"));const {whey,...food}=r.configs.b;delete old.whey;assert.deepEqual(food,old);
 assert.ok(r.scoops<=1.5);assert.equal(r.configs.l.sabziFraction,.3);assert.equal(r.configs.d.sabziFraction,.3);
 run("toggleMealQuantity(0,'l','h','food:chicken')");assert.equal(run('ketoSuggestedDay(0).blocked'),true);
 run("mealExclusions={};state.weekKey='2026-10-05'");assert.equal(run('ketoSuggestedDay(0).blocked'),true);
 run("state.weekKey=null;globalThis.baselineWeigh=()=>({gross:700})");assert.equal(run('ketoSuggestedDay(0).blocked'),true);
});
test('a frozen meal contributes its actual snapshot and cannot receive a whey edit',()=>{
 const run=setup();run("state.weekKey='2099-01-05';savedBatches.fixture={recipe:'C',cookedOn:'2099-01-05',vessel:'pan',tare:0,netWeight:250,createdAt:1,ingredients:[{id:'chicken',q:200,n:{k:240,p:45,fb:0}}],servings:[{date:'2099-01-05',meal:'l',person:'h',component:'protein',share:1,grams:250}]}");
 const before=snap(run),r=result(run);assert.equal(snap(run),before);assert.equal(r.configs.l.whey,0);assert.equal(run('ketoSuggestedDay(0).blocked'),true);
});
test('balanced whey is staged and manual whey editing opts out of automatic recalculation',()=>{
 const run=setup();run(`snapshotDraft();var drafts=Object.fromEntries(['b','l','d'].map(m=>['h/'+m,structuredClone(ketoConfig(state.days[0],'h',m,0))]));mealEditor={i:0,m:'l',p:'h',day:structuredClone(state.days[0]),drafts,original:JSON.stringify([state.days[0],drafts]),scope:null,nutritionRevision:0,added:{},page:0};`);const before=snap(run);
 run('mealEditorBalanceWhey()');assert.equal(run('mealEditor.autoWhey'),true);assert.equal(snap(run),before);
 const q=run("mealEditor.drafts['h/b'].whey+mealEditor.drafts['h/l'].whey+mealEditor.drafts['h/d'].whey");run("mealEditorSet('quantity',300)");assert.ok(run("mealEditor.drafts['h/b'].whey+mealEditor.drafts['h/l'].whey+mealEditor.drafts['h/d'].whey")<q);
 run("mealEditorSet('whey',.5)");assert.equal(run('mealEditor.autoWhey'),false);run("mealEditorSet('quantity',250)");assert.equal(run("mealEditor.drafts['h/l'].whey"),.5);
 run("deferredCloud=[{key:'setting/labels',revision:1,value:{}}]");assert.throws(()=>run('commitMealEditor()'),/household changed/);assert.equal(snap(run),before);
});
test('suggestion transaction guard rejects a changed household before any writes',async()=>{
 const {commit}=await import('../convex/household.js');let writes=0;const ctx={db:{query:()=>({collect:async()=>[{key:'other',revision:2}]}),patch:()=>writes++,insert:()=>writes++}};
 await assert.rejects(commit._handler(ctx,{changes:[],formatVersion:15,expectedHouseholdRevision:1}),/household changed/);assert.equal(writes,0);
});

test('whey cap respects an exact skipped-food signature and rejects stale exclusions',async()=>{
 const {validateKetoWheyTotals}=await import('../records.js');const base='keto/template/day/0/h/',b={protein:'eggs',quantity:3,whey:3,soya:0,oil:0,breakfastRecipe:'boiledEggs'},signature=JSON.stringify({diet:'keto',recipe:'boiledEggs',lines:[{id:'whey',q:3}]});
 const rows=[{key:base+'b',value:b},{key:base+'l',value:{...b,whey:2}},{key:'template/day/0',value:{meal:{wheyH:true}}},{key:'exclude/template/day/0/h/b',value:{items:{'food:whey':signature}}}];assert.doesNotThrow(()=>validateKetoWheyTotals(rows));b.whey=2.5;assert.throws(()=>validateKetoWheyTotals(rows),/Maximum 3/);
});

test('toolbar retry cannot bypass a failed suggestion’s concurrency guard',async()=>{
 const run=setup();run("var guards=[];cloudClient={connectionState:()=>({isWebSocketConnected:true}),mutation:async(_,args)=>{guards.push(args.expectedHouseholdRevision);throw Error('household changed')}}");
 assert.equal(await run('saveChanges(123)'),false);assert.equal(await run('saveChanges()'),false);assert.equal(run('JSON.stringify(guards)'),'[123,123]');
});

test('applying a whey suggestion updates day totals, shopping and prep from the same portions',()=>{
 const run=setup(),r=result(run),before=JSON.parse(run('JSON.stringify(ledger())'));
 const wife=run("JSON.stringify(assignedDayNutrition(0,'w'))");
 run(`for(const [m,cfg]of Object.entries(${JSON.stringify(r.configs)}))ketoMeals[ketoMealKey(0,'h',m)]=cfg`);
 near(run('ledger().whey'),before.whey+r.scoops-r.currentScoops);
 near(run("assignedDayNutrition(0,'h').p"),r.nutrition.p);
 assert.equal(run("JSON.stringify(assignedDayNutrition(0,'w'))"),wife);
 near(run("householdShopping().supermarket.find(x=>x.id==='whey').needed"),run('ledger().whey'));
 const groups=JSON.parse(run('JSON.stringify(householdPrep(0))'));
 const expected=JSON.parse(run("JSON.stringify(aggregateBatchLines(['w','h'].flatMap(p=>['b','l','d','e'].flatMap(m=>freshMeal(state.days[0],m,p)))))"));
 for(const x of expected){const name=run(`DB[${JSON.stringify(x.id)}][0]`),q=groups.flatMap(g=>g[1]).filter(s=>s.startsWith(name+' — ')).reduce((n,s)=>n+Number(s.slice(name.length+3).split(' ')[0]),0);assert.ok(Math.abs(q-x.q)<.31,`${x.id}: ${q} vs ${x.q}`);}
});
