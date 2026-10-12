import assert from 'node:assert/strict';
import {ConvexHttpClient} from 'convex/browser';
import {anyApi} from 'convex/server';
const url=process.env.MEAL_TEST_URL;
if(url!=='https://stoic-weasel-242.convex.cloud')throw Error('Restricted to development deployment');
const c=new ConvexHttpClient(url),read=async()=>Object.fromEntries((await c.query(anyApi.household.read,{})).map(r=>[r.key,r]));
const defaults={
 'setting/foodChoices':{paneer:'paneerMM',butter:'butter',nuts:'cashews'},
 'setting/produceOptions':{yields:{gobi:.6,arbi:650/750,bhindi:.95,palak:.8,carrot:.9,potato:.9,onion:.9,tomato:1,mushroom:1,cucumber:1,cabbage:.9,beans:.9,corn:1},mushroomPacketSize:180},
 'setting/nutritionVersion':9
};
let before=await read();
// Configure the development household with the production-targeted version, not production data.
const init=Object.entries(defaults).filter(([key])=>!before[key]?.value).map(([key,value])=>({key,value,expectedRevision:before[key]?.revision||0}));
if(init.length)await c.mutation(anyApi.household.commit,{changes:init,formatVersion:9});
before=await read();
const keys=['setting/foodChoices','setting/produceOptions','keto/2099-01-05/day/1/h/b','batch/integration-nutrients','buy/2099-01-05/paneerMM'];
const snap={version:2,profileId:'paneerMM',profileVersion:'2026-10-12',basis:'ingredient total',source:'Milky Mist regular500g panel',carbConvention:'full declared carbs',k:283,p:16.1,fb:0,c:5.1,cHi:5.1,a:5.1,aHi:5.1,f:22,fHi:22,s:5.1,sHi:5.1,sat:12,oil:0,added:0,addedHi:0,carbUnknown:false,unknown:false,satUnknown:false,addedUnknown:false,fibreUnknown:true};
const batch={recipe:'P',cookedOn:'2099-01-04',vessel:'pan',tare:0,netWeight:100,createdAt:1,ingredients:[{id:'paneerMM',q:100,n:snap}],servings:[{date:'2099-01-04',meal:'d',person:'h',component:'protein',share:1,grams:100}]};
try{
 for(const version of [undefined,5,7,8])await assert.rejects(c.mutation(anyApi.household.commit,{formatVersion:version,changes:[{key:'setting/utensils/pan',value:222,expectedRevision:before['setting/utensils/pan'].revision}]}),/Reload the app/);
 const modified={...before['setting/produceOptions'].value,yields:{...before['setting/produceOptions'].value.yields,gobi:.3},mushroomPacketSize:200};
 await c.mutation(anyApi.household.commit,{formatVersion:9,changes:[{key:keys[1],value:modified,expectedRevision:before[keys[1]].revision},{key:keys[2],value:{protein:'paneer',paneerType:'paneerMM',quantity:75,soya:0,oil:0,cashews:10,walnuts:0},expectedRevision:before[keys[2]]?.revision||0},{key:keys[3],value:batch,expectedRevision:before[keys[3]]?.revision||0}]});
 let now=await read();await c.mutation(anyApi.household.commit,{formatVersion:9,changes:[{key:keys[4],value:{checked:true,updatedAt:1,needed:100,buy:500},expectedRevision:now[keys[4]]?.revision||0}]});now=await read();assert.equal(now[keys[4]].value.buy,500);assert.equal(now[keys[1]].value.yields.gobi,.3);assert.equal(now[keys[2]].value.cashews,10);assert.deepEqual(now[keys[3]].value.ingredients[0].n,snap);
 await assert.rejects(c.mutation(anyApi.household.commit,{formatVersion:9,changes:[{key:keys[0],value:{paneer:'paneerHP',butter:'butter',nuts:'cashews'},expectedRevision:now[keys[0]].revision},{key:keys[1],value:before[keys[1]].value,expectedRevision:before[keys[1]].revision}]}),/Another device/);
 assert.deepEqual((await read())[keys[0]],now[keys[0]]);
 await assert.rejects(c.mutation(anyApi.household.commit,{formatVersion:9,changes:[{key:keys[1],value:{...modified,yields:{...modified.yields,gobi:0}},expectedRevision:now[keys[1]].revision}]}),/Invalid produce/);
 await assert.rejects(c.mutation(anyApi.household.commit,{formatVersion:8,changes:[{key:keys[3],value:null,expectedRevision:now[keys[3]].revision}]}),/Reload the app/);
 console.log('PASS: new food choices, produce settings, cashews and full snapshots persist; version8 writes blocked; stale/invalid writes roll back atomically.');
}finally{
 const now=await read(),changes=keys.filter(key=>JSON.stringify(now[key]?.value??null)!==JSON.stringify(before[key]?.value??null)).map(key=>({key,value:before[key]?.value??null,expectedRevision:now[key]?.revision||0}));
 if(changes.length)await c.mutation(anyApi.household.commit,{formatVersion:9,changes});
}
