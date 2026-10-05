import {ConvexHttpClient} from 'convex/browser';
import {anyApi} from 'convex/server';
import assert from 'node:assert/strict';
const url=process.env.MEAL_TEST_URL;if(url!=='https://stoic-weasel-242.convex.cloud')throw Error('Integration test is restricted to this project’s development deployment.');
const c=new ConvexHttpClient(url);const read=async()=>Object.fromEntries((await c.query(anyApi.household.read,{})).map(r=>[r.key,r]));
const before=await read(),k='setting/utensils/pan',other='setting/utensils/cooker';
try{
 await c.mutation(anyApi.household.commit,{changes:[{key:k,value:401,expectedRevision:before[k].revision}]});
 await assert.rejects(c.mutation(anyApi.household.commit,{changes:[{key:other,value:123,expectedRevision:before[other].revision},{key:k,value:402,expectedRevision:before[k].revision}]}));
 let now=await read();assert.equal(now[k].value,401);assert.equal(now[other].value,before[other].value);assert.equal(now[other].revision,before[other].revision);
 await assert.rejects(c.mutation(anyApi.household.commit,{changes:[{key:k,value:-3,expectedRevision:now[k].revision}]}));
 console.log('PASS: stale writes rejected; multi-record transactions roll back atomically; invalid values rejected.');
}finally{const now=await read();await c.mutation(anyApi.household.commit,{changes:[{key:k,value:before[k].value,expectedRevision:now[k].revision}]});}
