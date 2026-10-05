// Shared wire format. Tombstones retain revisions, including after deletion/recreation.
export const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
function canonical(x){if(x===undefined)return null;if(!x||typeof x!=='object')return x;if(Array.isArray(x))return x.map(canonical);return Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])]));}
export function validateRecord(key,value){
 if(!/^(setting\/(labels|density|soya|oilUse|personModes|utSel|utensils\/(kadhai|cooker|pan|bigpan|medpan))|template\/day\/[0-6]|week\/\d{4}-\d{2}-\d{2}(\/day\/[0-6])?)$/.test(key))throw Error('Invalid record key');
 if(JSON.stringify(value).length>12000)throw Error('Record too large');
 if(value===null){if(!key.startsWith('week/'))throw Error('Cannot delete household settings');return;}
 const number=(x,min,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
 const utensils=['kadhai','cooker','pan','bigpan','medpan'];
 const selection=x=>x&&['sabzi','dal','prot'].every(k=>utensils.includes(x[k]));
 if(key.includes('/day/')){const d=value.meal;if(!d||!/^B[1-5]$/.test(d.b)||!/^S(?:[1-9]|10|11)$/.test(d.s)||!['P','Y'].includes(d.p)||!['moong','masoor','arhar'].includes(d.dal)||!selection(value.utensils))throw Error('Invalid day');
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
