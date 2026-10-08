import {ConvexHttpClient} from 'convex/browser';
import {anyApi} from 'convex/server';
import assert from 'node:assert/strict';
const url=process.env.MEAL_TEST_URL;if(url!=='https://stoic-weasel-242.convex.cloud')throw Error('Integration test is restricted to this project’s development deployment.');
const c=new ConvexHttpClient(url);const read=async()=>Object.fromEntries((await c.query(anyApi.household.read,{})).map(r=>[r.key,r]));
const before=await read(),k='setting/utensils/pan',other='setting/utensils/cooker';
const batchKeys=['batch/integration-first','batch/integration-second'];
const weighKey='weigh/2099-01-01/sabzi';
const batch={recipe:'P',cookedOn:'2099-01-01',vessel:'pan',tare:0,netWeight:500,createdAt:Date.now(),ingredients:[{id:'paneer',q:100,n:{k:300,p:18,fb:0}}],servings:[{date:'2099-01-01',meal:'d',person:'w',component:'protein',share:1,grams:500}]};
try{
 await c.mutation(anyApi.household.commit,{changes:[{key:k,value:401,expectedRevision:before[k].revision}]});
 await assert.rejects(c.mutation(anyApi.household.commit,{changes:[{key:other,value:123,expectedRevision:before[other].revision},{key:k,value:402,expectedRevision:before[k].revision}]}));
 let now=await read();assert.equal(now[k].value,401);assert.equal(now[other].value,before[other].value);assert.equal(now[other].revision,before[other].revision);
 await assert.rejects(c.mutation(anyApi.household.commit,{changes:[{key:k,value:-3,expectedRevision:now[k].revision}]}));
 await c.mutation(anyApi.household.commit,{formatVersion:2,changes:[{key:batchKeys[0],value:batch,expectedRevision:before[batchKeys[0]]?.revision||0}]});
 now=await read();assert.equal(now[batchKeys[0]].value.netWeight,500);
 await assert.rejects(c.mutation(anyApi.household.commit,{changes:[{key:batchKeys[0],value:null,expectedRevision:now[batchKeys[0]].revision}]}),/Reload the app/);
 await assert.rejects(c.mutation(anyApi.household.commit,{formatVersion:2,changes:[{key:other,value:124,expectedRevision:now[other].revision},{key:batchKeys[1],value:batch,expectedRevision:before[batchKeys[1]]?.revision||0}]}),/already belongs/);
 const rolledBack=await read();assert.equal(rolledBack[other].revision,now[other].revision);assert.equal(rolledBack[other].value,now[other].value);assert.deepEqual(rolledBack[batchKeys[1]],now[batchKeys[1]]);
 const weight={gross:1600,tare:1000,netWeight:600,vessel:'kadhai',scope:'all',basis:'integration',savedAt:Date.now(),portions:[{meal:'l',person:'w',grams:150},{meal:'l',person:'h',grams:150},{meal:'d',person:'w',grams:150},{meal:'d',person:'h',grams:150}]};
 await c.mutation(anyApi.household.commit,{formatVersion:3,changes:[{key:weighKey,value:weight,expectedRevision:before[weighKey]?.revision||0}]});
 now=await read();assert.deepEqual(now[weighKey].value,weight);
 await assert.rejects(c.mutation(anyApi.household.commit,{formatVersion:2,changes:[{key:weighKey,value:null,expectedRevision:now[weighKey].revision}]}),/Reload the app/);
 console.log('PASS: cooked weights persist; stale writes, invalid values, overlapping batches and old-client deletions rejected; transactions roll back atomically.');
}finally{const now=await read();await c.mutation(anyApi.household.commit,{formatVersion:3,changes:[{key:k,value:before[k].value,expectedRevision:now[k].revision},...[...batchKeys,weighKey].filter(key=>JSON.stringify(now[key]?.value??null)!==JSON.stringify(before[key]?.value??null)).map(key=>({key,value:before[key]?.value??null,expectedRevision:now[key]?.revision||0}))]});}
