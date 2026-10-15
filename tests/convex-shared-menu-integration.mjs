import assert from 'node:assert/strict';import {ConvexHttpClient} from 'convex/browser';import {anyApi} from 'convex/server';
if(process.env.MEAL_TEST_URL!=='https://stoic-weasel-242.convex.cloud')throw Error('Development deployment only');
const c=new ConvexHttpClient(process.env.MEAL_TEST_URL),read=()=>c.query(anyApi.household.read,{formatVersion:16}),map=rs=>Object.fromEntries(rs.map(r=>[r.key,r]));
const keys=['week/2099-01-05/day/5','keto/shared/2099-01-05/day/5','keto/2099-01-05/day/5/h/d'],before=map(await read()),commit=(changes,formatVersion=16)=>c.mutation(anyApi.household.commit,{changes,formatVersion});
try{
 const values=[{...before['template/day/5'].value,meal:{...before['template/day/5'].value.meal,s:'S15',dal:'rajma'}},{recipe:'S15'},{protein:'chicken',quantity:200,soya:0,oil:5,whey:0,mealRecipe:'simpleChicken'}];
 const changes=keys.map((key,i)=>({key,value:values[i],expectedRevision:before[key]?.revision||0}));
 await assert.rejects(commit(changes,15),/Reload/);assert.deepEqual(map(await read())[keys[0]],before[keys[0]]);
 await commit(changes);let now=map(await read());keys.forEach((k,i)=>assert.deepEqual(now[k].value,values[i]));
 for(const dal of ['chickpea','kalachana']){await commit([{key:keys[0],value:{...values[0],meal:{...values[0].meal,dal}},expectedRevision:now[keys[0]].revision}]);now=map(await read());assert.equal(now[keys[0]].value.meal.dal,dal);}
 console.log('PASS: format 15 rejects new menu atomically; format 16 saves shared skillet, separate chicken and all three bean alternatives.');
}finally{const now=map(await read());await commit(keys.map(key=>({key,value:before[key]?.value??null,expectedRevision:now[key]?.revision||0})));}
