// Batch ratios use raw-recipe shares; water changes cooked weight, not nutrients.
export const PROTEIN_SABZIS=new Set(['S3','S8','S9','S10']);
export const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
export function portionWeights(total,factors){
 if(!Number.isInteger(total)||total<=0||!factors.length||factors.some(x=>!Number.isFinite(x)||x<=0))throw Error('Enter a positive cooked weight and select servings.');
 const sum=factors.reduce((a,b)=>a+b,0),raw=factors.map(x=>total*x/sum),grams=raw.map(Math.floor);
 const rank=raw.map((x,i)=>({i,rest:x-grams[i]})).sort((a,b)=>b.rest-a.rest||a.i-b.i);
 for(let n=total-grams.reduce((a,b)=>a+b,0),i=0;i<n;i++)grams[rank[i].i]++;
 return grams;
}
export function portionLines(batch,serving){return batch.ingredients.map(x=>({id:x.id,q:x.q*serving.share,n:{k:x.n.k*serving.share,p:x.n.p*serving.share,fb:x.n.fb*serving.share}}));}
export function claimsFor(batch,s){const keys=[`${s.date}/${s.meal}/${s.person}/${s.component}`];if(s.component==='sabzi'&&s.meal==='d'&&PROTEIN_SABZIS.has(batch.recipe))keys.push(`${s.date}/${s.meal}/${s.person}/protein`);return keys;}
export function validateBatch(batch){
 const number=(x,min,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
 if(!batch||!(/^(S(?:[1-9]|10|11)|P|Y)$/.test(batch.recipe))||!validDate(batch.cookedOn)||!['kadhai','cooker','pan','bigpan','medpan'].includes(batch.vessel)||!number(batch.tare,0,50000)||!Number.isInteger(batch.netWeight)||!number(batch.netWeight,1,100000)||!number(batch.createdAt,0,1e15))throw Error('Invalid batch details');
 if(!Array.isArray(batch.ingredients)||!batch.ingredients.length||batch.ingredients.length>30||batch.ingredients.some(x=>!x||!ALLOWED_INGREDIENTS.has(x.id)||!number(x.q,0,100000)||!x.n||!['k','p','fb'].every(k=>number(x.n[k],0,1e7))))throw Error('Invalid batch ingredients');
 if(new Set(batch.ingredients.map(x=>x.id)).size!==batch.ingredients.length)throw Error('Duplicate batch ingredient');
 if(!Array.isArray(batch.servings)||!batch.servings.length||batch.servings.length>56)throw Error('Select batch servings');
 const seen=new Set();let shares=0,grams=0;
 for(const s of batch.servings){
 if(!validDate(s.date)||s.date<batch.cookedOn||!['l','d'].includes(s.meal)||!['w','h'].includes(s.person)||!['sabzi','protein'].includes(s.component)||!number(s.share,1e-9,1)||!Number.isInteger(s.grams)||!number(s.grams,1,100000))throw Error('Invalid batch serving');
 if(s.component==='protein'&&(s.meal!=='d'||!['S3','S8','P','Y'].includes(batch.recipe)))throw Error('This recipe cannot replace dinner protein');
 if(s.component==='sabzi'&&['P','Y'].includes(batch.recipe))throw Error('Separate protein must replace a dinner protein serving');
 for(const key of claimsFor(batch,s)){if(seen.has(key))throw Error('A meal is assigned twice');seen.add(key);}shares+=s.share;grams+=s.grams;
 }
 if(Math.abs(shares-1)>1e-7||grams!==batch.netWeight)throw Error('Batch portions must add up to the entire cooked batch');
}
export function validateBatchAssignments(batches){const seen=new Set();for(const b of batches){validateBatch(b);for(const s of b.servings)for(const k of claimsFor(b,s)){if(seen.has(k))throw Error('A serving already belongs to another batch. Remove that batch first.');seen.add(k);}}}
const ALLOWED_INGREDIENTS=new Set(['atta','rice','oats','besan','moong','masoor','arhar','poha','chana','rajma','chickpea','kalachana','pasta','maida','butter','paneer','soyN','soyS','curd','milk','nuts','oil','spice','bhindi','onion','gobi','carrot','potato','palak','tomato','arbi','mushroom','beans','cucumber']);
