import {validDate} from './batch-math.js';
export function activityBasis(record){return JSON.stringify({basis:record.basis,gross:record.gross,tare:record.tare,portions:record.portions.map(s=>({meal:s.meal,person:s.person,grams:s.grams}))});}
export function servingState(record,activity,meal){
 const served=activity?.basis===activityBasis(record)?activity.served:[];
 const left=record.netWeight-record.portions.filter(s=>served.includes(s.meal+'/'+s.person)).reduce((n,s)=>n+s.grams,0);
 const dinner=record.portions.filter(s=>s.meal==='d'&&!served.includes('d/'+s.person)).reduce((n,s)=>n+s.grams,0);
 return {left,dinner,portions:record.portions.filter(s=>s.meal===meal).map(s=>({...s,served:served.includes(s.meal+'/'+s.person)}))};
}
export function validateActivity(key,value){
 const match=/^(serve|done|buy)\/(\d{4}-\d{2}-\d{2})\/(.+)$/.exec(key);
 if(!match||!validDate(match[2]))throw Error('Invalid activity date');
 const [,type,date,item]=match;
 if(type==='serve'&&!/^(sabzi|sabzi-w|sabzi-h|dal|prot)$/.test(item)||type==='done'&&!/^[bld]$/.test(item)||type==='buy'&&(!/^[a-zA-Z][a-zA-Z0-9]{0,31}$/.test(item)||new Date(date+'T00:00:00Z').getUTCDay()!==1))throw Error('Invalid activity key');
 if(value===null)return;
 if(!value||typeof value!=='object'||Array.isArray(value)||!Number.isFinite(value.updatedAt)||value.updatedAt<0||value.updatedAt>1e15)throw Error('Invalid activity');
 if(type==='serve'){
  if(Object.keys(value).sort().join(',')!=='basis,served,updatedAt'||typeof value.basis!=='string'||value.basis.length>8000||!Array.isArray(value.served)||value.served.length>4||new Set(value.served).size!==value.served.length||value.served.some(s=>!/[ld]\/[wh]/.test(s)||s.length!==3))throw Error('Invalid serving progress');
 }else if(Object.keys(value).sort().join(',')!==(type==='done'?'basis,complete,updatedAt':'checked,updatedAt')||typeof value[type==='done'?'complete':'checked']!=='boolean'||type==='done'&&(typeof value.basis!=='string'||value.basis.length>16000))throw Error('Invalid checklist value');
}
