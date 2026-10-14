import assert from 'node:assert/strict';
import {ConvexHttpClient} from 'convex/browser';
import {anyApi} from 'convex/server';
if(process.env.MEAL_TEST_URL!=='https://stoic-weasel-242.convex.cloud')throw Error('Development deployment only');
const c=new ConvexHttpClient(process.env.MEAL_TEST_URL),read=async()=>Object.fromEntries((await c.query(anyApi.household.read,{formatVersion:15})).map(r=>[r.key,r]));
const base='keto/2099-01-05/day/0/h/',keys=['b','l','d'].map(m=>base+m),before=await read();
const portion=whey=>({protein:'eggs',quantity:2,eggWhites:3,spinach:200,almonds:20,walnuts:10,cashews:5,soya:0,oil:5,whey});
const commit=changes=>c.mutation(anyApi.household.commit,{formatVersion:15,changes});
try{
 await commit(keys.map((key,i)=>({key,value:portion(i===0?1:0),expectedRevision:before[key]?.revision||0})));
 let now=await read();await commit([{key:keys[1],value:portion(2),expectedRevision:now[keys[1]].revision}]);
 now=await read();assert.equal(now[keys[1]].value.whey,2);assert.equal(now[keys[1]].value.eggWhites,3);assert.equal(now[keys[1]].value.spinach,200);
 // A second device has a fresh revision for dinner, but cannot exceed the daily cap.
 await assert.rejects(commit([{key:keys[2],value:portion(.5),expectedRevision:now[keys[2]].revision}]),/Maximum 3/);
 assert.deepEqual((await read())[keys[2]],now[keys[2]],'Rejected transaction must roll back its write');
 await assert.rejects(c.mutation(anyApi.household.commit,{formatVersion:9,changes:[{key:keys[2],value:null,expectedRevision:now[keys[2]].revision}]}),/Reload the app/);
 await assert.rejects(commit([{key:keys[2],value:{...portion(0),eggWhites:1.5},expectedRevision:now[keys[2]].revision}]),/Invalid extra egg whites/);
 await assert.rejects(commit([{key:'setting/nutritionVersion',value:9,expectedRevision:now['setting/nutritionVersion'].revision}]),/Cannot downgrade/);
 console.log('PASS: whey/whites/spinach/mixed nuts persist; cross-meal fourth scoop rejected atomically; old writers and fractional whites rejected.');
}finally{
 const now=await read();await commit(keys.map(key=>({key,value:before[key]?.value??null,expectedRevision:now[key]?.revision||0})));
}
