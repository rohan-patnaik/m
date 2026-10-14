import assert from 'node:assert/strict';import {ConvexHttpClient} from 'convex/browser';import {anyApi} from 'convex/server';
if(process.env.MEAL_TEST_URL!=='https://stoic-weasel-242.convex.cloud')throw Error('Development deployment only');
const c=new ConvexHttpClient(process.env.MEAL_TEST_URL),read=()=>c.query(anyApi.household.read,{formatVersion:15}),map=rs=>Object.fromEntries(rs.map(r=>[r.key,r]));
const base='keto/2099-01-05/day/6/h/',day='week/2099-01-05/day/6',excluded='exclude/2099-01-05/day/6/h/b',keys=[base+'b',base+'l',base+'d',day,excluded],before=map(await read());
const commit=(changes,guard)=>c.mutation(anyApi.household.commit,{changes,formatVersion:15,...(guard===undefined?{}:{expectedHouseholdRevision:guard})});
try{
 const meal={...before['template/day/6'].value,meal:{...before['template/day/6'].value.meal,wheyH:true,off:false,skip:{b:false,l:false,d:false}}};delete meal.meal.readyB;
 const protein={protein:'eggs',quantity:3,soya:0,oil:0,whey:3,breakfastRecipe:'boiledEggs'},signature=JSON.stringify({diet:'keto',recipe:'boiledEggs',lines:[{id:'whey',q:3}]});
 const values={[base+'b']:protein,[base+'l']:{protein:'chicken',quantity:200,oil:5,soya:0,whey:2},[base+'d']:{protein:'chicken',quantity:200,oil:5,soya:0,whey:0},[day]:meal,[excluded]:{items:{'food:whey':signature}}};
 await commit(keys.map(key=>({key,value:values[key],expectedRevision:before[key]?.revision||0})),Object.values(before).reduce((n,r)=>n+r.revision,0));
 let rows=await read(),now=map(rows),guard=rows.reduce((n,r)=>n+r.revision,0);
 // A concurrent edit on a different day dependency invalidates the whole suggested transaction.
 await commit([{key:base+'d',value:{...now[base+'d'].value,quantity:225},expectedRevision:now[base+'d'].revision}]);
 await assert.rejects(commit([{key:base+'l',value:{...now[base+'l'].value,whey:1.5},expectedRevision:now[base+'l'].revision}],guard),/household changed/);
 assert.deepEqual(map(await read())[base+'l'],now[base+'l']);
 now=map(await read());await assert.rejects(commit([{key:excluded,value:null,expectedRevision:now[excluded].revision}]),/Maximum 3/);
 await assert.rejects(commit([{key:base+'b',value:{...protein,whey:2.5},expectedRevision:now[base+'b'].revision}]),/Maximum 3/);
 rows=await read();now=map(rows);await commit([{key:base+'l',value:{...now[base+'l'].value,whey:1.5},expectedRevision:now[base+'l'].revision}],rows.reduce((n,r)=>n+r.revision,0));
 assert.equal(map(await read())[base+'l'].value.whey,1.5);
 console.log('PASS: skipped whey is excluded from the cap; restoring/stale exclusions enforce the cap; household revision guard rejects concurrent dependency changes atomically.');
}finally{const now=map(await read());await commit(keys.map(key=>({key,value:before[key]?.value??null,expectedRevision:now[key]?.revision||0})));}
