import {validateWeighRecord} from './weigh-math.js';
import {validateBatch} from './batch-math.js';
// Shared wire format. Tombstones retain revisions, including after deletion/recreation.
export const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
function canonical(x){if(x===undefined)return null;if(!x||typeof x!=='object')return x;if(Array.isArray(x))return x.map(canonical);return Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])]));}
function validMonday(iso){const d=new Date(iso+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===iso&&d.getUTCDay()===1;}
export function validateRecord(key,value){
 if(key==='setting/curdType'){if(value!==null&&!['curd','curdH'].includes(value))throw Error('Invalid Balanced curd variant');return;}
 if(key==='setting/diets'){if(value===null)return;if(!value||Array.isArray(value)||Object.keys(value).sort().join(',')!=='h,w'||!['w','h'].every(p=>['balanced','keto'].includes(value[p])))throw Error('Invalid household diets');return;}
 if(key==='setting/ketoOptions'){
 if(value===null)return;
 const numbers={targetK:[1000,3500],pMin:[60,200],pMax:[60,250],carbBudget:[15,100],baselineWeight:[30,250],baselineWaist:[0,200],reviewWeeks:[4,6]};
 if(!value||Object.keys(value).sort().join(',')!==[...Object.keys(numbers),'startDate'].sort().join(',')||Object.entries(numbers).some(([k,[min,max]])=>typeof value[k]!=='number'||!Number.isFinite(value[k])||value[k]<min||value[k]>max)||value.pMax<value.pMin||![4,5,6].includes(value.reviewWeeks)||!/^\d{4}-\d{2}-\d{2}$/.test(value.startDate)||new Date(value.startDate+'T00:00:00Z').toISOString().slice(0,10)!==value.startDate)throw Error('Invalid keto planning settings');return;
 }
 if(key.startsWith('keto/shared/')){const m=/^keto\/shared\/(template|\d{4}-\d{2}-\d{2})\/day\/[0-6]$/.exec(key);if(!m||m[1]!=='template'&&(!validMonday(m[1])))throw Error('Invalid shared recipe key');if(value!==null&&(!value||!Object.keys(value).length||Object.entries(value).some(([k,v])=>!['recipe','w','h'].includes(k)||!/^(K[1-4]|S(?:[1-9]|10|11|12))$/.test(v))))throw Error('Invalid shared vegetable recipe');return;}
 if(key.startsWith('keto/trial/')){if(!/^keto\/trial\/\d{4}-\d{2}-\d{2}$/.test(key)||!validMonday(key.slice(11)))throw Error('Invalid trial week');if(value===null)return;const ranges={weight:[30,250],waist:[30,200],hunger:[1,5]};if(!value||Array.isArray(value)||Object.entries(value).some(([k,v])=>ranges[k]?typeof v!=='number'||!Number.isFinite(v)||v<ranges[k][0]||v>ranges[k][1]||k==='hunger'&&!Number.isInteger(v):!['strength','energy','bowel'].includes(k)||!['good','stable','worse'].includes(v)))throw Error('Invalid trial check');return;}
 if(key.startsWith('keto/')){
 const match=/^keto\/(template|\d{4}-\d{2}-\d{2})\/day\/([0-6])\/(w|h)\/(b|l|d)$/.exec(key);
 if(!match)throw Error('Invalid keto meal key');
 if(match[1]!=='template'){const date=new Date(match[1]+'T00:00:00Z');if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==match[1]||date.getUTCDay()!==1)throw Error('Invalid keto week');}
 if(value===null)return;
 const number=(x,min,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
 if(!value||Array.isArray(value)||['oil','protein','quantity','soya'].some(k=>!(k in value))||Object.keys(value).some(k=>!['oil','protein','quantity','soya','paneerType','curdType','curd','milk','butter','cucumber','walnuts','flax','sabziFraction'].includes(k))||!['paneer','eggs','chicken'].includes(value.protein)||match[3]==='w'&&value.protein!=='paneer')throw Error('Invalid keto protein');
 if(value.paneerType!==undefined&&!['paneer','paneerHP'].includes(value.paneerType)||value.curdType!==undefined&&!['curd','curdH'].includes(value.curdType))throw Error('Invalid dairy product');
 for(const [field,max]of Object.entries({curd:500,milk:500,butter:50,cucumber:1000,walnuts:150,flax:50,sabziFraction:2}))if(value[field]!==undefined&&!number(value[field],0,max))throw Error('Invalid keto '+field);
 if(!number(value.quantity,0,value.protein==='eggs'?6:1000)||value.protein==='eggs'&&!Number.isInteger(value.quantity)||!number(value.soya,0,100)||!number(value.oil,0,50))throw Error('Invalid keto portion');
 return;
 }
 if(key.startsWith('weigh/')){validateWeighRecord(key,value);return;}
 if(key.startsWith('batch/')){if(!/^batch\/[a-zA-Z0-9-]{8,64}$/.test(key))throw Error('Invalid batch key');if(value!==null)validateBatch(value);if(JSON.stringify(value).length>32000)throw Error('Batch too large');return;}
 if(!/^(setting\/(labels|density|soya|oilUse|personModes|utSel|utensils\/(kadhai|cooker|pan|bigpan|medpan))|template\/day\/[0-6]|week\/\d{4}-\d{2}-\d{2}(\/day\/[0-6])?)$/.test(key))throw Error('Invalid record key');
 if(JSON.stringify(value).length>12000)throw Error('Record too large');
 if(value===null){if(!key.startsWith('week/'))throw Error('Cannot delete household settings');return;}
 const number=(x,min,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
 const utensils=['kadhai','cooker','pan','bigpan','medpan'];
 const selection=x=>x&&['sabzi','dal','prot'].every(k=>utensils.includes(x[k]));
 if(key.includes('/day/')){const d=value.meal;if(!d||!/^B[1-5]$/.test(d.b)||!/^S(?:[1-9]|10|11|12)$/.test(d.s)||!['P','Y'].includes(d.p)||!['moong','masoor','arhar'].includes(d.dal)||!selection(value.utensils))throw Error('Invalid day');
 for(const k of ['off','wheyW','wheyH','eggH','cardioW','cardioH'])if(typeof d[k]!=='boolean')throw Error('Invalid meal flag');
 if(!d.skip||!['b','l','d'].every(k=>typeof d.skip[k]==='boolean'))throw Error('Invalid skipped meal');
 }else if(key.startsWith('week/')){if(!number(value.savedAt,0,1e15))throw Error('Invalid week');}
 else if(key.startsWith('setting/utensils/')){if(!number(value,0,50000))throw Error('Invalid utensil weight');}
 else if(key==='setting/density'){if(!number(value,0.5,2))throw Error('Invalid milk density');}
 else if(key==='setting/soya'){if(!['N','S'].includes(value))throw Error('Invalid soya brand');}
 else if(key==='setting/personModes'){if(!value||!['w','h'].every(k=>['easy','medium','hard'].includes(value[k])))throw Error('Invalid portions');}
 else if(key==='setting/utSel'){if(!selection(value))throw Error('Invalid utensils');}
 else if(key==='setting/oilUse'){if(!value||!['bf','dal','egg','prot','sabzi'].every(k=>number(value[k],0,500)))throw Error('Invalid oil');}
 else if(key==='setting/labels'){if(!value||Array.isArray(value)||Object.values(value).some(x=>!Array.isArray(x)||x.length!==2||!x.every(n=>number(n,0,2000))))throw Error('Invalid labels');}
}
export function changesBetween(base,draft){return [...new Set([...Object.keys(base),...Object.keys(draft)])].filter(k=>!equal(base[k]?.value??null,draft[k]??null)).map(key=>({key,value:draft[key]??null,expectedRevision:base[key]?.revision||0}));}
export function mergeRecords(base,draft,incoming){const merged={},conflicts=[];for(const k of new Set([...Object.keys(base),...Object.keys(draft),...Object.keys(incoming)])){
 const b=base[k]?.value??null,d=draft[k]??null,r=incoming[k]?.value??null;
 if(equal(d,b)||equal(d,r))merged[k]=r;else{merged[k]=d;if(!equal(b,r))conflicts.push(k);}
 }return {draft:merged,conflicts};}
