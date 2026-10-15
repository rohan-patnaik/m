import test from 'node:test';
import assert from 'node:assert/strict';
import {app} from './helpers/app.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const start=`var drafts=Object.fromEntries(['b','l','d'].map(m=>['h/'+m,structuredClone(ketoConfig(state.days[0],'h',m,0))]));mealEditor={i:0,m:'l',p:'h',day:structuredClone(state.days[0]),drafts,original:JSON.stringify([state.days[0],drafts]),scope:state.weekKey,nutritionRevision:0,autoWhey:false,added:{},page:0};quickAddStart()`;
function setup(){const r=app(true);r(`state.view='week';householdDiets={w:'balanced',h:'keto'};state.days[0].off=false;state.days[0].skip={b:false,l:false,d:false};ketoMeals[ketoMealKey(0,'h','l')]={...ketoConfig(state.days[0],'h','l',0),milk:50,oil:5};snapshotDraft();${start}`);return r;}
const snapshot=r=>r('JSON.stringify({state,ketoMeals,cloudDraft,savedBatches,mealExclusions})');
test('quick milk preview counts the actual label and adds to an existing amount without mutating the plan',()=>{
 const r=setup(),before=snapshot(r);r("var result=quickAddPreview('milk',100),expected=comparisonSum([L('milk',100)])");
 for(const k of ['k','p','aHi'])near(r(`result.added.${k}`),r(`expected.${k}`));
 assert.equal(r('mealEditorCurrent().milk'),150);assert.equal(snapshot(r),before);
 r("quickAddPreview('milk',200)");assert.equal(r('mealEditorCurrent().milk'),250);
 r("quickAddPreview('curd',50)");assert.equal(r('mealEditorCurrent().milk'),50);assert.equal(snapshot(r),before);
});
test('saving an addition updates meal, day and purchasing totals and survives hydration, preserving Wife and other meals',()=>{
 const r=setup(),wife=r("JSON.stringify(assignedDayNutrition(0,'w'))"),dinner=r("JSON.stringify(meal(state.days[0],'d','h'))"),shop=r('ledger().milk');
 r("var beforeK=assignedDayNutrition(0,'h').k;quickAddPreview('milk',100);commitMealEditor();snapshotDraft();hydrateDraft()");
 near(r("assignedDayNutrition(0,'h').k-beforeK"),r("comparisonSum([L('milk',100)]).k"));near(r('ledger().milk')-shop,100);
 assert.equal(r("ketoConfig(state.days[0],'h','l').milk"),150);assert.equal(r("JSON.stringify(assignedDayNutrition(0,'w'))"),wife);assert.equal(r("JSON.stringify(meal(state.days[0],'d','h'))"),dinner);
});
test('calorie and carb headroom use saved limits; oil is fully counted; unknown carbs remain qualified',()=>{
 const r=setup();r("ketoOptions.targetK=1800;ketoOptions.carbBudget=30;var result=quickAddPreview('oil',10)");
 near(r('result.added.k'),r("comparisonSum([L('oil',10)]).k"));near(r('result.caloriesLeft'),r('1800-result.day.k'));near(r('result.carbsLeft'),r('30-result.day.aHi'));
 r('result.day.carbUnknown=true;result.caloriesLeft=-50;result.carbsLeft=-3');const html=r('quickAddSummary(result)');assert.match(html,/50 kcal over/);assert.match(html,/3 g carbs over/);assert.match(html,/incomplete/);
});
test('invalid amounts and daily whey limits cannot leave an invalid staged addition',()=>{
 const r=setup(),before=snapshot(r);
 for(const code of ["quickAddPreview('milk',NaN)","quickAddPreview('milk',-1)","quickAddPreview('milk',10000)","quickAddPreview('eggWhites',.5)","quickAddPreview('whey',.25)","quickAddPreview('whey',3)"]){assert.throws(()=>r(code));assert.equal(r('JSON.stringify(mealEditor.drafts)'),r('JSON.stringify(mealEditor.quickAdd.base)'));}
 assert.equal(snapshot(r),before);
});
test('crossed-out foods stay excluded and skipped meals cannot receive a hidden addition',()=>{
 const r=setup();r("toggleMealQuantity(0,'l','h','food:milk');"+start);const before=snapshot(r);
 assert.throws(()=>r("quickAddPreview('milk',100)"),/crossed-out/);assert.equal(snapshot(r),before);
 r("quickAddPreview('curd',50);commitMealEditor()");assert.equal(r("mealQuantityGroups(state.days[0],'l','h').find(g=>g.key==='food:milk').excluded"),true);
 const skip=setup();skip('mealEditor.day.skip.l=true');assert.throws(()=>skip("quickAddPreview('milk',100)"),/skipped/);
});
test('a side can be added alongside frozen protein without changing the batch or its allocation',()=>{
 const r=setup();r(`copyDietScope('template','2026-10-12');state.weekKey='2026-10-12';var ingredient=L('chicken',250);savedBatches.fixture={recipe:'C',cookedOn:dateForDay(0),vessel:'kadhai',tare:0,netWeight:200,createdAt:1,ingredients:[{...ingredient,n:nutrientSnapshot(ingredient)}],servings:[{date:dateForDay(0),meal:'l',person:'h',component:'protein',share:1,grams:200}]};snapshotDraft();${start}`);
 const frozen=r('JSON.stringify(savedBatches)'),portion=r("JSON.stringify(meal(state.days[0],'l','h').filter(x=>x.n))");
 assert.equal(r("quickAddFields().includes('quantity')"),false);r("quickAddPreview('milk',100);commitMealEditor()");
 assert.equal(r('JSON.stringify(savedBatches)'),frozen);assert.equal(r("JSON.stringify(meal(state.days[0],'l','h').filter(x=>x.n))"),portion);assert.equal(r("ketoConfig(state.days[0],'h','l').milk"),150);
});
test('quick additions protect concurrent totals and isolate day edits from the recurring template',()=>{
 const r=setup();r("quickAddPreview('milk',100);deferredCloud=[{revision:1}]");const before=snapshot(r);assert.throws(()=>r('commitMealEditor()'),/household changed/);assert.equal(snapshot(r),before);
 const d=setup();d("state.view='day';quickAddPreview('milk',100);commitMealEditor()");assert.equal(d("ketoMeals['keto/template/day/0/h/l'].milk"),50);assert.equal(d("ketoConfig(state.days[0],'h','l').milk"),150);
});
test('Lunch and Dinner headings expose add controls; Breakfast and skipped meals do not',()=>{
 const r=setup();for(const m of ['l','d'])assert.match(r(`uxMealHTML(0,'${m}')`),new RegExp(`data-meal-quick-add="0\\|${m}"`));assert.doesNotMatch(r("uxMealHTML(0,'b')"),/data-meal-quick-add/);r('state.days[0].skip.l=true');assert.doesNotMatch(r("uxMealHTML(0,'l')"),/data-meal-quick-add/);
});
