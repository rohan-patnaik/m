import assert from 'node:assert/strict';
import {ConvexHttpClient} from 'convex/browser';
import {anyApi} from 'convex/server';
if(process.env.MEAL_TEST_URL!=='https://stoic-weasel-242.convex.cloud')throw Error('Development deployment only');
const c=new ConvexHttpClient(process.env.MEAL_TEST_URL),key='keto/2099-01-05/day/6/h/d';
const read=async()=>(await c.query(anyApi.household.read,{formatVersion:15})).find(r=>r.key===key);
const before=await read();
const commit=(value,revision)=>c.mutation(anyApi.household.commit,{formatVersion:15,changes:[{key,value,expectedRevision:revision}]});
try{
 const value={protein:'eggs',quantity:3,eggWhites:2,oil:5,soya:0,whey:0,eggPreparation:'poached'};
 await commit(value,before?.revision||0);let row=await read();assert.deepEqual(row.value,value);
 await commit({...row.value,quantity:4},row.revision);row=await read();assert.equal(row.value.quantity,4);assert.equal(row.value.eggPreparation,'poached');assert.equal(row.value.oil,5);
 for(const patch of [{quantity:1.5},{eggPreparation:'invalid'}]){await assert.rejects(commit({...row.value,...patch},row.revision),/Invalid/);assert.deepEqual(await read(),row);}
 await assert.rejects(commit(value,row.revision-1),/Another device/);assert.deepEqual(await read(),row);
 console.log('PASS: egg count, whites, preparation and oil round trip; invalid counts, styles and stale writes reject atomically.');
}finally{const current=await read();if(JSON.stringify(current?.value)!==JSON.stringify(before?.value))await commit(before?.value??null,current?.revision||0);}
