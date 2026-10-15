import {validateWeighRecord} from './weigh-math.js';
import {validateBatch} from './batch-math.js';
import {validateActivity} from './activity-math.js';
// Shared wire format. Tombstones retain revisions, including after deletion/recreation.
export const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
// Check the final transaction, so two devices cannot each add a fourth scoop.
export function validateKetoWheyTotals(rows){
 const map=Object.fromEntries(rows.map(r=>[r.key,r.value]));
 const groups=new Set(Object.keys(map).filter(k=>/^keto\/(template|\d{4}-\d{2}-\d{2})\/day\/[0-6]\/(w|h)\/(b|l|d)$/.test(k)).map(k=>k.slice(0,-2)));
 for(const group of groups){
  const [,scope,,index,p]=group.split('/');
  const meal=(map[(scope==='template'?'template':'week/'+scope)+'/day/'+index]||map['template/day/'+index])?.meal;
  let total=0;
  for(const m of ['b','l','d']){
   if(meal&&(meal.off||meal.skip?.[m]||m==='b'&&!meal[p==='h'?'wheyH':'wheyW']))continue;
   const cfg=map[group+'/'+m],q=cfg?.whey??(m==='b'?1:0);
   const recipe=m==='b'?(meal?.readyB?.[p]?'ready':cfg?.breakfastRecipe||cfg?.protein):cfg?.mealRecipe||'';
   const signature=JSON.stringify({diet:'keto',recipe,lines:[{id:'whey',q:+q.toFixed(8)}]});
   if(map[`exclude/${scope}/day/${index}/${p}/${m}`]?.items?.['food:whey']===signature)continue;
   total+=q;
  }
  if(total>3+1e-8)throw Error('Maximum 3 whey scoops per person per day. Reduce another meal first.');
 }
}
function canonical(x){if(x===undefined)return null;if(!x||typeof x!=='object')return x;if(Array.isArray(x))return x.map(canonical);return Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])]));}
function validMonday(iso){const d=new Date(iso+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===iso&&d.getUTCDay()===1;}
export function validateRecord(key,value){
 if(key==='setting/nutritionVersion'){if(![9,10,11,12,13,14,15,16].includes(value))throw Error('Invalid nutrition version');return;}
 if(key.startsWith('exclude/')){
 const match=/^exclude\/(template|\d{4}-\d{2}-\d{2})\/day\/[0-6]\/(w|h)\/(b|l|d|e)$/.exec(key);
 if(!match||match[1]!=='template'&&!validMonday(match[1]))throw Error('Invalid meal exclusion key');
 if(value===null)return;
 if(!value||Array.isArray(value)||Object.keys(value).join(',')!=='items'||!value.items||Array.isArray(value.items)||!Object.keys(value.items).length||Object.keys(value.items).length>60||JSON.stringify(value).length>32000||Object.entries(value.items).some(([k,v])=>!/^(component:(sabzi|dal|protein)|food:[a-zA-Z][a-zA-Z0-9]*|eggs|nuts)$/.test(k)||typeof v!=='string'||!v.length||v.length>16000))throw Error('Invalid meal exclusions');
 return;
 }
 if(key==='setting/foodChoices'){if(!value||Object.keys(value).sort().join(',')!=='butter,nuts,paneer'||!['paneerMM','paneer','paneerHP'].includes(value.paneer)||!['butter','butterH'].includes(value.butter)||value.nuts!=='cashews')throw Error('Invalid food choices');return;}
 if(key==='setting/produceOptions'){
  const ids=['gobi','arbi','bhindi','palak','carrot','potato','onion','tomato','mushroom','cucumber','cabbage','beans','corn'];
 if(!value||Object.keys(value).sort().join(',')!=='mushroomPacketSize,yields'||![180,200].includes(value.mushroomPacketSize)||!value.yields||ids.some(id=>!Object.hasOwn(value.yields,id))||Object.keys(value.yields).some(id=>!ids.includes(id)&&!['avocado','capsicum'].includes(id))||Object.values(value.yields).some(x=>typeof x!=='number'||!Number.isFinite(x)||x<.01||x>1))throw Error('Invalid produce buying assumptions');return;
 }
 if(/^(serve|done|buy)\//.test(key)){validateActivity(key,value);return;}
 if(key==='setting/curdType'){if(value!==null&&!['curd','curdH'].includes(value))throw Error('Invalid Balanced curd variant');return;}
 if(key==='setting/diets'){if(value===null)return;if(!value||Array.isArray(value)||Object.keys(value).sort().join(',')!=='h,w'||!['w','h'].every(p=>['balanced','keto'].includes(value[p])))throw Error('Invalid household diets');return;}
 if(key==='setting/ketoOptions'){
 if(value===null)return;
 const numbers={targetK:[1000,3500],pMin:[60,200],pMax:[60,250],carbBudget:[15,100],baselineWeight:[30,250],baselineWaist:[0,200],reviewWeeks:[4,6]};
 if(!value||Object.keys(value).sort().join(',')!==[...Object.keys(numbers),'startDate'].sort().join(',')||Object.entries(numbers).some(([k,[min,max]])=>typeof value[k]!=='number'||!Number.isFinite(value[k])||value[k]<min||value[k]>max)||value.pMax<value.pMin||![4,5,6].includes(value.reviewWeeks)||!/^\d{4}-\d{2}-\d{2}$/.test(value.startDate)||new Date(value.startDate+'T00:00:00Z').toISOString().slice(0,10)!==value.startDate)throw Error('Invalid keto planning settings');return;
 }
 if(key.startsWith('keto/shared/')){const m=/^keto\/shared\/(template|\d{4}-\d{2}-\d{2})\/day\/[0-6]$/.exec(key);if(!m||m[1]!=='template'&&(!validMonday(m[1])))throw Error('Invalid shared recipe key');if(value!==null&&(!value||!Object.keys(value).length||Object.entries(value).some(([k,v])=>!['recipe','w','h'].includes(k)||!/^(K[1-5]|S(?:[1-9]|1[0-7]))$/.test(v))))throw Error('Invalid shared vegetable recipe');return;}
 if(key.startsWith('keto/trial/')){if(!/^keto\/trial\/\d{4}-\d{2}-\d{2}$/.test(key)||!validMonday(key.slice(11)))throw Error('Invalid trial week');if(value===null)return;const ranges={weight:[30,250],waist:[30,200],hunger:[1,5]};if(!value||Array.isArray(value)||Object.entries(value).some(([k,v])=>ranges[k]?typeof v!=='number'||!Number.isFinite(v)||v<ranges[k][0]||v>ranges[k][1]||k==='hunger'&&!Number.isInteger(v):!['strength','energy','bowel'].includes(k)||!['good','stable','worse'].includes(v)))throw Error('Invalid trial check');return;}
 if(key.startsWith('keto/')){
 const match=/^keto\/(template|\d{4}-\d{2}-\d{2})\/day\/([0-6])\/(w|h)\/(b|l|d|e)$/.exec(key);
 if(!match)throw Error('Invalid keto meal key');
 if(match[1]!=='template'){const date=new Date(match[1]+'T00:00:00Z');if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==match[1]||date.getUTCDay()!==1)throw Error('Invalid keto week');}
 if(value===null)return;
 const number=(x,min,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
 if(match[4]==='e'){if(match[3]!=='h'||!value||Array.isArray(value)||Object.keys(value).sort().join(',')!=='almonds,cashews,walnuts'||Object.values(value).some(x=>!number(x,0,20))||Object.values(value).reduce((a,b)=>a+b,0)>20+1e-8)throw Error('Evening nuts: maximum 20 g total per day.');return;}
 if(!value||Array.isArray(value)||['oil','protein','quantity','soya'].some(k=>!(k in value))||Object.keys(value).some(k=>!['oil','protein','quantity','soya','paneerType','curdType','curd','milk','butter','cucumber','walnuts','cashews','flax','sabziFraction','whey','eggWhites','almonds','spinach','avocado','mushroom','tomato','onion','breakfastRecipe','mealRecipe','eggPreparation'].includes(k))||!['paneer','eggs','chicken'].includes(value.protein)||match[3]==='w'&&value.protein!=='paneer')throw Error('Invalid keto protein');
 if(value.eggPreparation!==undefined&&!['planned','boiled','poached','fried','omelette','scrambled','curry'].includes(value.eggPreparation))throw Error('Invalid egg preparation');
 if(value.paneerType!==undefined&&!['paneer','paneerHP','paneerMM'].includes(value.paneerType)||value.curdType!==undefined&&!['curd','curdH'].includes(value.curdType))throw Error('Invalid dairy product');
 for(const [field,max]of Object.entries({whey:3,eggWhites:12,spinach:1000,almonds:150,curd:500,milk:500,butter:50,cucumber:1000,walnuts:150,cashews:150,flax:50,sabziFraction:2,avocado:500,mushroom:500,tomato:500,onion:200}))if(value[field]!==undefined&&!number(value[field],0,max))throw Error('Invalid keto '+field);
 if(value.mealRecipe!==undefined&&(match[3]!=='h'||!['l','d'].includes(match[4])||!['simpleChicken','sharedOnly','custom','chickenAvocado','eggAvocadoPlate','eggSpinach','eggMushroom','eggCurry','boiledEggMeal','chickenPan','chickenDahi','paneerPan','highProteinPaneer','eggSoya'].includes(value.mealRecipe)))throw Error('Invalid keto main dish');
 if(value.breakfastRecipe!==undefined&&(match[4]!=='b'||!['omelette','eggAvocado','paneerBhurji','chickenBowl','dahiBowl','boiledEggs','eggPoach'].includes(value.breakfastRecipe)||match[3]==='w'&&!['paneerBhurji','dahiBowl'].includes(value.breakfastRecipe)))throw Error('Invalid keto breakfast');
 if(value.eggWhites!==undefined&&(!Number.isInteger(value.eggWhites)||match[3]==='w'&&value.eggWhites>0))throw Error('Invalid extra egg whites');
 if(value.whey!==undefined&&!Number.isInteger(value.whey*2))throw Error('Use whole or half whey scoops');
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
 if(key.includes('/day/')){const d=value.meal;if(!d||!/^B[1-5]$/.test(d.b)||!/^S(?:[1-9]|1[0-7])$/.test(d.s)||!['P','Y'].includes(d.p)||!['moong','masoor','arhar','rajma','chickpea','kalachana'].includes(d.dal)||!selection(value.utensils))throw Error('Invalid day');
 for(const k of ['off','wheyW','wheyH','eggH','cardioW','cardioH'])if(typeof d[k]!=='boolean')throw Error('Invalid meal flag');
 if(!d.skip||!['b','l','d'].every(k=>typeof d.skip[k]==='boolean'))throw Error('Invalid skipped meal');
 if(d.readyB!==undefined&&(!d.readyB||Array.isArray(d.readyB)||Object.keys(d.readyB).sort().join(',')!=='h,w'||!['w','h'].every(k=>typeof d.readyB[k]==='boolean')||!d.readyB.w&&!d.readyB.h))throw Error('Invalid no-cooking breakfast');
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

export function validateKetoNuts(rows){
 const map=Object.fromEntries(rows.map(r=>[r.key,r.value]));
 for(const [key,value]of Object.entries(map))if(/^keto\/(template|\d{4}-\d{2}-\d{2})\/day\/[0-6]\/h\/e$/.test(key)&&value){
  validateRecord(key,value);
  for(const m of ['b','l','d'])if(['almonds','walnuts','cashews'].some(id=>(map[key.slice(0,-1)+m]?.[id]||0)>0))throw Error('Husband nuts belong in the evening only, maximum 20 g total: '+key.slice(0,-1)+m);
 }
}
