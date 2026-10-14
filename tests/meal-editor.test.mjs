import test from 'node:test';
import assert from 'node:assert/strict';
import {app} from './helpers/app.mjs';
function setup(){
 const run=app(true);
 run(`state.view='week';householdDiets={w:'balanced',h:'keto'};state.days[0].off=false;state.days[0].skip={b:false,l:false,d:false};state.days[0].wheyH=true;ketoMeals[ketoMealKey(0,'h','d')]=ketoMainConfig(0,'h','d','boiledEggMeal');snapshotDraft();
 var drafts=Object.fromEntries(['b','l','d'].map(m=>['h/'+m,structuredClone(ketoConfig(state.days[0],'h',m,0))]));mealEditor={i:0,m:'d',p:'h',day:structuredClone(state.days[0]),drafts,original:JSON.stringify([state.days[0],drafts]),scope:state.weekKey,added:{},page:0};`);
 return run;
}
const snapshot=run=>run('JSON.stringify({state,ketoMeals,cloudDraft,lockedWeeks,ledger:ledger()})');
test('meal preview is isolated, including exceptions, and discarding drafts leaves the plan intact',()=>{
 const run=setup(),before=snapshot(run),k=run("assignedDayNutrition(0,'h').k");
 run("mealEditorSet('quantity',5)");assert.equal(run("mealEditorWithDraft(()=>assignedDayNutrition(0,'h').k)"),k+72);
 assert.equal(snapshot(run),before);assert.throws(()=>run("mealEditorWithDraft(()=>{throw Error('fixture')})"),/fixture/);assert.equal(snapshot(run),before);
 run('mealEditor=null');assert.equal(snapshot(run),before);
});
test('meal save applies changed tabs together, preserves other foods, and survives hydration',()=>{
 const run=setup(),wife=run("JSON.stringify(assignedDayNutrition(0,'w'))"),lunch=run("JSON.stringify(ketoConfig(state.days[0],'h','l',0))");
 run("mealEditorSet('quantity',5);mealEditor.m='b';mealEditorSet('curd',50);commitMealEditor();snapshotDraft();hydrateDraft()");
 assert.equal(run("ketoConfig(state.days[0],'h','d',0).quantity"),5);assert.equal(run("ketoConfig(state.days[0],'h','b',0).curd"),50);
 assert.equal(run("JSON.stringify(assignedDayNutrition(0,'w'))"),wife);assert.equal(run("JSON.stringify(ketoConfig(state.days[0],'h','l',0))"),lunch);
});
test('over-limit whey is rejected before mutation; fixing another tab allows a single save',()=>{
 const run=setup(),before=snapshot(run);run("mealEditorSet('whey',3)");
 assert.throws(()=>run('commitMealEditor()'),/Maximum 3 whey/);assert.equal(snapshot(run),before);
 run("mealEditor.m='b';mealEditorSet('whey',0);commitMealEditor()");assert.equal(run("ketoWheyDailyTotal(state.days[0],'h')"),3);
});
test('no-cooked breakfast changes only the selected person; hidden food amounts stay available',()=>{
 const run=setup();run("mealEditor.m='b';mealEditorPick('ready')");assert.equal(run("mealEditorAllowed().includes('quantity')"),false);
 assert.equal(run("mealEditorWithDraft(()=>meal(state.days[0],'b','h').some(x=>x.id==='egg'||x.id==='paneerMM'))"),false);
 assert.equal(run('!!state.days[0].readyB?.h'),false);run('commitMealEditor()');assert.equal(run('state.days[0].readyB.h'),true);assert.equal(run('state.days[0].readyB.w'),false);
});
test('day save creates an isolated week and stale editors cannot overwrite newer edits',()=>{
 const run=setup(),template=run("JSON.stringify(ketoMeals[ketoMealKey(0,'h','d')])");run("state.view='day';mealEditorSet('quantity',5);commitMealEditor()");
 assert.equal(run('state.weekKey'),run('mondayOf(dayViewISO())'));assert.equal(run("JSON.stringify(ketoMeals['keto/template/day/0/h/d'])"),template);
 const stale=setup();stale("mealEditorSet('quantity',5);ketoMeals[ketoMealKey(0,'h','d')].quantity=2");const before=snapshot(stale);assert.throws(()=>stale('commitMealEditor()'),/changed while/);assert.equal(snapshot(stale),before);
});
test('ordinary brand selectors and inactive foods stay out of the meal editor; shared options stay separate',()=>{
 const run=setup();run("var body={innerHTML:''},title={textContent:''};document.querySelector=s=>s==='#dlgBody'?body:s==='#dlgTitle'?title:null;renderMealEditor()");
 const html=run('body.innerHTML');assert.doesNotMatch(html,/Milky Mist|Heritage|data-meal-field="milk"|data-meal-field="butter"/);assert.match(html,/value="milk"/);assert.match(html,/data-meal-field="quantity"/);
 run('editDayOptionsOnly=true');const opts=run('editFormHTML(editValsFromState(0),0)');assert.doesNotMatch(opts,/data-main-preview|data-ek="bh"|data-edit-sec="sides"/);assert.match(opts,/data-ek="s"/);assert.match(opts,/data-et="skipB"/);
});
test('frozen protein remains locked and evening-only nuts cannot be added at a meal',()=>{
 const run=setup();run("ketoMeals[ketoMealKey(0,'h','e')]={almonds:10,walnuts:10,cashews:0}");assert.equal(run("mealEditorAllowed().includes('almonds')"),false);assert.throws(()=>run("mealEditorSet('almonds',5)"),/Invalid meal/);
 run("mealEditorSet('quantity',5);globalThis.coveredComponent=()=>true");const before=snapshot(run);assert.throws(()=>run('commitMealEditor()'),/prepared batch/);assert.equal(snapshot(run),before);
});
