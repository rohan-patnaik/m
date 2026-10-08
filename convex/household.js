import {queryGeneric as query,mutationGeneric as mutation,internalMutationGeneric as internalMutation} from 'convex/server';
import {v,ConvexError} from 'convex/values';
import {validateRecord} from '../records.js';
import {validateBatchAssignments} from '../batch-math.js';
export const read=query({args:{},handler:async ctx=>(await ctx.db.query('records').collect()).map(({key,value,revision})=>({key,value,revision}))});
export const commit=mutation({args:{changes:v.array(v.object({key:v.string(),value:v.any(),expectedRevision:v.number()})),formatVersion:v.optional(v.number())},handler:async(ctx,{changes,formatVersion})=>{
 if(changes.some(c=>c.key.startsWith('batch/'))&&![2,3].includes(formatVersion))throw new ConvexError('Reload the app before editing batch meals.');
 if(changes.some(c=>c.key.startsWith('weigh/'))&&formatVersion!==3)throw new ConvexError('Reload the app before editing cooked weights.');
 if(changes.length>500)throw new ConvexError('Too many changes');
 const seen=new Set();
 for(const c of changes){if(seen.has(c.key))throw new ConvexError('Duplicate key');seen.add(c.key);validateRecord(c.key,c.value);
 const old=await ctx.db.query('records').withIndex('by_key',q=>q.eq('key',c.key)).unique();
 if((old?.revision||0)!==c.expectedRevision)throw new ConvexError('Another device changed '+c.key+'. Reload the shared version and reapply your edit.');
 if(old)await ctx.db.patch(old._id,{value:c.value,revision:old.revision+1});
 else await ctx.db.insert('records',{key:c.key,value:c.value,revision:1});
 }
 const batches=(await ctx.db.query('records').collect()).filter(r=>r.key.startsWith('batch/')&&r.value).map(r=>r.value);validateBatchAssignments(batches);
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
