import {ConvexHttpClient} from 'convex/browser';
import {anyApi} from 'convex/server';
import assert from 'node:assert/strict';
const url=process.env.MEAL_TEST_URL;if(url!=='https://stoic-weasel-242.convex.cloud')throw Error('Integration test is restricted to this project’s development deployment.');
const c=new ConvexHttpClient(url);const read=async()=>Object.fromEntries((await c.query(anyApi.household.read,{})).map(r=>[r.key,r]));
const before=await read(),k='setting/utensils/pan',other='setting/utensils/cooker';
const batchKeys=['batch/integration-first','batch/integration-second'];
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
 console.log('PASS: stale writes, invalid values, overlapping batches and old-client batch writes rejected; multi-record transactions roll back atomically.');
}finally{const now=await read();await c.mutation(anyApi.household.commit,{formatVersion:2,changes:[{key:k,value:before[k].value,expectedRevision:now[k].revision},...batchKeys.filter(key=>JSON.stringify(now[key]?.value??null)!==JSON.stringify(before[key]?.value??null)).map(key=>({key,value:before[key]?.value??null,expectedRevision:now[key]?.revision||0}))]});}
