import {portionWeights,validDate} from './batch-math.js';
export function allocateFood(gross,tare,servings){
 if(!Number.isFinite(gross)||!Number.isFinite(tare)||gross<=tare||tare<0)throw Error('The scale reading must be greater than the empty vessel weight.');
 const netWeight=Math.round(gross-tare);
 const grams=portionWeights(netWeight,servings.map(s=>s.factor));
 if(grams.some(g=>g<1))throw Error('The cooked weight is too small for these portions.');
 return {netWeight,portions:servings.map((s,i)=>({meal:s.meal,person:s.person,grams:grams[i]}))};
}
export function servingSteps(record,meal){
 let food=record.netWeight;
 for(const s of record.portions)if(s.meal==='l'&&meal==='d')food-=s.grams;
 return ['h','w'].map(person=>record.portions.find(s=>s.meal===meal&&s.person===person)).filter(Boolean).map(s=>{food-=s.grams;return {...s,foodLeft:food,scaleLeft:food+record.tare};});
}
export function validateWeighRecord(key,r){
 const match=/^weigh\/(\d{4}-\d{2}-\d{2})\/(sabzi|dal|prot)$/.exec(key);
 if(!match||!validDate(match[1]))throw Error('Invalid cooked-weight key');
 if(r===null)return;
 if(JSON.stringify(r).length>12000)throw Error('Cooked-weight record too large');
 const num=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
 if(!r||!['kadhai','cooker','pan','bigpan','medpan'].includes(r.vessel)||!['all','l','d'].includes(r.scope)||!num(r.gross,1,150000)||!num(r.tare,0,50000)||!Number.isInteger(r.netWeight)||!num(r.netWeight,1,100000)||r.netWeight!==Math.round(r.gross-r.tare)||!num(r.savedAt,0,1e15)||typeof r.basis!=='string'||r.basis.length>6000)throw Error('Invalid cooked weight');
 if(!Array.isArray(r.portions)||!r.portions.length||r.portions.length>4)throw Error('Invalid cooked portions');
 const seen=new Set();let total=0;
 for(const s of r.portions){const k=s.meal+'/'+s.person;if(!['l','d'].includes(s.meal)||!['w','h'].includes(s.person)||!Number.isInteger(s.grams)||!num(s.grams,1,100000)||seen.has(k)||r.scope!=='all'&&s.meal!==r.scope||match[2]==='prot'&&s.meal!=='d')throw Error('Invalid cooked portion');seen.add(k);total+=s.grams;}
 if(total!==r.netWeight)throw Error('Portions must add up to the cooked food weight');
}
