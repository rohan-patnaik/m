import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import * as math from '../batch-math.js';
import * as weighMath from '../weigh-math.js';
import * as records from '../records.js';

function app(){
 const root={innerHTML:'',querySelector(){return null;},querySelectorAll(){return[];}};
 const document={addEventListener(){},querySelector(sel){return sel==='#keto'?root:null;},querySelectorAll(){return[];}};
 const ctx=vm.createContext({document,window:{addEventListener(){}},BatchMath:math,WeighMath:weighMath,MealCloud:records,crypto:webcrypto,structuredClone,console,TextEncoder,setInterval(){},navigator:{onLine:true}});
 for(const file of ['batch-runtime.js','weigh-runtime.js','cloud-runtime.js','keto-runtime.js'])vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),ctx);
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 vm.runInContext(script.slice(0,script.indexOf("document.addEventListener('input'")),ctx);
 vm.runInContext("state.weekKey='2026-10-05';templateDays=structuredClone(state.days);templateUtensils=structuredClone(state.utDay);cloudReady=true;",ctx);
 return {root,run:expression=>vm.runInContext(expression,ctx)};
}
test('keto proposals respect off meals, vegetarian wife and enabled husband eggs',()=>{
 const {run}=app();
 assert.equal(run("ketoSuggestion(state.days[0],'w','b').name"),'Tofu bhurji + vegetables');
 assert.equal(run("ketoSuggestion({...state.days[0],eggH:true},'h','b').name"),'Your eggs + sautéed vegetables');
 assert.equal(run("ketoSuggestion({...state.days[0],eggH:false},'h','b').name"),'Tofu bhurji + vegetables');
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
 assert.match(root.innerHTML,/Tofu \+ capsicum/);
 assert.match(root.innerHTML,/prepared batch is assigned/);
 assert.match(root.innerHTML,/Soya chunks sabzi/);
 assert.match(root.innerHTML,/Keto totals: not calculated yet/);
 assert.match(root.innerHTML,/not a verified global/);
 assert.equal((root.innerHTML.match(/data-keto-day="/g)||[]).length,7);
 assert.equal(run('KETO_VIDEOS.length'),5);
 assert.equal(run('KETO_PACKETS[0].carbs'),2.8);
 assert.equal(run("KETO_PACKETS.find(x=>x.name==='Nutrela chunks').fibre"),null);
 assert.match(root.innerHTML,/100 g, not 100 ml/);
 assert.match(root.innerHTML,/ND = not declared, not zero/);
 run("ketoPerson='w';renderKeto()");assert.equal(snapshot(),before);
 assert.doesNotMatch(root.innerHTML,/class="keto-person">Husband/);
});
