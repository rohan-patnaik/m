import test from 'node:test';
import assert from 'node:assert/strict';
import {equal,changesBetween,mergeRecords,validateRecord} from '../records.js';
test('different day changes merge without overwriting a draft',()=>{const b={a:{value:1,revision:1},b:{value:2,revision:1}},d={a:3,b:2},r={a:b.a,b:{value:4,revision:2}};assert.deepEqual(mergeRecords(b,d,r),{draft:{a:3,b:4},conflicts:[]});assert.deepEqual(changesBetween(r,{a:3,b:4}),[{key:'a',value:3,expectedRevision:1}]);});
test('same item edits conflict; matching edits converge',()=>{const b={a:{value:1,revision:1}},r={a:{value:2,revision:2}};assert.deepEqual(mergeRecords(b,{a:3},r).conflicts,['a']);assert.deepEqual(mergeRecords(b,{a:2},r).conflicts,[]);});
test('deletions carry revision and recreate safely',()=>{assert.deepEqual(changesBetween({a:{value:1,revision:7}},{}),[{key:'a',value:null,expectedRevision:7}]);assert.deepEqual(changesBetween({a:{value:null,revision:8}},{a:2}),[{key:'a',value:2,expectedRevision:8}]);});
test('object key order does not create phantom changes',()=>assert.ok(equal({a:1,b:2},{b:2,a:1})));
test('palak corn is valid in shared selections but unknown recipe codes are rejected',()=>{
 assert.doesNotThrow(()=>validateRecord('keto/shared/template/day/3',{recipe:'K5'}));
 assert.doesNotThrow(()=>validateRecord('keto/shared/2026-10-05/day/1',{recipe:'K3',h:'K5'}));
 assert.throws(()=>validateRecord('keto/shared/template/day/3',{recipe:'K6'}));
});
test('reject invalid settings, arbitrary paths and meal codes',()=>{assert.throws(()=>validateRecord('setting/utensils/pan',-1));assert.throws(()=>validateRecord('other',{}));assert.throws(()=>validateRecord('template/day/0',{meal:{b:'bad'}}));assert.doesNotThrow(()=>validateRecord('setting/personModes',{w:'easy',h:'medium'}));});
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
test('legacy cleanup archives before removing only unchanged planner keys',async()=>{
 const data=new Map([['simple-meals-v1','{"old":true}'],['unrelated','keep']]);
 const storage={getItem:k=>data.get(k)??null,removeItem:k=>data.delete(k)};
 const ctx=vm.createContext({document:{addEventListener(){}},window:{addEventListener(){}},localStorage:storage,crypto:webcrypto,TextEncoder,console:{warn(){}},MealCloud:{api:{household:{archiveLegacy:'archive'}}}});
 vm.runInContext(readFileSync(new URL('../cloud-runtime.js',import.meta.url),'utf8'),ctx);
 vm.runInContext('cloudClient={mutation:async()=>{throw Error("offline")}}',ctx);await vm.runInContext('archiveLegacyStorage()',ctx);assert.ok(data.has('simple-meals-v1'));
 vm.runInContext('cloudClient={mutation:async()=>({archived:true})}',ctx);await vm.runInContext('archiveLegacyStorage()',ctx);assert.ok(!data.has('simple-meals-v1'));assert.equal(data.get('unrelated'),'keep');
});

test('keto meal validation enforces week, vegetarian wife, egg counts and bounded raw quantities',()=>{
 const cfg={protein:'chicken',quantity:125,soya:0,oil:4};
 assert.doesNotThrow(()=>validateRecord('keto/2026-10-05/day/1/h/d',cfg));
 assert.doesNotThrow(()=>validateRecord('keto/template/day/0/w/b',{...cfg,protein:'paneer'}));
 assert.doesNotThrow(()=>validateRecord('keto/2026-10-05/day/1/h/d',null));
 for(const key of ['keto/2026-10-06/day/1/h/d','keto/2026-02-30/day/1/h/d','keto/template/day/7/h/d','keto/template/day/1/h/e'])assert.throws(()=>validateRecord(key,cfg));
 assert.throws(()=>validateRecord('keto/template/day/1/w/d',cfg));
 for(const patch of [{quantity:-1},{quantity:1001},{oil:NaN},{oil:51},{soya:101},{protein:'tofu'},{extra:true},{protein:'eggs',quantity:2.5}])assert.throws(()=>validateRecord('keto/template/day/1/h/d',{...cfg,...patch}));
});

test('new no-cooking breakfast writer version is accepted by the shared validator',()=>{assert.doesNotThrow(()=>validateRecord('setting/nutritionVersion',13));assert.doesNotThrow(()=>validateRecord('setting/nutritionVersion',14));assert.throws(()=>validateRecord('setting/nutritionVersion',15));});
