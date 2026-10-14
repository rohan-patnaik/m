import {queryGeneric as query,mutationGeneric as mutation,internalMutationGeneric as internalMutation} from 'convex/server';
import {v,ConvexError} from 'convex/values';
import {validateRecord,validateKetoWheyTotals} from '../records.js';
import {validateBatchAssignments} from '../batch-math.js';
import {activityBasis} from '../activity-math.js';
export const read=query({args:{},handler:async ctx=>(await ctx.db.query('records').collect()).map(({key,value,revision})=>({key,value,revision}))});
export const commit=mutation({args:{changes:v.array(v.object({key:v.string(),value:v.any(),expectedRevision:v.number()})),formatVersion:v.optional(v.number())},handler:async(ctx,{changes,formatVersion})=>{
 const nutritionVersion=await ctx.db.query('records').withIndex('by_key',q=>q.eq('key','setting/nutritionVersion')).unique();
 if((nutritionVersion?.value>=14||changes.some(c=>c.key.startsWith('exclude/')||c.key==='setting/nutritionVersion'&&c.value===14))&&formatVersion!==14)throw new ConvexError('Reload the app before editing excluded meal quantities.');
 if(nutritionVersion?.value>=13&&![13,14].includes(formatVersion))throw new ConvexError('Reload the app before editing no-cooking breakfasts.');
 if(changes.some(c=>c.key==='setting/nutritionVersion'&&c.value===13||c.value?.meal?.readyB!==undefined)&&![13,14].includes(formatVersion))throw new ConvexError('Reload the app before editing no-cooking breakfasts.');
 if(nutritionVersion?.value>=12&&![12,13,14].includes(formatVersion))throw new ConvexError('Reload the app before editing the new breakfast plan.');
 if(changes.some(c=>c.key==='setting/nutritionVersion'&&c.value===12||['boiledEggs','eggPoach'].includes(c.value?.breakfastRecipe))&&![12,13,14].includes(formatVersion))throw new ConvexError('Reload the app before editing the new breakfast plan.');
 if(nutritionVersion?.value>=11&&![11,12,13,14].includes(formatVersion))throw new ConvexError('Reload the app before editing breakfast recipes.');
 if(changes.some(c=>c.key==='setting/nutritionVersion'&&c.value===11||c.value&&['breakfastRecipe','avocado','mushroom','tomato','onion'].some(k=>Object.hasOwn(c.value,k)))&&![11,12,13,14].includes(formatVersion))throw new ConvexError('Reload the app before editing breakfast recipes.');
 if(nutritionVersion?.value>=10&&![10,11,12,13,14].includes(formatVersion))throw new ConvexError('Reload the app before editing the updated nutrition plan.');
 if(nutritionVersion?.value>=9&&![9,10,11,12,13,14].includes(formatVersion))throw new ConvexError('Reload the app before editing the updated nutrition plan.');
 if(changes.some(c=>c.key==='setting/nutritionVersion'&&c.value===10)&&![10,11,12,13,14].includes(formatVersion))throw new ConvexError('Reload the app before editing whey and egg-white portions.');
 if(changes.some(c=>c.key==='setting/nutritionVersion'&&c.value<(nutritionVersion?.value||0)))throw new ConvexError('Cannot downgrade the nutrition format. Reload the app.');
 if(changes.some(c=>c.value?.whey!==undefined||c.value?.eggWhites!==undefined||c.value?.spinach!==undefined||c.value?.almonds!==undefined||c.value?.ingredients?.some(x=>['eggWhite','almonds'].includes(x.id)))&&![10,11,12,13,14].includes(formatVersion))throw new ConvexError('Reload the app before editing whey and egg-white portions.');
 if(changes.some(c=>['setting/foodChoices','setting/produceOptions','setting/nutritionVersion'].includes(c.key)||c.value?.paneerType==='paneerMM'||c.value?.cashews!==undefined||c.value?.ingredients?.some(x=>x.n?.version===2||['paneerMM','cashews'].includes(x.id)))&&![9,10,11,12,13,14].includes(formatVersion))throw new ConvexError('Reload the app before editing the updated nutrition plan.');
 if(changes.some(c=>c.key.startsWith('batch/'))&&![2,3,4,5,6,7,8,9,10,11,12,13,14].includes(formatVersion))throw new ConvexError('Reload the app before editing batch meals.');
 if(changes.some(c=>c.key.startsWith('weigh/'))&&![3,4,5,6,7,8,9,10,11,12,13,14].includes(formatVersion))throw new ConvexError('Reload the app before editing cooked weights.');
 if(changes.some(c=>c.key.startsWith('keto/')||['setting/diets','setting/ketoOptions','setting/curdType'].includes(c.key))&&![5,6,7,8,9,10,11,12,13,14].includes(formatVersion))throw new ConvexError('Reload the app before editing keto meals.');
 if(changes.some(c=>/^(serve|done|buy)\//.test(c.key))&&![7,8,9,10,11,12,13,14].includes(formatVersion))throw new ConvexError('Reload the app before editing serving or shopping progress.');
 if(changes.length>500)throw new ConvexError('Too many changes');
 const seen=new Set();
 for(const c of changes){if(seen.has(c.key))throw new ConvexError('Duplicate key');seen.add(c.key);validateRecord(c.key,c.value);
 if(![6,7,8,9,10,11,12,13,14].includes(formatVersion)&&(c.key.startsWith('keto/shared/')||/\/(sabzi-w|sabzi-h)$/.test(c.key)||c.key.startsWith('batch/')&&c.value?.recipe==='S12'||c.value?.meal?.s==='S12'))throw new ConvexError('Reload the app before editing individual sabzis.');
 const old=await ctx.db.query('records').withIndex('by_key',q=>q.eq('key',c.key)).unique();
 const hasCornRecipe=value=>value?.recipe==='K5'||value?.w==='K5'||value?.h==='K5'||value?.meal?.s==='K5';
 if(![8,9,10,11,12,13,14].includes(formatVersion)&&(hasCornRecipe(c.value)||hasCornRecipe(old?.value)))throw new ConvexError('Reload the app before editing palak corn.');
 if(![6,7,8,9,10,11,12,13,14].includes(formatVersion)&&(c.key.startsWith('batch/')&&old?.value?.recipe==='S12'||old?.value?.meal?.s==='S12'))throw new ConvexError('Reload the app before editing individual sabzis.');
 if(c.key.startsWith('batch/')&&(/^K[1-5]$|^[QCE]$/.test(c.value?.recipe||'')||/^K[1-5]$|^[QCE]$/.test(old?.value?.recipe||''))&&![5,6,7,8,9,10,11,12,13,14].includes(formatVersion))throw new ConvexError('Reload the app before editing keto batches.');
 if((old?.revision||0)!==c.expectedRevision)throw new ConvexError('Another device changed '+c.key+'. Reload the shared version and reapply your edit.');
 if(old)await ctx.db.patch(old._id,{value:c.value,revision:old.revision+1});
 else await ctx.db.insert('records',{key:c.key,value:c.value,revision:1});
 }
 for(const c of changes.filter(c=>c.key.startsWith('serve/')&&c.value)){
 const weight=await ctx.db.query('records').withIndex('by_key',q=>q.eq('key','weigh/'+c.key.slice(6))).unique();
 if(!weight?.value||activityBasis(weight.value)!==c.value.basis||c.value.served.some(s=>!weight.value.portions.some(p=>s===p.meal+'/'+p.person)))throw new ConvexError('The cooked weight changed. Reopen serving portions before marking served.');
 }
 const allRecords=await ctx.db.query('records').collect();validateKetoWheyTotals(allRecords);
 const batches=allRecords.filter(r=>r.key.startsWith('batch/')&&r.value).map(r=>r.value);validateBatchAssignments(batches);
 return {savedAt:Date.now()};
}});
// Admin-only one-time import. Never callable by the public app and never overwrites data.
export const seed=internalMutation({args:{records:v.array(v.object({key:v.string(),value:v.any()}))},handler:async(ctx,{records})=>{
 if(await ctx.db.query('records').first())throw Error('Refusing to overwrite existing data');
 for(const r of records){validateRecord(r.key,r.value);await ctx.db.insert('records',{...r,revision:1});}
 return {imported:records.length};
}});
export const archiveLegacy=mutation({args:{fingerprint:v.string(),data:v.string()},handler:async(ctx,{fingerprint,data})=>{
 if(!/^[a-f0-9]{64}$/.test(fingerprint)||data.length>200000)throw Error('Invalid legacy archive');
 const parsed=JSON.parse(data),allowed=['simple-meals-v1','simple-meals-weeks-v1','meal-household-utensils-v1','meal-sync-v1','meal-before-household-sync-v1'];
 if(!parsed||Array.isArray(parsed)||Object.entries(parsed).some(([k,v])=>!allowed.includes(k)||typeof v!=='string'))throw Error('Invalid archive keys');
 const existing=await ctx.db.query('legacyArchives').withIndex('by_fingerprint',q=>q.eq('fingerprint',fingerprint)).unique();
 if(!existing)await ctx.db.insert('legacyArchives',{fingerprint,data,createdAt:Date.now()});
 return {archived:true};
}});
