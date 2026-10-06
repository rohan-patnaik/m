import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import * as math from '../batch-math.js';
import * as records from '../records.js';
function app(){
 const document={addEventListener(){},querySelector(){return null;},querySelectorAll(){return[];}};
 const ctx=vm.createContext({document,window:{addEventListener(){}},BatchMath:math,MealCloud:records,crypto:webcrypto,structuredClone,console,TextEncoder,setInterval(){},navigator:{onLine:true}});
 vm.runInContext(readFileSync(new URL('../batch-runtime.js',import.meta.url),'utf8'),ctx);
 vm.runInContext(readFileSync(new URL('../cloud-runtime.js',import.meta.url),'utf8'),ctx);
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 vm.runInContext(script.slice(0,script.indexOf("document.addEventListener('input'")),ctx);
 vm.runInContext("state.weekKey='2026-10-05';templateDays=structuredClone(state.days);templateUtensils=structuredClone(state.utDay);cloudReady=true;",ctx);
 return expression=>vm.runInContext(expression,ctx);
}
test('whole gram boxes add up exactly even with unequal shares and ties',()=>{
 assert.deepEqual(math.portionWeights(1001,[1,1,1]),[334,334,333]);
 for(let total=50;total<250;total++)assert.equal(math.portionWeights(total,[.2,.25,.4,.6]).reduce((a,b)=>a+b),total);
 assert.throws(()=>math.portionWeights(0,[1]));assert.throws(()=>math.portionWeights(100,[0]));
});
test('same-recipe palak batch conserves meal calories, protein and shopping',()=>{
 const run=app();const result=run(`(()=>{state.days[2].s='S3';const before=['w','h'].map(p=>daily(2,p).total),beforeLedger=ledger();batchDraft={recipe:'S3',cookedOn:'2026-10-07',vessel:'kadhai',includeVessel:false,gross:1200,oil:null,roles:{},selected:{}};for(const m of ['l','d']){batchDraft.roles['2026-10-07/'+m]='sabzi';for(const p of ['w','h'])batchDraft.selected['2026-10-07/'+m+'/'+p]=true;}const b=buildBatchPreview(true);savedBatches['fixture-palak']=b;return{before,after:['w','h'].map(p=>daily(2,p).total),beforeLedger,afterLedger:ledger(),batch:b};})()`);
 math.validateBatch(result.batch);assert.equal(result.batch.servings.reduce((n,s)=>n+s.grams,0),1200);
 result.before.forEach((n,i)=>['k','p','fb'].forEach(k=>assert.ok(Math.abs(n[k]-result.after[i][k])<1e-7)));
 for(const k of Object.keys(result.beforeLedger))assert.ok(Math.abs(result.beforeLedger[k]-result.afterLedger[k])<1e-7,k);
 assert.equal(run('freshSabziLines(state.days[2]).length'),0);
});
test('soya sabzi replaces only requested dinner protein, includes gravy/oil, and freezes portions',()=>{
 const run=app();const result=run(`(()=>{state.days[0].s='S8';state.days[1].p='Y';batchDraft={recipe:'S8',cookedOn:'2026-10-05',vessel:'bigpan',includeVessel:true,gross:1850,oil:20,roles:{},selected:{}};state.utensils.bigpan=850;for(const m of ['l','d']){batchDraft.roles['2026-10-05/'+m]='sabzi';for(const p of ['w','h'])batchDraft.selected['2026-10-05/'+m+'/'+p]=true;}batchDraft.roles['2026-10-06/d']='protein';batchDraft.selected['2026-10-06/d/w']=true;const b=buildBatchPreview(true);savedBatches['fixture-soya']=b;const s=b.servings.find(x=>x.date==='2026-10-06');const dinner=meal(state.days[1],'d','w');const frozen=sum(BatchMath.portionLines(b,s));state.personModes.w='hard';state.soya='S';state.labels.soyN=[999,1];return {batch:b,core:BatchMath.portionLines(b,s).find(x=>x.id==='soyN').q,dinner,snapshot:frozen,after:sum(BatchMath.portionLines(b,s)),freshProtein:originalComponent(state.days[1],'d','w','protein'),fresh: freshMeal(state.days[1],'d','w')};})()`);
 assert.equal(result.batch.netWeight,1000);assert.ok(Math.abs(result.core-40)<1e-8);assert.equal(result.batch.ingredients.find(x=>x.id==='oil').q,20);
 assert.ok(result.dinner.filter(x=>x.id==='onion').length>1);assert.equal(result.fresh.some(x=>x.id==='soyS'),false);
 assert.deepEqual(result.snapshot,result.after);math.validateBatch(result.batch);
 const allocated=result.batch.servings.flatMap(s=>math.portionLines(result.batch,s));for(const ingredient of result.batch.ingredients)assert.ok(Math.abs(allocated.filter(x=>x.id===ingredient.id).reduce((n,x)=>n+x.q,0)-ingredient.q)<1e-7);
});
test('batch-owned protein in sabzi suppresses the former separate protein',()=>{
 const run=app();run(`state.days[0].s='S1';state.days[0].p='P';batchDraft={recipe:'S8',cookedOn:'2026-10-05',vessel:'pan',includeVessel:false,gross:400,oil:null,roles:{'2026-10-05/d':'sabzi'},selected:{'2026-10-05/d/w':true}};savedBatches['fixture-replace']=buildBatchPreview(true);`);
 assert.equal(run("meal(state.days[0],'d','w').some(x=>x.id==='paneer')"),false);
 assert.equal(run("meal(state.days[0],'d','h').some(x=>x.id==='paneer')"),true);
 assert.equal(run("coveredComponent(state.days[0],'d','w','protein')"),true);
});
test('conflicting batch assignments and invalid totals are rejected',()=>{
 const run=app();const batch=run(`(()=>{batchDraft={recipe:'P',cookedOn:'2026-10-05',vessel:'pan',includeVessel:false,gross:500,oil:null,roles:{'2026-10-05/d':'protein'},selected:{'2026-10-05/d/w':true}};return buildBatchPreview(true);})()`);
 assert.throws(()=>math.validateBatchAssignments([batch,batch]));
 assert.throws(()=>math.validateBatch({...batch,netWeight:501}));
 assert.throws(()=>records.validateRecord('batch/valid-fixture',{...batch,ingredients:[{id:'unknown',q:2,n:{k:1,p:1,fb:1}}]}));
 assert.doesNotThrow(()=>records.validateRecord('batch/valid-fixture',batch));assert.doesNotThrow(()=>records.validateRecord('batch/valid-fixture',null));
});
test('batch records survive state snapshot/hydration and skip/re-enable',()=>{
 const run=app();const result=run(`(()=>{batchDraft={recipe:'Y',cookedOn:'2026-10-05',vessel:'pan',includeVessel:false,gross:500,oil:null,roles:{'2026-10-05/d':'protein'},selected:{'2026-10-05/d/w':true}};const b=buildBatchPreview(true);savedBatches['fixture-cloud']=b;snapshotDraft();const saved=cloudDraft['batch/fixture-cloud'];hydrateDraft();state.days[0].skip.d=true;const skipped=meal(state.days[0],'d','w').length;state.days[0].skip.d=false;return{saved,batch:savedBatches['fixture-cloud'],skipped,restored:meal(state.days[0],'d','w').some(x=>!!x.n)};})()`);
 assert.deepEqual(result.saved,result.batch);assert.equal(result.skipped,0);assert.equal(result.restored,true);
});
test('a Sunday batch for next week is bought once and survives calendar hydration',()=>{
 const run=app();const result=run(`(()=>{batchDraft={recipe:'Y',cookedOn:'2026-10-11',vessel:'pan',includeVessel:false,gross:1000,oil:null,roles:{'2026-10-12/d':'protein'},selected:{'2026-10-12/d/w':true,'2026-10-12/d/h':true}};const b=buildBatchPreview(true);const before=ledger();stageBatch('fixture-nextweek',b);snapshotDraft();const cookingWeek=cloudDraft['week/2026-10-05'],nextWeek=cloudDraft['week/2026-10-12'];const prep=ledger();selectWeek('2026-10-12');const next=ledger(),fresh=cookRows(0);hydrateDraft();return{batch:b,before,prep,next,cookingWeek,nextWeek,fresh,linked:meal(state.days[0],'d','w').filter(x=>!!x.n)};})()`);
 math.validateBatch(result.batch);assert.ok(result.cookingWeek);assert.ok(result.nextWeek);
 assert.ok(Math.abs(result.prep.soyN-(result.before.soyN||0)-result.batch.ingredients.find(x=>x.id==='soyN').q)<1e-8);
 assert.equal(result.linked.find(x=>x.id==='soyN').q,48); // Chilla-day boost: 60 g × wife's Low dinner scale.
 assert.ok(result.fresh.some(g=>g[0].startsWith('Already prepared')));
 assert.equal(result.fresh.some(g=>g[0].startsWith('Cooked batch')),false);
 assert.equal(result.fresh.filter(g=>g[0].includes('Dinner')&&!g[0].includes('prepared')).flatMap(g=>g[1]).some(x=>x.includes('soya chunks')),false);
});
test('cooking week is materialized from template even with no servings in that week',()=>{
 const run=app();const result=run(`(()=>{state.weekKey=null;batchDraft={recipe:'P',cookedOn:'2026-10-11',vessel:'pan',includeVessel:false,gross:700,oil:null,roles:{'2026-10-12/d':'protein'},selected:{'2026-10-12/d/w':true}};stageBatch('fixture-template',buildBatchPreview(true));selectWeek('2026-10-05');return {cooking:!!lockedWeeks['2026-10-05'],next:!!lockedWeeks['2026-10-12'],prep:cookRows(6)};})()`);
 assert.ok(result.cooking&&result.next);assert.ok(result.prep.some(g=>g[0].startsWith('Cooked batch')));
});
